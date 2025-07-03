package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/syndtr/goleveldb/leveldb"
	"github.com/syndtr/goleveldb/leveldb/errors"
	"github.com/syndtr/goleveldb/leveldb/opt"
)

// StorageValue represents a value with metadata
type StorageValue struct {
	Value     string            `json:"value"`
	Timestamp int64             `json:"timestamp"`
	Version   int               `json:"version"`
	Metadata  map[string]string `json:"metadata"`
}

// LevelDBStorage implements distributed storage with LevelDB
type LevelDBStorage struct {
	db       *leveldb.DB
	nodeID   string
	dataPath string
	mu       sync.RWMutex
	// Vector clock integration
	eventLog *EventLog
}

// NewLevelDBStorage creates a new LevelDB storage instance with vector clock support
func NewLevelDBStorage(nodeID, dataPath string) (*LevelDBStorage, error) {
	fullPath := fmt.Sprintf("%s/%s", dataPath, nodeID)

	// Try to open the database
	db, err := leveldb.OpenFile(fullPath, nil)
	if err != nil {
		// If it's a corrupted database, try to recover
		if errors.IsCorrupted(err) {
			fmt.Printf("🔧 Database corrupted, attempting recovery...\n")
			db, err = leveldb.RecoverFile(fullPath, nil)
		}

		// If recovery fails or other error, create fresh database
		if err != nil {
			fmt.Printf("⚠️ Could not open/recover database, creating fresh: %v\n", err)
			// Remove the corrupted database directory and create fresh
			db, err = leveldb.OpenFile(fullPath, nil)
			if err != nil {
				return nil, fmt.Errorf("failed to create fresh database: %v", err)
			}
		}
	}

	storage := &LevelDBStorage{
		db:       db,
		nodeID:   nodeID,
		dataPath: fullPath,
		eventLog: NewEventLog(nodeID),
	}

	fmt.Printf("✅ LevelDB storage initialized at %s\n", fullPath)
	fmt.Printf("📅 Vector clock event logging initialized for node %s\n", nodeID)

	return storage, nil
}

// Put stores a key-value pair with vector clock event logging
func (s *LevelDBStorage) Put(key, value string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Log the event with vector clock
	event := s.eventLog.AddEvent("put", key, value)

	// Create storage value with metadata including vector clock
	storageValue := StorageValue{
		Value:     value,
		Timestamp: time.Now().Unix(),
		Version:   1, // TODO: Implement proper versioning
		Metadata: map[string]string{
			"node_id":      s.nodeID,
			"event_id":     event.ID,
			"vector_clock": event.VectorClock.String(),
		},
	}

	// Serialize and store
	data, err := json.Marshal(storageValue)
	if err != nil {
		return err
	}

	err = s.db.Put([]byte(key), data, nil)
	if err != nil {
		return err
	}

	fmt.Printf("💾 PUT %s [%s] at event %s\n", key, event.VectorClock.String(), event.ID)
	return nil
}

// PutReplicated stores a key-value pair from replication without creating a new event
func (s *LevelDBStorage) PutReplicated(key, value string, sourceEvent *Event) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Use the source event instead of creating a new one
	storageValue := StorageValue{
		Value:     value,
		Timestamp: time.Now().Unix(),
		Version:   1,
		Metadata: map[string]string{
			"node_id":      sourceEvent.NodeID,
			"event_id":     sourceEvent.ID,
			"vector_clock": sourceEvent.VectorClock.String(),
			"replicated":   "true", // Mark as replicated
		},
	}

	// Serialize and store
	data, err := json.Marshal(storageValue)
	if err != nil {
		return err
	}

	err = s.db.Put([]byte(key), data, nil)
	if err != nil {
		return err
	}

	fmt.Printf("📦 PUT-REPLICATED: %s = %s (source event: %s from %s)\n", 
		key, value, sourceEvent.ID, sourceEvent.NodeID)
	return nil
}

// Get retrieves a value by key with vector clock event logging
func (s *LevelDBStorage) Get(key string) (*StorageValue, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Log the read event
	event := s.eventLog.AddEvent("get", key, "")

	data, err := s.db.Get([]byte(key), nil)
	if err != nil {
		if err == leveldb.ErrNotFound {
			return nil, fmt.Errorf("key not found")
		}
		return nil, err
	}

	var value StorageValue
	err = json.Unmarshal(data, &value)
	if err != nil {
		return nil, err
	}

	fmt.Printf("📖 GET %s [%s] at event %s\n", key, event.VectorClock.String(), event.ID)
	return &value, nil
}

// Delete removes a key-value pair with vector clock event logging
func (s *LevelDBStorage) Delete(key string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Log the delete event
	event := s.eventLog.AddEvent("delete", key, "")

	err := s.db.Delete([]byte(key), nil)
	if err != nil {
		return err
	}

	fmt.Printf("🗑️ DELETE %s [%s] at event %s\n", key, event.VectorClock.String(), event.ID)
	return nil
}

// DeleteReplicated removes a key-value pair from replication without creating a new event
func (s *LevelDBStorage) DeleteReplicated(key string, sourceEvent *Event) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	err := s.db.Delete([]byte(key), nil)
	if err != nil {
		return err
	}

	fmt.Printf("🗑️ DELETE-REPLICATED: %s (source event: %s from %s)\n", 
		key, sourceEvent.ID, sourceEvent.NodeID)
	return nil
}

// Exists checks if a key exists
func (s *LevelDBStorage) Exists(key string) (bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	_, err := s.db.Get([]byte(key), nil)
	if err != nil {
		if err == leveldb.ErrNotFound {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

// ListKeys returns all keys in the database
func (s *LevelDBStorage) ListKeys() ([]string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	keys := make([]string, 0)
	iter := s.db.NewIterator(nil, nil)
	defer iter.Release()

	for iter.Next() {
		keys = append(keys, string(iter.Key()))
	}

	if err := iter.Error(); err != nil {
		return nil, err
	}

	return keys, nil
}

// GetStats returns storage statistics including vector clock info
func (s *LevelDBStorage) GetStats() map[string]interface{} {
	s.mu.RLock()
	defer s.mu.RUnlock()

	keys, _ := s.ListKeys()

	return map[string]interface{}{
		"node_id":      s.nodeID,
		"data_path":    s.dataPath,
		"key_count":    len(keys),
		"vector_clock": s.eventLog.Current.String(),
		"event_count":  len(s.eventLog.Events),
		"known_nodes":  len(s.eventLog.Nodes),
		"current_time": time.Now().Unix(),
	}
}

// GetEventLog returns the vector clock event log
func (s *LevelDBStorage) GetEventLog() *EventLog {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.eventLog
}

// MergeVectorClock merges another node's vector clock and events
func (s *LevelDBStorage) MergeVectorClock(otherLog *EventLog) {
	s.mu.Lock()
	defer s.mu.Unlock()

	fmt.Printf("🔄 Merging vector clock from %s: %s -> ",
		otherLog.NodeID, s.eventLog.Current.String())

	s.eventLog.MergeEventLog(otherLog)

	fmt.Printf("%s\n", s.eventLog.Current.String())
}

// DetectConflicts finds conflicting concurrent operations
func (s *LevelDBStorage) DetectConflicts() []*ConflictSet {
	s.mu.RLock()
	defer s.mu.RUnlock()

	conflicts := s.eventLog.DetectConflicts()

	if len(conflicts) > 0 {
		fmt.Printf("⚠️ CONFLICTS DETECTED: %d conflict sets found!\n", len(conflicts))
		for _, conflict := range conflicts {
			fmt.Printf("   🔥 Key '%s': %d concurrent writes\n",
				conflict.Key, len(conflict.ConflictingEvents))
		}
	}

	return conflicts
}

// GetCausalHistory returns the causal history for a specific key
func (s *LevelDBStorage) GetCausalHistory(key string) []*Event {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var history []*Event
	for _, event := range s.eventLog.Events {
		if event.Key == key {
			history = append(history, event)
		}
	}

	return history
}

// Close closes the LevelDB database
func (s *LevelDBStorage) Close() error {
	if s.db != nil {
		return s.db.Close()
	}
	return nil
}

// NewFreshLevelDBStorage creates a completely fresh database by removing old data
func NewFreshLevelDBStorage(nodeID, dataPath string) (*LevelDBStorage, error) {
	dbPath := filepath.Join(dataPath, nodeID)

	// Remove old database completely
	fmt.Printf("🧹 Cleaning old database at %s\n", dbPath)
	os.RemoveAll(dbPath)

	// Create fresh database
	opts := &opt.Options{
		WriteBuffer: 64 * 1024 * 1024, // 64MB write buffer
		BlockSize:   4 * 1024,         // 4KB block size
	}

	db, err := leveldb.OpenFile(dbPath, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to create fresh LevelDB at %s: %v", dbPath, err)
	}

	storage := &LevelDBStorage{
		db:       db,
		nodeID:   nodeID,
		dataPath: dbPath,
	}

	fmt.Printf("✅ Fresh LevelDB storage created at %s\n", dbPath)
	return storage, nil
}
