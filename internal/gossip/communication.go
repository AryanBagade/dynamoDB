package gossip

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// sendGossip sends gossip message to a peer
func (gm *GossipManager) sendGossip(peer *PeerInfo, data map[string]interface{}) {
	message := GossipMessage{
		Type:      "heartbeat",
		FromNode:  gm.currentNode.ID,
		ToNode:    peer.NodeID,
		Timestamp: time.Now().Unix(),
		Data:      data,
		MessageID: generateMessageID(),
	}

	url := fmt.Sprintf("http://%s/gossip/receive", peer.Address)
	
	jsonData, err := json.Marshal(message)
	if err != nil {
		fmt.Printf("❌ Failed to marshal gossip message for %s: %v\n", peer.NodeID, err)
		return
	}

	resp, err := gm.httpClient.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Printf("❌ Failed to send gossip to %s: %v\n", peer.NodeID, err)
		gm.handleGossipFailure(peer.NodeID)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Printf("❌ Gossip to %s failed with status %d\n", peer.NodeID, resp.StatusCode)
		gm.handleGossipFailure(peer.NodeID)
		return
	}

	fmt.Printf("🗣️ Gossip sent to %s successfully\n", peer.NodeID)
}

// HandleGossipMessage processes incoming gossip messages
func (gm *GossipManager) HandleGossipMessage(message *GossipMessage) error {
	gm.mu.Lock()
	defer gm.mu.Unlock()

	fmt.Printf("📨 Received gossip from %s (type: %s)\n", message.FromNode, message.Type)

	switch message.Type {
	case "heartbeat":
		return gm.handleHeartbeat(message)
	case "join":
		return gm.handleJoinMessage(message)
	case "leave":
		return gm.handleLeaveMessage(message)
	case "probe":
		return gm.handleProbeMessage(message)
	case "probe_response":
		return gm.handleProbeResponse(message)
	default:
		fmt.Printf("⚠️ Unknown gossip message type: %s\n", message.Type)
		return fmt.Errorf("unknown message type: %s", message.Type)
	}
}

// handleHeartbeat processes heartbeat messages containing peer information
func (gm *GossipManager) handleHeartbeat(message *GossipMessage) error {
	// Extract peer information from the message
	if peersData, ok := message.Data["peers"]; ok {
		if peersMap, ok := peersData.(map[string]interface{}); ok {
			for nodeID, peerData := range peersMap {
				gm.updatePeerInfo(nodeID, peerData)
			}
		}
	}

	// Extract and process rumors
	if rumorsData, ok := message.Data["rumors"]; ok {
		if rumorsMap, ok := rumorsData.(map[string]interface{}); ok {
			for rumorID, rumorData := range rumorsMap {
				gm.processRumor(rumorID, rumorData)
			}
		}
	}

	// Update the sender's last seen time and ensure they're marked as alive
	if peer, exists := gm.peers[message.FromNode]; exists {
		peer.LastSeen = time.Now()
		wasAlive := peer.Status == "alive"
		
		// Always mark a communicating node as alive
		if peer.Status != "alive" {
			fmt.Printf("💚 Node %s is communicating - marking as alive\n", message.FromNode)
			peer.Status = "alive"
			
			// Trigger join callback for any node that becomes alive (recovered or newly active)
			if gm.onNodeJoin != nil && message.FromNode != gm.currentNode.ID {
				fmt.Printf("🔄 Triggering join callback for active node %s\n", message.FromNode)
				gm.onNodeJoin(message.FromNode, peer.Address)
			}
		} else if !wasAlive {
			// Node was not alive before, now it is - trigger callback
			if gm.onNodeJoin != nil && message.FromNode != gm.currentNode.ID {
				fmt.Printf("🔄 Triggering join callback for newly active node %s\n", message.FromNode)
				gm.onNodeJoin(message.FromNode, peer.Address)
			}
		}
	}

	return nil
}

// updatePeerInfo updates or adds peer information
func (gm *GossipManager) updatePeerInfo(nodeID string, peerData interface{}) {
	peerMap, ok := peerData.(map[string]interface{})
	if !ok {
		return
	}

	// Convert the peer data
	var peerInfo PeerInfo
	jsonData, _ := json.Marshal(peerMap)
	json.Unmarshal(jsonData, &peerInfo)

	existingPeer, exists := gm.peers[nodeID]
	
	if !exists {
		// New peer discovered
		gm.peers[nodeID] = &peerInfo
		fmt.Printf("🆕 Discovered new peer: %s (%s)\n", nodeID, peerInfo.Address)
		
		if gm.onNodeJoin != nil && nodeID != gm.currentNode.ID {
			fmt.Printf("🔄 Triggering join callback for newly discovered node %s\n", nodeID)
			gm.onNodeJoin(nodeID, peerInfo.Address)
		}
	} else {
		// Update existing peer if the information is newer
		if peerInfo.HeartbeatSeq > existingPeer.HeartbeatSeq ||
		   peerInfo.Incarnation > existingPeer.Incarnation {
			
			// Only update heartbeat and timestamp, don't override status for active peers
			existingPeer.HeartbeatSeq = peerInfo.HeartbeatSeq
			existingPeer.LastSeen = time.Now()
			
			// Only change status if we're receiving explicit status changes or if node was dead and now communicating
			if existingPeer.Status == "dead" && peerInfo.Status == "alive" {
				fmt.Printf("💚 Node %s recovered: dead -> alive\n", nodeID)
				existingPeer.Status = "alive"
				
				// Trigger the join callback for recovered nodes
				if gm.onNodeJoin != nil && nodeID != gm.currentNode.ID {
					fmt.Printf("🔄 Triggering join callback for recovered node %s\n", nodeID)
					gm.onNodeJoin(nodeID, existingPeer.Address)
				}
			}
		}
	}
}

// processRumor processes incoming rumors
func (gm *GossipManager) processRumor(rumorID string, rumorData interface{}) {
	rumorMap, ok := rumorData.(map[string]interface{})
	if !ok {
		return
	}

	var rumor Rumor
	jsonData, _ := json.Marshal(rumorMap)
	json.Unmarshal(jsonData, &rumor)

	existingRumor, exists := gm.rumors[rumorID]
	
	if !exists {
		// New rumor - add it and prepare to spread
		gm.rumors[rumorID] = &rumor
		fmt.Printf("📢 New rumor received: %s (type: %s)\n", rumorID, rumor.Type)
		
		// Process the rumor based on its type
		gm.processRumorContent(&rumor)
	} else if rumor.Timestamp > existingRumor.Timestamp {
		// Update with newer information
		*existingRumor = rumor
		fmt.Printf("🔄 Rumor updated: %s\n", rumorID)
	}
}

// processRumorContent processes the content of a rumor
func (gm *GossipManager) processRumorContent(rumor *Rumor) {
	switch rumor.Type {
	case "node_join":
		if nodeID, ok := rumor.Data["node_id"].(string); ok {
			if address, ok := rumor.Data["address"].(string); ok {
				fmt.Printf("📢 Rumor: Node %s joined at %s\n", nodeID, address)
			}
		}
	case "node_leave":
		if nodeID, ok := rumor.Data["node_id"].(string); ok {
			fmt.Printf("📢 Rumor: Node %s left the cluster\n", nodeID)
		}
	case "node_failure":
		if nodeID, ok := rumor.Data["node_id"].(string); ok {
			fmt.Printf("📢 Rumor: Node %s failed\n", nodeID)
			gm.markNodeAsSuspected(nodeID)
		}
	}
}

// handleJoinMessage processes explicit join messages
func (gm *GossipManager) handleJoinMessage(message *GossipMessage) error {
	nodeID := message.FromNode
	
	if address, ok := message.Data["address"].(string); ok {
		fmt.Printf("🤝 Node %s requesting to join cluster\n", nodeID)
		
		// Add the node to our peer list
		gm.peers[nodeID] = &PeerInfo{
			NodeID:       nodeID,
			Address:      address,
			Status:       "alive",
			LastSeen:     time.Now(),
			HeartbeatSeq: 0,
			Incarnation:  time.Now().Unix(),
		}

		// Spread the rumor about this new node
		gm.spreadRumor("node_join", map[string]interface{}{
			"node_id": nodeID,
			"address": address,
		})

		if gm.onNodeJoin != nil {
			gm.onNodeJoin(nodeID, address)
		}
	}

	return nil
}

// handleLeaveMessage processes explicit leave messages
func (gm *GossipManager) handleLeaveMessage(message *GossipMessage) error {
	nodeID := message.FromNode
	
	fmt.Printf("👋 Node %s leaving cluster\n", nodeID)
	
	if peer, exists := gm.peers[nodeID]; exists {
		peer.Status = "dead"
		
		// Spread the rumor about this node leaving
		gm.spreadRumor("node_leave", map[string]interface{}{
			"node_id": nodeID,
		})

		if gm.onNodeLeave != nil {
			gm.onNodeLeave(nodeID)
		}
	}

	return nil
}

// handleGossipFailure handles failed gossip attempts
func (gm *GossipManager) handleGossipFailure(nodeID string) {
	gm.mu.Lock()
	defer gm.mu.Unlock()

	if peer, exists := gm.peers[nodeID]; exists {
		if peer.Status == "alive" {
			peer.Status = "suspected"
			fmt.Printf("🤔 Node %s marked as suspected due to gossip failure\n", nodeID)
			
			// Start suspicion timer
			go gm.handleSuspectedNode(nodeID)
		}
	}
}

// handleSuspectedNode handles the suspicion timeout for a node
func (gm *GossipManager) handleSuspectedNode(nodeID string) {
	time.Sleep(gm.config.SuspicionTimeout)
	
	gm.mu.Lock()
	defer gm.mu.Unlock()

	if peer, exists := gm.peers[nodeID]; exists && peer.Status == "suspected" {
		peer.Status = "dead"
		fmt.Printf("💀 Node %s marked as dead after suspicion timeout\n", nodeID)
		
		// Spread rumor about node failure
		gm.spreadRumor("node_failure", map[string]interface{}{
			"node_id": nodeID,
		})

		if gm.onNodeFail != nil {
			gm.onNodeFail(nodeID)
		}
	}
}

// markNodeAsSuspected marks a node as suspected
func (gm *GossipManager) markNodeAsSuspected(nodeID string) {
	if peer, exists := gm.peers[nodeID]; exists && peer.Status == "alive" {
		peer.Status = "suspected"
		fmt.Printf("🤔 Node %s marked as suspected\n", nodeID)
		
		go gm.handleSuspectedNode(nodeID)
	}
}

// spreadRumor creates and spreads a rumor through the cluster
func (gm *GossipManager) spreadRumor(rumorType string, data map[string]interface{}) {
	rumorID := fmt.Sprintf("%s-%s-%d", gm.currentNode.ID, rumorType, time.Now().UnixNano())
	
	rumor := &Rumor{
		ID:          rumorID,
		Type:        rumorType,
		Data:        data,
		Timestamp:   time.Now().Unix(),
		Origin:      gm.currentNode.ID,
		SpreadCount: 0,
		MaxSpread:   gm.config.RumorSpreadLimit,
	}

	gm.rumors[rumorID] = rumor
	fmt.Printf("📢 Created rumor: %s (type: %s)\n", rumorID, rumorType)
}