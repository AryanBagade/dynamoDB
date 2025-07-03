package api

import (
	"fmt"
	"net/http"
	"time"

	"dynamodb/internal/node"
	"dynamodb/internal/replication"
	"dynamodb/internal/ring"
	"dynamodb/internal/storage"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow connections from any origin
	},
}

// Handler handles HTTP requests and WebSocket connections
type Handler struct {
	ring        *ring.ConsistentHashRing
	currentNode *node.Node
	storage     *storage.LevelDBStorage
	replicator  *replication.Replicator
}

// NewHandler creates a new API handler
func NewHandler(hashRing *ring.ConsistentHashRing, currentNode *node.Node, localStorage *storage.LevelDBStorage, replicator *replication.Replicator) *Handler {
	return &Handler{
		ring:        hashRing,
		currentNode: currentNode,
		storage:     localStorage,
		replicator:  replicator,
	}
}

// GetStatus returns the current node status
func (h *Handler) GetStatus(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"node":        h.currentNode.GetInfo(),
		"storage":     h.storage.GetStats(),
		"replication": h.replicator.GetReplicationStatus(),
		"timestamp":   time.Now().Unix(),
		"message":     "Node is healthy",
	})
}

// GetRing returns information about the hash ring
func (h *Handler) GetRing(c *gin.Context) {
	ringInfo := h.ring.GetRingInfo()
	nodes := h.ring.GetAllNodes()

	nodeInfos := make([]map[string]interface{}, len(nodes))
	for i, node := range nodes {
		nodeInfos[i] = node.GetInfo()
	}

	c.JSON(http.StatusOK, gin.H{
		"ring":  ringInfo,
		"nodes": nodeInfos,
	})
}

// PutData stores a key-value pair with replication
func (h *Handler) PutData(c *gin.Context) {
	key := c.Param("key")

	var data struct {
		Value string `json:"value" binding:"required"`
	}

	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Use replication system for distributed write with vector clock sync
	result, err := h.replicator.WriteWithReplication(key, data.Value)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  err.Error(),
			"result": result,
		})
		return
	}

	// Find which node should handle this key
	responsibleNode := h.ring.GetNodeForKey(key)
	replicationNodes := h.ring.GetNodesForKey(key, 3)

	// Get the current vector clock state after the write
	eventLog := h.storage.GetEventLog()

	c.JSON(http.StatusOK, gin.H{
		"key":                key,
		"value":              data.Value,
		"responsible_node":   responsibleNode.ID,
		"replication_nodes":  getNodeIDs(replicationNodes),
		"replication_result": result,
		"vector_clock":       eventLog.Current,
		"event_count":        len(eventLog.Events),
		"timestamp":          time.Now().Unix(),
	})
}

// GetData retrieves a value by key with quorum read
func (h *Handler) GetData(c *gin.Context) {
	key := c.Param("key")

	// Use replication system for distributed read
	result, err := h.replicator.ReadWithQuorum(key)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	responsibleNode := h.ring.GetNodeForKey(key)
	replicationNodes := h.ring.GetNodesForKey(key, 3)

	c.JSON(http.StatusOK, gin.H{
		"key":               key,
		"value":             result.Value,
		"responsible_node":  responsibleNode.ID,
		"replication_nodes": getNodeIDs(replicationNodes),
		"read_result":       result,
		"timestamp":         time.Now().Unix(),
	})
}

// DeleteData deletes a key-value pair
func (h *Handler) DeleteData(c *gin.Context) {
	key := c.Param("key")

	// Check if key exists first
	exists, err := h.storage.Exists(key)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Key not found"})
		return
	}

	// Delete from local storage
	err = h.storage.Delete(key)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// TODO: Implement distributed delete with replication

	c.JSON(http.StatusOK, gin.H{
		"key":       key,
		"message":   "Key deleted successfully",
		"timestamp": time.Now().Unix(),
	})
}

// HandleReplication handles internal replication requests from other nodes
func (h *Handler) HandleReplication(c *gin.Context) {
	var req replication.ReplicationRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	response := h.replicator.HandleReplicationRequest(&req)

	if response.Success {
		c.JSON(http.StatusOK, response)
	} else {
		c.JSON(http.StatusInternalServerError, response)
	}
}

// GetStorageStats returns detailed storage statistics
func (h *Handler) GetStorageStats(c *gin.Context) {
	stats := h.storage.GetStats()

	// Add list of keys for debugging (expensive operation)
	keys, err := h.storage.ListKeys()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	stats["keys"] = keys

	c.JSON(http.StatusOK, stats)
}

// WebSocketHandler handles WebSocket connections for real-time updates
func (h *Handler) WebSocketHandler(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	// Helper function to get enhanced node information with health status
	getEnhancedNodeInfo := func() []map[string]interface{} {
		nodes := h.ring.GetAllNodes()
		replicationStatus := h.replicator.GetReplicationStatus()

		nodeInfos := make([]map[string]interface{}, len(nodes))
		for i, node := range nodes {
			nodeInfo := node.GetInfo()

			// Check if this node is alive according to replication system
			aliveNodes, _ := replicationStatus["alive_nodes"].(int)
			totalNodes, _ := replicationStatus["total_nodes"].(int)

			// For now, mark node as failed if we don't have quorum and this isn't the current node
			isCurrentNode := node.ID == h.currentNode.ID
			if isCurrentNode {
				// Current node is always considered alive
				nodeInfo["status"] = "alive"
				nodeInfo["health_status"] = map[string]interface{}{
					"is_alive":      true,
					"failure_count": 0,
				}
			} else {
				// For remote nodes, check if we have fewer alive nodes than total
				// This is a simplified check - in real implementation we'd use the actual health map
				if aliveNodes < totalNodes {
					nodeInfo["status"] = "failed"
					nodeInfo["health_status"] = map[string]interface{}{
						"is_alive":      false,
						"failure_count": 1,
					}
				} else {
					nodeInfo["status"] = "alive"
					nodeInfo["health_status"] = map[string]interface{}{
						"is_alive":      true,
						"failure_count": 0,
					}
				}
			}

			nodeInfos[i] = nodeInfo
		}
		return nodeInfos
	}

	// Send initial ring state with health information
	ringInfo := h.ring.GetRingInfo()
	replicationStatus := h.replicator.GetReplicationStatus()

	initialData := map[string]interface{}{
		"type":        "ring_state",
		"ring":        ringInfo,
		"nodes":       getEnhancedNodeInfo(),
		"storage":     h.storage.GetStats(),
		"replication": replicationStatus,
	}

	if err := conn.WriteJSON(initialData); err != nil {
		return
	}

	// Keep connection alive and send periodic updates
	ticker := time.NewTicker(2 * time.Second) // Faster updates for health monitoring
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			// Send periodic ring updates with current health status
			replicationStatus := h.replicator.GetReplicationStatus()

			updateData := map[string]interface{}{
				"type":        "heartbeat",
				"timestamp":   time.Now().Unix(),
				"nodes":       getEnhancedNodeInfo(), // Include updated node health
				"storage":     h.storage.GetStats(),
				"replication": replicationStatus,
			}

			if err := conn.WriteJSON(updateData); err != nil {
				return
			}
		}
	}
}

// JoinCluster handles requests for a node to join this node's cluster
func (h *Handler) JoinCluster(c *gin.Context) {
	var req struct {
		NodeID  string `json:"node_id" binding:"required"`
		Address string `json:"address" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create and add the new node to our ring
	newNode := node.NewNode(req.NodeID, req.Address)
	h.ring.AddNode(newNode)

	// Get updated ring info
	ringInfo := h.ring.GetRingInfo()
	nodes := h.ring.GetAllNodes()

	nodeInfos := make([]map[string]interface{}, len(nodes))
	for i, node := range nodes {
		nodeInfos[i] = node.GetInfo()
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Node %s joined cluster", req.NodeID),
		"cluster": gin.H{
			"ring":  ringInfo,
			"nodes": nodeInfos,
		},
	})
}

// GetCluster returns current cluster information
func (h *Handler) GetCluster(c *gin.Context) {
	ringInfo := h.ring.GetRingInfo()
	nodes := h.ring.GetAllNodes()

	nodeInfos := make([]map[string]interface{}, len(nodes))
	for i, node := range nodes {
		nodeInfos[i] = node.GetInfo()
	}

	c.JSON(http.StatusOK, gin.H{
		"cluster": gin.H{
			"ring":  ringInfo,
			"nodes": nodeInfos,
		},
		"current_node": h.currentNode.ID,
	})
}

// GetMerkleTree returns the current node's Merkle tree
func (h *Handler) GetMerkleTree(c *gin.Context) {
	tree, err := h.storage.BuildMerkleTree()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to build Merkle tree: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"merkle_tree": tree,
		"timestamp":   time.Now().Unix(),
		"message":     "Merkle tree built successfully",
	})
}

// CompareMerkleTrees compares this node's tree with another node's tree
func (h *Handler) CompareMerkleTrees(c *gin.Context) {
	targetNodeID := c.Param("target_node")

	// Build our own tree
	sourceTree, err := h.storage.BuildMerkleTree()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to build source tree: %v", err),
		})
		return
	}

	// Find the target node
	targetNode := h.ring.GetNode(targetNodeID)
	if targetNode == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": fmt.Sprintf("Target node %s not found in ring", targetNodeID),
		})
		return
	}

	// Make HTTP request to target node to get its Merkle tree
	targetTree, err := h.fetchMerkleTreeFromNode(targetNode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to fetch tree from target node: %v", err),
		})
		return
	}

	// Compare the trees
	comparison := storage.CompareTrees(sourceTree, targetTree)

	c.JSON(http.StatusOK, gin.H{
		"comparison":  comparison,
		"source_tree": sourceTree,
		"target_tree": targetTree,
		"timestamp":   time.Now().Unix(),
	})
}

// SyncMerkleTree performs anti-entropy synchronization with another node
func (h *Handler) SyncMerkleTree(c *gin.Context) {
	var req struct {
		TargetNodeID string `json:"target_node_id" binding:"required"`
		DryRun       bool   `json:"dry_run,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find the target node
	targetNode := h.ring.GetNode(req.TargetNodeID)
	if targetNode == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": fmt.Sprintf("Target node %s not found in ring", req.TargetNodeID),
		})
		return
	}

	// Build our tree and get target tree
	sourceTree, err := h.storage.BuildMerkleTree()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to build source tree: %v", err),
		})
		return
	}

	targetTree, err := h.fetchMerkleTreeFromNode(targetNode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to fetch target tree: %v", err),
		})
		return
	}

	// Compare trees to find inconsistencies
	comparison := storage.CompareTrees(sourceTree, targetTree)

	if comparison.IsConsistent {
		c.JSON(http.StatusOK, gin.H{
			"message":    "Trees are already consistent",
			"comparison": comparison,
			"actions":    []string{},
		})
		return
	}

	// Prepare synchronization actions
	actions := make([]string, 0)

	// For this basic implementation, we'll report what would be done
	if len(comparison.MissingKeys) > 0 {
		actions = append(actions, fmt.Sprintf("Would copy %d missing keys from target", len(comparison.MissingKeys)))
	}

	if len(comparison.MismatchedKeys) > 0 {
		actions = append(actions, fmt.Sprintf("Would resolve %d mismatched keys", len(comparison.MismatchedKeys)))
	}

	if len(comparison.ExtraKeys) > 0 {
		actions = append(actions, fmt.Sprintf("Would handle %d extra keys on target", len(comparison.ExtraKeys)))
	}

	// For now, this is a dry-run response. In a full implementation,
	// we would actually perform the synchronization operations here.

	c.JSON(http.StatusOK, gin.H{
		"message":    "Anti-entropy analysis complete",
		"comparison": comparison,
		"actions":    actions,
		"dry_run":    true,
		"timestamp":  time.Now().Unix(),
	})
}

// ============= VECTOR CLOCK ENDPOINTS =============

// GetVectorClock returns the current node's vector clock and event log
func (h *Handler) GetVectorClock(c *gin.Context) {
	eventLog := h.storage.GetEventLog()

	c.JSON(http.StatusOK, gin.H{
		"node_id":      eventLog.NodeID,
		"vector_clock": eventLog.Current,
		"event_log":    eventLog,
		"conflicts":    h.storage.DetectConflicts(),
		"timestamp":    time.Now().Unix(),
		"message":      "Vector clock retrieved successfully",
	})
}

// GetEventHistory returns the causal event history
func (h *Handler) GetEventHistory(c *gin.Context) {
	eventLog := h.storage.GetEventLog()
	conflicts := h.storage.DetectConflicts()

	// Get key-specific history if requested
	key := c.Query("key")
	var keyHistory []*storage.Event
	if key != "" {
		keyHistory = h.storage.GetCausalHistory(key)
	}

	c.JSON(http.StatusOK, gin.H{
		"node_id":      eventLog.NodeID,
		"total_events": len(eventLog.Events),
		"events":       eventLog.Events,
		"conflicts":    conflicts,
		"key_history":  keyHistory,
		"vector_clock": eventLog.Current,
		"timestamp":    time.Now().Unix(),
	})
}

// CompareVectorClocks compares vector clocks between nodes
func (h *Handler) CompareVectorClocks(c *gin.Context) {
	targetNodeID := c.Param("target_node")

	// Get our event log
	sourceLog := h.storage.GetEventLog()

	// Find the target node
	targetNode := h.ring.GetNode(targetNodeID)
	if targetNode == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": fmt.Sprintf("Target node %s not found in ring", targetNodeID),
		})
		return
	}

	// In a real implementation, we'd fetch the target node's vector clock via HTTP
	// For now, we'll simulate it
	targetLog := storage.NewEventLog(targetNodeID)

	// Compare vector clocks
	relation := sourceLog.Current.Compare(targetLog.Current)
	var relationStr string
	switch relation {
	case storage.Concurrent:
		relationStr = "concurrent"
	case storage.Before:
		relationStr = "before"
	case storage.After:
		relationStr = "after"
	case storage.Equal:
		relationStr = "equal"
	}

	c.JSON(http.StatusOK, gin.H{
		"source_node":  sourceLog.NodeID,
		"target_node":  targetNodeID,
		"source_clock": sourceLog.Current,
		"target_clock": targetLog.Current,
		"relationship": relationStr,
		"conflicts":    h.storage.DetectConflicts(),
		"timestamp":    time.Now().Unix(),
	})
}

// SyncVectorClocks performs vector clock synchronization with another node
func (h *Handler) SyncVectorClocks(c *gin.Context) {
	var req struct {
		TargetNodeID string `json:"target_node_id" binding:"required"`
		DryRun       bool   `json:"dry_run,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find the target node
	targetNode := h.ring.GetNode(req.TargetNodeID)
	if targetNode == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": fmt.Sprintf("Target node %s not found in ring", req.TargetNodeID),
		})
		return
	}

	// Get our current state
	sourceLog := h.storage.GetEventLog()
	conflicts := h.storage.DetectConflicts()

	// In a real implementation, we'd exchange event logs with the target node
	// For now, we'll simulate the process

	actions := make([]string, 0)
	if len(conflicts) > 0 {
		actions = append(actions, fmt.Sprintf("Would resolve %d conflicts", len(conflicts)))
	}
	actions = append(actions, "Would sync vector clocks with target node")
	actions = append(actions, "Would merge event logs")

	c.JSON(http.StatusOK, gin.H{
		"message":       "Vector clock sync analysis complete",
		"source_node":   sourceLog.NodeID,
		"target_node":   req.TargetNodeID,
		"current_clock": sourceLog.Current,
		"conflicts":     conflicts,
		"actions":       actions,
		"dry_run":       true,
		"timestamp":     time.Now().Unix(),
	})
}

// fetchMerkleTreeFromNode makes HTTP request to get Merkle tree from another node
func (h *Handler) fetchMerkleTreeFromNode(targetNode *node.Node) (*storage.MerkleTree, error) {
	// In a production system, we'd make an HTTP request like:
	// url := fmt.Sprintf("http://%s/api/v1/merkle-tree", targetNode.Address)
	// For now, this is a placeholder that returns an empty tree
	emptyTree := &storage.MerkleTree{
		NodeID:    targetNode.ID,
		Timestamp: time.Now().Unix(),
		KeyCount:  0,
		TreeDepth: 1,
		Leaves:    make([]*storage.MerkleNode, 0),
		Root: &storage.MerkleNode{
			Hash:     "empty",
			IsLeaf:   true,
			Level:    0,
			Position: 0,
		},
	}

	return emptyTree, nil
}

// HandleWebSocket handles WebSocket connections (keeping the existing method name)
func (h *Handler) HandleWebSocket(c *gin.Context) {
	h.WebSocketHandler(c)
}

func getNodeIDs(nodes []*node.Node) []string {
	ids := make([]string, len(nodes))
	for i, node := range nodes {
		ids[i] = node.ID
	}
	return ids
}
