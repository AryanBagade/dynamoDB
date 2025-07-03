package replication

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"dynamodb/internal/node"
	"dynamodb/internal/ring"
	"dynamodb/internal/storage"
)

// HealthStatus represents the health state of a node
type HealthStatus struct {
	NodeID       string        `json:"node_id"`
	IsAlive      bool          `json:"is_alive"`
	LastChecked  time.Time     `json:"last_checked"`
	ResponseTime time.Duration `json:"response_time"`
	FailureCount int           `json:"failure_count"`
}

// ReplicationRequest represents a request to replicate data to another node
type ReplicationRequest struct {
	Key        string `json:"key"`
	Value      string `json:"value"`
	Operation  string `json:"operation"` // "put", "delete"
	SourceNode string `json:"source_node"`
	Timestamp  int64  `json:"timestamp"`
	// Vector clock synchronization
	EventLog    *storage.EventLog    `json:"event_log,omitempty"`
	VectorClock *storage.VectorClock `json:"vector_clock,omitempty"`
	SourceEvent *storage.Event       `json:"source_event,omitempty"`
}

// ReplicationResponse represents the response from a replication request
type ReplicationResponse struct {
	Success   bool   `json:"success"`
	Message   string `json:"message"`
	NodeID    string `json:"node_id"`
	Timestamp int64  `json:"timestamp"`
	Error     string `json:"error,omitempty"`
	// Vector clock response
	UpdatedClock *storage.VectorClock `json:"updated_clock,omitempty"`
}

// WriteResult represents the result of a distributed write operation
type WriteResult struct {
	Key              string   `json:"key"`
	Value            string   `json:"value"`
	SuccessfulNodes  []string `json:"successful_nodes"`
	FailedNodes      []string `json:"failed_nodes"`
	ReplicationLevel int      `json:"replication_level"`
	QuorumAchieved   bool     `json:"quorum_achieved"`
}

// ReadResult represents the result of a read operation across replicas
type ReadResult struct {
	Key       string                           `json:"key"`
	Value     string                           `json:"value"`
	Responses map[string]*storage.StorageValue `json:"responses"`
	NodeID    string                           `json:"node_id"`
}

// Replicator handles data replication across nodes
type Replicator struct {
	ring              *ring.ConsistentHashRing
	storage           *storage.LevelDBStorage
	currentNode       *node.Node
	replicationFactor int
	quorumSize        int
	httpClient        *http.Client

	// Health monitoring
	nodeHealth      map[string]*HealthStatus
	healthMutex     sync.RWMutex
	healthTicker    *time.Ticker
	stopHealthCheck chan bool
}

// NewReplicator creates a new replicator instance
func NewReplicator(hashRing *ring.ConsistentHashRing, localStorage *storage.LevelDBStorage, currentNode *node.Node) *Replicator {
	replicator := &Replicator{
		ring:              hashRing,
		storage:           localStorage,
		currentNode:       currentNode,
		replicationFactor: 3,
		quorumSize:        2,
		httpClient: &http.Client{
			Timeout: 2 * time.Second, // 2 second timeout for health checks
		},
		nodeHealth:      make(map[string]*HealthStatus),
		healthMutex:     sync.RWMutex{},
		stopHealthCheck: make(chan bool),
	}

	// Start health monitoring
	replicator.startHealthMonitoring()

	return replicator
}

// startHealthMonitoring begins periodic health checks of all cluster nodes
func (r *Replicator) startHealthMonitoring() {
	r.healthTicker = time.NewTicker(3 * time.Second) // Check every 3 seconds

	go func() {
		for {
			select {
			case <-r.healthTicker.C:
				r.performHealthChecks()
			case <-r.stopHealthCheck:
				r.healthTicker.Stop()
				return
			}
		}
	}()

	fmt.Printf("🩺 Health monitoring started (checking every 3 seconds)\n")
}

// performHealthChecks checks the health of all nodes in the cluster
func (r *Replicator) performHealthChecks() {
	nodes := r.ring.GetAllNodes()

	for _, node := range nodes {
		// Don't check ourselves
		if node.ID == r.currentNode.ID {
			r.updateNodeHealth(node.ID, true, 0, 0)
			continue
		}

		// Check remote node health
		go r.checkNodeHealth(node)
	}
}

// checkNodeHealth performs a health check on a specific node
func (r *Replicator) checkNodeHealth(targetNode *node.Node) {
	start := time.Now()

	// Try to contact the node's status endpoint
	url := fmt.Sprintf("http://%s/api/v1/status", targetNode.Address)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		r.recordHealthCheckFailure(targetNode.ID, start)
		return
	}

	resp, err := r.httpClient.Do(req)
	responseTime := time.Since(start)

	if err != nil || resp.StatusCode != 200 {
		r.recordHealthCheckFailure(targetNode.ID, start)
		if resp != nil {
			resp.Body.Close()
		}
		return
	}

	resp.Body.Close()
	r.updateNodeHealth(targetNode.ID, true, responseTime, 0)
}

// recordHealthCheckFailure records a failed health check
func (r *Replicator) recordHealthCheckFailure(nodeID string, startTime time.Time) {
	responseTime := time.Since(startTime)

	r.healthMutex.Lock()
	defer r.healthMutex.Unlock()

	health, exists := r.nodeHealth[nodeID]
	if !exists {
		health = &HealthStatus{
			NodeID: nodeID,
		}
		r.nodeHealth[nodeID] = health
	}

	health.IsAlive = false
	health.LastChecked = time.Now()
	health.ResponseTime = responseTime
	health.FailureCount++

	// Log failure detection
	if health.FailureCount == 1 {
		fmt.Printf("💀 Node %s detected as FAILED (connection refused)\n", nodeID)
	}
}

// updateNodeHealth updates the health status of a node
func (r *Replicator) updateNodeHealth(nodeID string, isAlive bool, responseTime time.Duration, failureCount int) {
	r.healthMutex.Lock()
	defer r.healthMutex.Unlock()

	health, exists := r.nodeHealth[nodeID]
	if !exists {
		health = &HealthStatus{
			NodeID: nodeID,
		}
		r.nodeHealth[nodeID] = health
	}

	wasAlive := health.IsAlive
	health.IsAlive = isAlive
	health.LastChecked = time.Now()
	health.ResponseTime = responseTime

	if failureCount > 0 {
		health.FailureCount = failureCount
	} else if isAlive && !wasAlive {
		// Node recovered
		health.FailureCount = 0
		fmt.Printf("💚 Node %s RECOVERED (%.2fms response time)\n", nodeID, float64(responseTime.Nanoseconds())/1000000)
	}
}

// getAliveNodes returns only the nodes that are currently alive
func (r *Replicator) getAliveNodes() []*node.Node {
	allNodes := r.ring.GetAllNodes()
	aliveNodes := make([]*node.Node, 0)

	r.healthMutex.RLock()
	defer r.healthMutex.RUnlock()

	for _, node := range allNodes {
		if node.ID == r.currentNode.ID {
			// Current node is always considered alive
			aliveNodes = append(aliveNodes, node)
			continue
		}

		health, exists := r.nodeHealth[node.ID]
		if exists && health.IsAlive {
			aliveNodes = append(aliveNodes, node)
		}
	}

	return aliveNodes
}

// WriteWithReplication writes data with replication and vector clock sync
func (r *Replicator) WriteWithReplication(key, value string) (*WriteResult, error) {
	// Check if we have enough alive nodes for quorum
	aliveNodes := r.getAliveNodes()
	if len(aliveNodes) < r.quorumSize {
		return &WriteResult{
			Key:              key,
			Value:            value,
			SuccessfulNodes:  []string{},
			FailedNodes:      []string{},
			ReplicationLevel: len(aliveNodes),
			QuorumAchieved:   false,
		}, fmt.Errorf("insufficient alive nodes: have %d, need %d for quorum", len(aliveNodes), r.quorumSize)
	}

	fmt.Printf("🔍 Write attempt: %d alive nodes, need %d for quorum\n", len(aliveNodes), r.quorumSize)

	// Store locally first and get the event
	err := r.storage.Put(key, value)
	if err != nil {
		return nil, fmt.Errorf("local write failed: %v", err)
	}

	// Get the event that was just created for this write
	eventLog := r.storage.GetEventLog()
	var sourceEvent *storage.Event
	if len(eventLog.Events) > 0 {
		sourceEvent = eventLog.Events[len(eventLog.Events)-1] // Get the latest event
	}

	successfulNodes := []string{r.currentNode.ID}
	failedNodes := []string{}

	// Get target nodes for replication
	targetNodes := r.ring.GetNodesForKey(key, r.replicationFactor)

	// Replicate to other nodes with vector clock sync
	for _, targetNode := range targetNodes {
		if targetNode.ID == r.currentNode.ID {
			continue // Skip self
		}

		// Only replicate to alive nodes
		if !r.isNodeAlive(targetNode.ID) {
			failedNodes = append(failedNodes, targetNode.ID)
			continue
		}

		// Create replication request with vector clock info
		request := ReplicationRequest{
			Key:         key,
			Value:       value,
			Operation:   "put",
			SourceNode:  r.currentNode.ID,
			Timestamp:   time.Now().Unix(),
			EventLog:    eventLog,
			VectorClock: eventLog.Current,
			SourceEvent: sourceEvent,
		}

		success := r.replicateToNode(targetNode, &request)
		if success {
			successfulNodes = append(successfulNodes, targetNode.ID)
		} else {
			failedNodes = append(failedNodes, targetNode.ID)
		}
	}

	quorumAchieved := len(successfulNodes) >= r.quorumSize

	return &WriteResult{
		Key:              key,
		Value:            value,
		SuccessfulNodes:  successfulNodes,
		FailedNodes:      failedNodes,
		ReplicationLevel: len(successfulNodes),
		QuorumAchieved:   quorumAchieved,
	}, nil
}

// replicateToNode sends replication request to a specific node
func (r *Replicator) replicateToNode(targetNode *node.Node, request *ReplicationRequest) bool {
	url := fmt.Sprintf("http://%s/internal/replicate", targetNode.Address)

	requestBody, err := json.Marshal(request)
	if err != nil {
		fmt.Printf("❌ Failed to marshal replication request for %s: %v\n", targetNode.ID, err)
		return false
	}

	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Post(url, "application/json", bytes.NewBuffer(requestBody))
	if err != nil {
		fmt.Printf("❌ Replication failed to %s: %v\n", targetNode.ID, err)
		return false
	}
	defer resp.Body.Close()

	var response ReplicationResponse
	err = json.NewDecoder(resp.Body).Decode(&response)
	if err != nil {
		fmt.Printf("❌ Failed to decode replication response from %s: %v\n", targetNode.ID, err)
		return false
	}

	if response.Success {
		fmt.Printf("✅ Replication successful to %s\n", targetNode.ID)

		// If we got an updated vector clock back, we could merge it here
		if response.UpdatedClock != nil {
			fmt.Printf("🕰️ Received updated vector clock from %s: %s\n",
				targetNode.ID, response.UpdatedClock.String())
		}

		return true
	} else {
		fmt.Printf("❌ Replication failed to %s: %s\n", targetNode.ID, response.Error)
		return false
	}
}

// isNodeAlive checks if a specific node is alive
func (r *Replicator) isNodeAlive(nodeID string) bool {
	r.healthMutex.RLock()
	defer r.healthMutex.RUnlock()

	health, exists := r.nodeHealth[nodeID]
	return exists && health.IsAlive
}

// GetReplicationStatus returns current replication status including health information
func (r *Replicator) GetReplicationStatus() map[string]interface{} {
	aliveNodes := r.getAliveNodes()
	allNodes := r.ring.GetAllNodes()

	r.healthMutex.RLock()
	healthSummary := make(map[string]*HealthStatus)
	for k, v := range r.nodeHealth {
		healthSummary[k] = v
	}
	r.healthMutex.RUnlock()

	return map[string]interface{}{
		"replication_factor": r.replicationFactor,
		"quorum_size":        r.quorumSize,
		"total_nodes":        len(allNodes),
		"alive_nodes":        len(aliveNodes),
		"current_node":       r.currentNode.ID,
		"quorum_available":   len(aliveNodes) >= r.quorumSize,
		"node_health":        healthSummary,
	}
}

// ReadWithQuorum reads data with quorum requirements
func (r *Replicator) ReadWithQuorum(key string) (*storage.StorageValue, error) {
	// Check if we have enough alive nodes for quorum
	aliveNodes := r.getAliveNodes()
	if len(aliveNodes) < r.quorumSize {
		return nil, fmt.Errorf("insufficient alive nodes for read quorum: have %d, need %d", len(aliveNodes), r.quorumSize)
	}

	// For now, just read from local storage
	// In a full implementation, we'd read from multiple nodes and resolve conflicts
	return r.storage.Get(key)
}

// HandleReplicationRequest processes incoming replication requests with vector clock sync
func (r *Replicator) HandleReplicationRequest(req *ReplicationRequest) *ReplicationResponse {
	switch req.Operation {
	case "put":
		// Store the data locally
		err := r.storage.Put(req.Key, req.Value)
		if err != nil {
			return &ReplicationResponse{
				Success:   false,
				Message:   "Replication failed",
				NodeID:    r.currentNode.ID,
				Timestamp: time.Now().Unix(),
				Error:     err.Error(),
			}
		}

		// Merge vector clock and event log if provided
		if req.EventLog != nil && req.VectorClock != nil {
			fmt.Printf("🕰️ Merging vector clock from %s\n", req.SourceNode)
			r.storage.MergeVectorClock(req.EventLog)
		}

		return &ReplicationResponse{
			Success:      true,
			Message:      "Replication successful",
			NodeID:       r.currentNode.ID,
			Timestamp:    time.Now().Unix(),
			UpdatedClock: r.storage.GetEventLog().Current,
		}

	case "delete":
		err := r.storage.Delete(req.Key)
		if err != nil {
			return &ReplicationResponse{
				Success:   false,
				Message:   "Delete replication failed",
				NodeID:    r.currentNode.ID,
				Timestamp: time.Now().Unix(),
				Error:     err.Error(),
			}
		}

		// Merge vector clock for delete operations too
		if req.EventLog != nil && req.VectorClock != nil {
			fmt.Printf("🕰️ Merging vector clock from %s for delete\n", req.SourceNode)
			r.storage.MergeVectorClock(req.EventLog)
		}

		return &ReplicationResponse{
			Success:      true,
			Message:      "Delete replication successful",
			NodeID:       r.currentNode.ID,
			Timestamp:    time.Now().Unix(),
			UpdatedClock: r.storage.GetEventLog().Current,
		}

	default:
		return &ReplicationResponse{
			Success:   false,
			Message:   "Unknown operation",
			NodeID:    r.currentNode.ID,
			Timestamp: time.Now().Unix(),
			Error:     "unsupported operation: " + req.Operation,
		}
	}
}

// Stop stops the health monitoring
func (r *Replicator) Stop() {
	close(r.stopHealthCheck)
	if r.healthTicker != nil {
		r.healthTicker.Stop()
	}
}

func getErrorString(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}

type ReplicationResult struct {
	Key              string   `json:"key"`
	Value            string   `json:"value"`
	SuccessfulNodes  []string `json:"successful_nodes"`
	FailedNodes      []string `json:"failed_nodes"`
	ReplicationLevel int      `json:"replication_level"`
	QuorumAchieved   bool     `json:"quorum_achieved"`
}
