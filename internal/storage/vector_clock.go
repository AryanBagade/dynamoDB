package storage

import (
	"encoding/json"
	"fmt"
	"sort"
	"time"
)

// VectorClock represents a logical clock for tracking causality in distributed systems
type VectorClock struct {
	Clocks map[string]int64 `json:"clocks"` // node_id -> logical timestamp
}

// Event represents a distributed system event with vector clock
type Event struct {
	ID          string       `json:"id"`
	Type        string       `json:"type"` // "put", "get", "delete"
	Key         string       `json:"key"`
	Value       string       `json:"value,omitempty"`
	NodeID      string       `json:"node_id"`
	VectorClock *VectorClock `json:"vector_clock"`
	Timestamp   int64        `json:"timestamp"`
	CausalHash  string       `json:"causal_hash"` // Hash of the event for causality
}

// EventLog tracks all events in the system with their vector clocks
type EventLog struct {
	Events  []*Event        `json:"events"`
	NodeID  string          `json:"node_id"`
	Current *VectorClock    `json:"current_clock"`
	Nodes   map[string]bool `json:"known_nodes"`
}

// NewVectorClock creates a new vector clock
func NewVectorClock() *VectorClock {
	return &VectorClock{
		Clocks: make(map[string]int64),
	}
}

// NewEventLog creates a new event log for a node
func NewEventLog(nodeID string) *EventLog {
	return &EventLog{
		Events:  make([]*Event, 0),
		NodeID:  nodeID,
		Current: NewVectorClock(),
		Nodes:   make(map[string]bool),
	}
}

// Tick increments the logical clock for the current node
func (vc *VectorClock) Tick(nodeID string) {
	if vc.Clocks == nil {
		vc.Clocks = make(map[string]int64)
	}
	vc.Clocks[nodeID]++
}

// Update merges another vector clock into this one (taking maximum of each component)
func (vc *VectorClock) Update(other *VectorClock) {
	if vc.Clocks == nil {
		vc.Clocks = make(map[string]int64)
	}

	for nodeID, timestamp := range other.Clocks {
		if current, exists := vc.Clocks[nodeID]; !exists || timestamp > current {
			vc.Clocks[nodeID] = timestamp
		}
	}
}

// Copy creates a deep copy of the vector clock
func (vc *VectorClock) Copy() *VectorClock {
	newVC := NewVectorClock()
	for nodeID, timestamp := range vc.Clocks {
		newVC.Clocks[nodeID] = timestamp
	}
	return newVC
}

// Compare compares two vector clocks and returns the relationship
type ClockRelation int

const (
	Concurrent ClockRelation = iota // Events happened concurrently (conflict!)
	Before                          // This clock happened before other
	After                           // This clock happened after other
	Equal                           // Clocks are identical
)

// Compare determines the causal relationship between two vector clocks
func (vc *VectorClock) Compare(other *VectorClock) ClockRelation {
	if vc.Equal(other) {
		return Equal
	}

	if vc.HappensBefore(other) {
		return Before
	}

	if other.HappensBefore(vc) {
		return After
	}

	return Concurrent // This is where conflicts occur!
}

// HappensBefore checks if this clock happened before another (vc <= other)
func (vc *VectorClock) HappensBefore(other *VectorClock) bool {
	allNodes := make(map[string]bool)
	for nodeID := range vc.Clocks {
		allNodes[nodeID] = true
	}
	for nodeID := range other.Clocks {
		allNodes[nodeID] = true
	}

	hasSmaller := false
	for nodeID := range allNodes {
		vcTime := vc.Clocks[nodeID]
		otherTime := other.Clocks[nodeID]

		if vcTime > otherTime {
			return false // Not happened before
		}
		if vcTime < otherTime {
			hasSmaller = true
		}
	}

	return hasSmaller
}

// Equal checks if two vector clocks are identical
func (vc *VectorClock) Equal(other *VectorClock) bool {
	allNodes := make(map[string]bool)
	for nodeID := range vc.Clocks {
		allNodes[nodeID] = true
	}
	for nodeID := range other.Clocks {
		allNodes[nodeID] = true
	}

	for nodeID := range allNodes {
		if vc.Clocks[nodeID] != other.Clocks[nodeID] {
			return false
		}
	}

	return true
}

// String returns a human-readable representation of the vector clock
func (vc *VectorClock) String() string {
	if len(vc.Clocks) == 0 {
		return "{}"
	}

	// Sort node IDs for consistent output
	nodeIDs := make([]string, 0, len(vc.Clocks))
	for nodeID := range vc.Clocks {
		nodeIDs = append(nodeIDs, nodeID)
	}
	sort.Strings(nodeIDs)

	result := "{"
	for i, nodeID := range nodeIDs {
		if i > 0 {
			result += ", "
		}
		result += fmt.Sprintf("%s: %d", nodeID, vc.Clocks[nodeID])
	}
	result += "}"

	return result
}

// AddEvent records a new event in the log with proper vector clock management
func (el *EventLog) AddEvent(eventType, key, value string) *Event {
	// Tick our own clock
	el.Current.Tick(el.NodeID)
	el.Nodes[el.NodeID] = true

	// Create event
	event := &Event{
		ID:          fmt.Sprintf("%s-%d-%d", el.NodeID, time.Now().UnixNano(), len(el.Events)),
		Type:        eventType,
		Key:         key,
		Value:       value,
		NodeID:      el.NodeID,
		VectorClock: el.Current.Copy(),
		Timestamp:   time.Now().Unix(),
		CausalHash:  computeEventHash(eventType, key, value, el.Current),
	}

	el.Events = append(el.Events, event)

	fmt.Printf("📅 Event logged: %s %s [%s] at %s\n",
		eventType, key, el.Current.String(), event.ID)

	return event
}

// MergeEventLog merges events from another node's log
func (el *EventLog) MergeEventLog(other *EventLog) {
	// Update our vector clock with the other node's clock
	el.Current.Update(other.Current)

	// Add the other node to our known nodes
	for nodeID := range other.Nodes {
		el.Nodes[nodeID] = true
	}

	// Merge events (avoiding duplicates)
	existingEvents := make(map[string]bool)
	for _, event := range el.Events {
		existingEvents[event.ID] = true
	}

	for _, event := range other.Events {
		if !existingEvents[event.ID] {
			el.Events = append(el.Events, event)
		}
	}

	// Sort events by causal order (best effort)
	el.sortEventsByCausality()
}

// DetectConflicts finds concurrent events that modified the same key
func (el *EventLog) DetectConflicts() []*ConflictSet {
	conflicts := make([]*ConflictSet, 0)
	keyEvents := make(map[string][]*Event)

	// Group events by key
	for _, event := range el.Events {
		if event.Type == "put" { // Only writes can conflict
			keyEvents[event.Key] = append(keyEvents[event.Key], event)
		}
	}

	// Check each key for conflicts
	for key, events := range keyEvents {
		conflictGroups := el.findConcurrentEvents(events)
		for _, group := range conflictGroups {
			if len(group) > 1 {
				conflicts = append(conflicts, &ConflictSet{
					Key:               key,
					ConflictingEvents: group,
					DetectedAt:        time.Now().Unix(),
				})
			}
		}
	}

	return conflicts
}

// ConflictSet represents a set of conflicting concurrent events
type ConflictSet struct {
	Key               string   `json:"key"`
	ConflictingEvents []*Event `json:"conflicting_events"`
	DetectedAt        int64    `json:"detected_at"`
	Resolution        string   `json:"resolution,omitempty"`
}

// findConcurrentEvents groups events that are concurrent with each other
func (el *EventLog) findConcurrentEvents(events []*Event) [][]*Event {
	groups := make([][]*Event, 0)

	for i := 0; i < len(events); i++ {
		group := []*Event{events[i]}

		for j := i + 1; j < len(events); j++ {
			relation := events[i].VectorClock.Compare(events[j].VectorClock)
			if relation == Concurrent {
				group = append(group, events[j])
			}
		}

		if len(group) > 1 {
			groups = append(groups, group)
		}
	}

	return groups
}

// sortEventsByCausality sorts events by their causal relationships
func (el *EventLog) sortEventsByCausality() {
	sort.Slice(el.Events, func(i, j int) bool {
		relation := el.Events[i].VectorClock.Compare(el.Events[j].VectorClock)
		if relation == Before {
			return true
		}
		if relation == After {
			return false
		}
		// For concurrent events, sort by timestamp
		return el.Events[i].Timestamp < el.Events[j].Timestamp
	})
}

// computeEventHash creates a deterministic hash for an event
func computeEventHash(eventType, key, value string, vc *VectorClock) string {
	data := fmt.Sprintf("%s:%s:%s:%s", eventType, key, value, vc.String())
	// Simple hash - in production you'd use crypto/sha256
	hash := 0
	for _, c := range data {
		hash = hash*31 + int(c)
	}
	return fmt.Sprintf("%x", hash)
}

// GetEventsSince returns events that happened after the given vector clock
func (el *EventLog) GetEventsSince(sinceVC *VectorClock) []*Event {
	result := make([]*Event, 0)

	for _, event := range el.Events {
		if sinceVC.HappensBefore(event.VectorClock) {
			result = append(result, event)
		}
	}

	return result
}

// SerializeEventLog converts the event log to JSON
func (el *EventLog) SerializeEventLog() ([]byte, error) {
	return json.Marshal(el)
}
