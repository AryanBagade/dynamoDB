package node

import (
	"sync"
	"time"

	"github.com/google/uuid"
)

// NodeStatus represents the current status of a node
type NodeStatus int

const (
	StatusAlive NodeStatus = iota
	StatusSuspected
	StatusFailed
)

func (s NodeStatus) String() string {
	switch s {
	case StatusAlive:
		return "alive"
	case StatusSuspected:
		return "suspected"
	case StatusFailed:
		return "failed"
	default:
		return "unknown"
	}
}

// Node represents a single node in the distributed system
type Node struct {
	ID          string
	Address     string
	Port        string
	Status      NodeStatus
	LastSeen    time.Time
	StartTime   time.Time
	
	// For failure detection
	HeartbeatCount uint64
	SuspicionTime  time.Time
	
	mu sync.RWMutex
}

// NewNode creates a new node with the given ID and address
func NewNode(id, address string) *Node {
	if id == "" {
		id = uuid.New().String()
	}
	
	return &Node{
		ID:        id,
		Address:   address,
		Status:    StatusAlive,
		LastSeen:  time.Now(),
		StartTime: time.Now(),
	}
}

// UpdateHeartbeat updates the node's heartbeat information
func (n *Node) UpdateHeartbeat() {
	n.mu.Lock()
	defer n.mu.Unlock()
	
	n.HeartbeatCount++
	n.LastSeen = time.Now()
	
	// If node was suspected, mark as alive again
	if n.Status == StatusSuspected {
		n.Status = StatusAlive
	}
}

// MarkSuspected marks the node as suspected of failure
func (n *Node) MarkSuspected() {
	n.mu.Lock()
	defer n.mu.Unlock()
	
	if n.Status == StatusAlive {
		n.Status = StatusSuspected
		n.SuspicionTime = time.Now()
	}
}

// MarkFailed marks the node as failed
func (n *Node) MarkFailed() {
	n.mu.Lock()
	defer n.mu.Unlock()
	
	n.Status = StatusFailed
}

// MarkAlive marks the node as alive
func (n *Node) MarkAlive() {
	n.mu.Lock()
	defer n.mu.Unlock()
	
	n.Status = StatusAlive
	n.LastSeen = time.Now()
}

// GetStatus returns the current status of the node
func (n *Node) GetStatus() NodeStatus {
	n.mu.RLock()
	defer n.mu.RUnlock()
	return n.Status
}

// GetInfo returns information about the node
func (n *Node) GetInfo() map[string]interface{} {
	n.mu.RLock()
	defer n.mu.RUnlock()
	
	return map[string]interface{}{
		"id":              n.ID,
		"address":         n.Address,
		"status":          n.Status.String(),
		"last_seen":       n.LastSeen.Unix(),
		"start_time":      n.StartTime.Unix(),
		"heartbeat_count": n.HeartbeatCount,
		"uptime_seconds":  time.Since(n.StartTime).Seconds(),
	}
}

// IsHealthy returns true if the node is considered healthy
func (n *Node) IsHealthy() bool {
	n.mu.RLock()
	defer n.mu.RUnlock()
	
	return n.Status == StatusAlive
}

// GetLastSeenDuration returns how long ago this node was last seen
func (n *Node) GetLastSeenDuration() time.Duration {
	n.mu.RLock()
	defer n.mu.RUnlock()
	
	return time.Since(n.LastSeen)
} 