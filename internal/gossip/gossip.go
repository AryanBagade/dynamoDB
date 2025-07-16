package gossip

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"sync"
	"time"

	"dynamodb/internal/node"
)

// GossipMessage represents different types of gossip messages
type GossipMessage struct {
	Type        string                 `json:"type"`        // "join", "leave", "heartbeat", "rumor"
	FromNode    string                 `json:"from_node"`   // Sender node ID
	ToNode      string                 `json:"to_node"`     // Target node ID (if specific)
	Timestamp   int64                  `json:"timestamp"`   // Message timestamp
	Data        map[string]interface{} `json:"data"`        // Message payload
	TTL         int                    `json:"ttl"`         // Time to live for rumor propagation
	MessageID   string                 `json:"message_id"`  // Unique message identifier
}

// PeerInfo represents information about a cluster member
type PeerInfo struct {
	NodeID       string    `json:"node_id"`
	Address      string    `json:"address"`
	Status       string    `json:"status"`        // "alive", "suspected", "dead"
	LastSeen     time.Time `json:"last_seen"`
	HeartbeatSeq int64     `json:"heartbeat_seq"` // Heartbeat sequence number
	Incarnation  int64     `json:"incarnation"`   // Node incarnation number
}

// Rumor represents a piece of information being spread through the cluster
type Rumor struct {
	ID          string                 `json:"id"`
	Type        string                 `json:"type"`     // "node_join", "node_leave", "node_failure"
	Data        map[string]interface{} `json:"data"`
	Timestamp   int64                  `json:"timestamp"`
	Origin      string                 `json:"origin"`
	SpreadCount int                    `json:"spread_count"`
	MaxSpread   int                    `json:"max_spread"`
}

// GossipConfig holds configuration for the gossip protocol
type GossipConfig struct {
	GossipInterval    time.Duration // How often to gossip
	ProbeInterval     time.Duration // How often to probe nodes
	ProbeTimeout      time.Duration // Timeout for probe responses
	SuspicionTimeout  time.Duration // How long to wait before marking suspected nodes as dead
	GossipNodes       int           // Number of nodes to gossip to each round
	RumorTTL          int           // Maximum TTL for rumors
	RumorSpreadLimit  int           // Maximum times to spread a rumor
}

// DefaultGossipConfig returns sensible defaults for gossip protocol
func DefaultGossipConfig() *GossipConfig {
	return &GossipConfig{
		GossipInterval:    1 * time.Second,
		ProbeInterval:     3 * time.Second,
		ProbeTimeout:      1 * time.Second,
		SuspicionTimeout:  5 * time.Second,
		GossipNodes:       3,
		RumorTTL:          10,
		RumorSpreadLimit:  5,
	}
}

// GossipManager manages the gossip protocol for cluster membership
type GossipManager struct {
	mu           sync.RWMutex
	config       *GossipConfig
	currentNode  *node.Node
	peers        map[string]*PeerInfo
	rumors       map[string]*Rumor
	httpClient   *http.Client
	ctx          context.Context
	cancel       context.CancelFunc
	
	// Callbacks
	onNodeJoin   func(nodeID, address string)
	onNodeLeave  func(nodeID string)
	onNodeFail   func(nodeID string)
}

// NewGossipManager creates a new gossip manager
func NewGossipManager(currentNode *node.Node, config *GossipConfig) *GossipManager {
	if config == nil {
		config = DefaultGossipConfig()
	}

	ctx, cancel := context.WithCancel(context.Background())

	gm := &GossipManager{
		config:      config,
		currentNode: currentNode,
		peers:       make(map[string]*PeerInfo),
		rumors:      make(map[string]*Rumor),
		httpClient: &http.Client{
			Timeout: config.ProbeTimeout,
		},
		ctx:    ctx,
		cancel: cancel,
	}

	// Add ourselves to the peer list
	gm.peers[currentNode.ID] = &PeerInfo{
		NodeID:       currentNode.ID,
		Address:      currentNode.Address,
		Status:       "alive",
		LastSeen:     time.Now(),
		HeartbeatSeq: 0,
		Incarnation:  time.Now().Unix(),
	}

	return gm
}

// Start begins the gossip protocol
func (gm *GossipManager) Start() {
	fmt.Printf("🗣️ Starting gossip protocol for node %s\n", gm.currentNode.ID)
	
	// Start gossip routine
	go gm.gossipRoutine()
	
	// Start probe routine
	go gm.probeRoutine()
	
	// Start rumor cleanup routine
	go gm.rumorCleanupRoutine()
	
	// Start self-maintenance routine
	go gm.selfMaintenanceRoutine()
	
	fmt.Printf("✅ Gossip protocol started\n")
}

// Stop shuts down the gossip protocol
func (gm *GossipManager) Stop() {
	fmt.Printf("🛑 Stopping gossip protocol for node %s\n", gm.currentNode.ID)
	gm.cancel()
}

// AddSeedNode adds a seed node for initial cluster discovery
func (gm *GossipManager) AddSeedNode(nodeID, address string) {
	if nodeID == gm.currentNode.ID {
		return // Don't add ourselves
	}

	fmt.Printf("🌱 Adding seed node: %s (%s)\n", nodeID, address)
	
	// First, actively discover the seed node's current state
	go gm.performSeedNodeDiscovery(nodeID, address)
}

// SetCallbacks sets the callback functions for node events
func (gm *GossipManager) SetCallbacks(onJoin func(string, string), onLeave, onFail func(string)) {
	gm.onNodeJoin = onJoin
	gm.onNodeLeave = onLeave
	gm.onNodeFail = onFail
}

// gossipRoutine runs the main gossip loop
func (gm *GossipManager) gossipRoutine() {
	ticker := time.NewTicker(gm.config.GossipInterval)
	defer ticker.Stop()

	for {
		select {
		case <-gm.ctx.Done():
			return
		case <-ticker.C:
			gm.performGossipRound()
		}
	}
}

// probeRoutine runs the failure detection probe loop
func (gm *GossipManager) probeRoutine() {
	ticker := time.NewTicker(gm.config.ProbeInterval)
	defer ticker.Stop()

	for {
		select {
		case <-gm.ctx.Done():
			return
		case <-ticker.C:
			gm.performProbeRound()
		}
	}
}

// rumorCleanupRoutine cleans up old rumors
func (gm *GossipManager) rumorCleanupRoutine() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-gm.ctx.Done():
			return
		case <-ticker.C:
			gm.cleanupOldRumors()
		}
	}
}

// performGossipRound performs one round of gossip
func (gm *GossipManager) performGossipRound() {
	gm.mu.RLock()
	
	// Select random peers to gossip with
	peers := gm.selectRandomPeers(gm.config.GossipNodes)
	
	// Prepare gossip payload
	gossipData := gm.prepareGossipData()
	
	gm.mu.RUnlock()

	// Send gossip to selected peers
	for _, peer := range peers {
		go gm.sendGossip(peer, gossipData)
	}
}

// selectRandomPeers selects random peers for gossip (excluding ourselves)
func (gm *GossipManager) selectRandomPeers(count int) []*PeerInfo {
	alivePeers := make([]*PeerInfo, 0)
	
	for nodeID, peer := range gm.peers {
		if nodeID != gm.currentNode.ID && peer.Status == "alive" {
			alivePeers = append(alivePeers, peer)
		}
	}

	if len(alivePeers) == 0 {
		return nil
	}

	// Shuffle and select up to 'count' peers
	selected := make([]*PeerInfo, 0, count)
	for i := 0; i < count && i < len(alivePeers); i++ {
		idx, _ := rand.Int(rand.Reader, big.NewInt(int64(len(alivePeers)-i)))
		selectedIdx := int(idx.Int64()) + i
		
		// Swap and select
		alivePeers[i], alivePeers[selectedIdx] = alivePeers[selectedIdx], alivePeers[i]
		selected = append(selected, alivePeers[i])
	}

	return selected
}

// prepareGossipData prepares the data to gossip
func (gm *GossipManager) prepareGossipData() map[string]interface{} {
	// Increment our heartbeat
	ourPeer := gm.peers[gm.currentNode.ID]
	if ourPeer != nil {
		ourPeer.HeartbeatSeq++
		ourPeer.LastSeen = time.Now()
	}

	// Create safe copies without nil pointers
	safePeers := make(map[string]*PeerInfo)
	for k, v := range gm.peers {
		if v != nil {
			peerCopy := *v
			safePeers[k] = &peerCopy
		}
	}

	safeRumors := make(map[string]*Rumor)
	for k, v := range gm.rumors {
		if v != nil {
			rumorCopy := *v
			safeRumors[k] = &rumorCopy
		}
	}

	data := map[string]interface{}{
		"peers":  safePeers,
		"rumors": safeRumors,
		"sender": gm.currentNode.ID,
	}

	return data
}

// GetClusterMembers returns current cluster members
func (gm *GossipManager) GetClusterMembers() map[string]*PeerInfo {
	gm.mu.RLock()
	defer gm.mu.RUnlock()

	// Create a copy to avoid race conditions
	members := make(map[string]*PeerInfo)
	for k, v := range gm.peers {
		memberCopy := *v
		members[k] = &memberCopy
	}

	return members
}

// GetAliveNodes returns only alive nodes
func (gm *GossipManager) GetAliveNodes() []*PeerInfo {
	gm.mu.RLock()
	defer gm.mu.RUnlock()

	alive := make([]*PeerInfo, 0)
	for _, peer := range gm.peers {
		if peer.Status == "alive" {
			peerCopy := *peer
			alive = append(alive, &peerCopy)
		}
	}

	return alive
}

// selfMaintenanceRoutine ensures the current node always sees itself as alive
func (gm *GossipManager) selfMaintenanceRoutine() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-gm.ctx.Done():
			return
		case <-ticker.C:
			gm.mu.Lock()
			if ourPeer, exists := gm.peers[gm.currentNode.ID]; exists {
				// Ensure we always see ourselves as alive
				if ourPeer.Status != "alive" {
					fmt.Printf("🔧 Self-maintenance: Correcting own status from %s to alive\n", ourPeer.Status)
					ourPeer.Status = "alive"
					ourPeer.LastSeen = time.Now()
				}
			}
			gm.mu.Unlock()
		}
	}
}

// performSeedNodeDiscovery actively discovers and exchanges state with a seed node
func (gm *GossipManager) performSeedNodeDiscovery(seedNodeID, seedAddress string) {
	fmt.Printf("🔍 Performing active discovery of seed node %s\n", seedNodeID)
	
	// Step 1: Send a discovery request to get the seed node's current state
	discoveryMessage := GossipMessage{
		Type:      "seed_discovery",
		FromNode:  gm.currentNode.ID,
		ToNode:    seedNodeID,
		Timestamp: time.Now().Unix(),
		Data: map[string]interface{}{
			"requester_address": gm.currentNode.Address,
			"discovery_id":      generateMessageID(),
		},
		MessageID: generateMessageID(),
	}
	
	response, err := gm.sendDiscoveryRequest(seedAddress, &discoveryMessage)
	if err != nil {
		fmt.Printf("❌ Seed discovery failed for %s: %v\n", seedNodeID, err)
		// Fallback to old behavior with zero incarnation
		gm.addSeedNodeFallback(seedNodeID, seedAddress)
		return
	}
	
	// Step 2: Process the discovery response and add the seed node with correct info
	gm.processSeedDiscoveryResponse(response)
	
	// Step 3: Send our own state to the seed node so it learns about us
	gm.introduceToSeedNode(seedNodeID, seedAddress)
}

// sendDiscoveryRequest sends a discovery request and waits for response
func (gm *GossipManager) sendDiscoveryRequest(address string, message *GossipMessage) (*GossipMessage, error) {
	url := fmt.Sprintf("http://%s/gossip/receive", address)
	
	jsonData, err := json.Marshal(message)
	if err != nil {
		return nil, err
	}
	
	// Use a longer timeout for discovery requests
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("discovery request failed with status %d", resp.StatusCode)
	}
	
	// For now, we'll rely on the gossip protocol to exchange state through regular heartbeats
	// The seed node will respond with its state in subsequent gossip messages
	return nil, nil
}

// processSeedDiscoveryResponse processes the response from seed node discovery
func (gm *GossipManager) processSeedDiscoveryResponse(response *GossipMessage) {
	if response == nil {
		return
	}
	// Discovery response will be handled through regular gossip message processing
}

// introduceToSeedNode sends our state to the seed node
func (gm *GossipManager) introduceToSeedNode(seedNodeID, seedAddress string) {
	fmt.Printf("🤝 Introducing ourselves to seed node %s\n", seedNodeID)
	
	// Send a join message to introduce ourselves
	joinMessage := GossipMessage{
		Type:      "join",
		FromNode:  gm.currentNode.ID,
		ToNode:    seedNodeID,
		Timestamp: time.Now().Unix(),
		Data: map[string]interface{}{
			"node_id": gm.currentNode.ID,
			"address": gm.currentNode.Address,
		},
		MessageID: generateMessageID(),
	}
	
	url := fmt.Sprintf("http://%s/gossip/receive", seedAddress)
	jsonData, _ := json.Marshal(joinMessage)
	
	resp, err := gm.httpClient.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Printf("❌ Failed to introduce to seed node %s: %v\n", seedNodeID, err)
		return
	}
	defer resp.Body.Close()
	
	fmt.Printf("✅ Successfully introduced to seed node %s\n", seedNodeID)
}

// addSeedNodeFallback adds a seed node with fallback behavior (zero incarnation)
func (gm *GossipManager) addSeedNodeFallback(nodeID, address string) {
	gm.mu.Lock()
	defer gm.mu.Unlock()
	
	fmt.Printf("⚠️ Using fallback method for seed node %s\n", nodeID)
	
	gm.peers[nodeID] = &PeerInfo{
		NodeID:       nodeID,
		Address:      address,
		Status:       "alive",
		LastSeen:     time.Now(),
		HeartbeatSeq: 0,
		Incarnation:  0, // Will be updated when we receive gossip from this node
	}
	
	// Trigger callback
	if gm.onNodeJoin != nil {
		fmt.Printf("🔄 Triggering join callback for seed node %s\n", nodeID)
		gm.onNodeJoin(nodeID, address)
	}
}

// generateMessageID generates a unique message ID
func generateMessageID() string {
	randNum, _ := rand.Int(rand.Reader, big.NewInt(1000000))
	return fmt.Sprintf("%d-%d", time.Now().UnixNano(), randNum.Int64())
}