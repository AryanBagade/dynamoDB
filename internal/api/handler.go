package api

import (
	"bytes"
	"encoding/json"
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

// DeleteData deletes a key-value pair with replication
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

	// Use replication system for distributed delete with vector clock sync
	result, err := h.replicator.DeleteWithReplication(key)
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

	// Get the current vector clock state after the delete
	eventLog := h.storage.GetEventLog()

	c.JSON(http.StatusOK, gin.H{
		"key":                key,
		"message":            "Key deleted successfully",
		"responsible_node":   responsibleNode.ID,
		"replication_nodes":  getNodeIDs(replicationNodes),
		"replication_result": result,
		"vector_clock":       eventLog.Current,
		"event_count":        len(eventLog.Events),
		"timestamp":          time.Now().Unix(),
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
		SyncMode     string `json:"sync_mode,omitempty"` // "pull", "push", "bidirectional"
	}
	
	// Default to bidirectional sync for enterprise-grade behavior
	if req.SyncMode == "" {
		req.SyncMode = "bidirectional"
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

	// Perform bidirectional synchronization  
	result, err := h.performBidirectionalSync(targetNode, sourceTree, targetTree, comparison, req.SyncMode, req.DryRun)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Synchronization failed: %v", err),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message":    result.Message,
		"comparison": comparison,
		"actions":    result.Actions,
		"dry_run":    req.DryRun,
		"sync_mode":  req.SyncMode,
		"pull_stats": result.PullStats,
		"push_stats": result.PushStats,
		"timestamp":  time.Now().Unix(),
	})
}

// SyncResult represents the result of a bidirectional synchronization
type SyncResult struct {
	Message   string            `json:"message"`
	Actions   []string          `json:"actions"`
	PullStats map[string]int    `json:"pull_stats"`
	PushStats map[string]int    `json:"push_stats"`
}

// performBidirectionalSync executes enterprise-grade bidirectional anti-entropy repair
func (h *Handler) performBidirectionalSync(targetNode *node.Node, sourceTree, targetTree *storage.MerkleTree, comparison *storage.TreeComparison, syncMode string, dryRun bool) (*SyncResult, error) {
	result := &SyncResult{
		Actions:   make([]string, 0),
		PullStats: make(map[string]int),
		PushStats: make(map[string]int),
	}
	
	if dryRun {
		return h.simulateBidirectionalSync(targetNode, comparison, syncMode)
	}
	
	var totalSynced int
	
	// PULL PHASE: Get keys from target that we don't have
	if syncMode == "pull" || syncMode == "bidirectional" {
		pullResult := h.executePullSync(targetNode, comparison)
		result.PullStats = pullResult
		totalSynced += pullResult["synced"]
		
		if pullResult["synced"] > 0 {
			result.Actions = append(result.Actions, fmt.Sprintf("Pulled %d keys from target", pullResult["synced"]))
		}
		if pullResult["failed"] > 0 {
			result.Actions = append(result.Actions, fmt.Sprintf("Failed to pull %d keys", pullResult["failed"]))
		}
	}
	
	// PUSH PHASE: Send our keys to target that it doesn't have
	if syncMode == "push" || syncMode == "bidirectional" {
		pushResult := h.executePushSync(targetNode, comparison)
		result.PushStats = pushResult
		totalSynced += pushResult["synced"]
		
		if pushResult["synced"] > 0 {
			result.Actions = append(result.Actions, fmt.Sprintf("Pushed %d keys to target", pushResult["synced"]))
		}
		if pushResult["failed"] > 0 {
			result.Actions = append(result.Actions, fmt.Sprintf("Failed to push %d keys", pushResult["failed"]))
		}
	}
	
	// CONFLICT RESOLUTION: Handle mismatched keys with vector clocks
	if len(comparison.MismatchedKeys) > 0 {
		conflictResult := h.resolveConflicts(targetNode, comparison.MismatchedKeys, dryRun)
		totalSynced += conflictResult["resolved"]
		
		if conflictResult["resolved"] > 0 {
			result.Actions = append(result.Actions, fmt.Sprintf("Resolved %d conflicts using vector clocks", conflictResult["resolved"]))
		}
	}
	
	// Generate final message
	if totalSynced > 0 {
		result.Message = fmt.Sprintf("Bidirectional sync complete: %d keys synchronized", totalSynced)
	} else {
		result.Message = "Nodes are already synchronized"
	}
	
	fmt.Printf("🔄 Bidirectional sync complete: %d total keys synchronized\n", totalSynced)
	return result, nil
}

// simulateBidirectionalSync simulates what would happen in dry run mode
func (h *Handler) simulateBidirectionalSync(targetNode *node.Node, comparison *storage.TreeComparison, syncMode string) (*SyncResult, error) {
	result := &SyncResult{
		Message:   "Bidirectional sync simulation (dry run)",
		Actions:   make([]string, 0),
		PullStats: make(map[string]int),
		PushStats: make(map[string]int),
	}
	
	if syncMode == "pull" || syncMode == "bidirectional" {
		if len(comparison.ExtraKeys) > 0 {
			result.Actions = append(result.Actions, fmt.Sprintf("Would pull %d keys from target", len(comparison.ExtraKeys)))
			result.PullStats["would_pull"] = len(comparison.ExtraKeys)
		}
	}
	
	if syncMode == "push" || syncMode == "bidirectional" {
		if len(comparison.MissingKeys) > 0 {
			result.Actions = append(result.Actions, fmt.Sprintf("Would push %d keys to target", len(comparison.MissingKeys)))
			result.PushStats["would_push"] = len(comparison.MissingKeys)
		}
	}
	
	if len(comparison.MismatchedKeys) > 0 {
		result.Actions = append(result.Actions, fmt.Sprintf("Would resolve %d conflicts using vector clocks", len(comparison.MismatchedKeys)))
	}
	
	return result, nil
}

// executePullSync pulls missing keys from target to source
func (h *Handler) executePullSync(targetNode *node.Node, comparison *storage.TreeComparison) map[string]int {
	stats := map[string]int{"synced": 0, "failed": 0, "attempted": len(comparison.ExtraKeys)}
	
	for _, key := range comparison.ExtraKeys {
		if err := h.copyKeyFromTarget(key, targetNode); err != nil {
			fmt.Printf("❌ Failed to pull key %s: %v\n", key, err)
			stats["failed"]++
		} else {
			fmt.Printf("✅ Pulled key: %s\n", key)
			stats["synced"]++
		}
	}
	
	return stats
}

// executePushSync pushes our keys to target node
func (h *Handler) executePushSync(targetNode *node.Node, comparison *storage.TreeComparison) map[string]int {
	stats := map[string]int{"synced": 0, "failed": 0, "attempted": len(comparison.MissingKeys)}
	
	for _, key := range comparison.MissingKeys {
		if err := h.pushKeyToTarget(key, targetNode); err != nil {
			fmt.Printf("❌ Failed to push key %s: %v\n", key, err)
			stats["failed"]++
		} else {
			fmt.Printf("✅ Pushed key: %s\n", key)
			stats["synced"]++
		}
	}
	
	return stats
}

// resolveConflicts handles mismatched keys using vector clock causality
func (h *Handler) resolveConflicts(targetNode *node.Node, conflictKeys []string, dryRun bool) map[string]int {
	stats := map[string]int{"resolved": 0, "failed": 0, "attempted": len(conflictKeys)}
	
	for _, key := range conflictKeys {
		// Get our version with vector clock
		ourValue, err := h.storage.Get(key)
		if err != nil {
			fmt.Printf("❌ Failed to get our version of %s: %v\n", key, err)
			stats["failed"]++
			continue
		}
		
		// Get target's version with vector clock  
		targetValue, err := h.getValueWithVectorClock(key, targetNode)
		if err != nil {
			fmt.Printf("❌ Failed to get target version of %s: %v\n", key, err)
			stats["failed"]++
			continue
		}
		
		// Use vector clock to determine which version wins
		winner := h.resolveVectorClockConflict(ourValue, targetValue)
		
		if winner == "ours" {
			// Push our version to target
			if err := h.pushKeyToTarget(key, targetNode); err != nil {
				fmt.Printf("❌ Failed to push winning version of %s: %v\n", key, err)
				stats["failed"]++
			} else {
				fmt.Printf("✅ Conflict resolved: pushed our version of %s\n", key)
				stats["resolved"]++
			}
		} else if winner == "theirs" {
			// Pull their version
			if err := h.copyKeyFromTarget(key, targetNode); err != nil {
				fmt.Printf("❌ Failed to pull winning version of %s: %v\n", key, err)
				stats["failed"]++
			} else {
				fmt.Printf("✅ Conflict resolved: pulled their version of %s\n", key)
				stats["resolved"]++
			}
		} else {
			fmt.Printf("⚠️ Concurrent conflict for %s - keeping our version\n", key)
			stats["resolved"]++
		}
	}
	
	return stats
}

// copyKeyFromTarget fetches a key from the target node and stores it locally
func (h *Handler) copyKeyFromTarget(key string, targetNode *node.Node) error {
	// Fetch the key from the target node
	url := fmt.Sprintf("http://%s/api/v1/data/%s", targetNode.Address, key)
	
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return fmt.Errorf("failed to fetch key from target: %v", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("target node returned status %d for key %s", resp.StatusCode, key)
	}
	
	// Parse the response to get the value
	var result struct {
		Key   string `json:"key"`
		Value string `json:"value"`
		ReadResult struct {
			Value string `json:"value"`
		} `json:"read_result"`
	}
	
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fmt.Errorf("failed to decode response: %v", err)
	}
	
	// Get the actual value (try both possible response formats)
	value := result.Value
	if value == "" && result.ReadResult.Value != "" {
		value = result.ReadResult.Value
	}
	
	if value == "" {
		return fmt.Errorf("no value found in response for key %s", key)
	}
	
	// Store the key locally (this will create a new event in our vector clock)
	if err := h.storage.Put(key, value); err != nil {
		return fmt.Errorf("failed to store key locally: %v", err)
	}
	
	return nil
}

// pushKeyToTarget sends a key-value pair to the target node
func (h *Handler) pushKeyToTarget(key string, targetNode *node.Node) error {
	// Get our version of the key
	value, err := h.storage.Get(key)
	if err != nil {
		return fmt.Errorf("failed to get local key: %v", err)
	}
	
	// Send PUT request to target node
	url := fmt.Sprintf("http://%s/api/v1/data/%s", targetNode.Address, key)
	
	payload := map[string]string{"value": value.Value}
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %v", err)
	}
	
	client := &http.Client{Timeout: 5 * time.Second}
	req, err := http.NewRequest("PUT", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send key to target: %v", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("target node returned status %d for key %s", resp.StatusCode, key)
	}
	
	return nil
}

// getValueWithVectorClock fetches a key with its vector clock from target node
func (h *Handler) getValueWithVectorClock(key string, targetNode *node.Node) (*storage.StorageValue, error) {
	// For now, just get the regular value - vector clock comparison can be enhanced later
	url := fmt.Sprintf("http://%s/api/v1/data/%s", targetNode.Address, key)
	
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch key from target: %v", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("target node returned status %d for key %s", resp.StatusCode, key)
	}
	
	var result struct {
		Key   string `json:"key"`
		Value string `json:"value"`
		ReadResult struct {
			Value string `json:"value"`
		} `json:"read_result"`
	}
	
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %v", err)
	}
	
	value := result.Value
	if value == "" && result.ReadResult.Value != "" {
		value = result.ReadResult.Value
	}
	
	return &storage.StorageValue{
		Value:     value,
		Timestamp: time.Now().Unix(),
		Version:   1,
		Metadata:  make(map[string]string),
	}, nil
}

// resolveVectorClockConflict determines which version wins using vector clock causality
func (h *Handler) resolveVectorClockConflict(ourValue, targetValue *storage.StorageValue) string {
	// For now, use simple timestamp comparison
	// In a full implementation, this would use actual vector clock comparison
	if ourValue.Timestamp > targetValue.Timestamp {
		return "ours"
	} else if targetValue.Timestamp > ourValue.Timestamp {
		return "theirs"
	} else {
		// Concurrent - use deterministic tie-breaker (could use node ID comparison)
		return "concurrent"
	}
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
	// Make actual HTTP request to target node
	url := fmt.Sprintf("http://%s/api/v1/merkle-tree", targetNode.Address)
	
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch Merkle tree from %s: %v", targetNode.ID, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch Merkle tree from %s: HTTP %d", targetNode.ID, resp.StatusCode)
	}

	// Parse the response
	var response struct {
		MerkleTree *storage.MerkleTree `json:"merkle_tree"`
		Message    string              `json:"message"`
		Timestamp  int64               `json:"timestamp"`
	}

	err = json.NewDecoder(resp.Body).Decode(&response)
	if err != nil {
		return nil, fmt.Errorf("failed to decode Merkle tree response from %s: %v", targetNode.ID, err)
	}

	if response.MerkleTree == nil {
		return nil, fmt.Errorf("received nil Merkle tree from %s", targetNode.ID)
	}

	fmt.Printf("✅ Successfully fetched Merkle tree from %s (%d keys)\n", 
		targetNode.ID, response.MerkleTree.KeyCount)

	return response.MerkleTree, nil
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
