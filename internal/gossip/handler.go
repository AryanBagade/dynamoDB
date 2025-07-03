package gossip

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// GossipHandler handles HTTP requests for gossip protocol
type GossipHandler struct {
	gossipManager *GossipManager
}

// NewGossipHandler creates a new gossip HTTP handler
func NewGossipHandler(gm *GossipManager) *GossipHandler {
	return &GossipHandler{
		gossipManager: gm,
	}
}

// ReceiveGossip handles incoming gossip messages
func (gh *GossipHandler) ReceiveGossip(c *gin.Context) {
	var message GossipMessage
	
	if err := c.ShouldBindJSON(&message); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid gossip message format",
			"details": err.Error(),
		})
		return
	}

	// Process the gossip message
	err := gh.gossipManager.HandleGossipMessage(&message)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to process gossip message",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"message": "Gossip message processed",
	})
}

// GetClusterMembers returns current cluster membership
func (gh *GossipHandler) GetClusterMembers(c *gin.Context) {
	members := gh.gossipManager.GetClusterMembers()
	
	c.JSON(http.StatusOK, gin.H{
		"cluster_members": members,
		"total_members": len(members),
		"alive_members": len(gh.gossipManager.GetAliveNodes()),
	})
}

// GetGossipStatus returns gossip protocol status
func (gh *GossipHandler) GetGossipStatus(c *gin.Context) {
	gh.gossipManager.mu.RLock()
	defer gh.gossipManager.mu.RUnlock()

	aliveCount := 0
	suspectedCount := 0
	deadCount := 0
	
	for _, peer := range gh.gossipManager.peers {
		switch peer.Status {
		case "alive":
			aliveCount++
		case "suspected":
			suspectedCount++
		case "dead":
			deadCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"gossip_status": gin.H{
			"current_node": gh.gossipManager.currentNode.ID,
			"cluster_size": len(gh.gossipManager.peers),
			"alive_nodes": aliveCount,
			"suspected_nodes": suspectedCount,
			"dead_nodes": deadCount,
			"active_rumors": len(gh.gossipManager.rumors),
		},
		"config": gin.H{
			"gossip_interval": gh.gossipManager.config.GossipInterval.String(),
			"probe_interval": gh.gossipManager.config.ProbeInterval.String(),
			"suspicion_timeout": gh.gossipManager.config.SuspicionTimeout.String(),
		},
	})
}

// JoinCluster allows a node to explicitly join via gossip protocol
func (gh *GossipHandler) JoinCluster(c *gin.Context) {
	var req struct {
		NodeID  string `json:"node_id" binding:"required"`
		Address string `json:"address" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Add the node via gossip protocol
	gh.gossipManager.AddSeedNode(req.NodeID, req.Address)

	// Send a join message to the new node
	joinMessage := GossipMessage{
		Type:      "join",
		FromNode:  gh.gossipManager.currentNode.ID,
		ToNode:    req.NodeID,
		Timestamp: time.Now().Unix(),
		Data: map[string]interface{}{
			"node_id": gh.gossipManager.currentNode.ID,
			"address": gh.gossipManager.currentNode.Address,
		},
		MessageID: generateMessageID(),
	}

	// Send the join message
	go func() {
		url := fmt.Sprintf("http://%s/gossip/receive", req.Address)
		jsonData, _ := json.Marshal(joinMessage)
		
		resp, err := gh.gossipManager.httpClient.Post(url, "application/json", bytes.NewBuffer(jsonData))
		if err == nil {
			resp.Body.Close()
		}
	}()

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Node %s joining cluster via gossip", req.NodeID),
		"cluster_members": gh.gossipManager.GetClusterMembers(),
	})
}

// LeaveCluster allows a node to gracefully leave the cluster
func (gh *GossipHandler) LeaveCluster(c *gin.Context) {
	// Spread rumor about our departure
	gh.gossipManager.mu.Lock()
	gh.gossipManager.spreadRumor("node_leave", map[string]interface{}{
		"node_id": gh.gossipManager.currentNode.ID,
	})
	gh.gossipManager.mu.Unlock()

	// Send leave messages to all known peers
	members := gh.gossipManager.GetAliveNodes()
	for _, peer := range members {
		if peer.NodeID != gh.gossipManager.currentNode.ID {
			leaveMessage := GossipMessage{
				Type:      "leave",
				FromNode:  gh.gossipManager.currentNode.ID,
				ToNode:    peer.NodeID,
				Timestamp: time.Now().Unix(),
				Data: map[string]interface{}{
					"reason": "graceful_shutdown",
				},
				MessageID: generateMessageID(),
			}

			go func(p *PeerInfo) {
				url := fmt.Sprintf("http://%s/gossip/receive", p.Address)
				jsonData, _ := json.Marshal(leaveMessage)
				
				resp, err := gh.gossipManager.httpClient.Post(url, "application/json", bytes.NewBuffer(jsonData))
				if err == nil {
					resp.Body.Close()
				}
			}(peer)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Graceful leave initiated",
		"remaining_members": len(members) - 1,
	})
}

// GetRumors returns current active rumors
func (gh *GossipHandler) GetRumors(c *gin.Context) {
	gh.gossipManager.mu.RLock()
	defer gh.gossipManager.mu.RUnlock()

	rumors := make(map[string]interface{})
	for id, rumor := range gh.gossipManager.rumors {
		rumors[id] = gin.H{
			"type": rumor.Type,
			"data": rumor.Data,
			"origin": rumor.Origin,
			"timestamp": rumor.Timestamp,
			"spread_count": rumor.SpreadCount,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"rumors": rumors,
		"total_rumors": len(rumors),
	})
}