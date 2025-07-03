package storage

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sort"
	"time"
)

// MerkleNode represents a node in the Merkle tree
type MerkleNode struct {
	Hash     string      `json:"hash"`
	IsLeaf   bool        `json:"is_leaf"`
	Key      string      `json:"key,omitempty"`   // Only for leaf nodes
	Value    string      `json:"value,omitempty"` // Only for leaf nodes
	Left     *MerkleNode `json:"left,omitempty"`  // Only for internal nodes
	Right    *MerkleNode `json:"right,omitempty"` // Only for internal nodes
	Level    int         `json:"level"`           // Tree level (0 = root)
	Position int         `json:"position"`        // Position at this level
}

// MerkleTree represents the complete Merkle tree for a node's data
type MerkleTree struct {
	Root      *MerkleNode   `json:"root"`
	NodeID    string        `json:"node_id"`
	Timestamp int64         `json:"timestamp"`
	KeyCount  int           `json:"key_count"`
	TreeDepth int           `json:"tree_depth"`
	Leaves    []*MerkleNode `json:"leaves"`
}

// TreeComparison represents the result of comparing two Merkle trees
type TreeComparison struct {
	SourceNodeID   string   `json:"source_node_id"`
	TargetNodeID   string   `json:"target_node_id"`
	IsConsistent   bool     `json:"is_consistent"`
	MismatchedKeys []string `json:"mismatched_keys"`
	MissingKeys    []string `json:"missing_keys"`
	ExtraKeys      []string `json:"extra_keys"`
	Timestamp      int64    `json:"timestamp"`
}

// BuildMerkleTree constructs a Merkle tree from the storage data
func (s *LevelDBStorage) BuildMerkleTree() (*MerkleTree, error) {
	// Get all keys from storage
	keys, err := s.GetAllKeys()
	if err != nil {
		return nil, fmt.Errorf("failed to get keys: %v", err)
	}

	// Sort keys for deterministic tree construction
	sort.Strings(keys)

	// Create leaf nodes
	leaves := make([]*MerkleNode, 0, len(keys))
	for i, key := range keys {
		value, err := s.Get(key)
		if err != nil {
			continue // Skip keys that can't be read
		}

		leafHash := computeLeafHash(key, value.Value)
		leaf := &MerkleNode{
			Hash:     leafHash,
			IsLeaf:   true,
			Key:      key,
			Value:    value.Value,
			Level:    0,
			Position: i,
		}
		leaves = append(leaves, leaf)
	}

	// Build tree from leaves up
	root := buildTreeFromLeaves(leaves)

	tree := &MerkleTree{
		Root:      root,
		NodeID:    s.nodeID,
		Timestamp: time.Now().Unix(),
		KeyCount:  len(leaves),
		TreeDepth: calculateDepth(root),
		Leaves:    leaves,
	}

	return tree, nil
}

// buildTreeFromLeaves constructs the tree bottom-up from leaf nodes
func buildTreeFromLeaves(leaves []*MerkleNode) *MerkleNode {
	if len(leaves) == 0 {
		// Empty tree
		return &MerkleNode{
			Hash:     computeEmptyHash(),
			IsLeaf:   false,
			Level:    0,
			Position: 0,
		}
	}

	if len(leaves) == 1 {
		return leaves[0]
	}

	currentLevel := leaves
	level := 1

	for len(currentLevel) > 1 {
		nextLevel := make([]*MerkleNode, 0, (len(currentLevel)+1)/2)

		for i := 0; i < len(currentLevel); i += 2 {
			left := currentLevel[i]
			var right *MerkleNode

			if i+1 < len(currentLevel) {
				right = currentLevel[i+1]
			} else {
				// Odd number of nodes, duplicate the last one
				right = left
			}

			parentHash := computeInternalHash(left.Hash, right.Hash)
			parent := &MerkleNode{
				Hash:     parentHash,
				IsLeaf:   false,
				Left:     left,
				Right:    right,
				Level:    level,
				Position: len(nextLevel),
			}

			nextLevel = append(nextLevel, parent)
		}

		currentLevel = nextLevel
		level++
	}

	return currentLevel[0]
}

// computeLeafHash computes hash for a leaf node (key-value pair)
func computeLeafHash(key, value string) string {
	hasher := sha256.New()
	hasher.Write([]byte(fmt.Sprintf("leaf:%s:%s", key, value)))
	return hex.EncodeToString(hasher.Sum(nil))
}

// computeInternalHash computes hash for an internal node (combination of child hashes)
func computeInternalHash(leftHash, rightHash string) string {
	hasher := sha256.New()
	hasher.Write([]byte(fmt.Sprintf("internal:%s:%s", leftHash, rightHash)))
	return hex.EncodeToString(hasher.Sum(nil))
}

// computeEmptyHash computes hash for an empty tree
func computeEmptyHash() string {
	hasher := sha256.New()
	hasher.Write([]byte("empty_tree"))
	return hex.EncodeToString(hasher.Sum(nil))
}

// calculateDepth calculates the depth of the tree
func calculateDepth(root *MerkleNode) int {
	if root == nil || root.IsLeaf {
		return 1
	}

	leftDepth := calculateDepth(root.Left)
	rightDepth := calculateDepth(root.Right)

	if leftDepth > rightDepth {
		return leftDepth + 1
	}
	return rightDepth + 1
}

// CompareTrees compares two Merkle trees and identifies inconsistencies
func CompareTrees(sourceTree, targetTree *MerkleTree) *TreeComparison {
	comparison := &TreeComparison{
		SourceNodeID:   sourceTree.NodeID,
		TargetNodeID:   targetTree.NodeID,
		Timestamp:      time.Now().Unix(),
		MismatchedKeys: make([]string, 0),
		MissingKeys:    make([]string, 0),
		ExtraKeys:      make([]string, 0),
	}

	// Quick check: if root hashes match, trees are identical
	if sourceTree.Root.Hash == targetTree.Root.Hash {
		comparison.IsConsistent = true
		return comparison
	}

	// Build maps for easier comparison
	sourceLeaves := make(map[string]*MerkleNode)
	targetLeaves := make(map[string]*MerkleNode)

	for _, leaf := range sourceTree.Leaves {
		sourceLeaves[leaf.Key] = leaf
	}

	for _, leaf := range targetTree.Leaves {
		targetLeaves[leaf.Key] = leaf
	}

	// Find mismatched and missing keys
	for key, sourceLeaf := range sourceLeaves {
		if targetLeaf, exists := targetLeaves[key]; exists {
			if sourceLeaf.Hash != targetLeaf.Hash {
				comparison.MismatchedKeys = append(comparison.MismatchedKeys, key)
			}
		} else {
			comparison.MissingKeys = append(comparison.MissingKeys, key)
		}
	}

	// Find extra keys in target
	for key := range targetLeaves {
		if _, exists := sourceLeaves[key]; !exists {
			comparison.ExtraKeys = append(comparison.ExtraKeys, key)
		}
	}

	comparison.IsConsistent = len(comparison.MismatchedKeys) == 0 &&
		len(comparison.MissingKeys) == 0 &&
		len(comparison.ExtraKeys) == 0

	return comparison
}

// GetAllKeys returns all keys in the storage (helper method)
func (s *LevelDBStorage) GetAllKeys() ([]string, error) {
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

// SerializeTree converts the Merkle tree to JSON for API responses
func (tree *MerkleTree) SerializeTree() ([]byte, error) {
	return json.Marshal(tree)
}
