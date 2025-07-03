package gossip

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// performProbeRound performs failure detection probing
func (gm *GossipManager) performProbeRound() {
	gm.mu.RLock()
	
	// Select a random alive node to probe
	var targetPeer *PeerInfo
	for nodeID, peer := range gm.peers {
		if nodeID != gm.currentNode.ID && peer.Status == "alive" {
			// Check if we haven't heard from this node recently
			if time.Since(peer.LastSeen) > gm.config.ProbeInterval {
				targetPeer = peer
				break
			}
		}
	}
	
	gm.mu.RUnlock()

	if targetPeer != nil {
		go gm.probeNode(targetPeer)
	}
}

// probeNode sends a probe message to a specific node
func (gm *GossipManager) probeNode(peer *PeerInfo) {
	fmt.Printf("🔍 Probing node %s for failure detection\n", peer.NodeID)

	message := GossipMessage{
		Type:      "probe",
		FromNode:  gm.currentNode.ID,
		ToNode:    peer.NodeID,
		Timestamp: time.Now().Unix(),
		Data: map[string]interface{}{
			"probe_id": generateMessageID(),
		},
		MessageID: generateMessageID(),
	}

	url := fmt.Sprintf("http://%s/gossip/receive", peer.Address)
	
	jsonData, err := json.Marshal(message)
	if err != nil {
		fmt.Printf("❌ Failed to marshal probe message for %s: %v\n", peer.NodeID, err)
		gm.handleProbeFailure(peer.NodeID)
		return
	}

	resp, err := gm.httpClient.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Printf("❌ Probe failed for %s: %v\n", peer.NodeID, err)
		gm.handleProbeFailure(peer.NodeID)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Printf("❌ Probe to %s failed with status %d\n", peer.NodeID, resp.StatusCode)
		gm.handleProbeFailure(peer.NodeID)
		return
	}

	fmt.Printf("✅ Probe response received from %s\n", peer.NodeID)
	
	// Update last seen time for successful probe
	gm.mu.Lock()
	if peerInfo, exists := gm.peers[peer.NodeID]; exists {
		peerInfo.LastSeen = time.Now()
		if peerInfo.Status == "suspected" {
			peerInfo.Status = "alive"
			fmt.Printf("💚 Node %s recovered from suspicion\n", peer.NodeID)
		}
	}
	gm.mu.Unlock()
}

// handleProbeMessage processes incoming probe messages
func (gm *GossipManager) handleProbeMessage(message *GossipMessage) error {
	fmt.Printf("🔍 Received probe from %s\n", message.FromNode)

	// Send probe response
	response := GossipMessage{
		Type:      "probe_response",
		FromNode:  gm.currentNode.ID,
		ToNode:    message.FromNode,
		Timestamp: time.Now().Unix(),
		Data: map[string]interface{}{
			"probe_id":    message.Data["probe_id"],
			"response_id": generateMessageID(),
		},
		MessageID: generateMessageID(),
	}

	// Find the sender's address
	gm.mu.RLock()
	senderPeer, exists := gm.peers[message.FromNode]
	gm.mu.RUnlock()

	if !exists {
		return fmt.Errorf("unknown sender: %s", message.FromNode)
	}

	go gm.sendProbeResponse(senderPeer, &response)
	return nil
}

// sendProbeResponse sends a probe response
func (gm *GossipManager) sendProbeResponse(peer *PeerInfo, response *GossipMessage) {
	url := fmt.Sprintf("http://%s/gossip/receive", peer.Address)
	
	jsonData, err := json.Marshal(response)
	if err != nil {
		fmt.Printf("❌ Failed to marshal probe response for %s: %v\n", peer.NodeID, err)
		return
	}

	resp, err := gm.httpClient.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Printf("❌ Failed to send probe response to %s: %v\n", peer.NodeID, err)
		return
	}
	defer resp.Body.Close()

	fmt.Printf("📤 Probe response sent to %s\n", peer.NodeID)
}

// handleProbeResponse processes probe responses
func (gm *GossipManager) handleProbeResponse(message *GossipMessage) error {
	fmt.Printf("📨 Received probe response from %s\n", message.FromNode)

	gm.mu.Lock()
	defer gm.mu.Unlock()

	// Update the sender's status
	if peer, exists := gm.peers[message.FromNode]; exists {
		peer.LastSeen = time.Now()
		if peer.Status == "suspected" {
			peer.Status = "alive"
			fmt.Printf("💚 Node %s recovered from suspicion via probe response\n", message.FromNode)
		}
	}

	return nil
}

// handleProbeFailure handles failed probe attempts
func (gm *GossipManager) handleProbeFailure(nodeID string) {
	gm.mu.Lock()
	defer gm.mu.Unlock()

	if peer, exists := gm.peers[nodeID]; exists {
		if peer.Status == "alive" {
			peer.Status = "suspected"
			fmt.Printf("🤔 Node %s marked as suspected due to probe failure\n", nodeID)
			
			// Start indirect probing before marking as dead
			go gm.indirectProbe(nodeID)
		}
	}
}

// indirectProbe attempts to probe a suspected node through other nodes
func (gm *GossipManager) indirectProbe(targetNodeID string) {
	fmt.Printf("🔄 Starting indirect probe for suspected node %s\n", targetNodeID)

	gm.mu.RLock()
	
	// Find other alive nodes to help with indirect probing
	var helperNodes []*PeerInfo
	for nodeID, peer := range gm.peers {
		if nodeID != gm.currentNode.ID && nodeID != targetNodeID && peer.Status == "alive" {
			helperNodes = append(helperNodes, peer)
		}
	}
	
	targetPeer := gm.peers[targetNodeID]
	gm.mu.RUnlock()

	if len(helperNodes) == 0 || targetPeer == nil {
		// No helper nodes available, proceed to suspicion timeout
		go gm.handleSuspectedNode(targetNodeID)
		return
	}

	// Try indirect probe through up to 3 helper nodes
	successChan := make(chan bool, len(helperNodes))
	
	maxHelpers := 3
	if len(helperNodes) < maxHelpers {
		maxHelpers = len(helperNodes)
	}

	for i := 0; i < maxHelpers; i++ {
		go gm.requestIndirectProbe(helperNodes[i], targetPeer, successChan)
	}

	// Wait for responses or timeout
	timeout := time.After(gm.config.ProbeTimeout * 2)
	responses := 0

	for responses < maxHelpers {
		select {
		case success := <-successChan:
			responses++
			if success {
				fmt.Printf("✅ Indirect probe successful for %s\n", targetNodeID)
				
				gm.mu.Lock()
				if peer, exists := gm.peers[targetNodeID]; exists && peer.Status == "suspected" {
					peer.Status = "alive"
					peer.LastSeen = time.Now()
					fmt.Printf("💚 Node %s recovered via indirect probe\n", targetNodeID)
				}
				gm.mu.Unlock()
				return
			}
		case <-timeout:
			fmt.Printf("⏰ Indirect probe timeout for %s\n", targetNodeID)
			go gm.handleSuspectedNode(targetNodeID)
			return
		}
	}

	// All indirect probes failed
	fmt.Printf("❌ All indirect probes failed for %s\n", targetNodeID)
	go gm.handleSuspectedNode(targetNodeID)
}

// requestIndirectProbe requests another node to probe a suspected node
func (gm *GossipManager) requestIndirectProbe(helper *PeerInfo, target *PeerInfo, result chan bool) {
	message := GossipMessage{
		Type:      "indirect_probe_request",
		FromNode:  gm.currentNode.ID,
		ToNode:    helper.NodeID,
		Timestamp: time.Now().Unix(),
		Data: map[string]interface{}{
			"target_node_id": target.NodeID,
			"target_address": target.Address,
			"request_id":     generateMessageID(),
		},
		MessageID: generateMessageID(),
	}

	url := fmt.Sprintf("http://%s/gossip/receive", helper.Address)
	
	jsonData, err := json.Marshal(message)
	if err != nil {
		result <- false
		return
	}

	resp, err := gm.httpClient.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		result <- false
		return
	}
	defer resp.Body.Close()

	result <- resp.StatusCode == http.StatusOK
}

// cleanupOldRumors removes old rumors that have been spread enough
func (gm *GossipManager) cleanupOldRumors() {
	gm.mu.Lock()
	defer gm.mu.Unlock()

	now := time.Now().Unix()
	for rumorID, rumor := range gm.rumors {
		// Remove rumors older than 5 minutes or that have been spread enough
		if now-rumor.Timestamp > 300 || rumor.SpreadCount >= rumor.MaxSpread {
			delete(gm.rumors, rumorID)
			fmt.Printf("🧹 Cleaned up old rumor: %s\n", rumorID)
		}
	}
}