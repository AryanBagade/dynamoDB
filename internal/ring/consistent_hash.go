package ring

import (
	"crypto/sha256"
	"fmt"
	"sort"
	"sync"

	"dynamodb/internal/node"
)

// VirtualNode represents a virtual node on the hash ring
type VirtualNode struct {
	Hash   uint32
	NodeID string
}

// ConsistentHashRing implements consistent hashing with virtual nodes
type ConsistentHashRing struct {
	mu           sync.RWMutex
	virtualNodes []VirtualNode
	nodes        map[string]*node.Node
	replicas     int // Number of virtual nodes per physical node
}

// NewConsistentHashRing creates a new consistent hash ring
func NewConsistentHashRing() *ConsistentHashRing {
	return &ConsistentHashRing{
		virtualNodes: make([]VirtualNode, 0),
		nodes:        make(map[string]*node.Node),
		replicas:     150, // Each physical node gets 150 virtual nodes
	}
}

// AddNode adds a physical node to the ring
func (chr *ConsistentHashRing) AddNode(n *node.Node) {
	chr.mu.Lock()
	defer chr.mu.Unlock()

	// Check if node already exists
	if _, exists := chr.nodes[n.ID]; exists {
		fmt.Printf("⚠️  Node %s already exists in ring, skipping duplicate add\n", n.ID)
		return
	}

	chr.nodes[n.ID] = n

	// Add virtual nodes for this physical node
	for i := 0; i < chr.replicas; i++ {
		virtualKey := fmt.Sprintf("%s:%d", n.ID, i)
		hash := chr.hash(virtualKey)

		virtualNode := VirtualNode{
			Hash:   hash,
			NodeID: n.ID,
		}

		chr.virtualNodes = append(chr.virtualNodes, virtualNode)
	}

	// Keep virtual nodes sorted by hash
	sort.Slice(chr.virtualNodes, func(i, j int) bool {
		return chr.virtualNodes[i].Hash < chr.virtualNodes[j].Hash
	})

	fmt.Printf("✅ Added node %s with %d virtual nodes\n", n.ID, chr.replicas)
}

// RemoveNode removes a physical node from the ring
func (chr *ConsistentHashRing) RemoveNode(nodeID string) {
	chr.mu.Lock()
	defer chr.mu.Unlock()

	delete(chr.nodes, nodeID)

	// Remove all virtual nodes for this physical node
	newVirtualNodes := make([]VirtualNode, 0)
	for _, vn := range chr.virtualNodes {
		if vn.NodeID != nodeID {
			newVirtualNodes = append(newVirtualNodes, vn)
		}
	}
	chr.virtualNodes = newVirtualNodes

	fmt.Printf("❌ Removed node %s\n", nodeID)
}

// GetNodeForKey returns the primary node responsible for a key
func (chr *ConsistentHashRing) GetNodeForKey(key string) *node.Node {
	chr.mu.RLock()
	defer chr.mu.RUnlock()

	if len(chr.virtualNodes) == 0 {
		return nil
	}

	hash := chr.hash(key)

	// Find the first virtual node with hash >= key hash (clockwise)
	idx := sort.Search(len(chr.virtualNodes), func(i int) bool {
		return chr.virtualNodes[i].Hash >= hash
	})

	// If we went past the end, wrap around to the beginning
	if idx == len(chr.virtualNodes) {
		idx = 0
	}

	virtualNode := chr.virtualNodes[idx]
	return chr.nodes[virtualNode.NodeID]
}

// GetNodesForKey returns N nodes for replication (including primary)
func (chr *ConsistentHashRing) GetNodesForKey(key string, replicationFactor int) []*node.Node {
	chr.mu.RLock()
	defer chr.mu.RUnlock()

	if len(chr.virtualNodes) == 0 {
		return nil
	}

	hash := chr.hash(key)
	nodes := make([]*node.Node, 0, replicationFactor)
	seenNodes := make(map[string]bool)

	// Find starting position
	idx := sort.Search(len(chr.virtualNodes), func(i int) bool {
		return chr.virtualNodes[i].Hash >= hash
	})

	// Walk clockwise around the ring until we have enough unique nodes
	for len(nodes) < replicationFactor && len(seenNodes) < len(chr.nodes) {
		if idx >= len(chr.virtualNodes) {
			idx = 0 // Wrap around
		}

		virtualNode := chr.virtualNodes[idx]
		if !seenNodes[virtualNode.NodeID] {
			nodes = append(nodes, chr.nodes[virtualNode.NodeID])
			seenNodes[virtualNode.NodeID] = true
		}

		idx++
	}

	return nodes
}

// GetAllNodes returns all physical nodes in the ring
func (chr *ConsistentHashRing) GetAllNodes() []*node.Node {
	chr.mu.RLock()
	defer chr.mu.RUnlock()

	nodes := make([]*node.Node, 0, len(chr.nodes))
	for _, n := range chr.nodes {
		nodes = append(nodes, n)
	}
	return nodes
}

// GetNode returns a specific node by ID
func (chr *ConsistentHashRing) GetNode(nodeID string) *node.Node {
	chr.mu.RLock()
	defer chr.mu.RUnlock()

	return chr.nodes[nodeID]
}

// GetRingInfo returns information about the current ring state
func (chr *ConsistentHashRing) GetRingInfo() map[string]interface{} {
	chr.mu.RLock()
	defer chr.mu.RUnlock()

	virtualNodeInfo := make([]map[string]interface{}, len(chr.virtualNodes))
	for i, vn := range chr.virtualNodes {
		virtualNodeInfo[i] = map[string]interface{}{
			"hash":    vn.Hash,
			"node_id": vn.NodeID,
		}
	}

	return map[string]interface{}{
		"physical_nodes": len(chr.nodes),
		"virtual_nodes":  len(chr.virtualNodes),
		"replicas":       chr.replicas,
		"ring":           virtualNodeInfo,
	}
}

// hash function using SHA-256, truncated to 32 bits
func (chr *ConsistentHashRing) hash(key string) uint32 {
	h := sha256.Sum256([]byte(key))
	// Use first 4 bytes as uint32
	return uint32(h[0])<<24 | uint32(h[1])<<16 | uint32(h[2])<<8 | uint32(h[3])
}
