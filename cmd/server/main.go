package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"dynamodb/internal/api"
	"dynamodb/internal/gossip"
	"dynamodb/internal/node"
	"dynamodb/internal/replication"
	"dynamodb/internal/ring"
	"dynamodb/internal/storage"

	"github.com/gin-gonic/gin"
)

func main() {
	// Parse command line flags
	port := flag.String("port", "8080", "Port to run the server on")
	nodeID := flag.String("node-id", "node-1", "Unique identifier for this node")
	dataPath := flag.String("data-dir", "./data", "Directory to store data")
	seedNode := flag.String("seed-node", "", "Seed node address for gossip discovery (e.g., localhost:8081)")
	enableGossip := flag.Bool("gossip", true, "Enable gossip protocol for cluster discovery")
	flag.Parse()

	fmt.Printf("🚀 Starting DynamoDB Node: %s on port %s\n", *nodeID, *port)
	fmt.Printf("📁 Data will be stored in: %s/%s\n", *dataPath, *nodeID)
	if *enableGossip {
		fmt.Printf("🗣️ Gossip protocol enabled\n")
		if *seedNode != "" {
			fmt.Printf("🌱 Seed node: %s\n", *seedNode)
		}
	}

	// Initialize LevelDB storage
	localStorage, err := storage.NewLevelDBStorage(*nodeID, *dataPath)
	if err != nil {
		log.Fatal("Failed to initialize storage:", err)
	}
	defer localStorage.Close()

	// Initialize the consistent hash ring
	hashRing := ring.NewConsistentHashRing()

	// Create this node
	currentNode := node.NewNode(*nodeID, "localhost:"+*port)
	hashRing.AddNode(currentNode)

	fmt.Printf("✅ Node %s added to hash ring\n", *nodeID)

	// Initialize replication system
	replicator := replication.NewReplicator(hashRing, localStorage, currentNode)
	defer replicator.Stop() // Clean shutdown of health monitoring

	// Initialize gossip protocol
	var gossipManager *gossip.GossipManager
	var gossipHandler *gossip.GossipHandler
	
	if *enableGossip {
		gossipManager = gossip.NewGossipManager(currentNode, gossip.DefaultGossipConfig())
		
		// Set up callbacks for gossip events
		gossipManager.SetCallbacks(
			func(joinNodeID, address string) {
				// Node joined callback - skip if it's ourselves
				if joinNodeID != *nodeID {
					fmt.Printf("🤝 Gossip: Node %s joined at %s\n", joinNodeID, address)
					newNode := node.NewNode(joinNodeID, address)
					hashRing.AddNode(newNode)
					
					// Also mark the node as alive in the replication system
					fmt.Printf("💚 Marking gossip-discovered node %s as alive in replication system\n", joinNodeID)
					replicator.MarkNodeAlive(joinNodeID)
				}
			},
			func(leaveNodeID string) {
				// Node left callback - skip if it's ourselves
				if leaveNodeID != *nodeID {
					fmt.Printf("👋 Gossip: Node %s left cluster\n", leaveNodeID)
					hashRing.RemoveNode(leaveNodeID)
				}
			},
			func(failNodeID string) {
				// Node failed callback - skip if it's ourselves
				if failNodeID != *nodeID {
					fmt.Printf("💀 Gossip: Node %s failed\n", failNodeID)
					hashRing.RemoveNode(failNodeID)
				}
			},
		)
		
		// Add seed node if provided
		if *seedNode != "" {
			// Extract nodeID from seed node address (simple heuristic)
			seedNodeID := "seed-node"
			if *seedNode == "localhost:8081" {
				seedNodeID = "node-1"
			} else if *seedNode == "localhost:8082" {
				seedNodeID = "node-2"
			}
			gossipManager.AddSeedNode(seedNodeID, *seedNode)
		}
		
		gossipHandler = gossip.NewGossipHandler(gossipManager)
		gossipManager.Start()
		defer gossipManager.Stop()
	}

	// Initialize API server
	router := gin.Default()

	// CORS middleware for frontend communication
	router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	apiHandler := api.NewHandler(hashRing, currentNode, localStorage, replicator)

	// Setup routes
	v1 := router.Group("/api/v1")
	{
		v1.GET("/status", apiHandler.GetStatus)
		v1.GET("/ring", apiHandler.GetRing)
		v1.GET("/storage", apiHandler.GetStorageStats)
		v1.PUT("/data/:key", apiHandler.PutData)
		v1.GET("/data/:key", apiHandler.GetData)
		v1.DELETE("/data/:key", apiHandler.DeleteData)

		// Cluster management endpoints
		v1.POST("/cluster/join", apiHandler.JoinCluster)
		v1.GET("/cluster", apiHandler.GetCluster)

		// Merkle tree endpoints for data integrity
		v1.GET("/merkle-tree", apiHandler.GetMerkleTree)
		v1.GET("/merkle-tree/compare/:target_node", apiHandler.CompareMerkleTrees)
		v1.POST("/merkle-tree/sync", apiHandler.SyncMerkleTree)

		// Vector clock endpoints for causality tracking
		v1.GET("/vector-clock", apiHandler.GetVectorClock)
		v1.GET("/events", apiHandler.GetEventHistory)
		v1.GET("/vector-clock/compare/:target_node", apiHandler.CompareVectorClocks)
		v1.POST("/vector-clock/sync", apiHandler.SyncVectorClocks)
	}

	// Internal replication endpoint (for node-to-node communication)
	internal := router.Group("/internal")
	{
		internal.POST("/replicate", apiHandler.HandleReplication)
	}

	// Gossip protocol endpoints
	if *enableGossip && gossipHandler != nil {
		gossipGroup := router.Group("/gossip")
		{
			gossipGroup.POST("/receive", gossipHandler.ReceiveGossip)
			gossipGroup.GET("/members", gossipHandler.GetClusterMembers)
			gossipGroup.GET("/status", gossipHandler.GetGossipStatus)
			gossipGroup.GET("/rumors", gossipHandler.GetRumors)
			gossipGroup.POST("/join", gossipHandler.JoinCluster)
			gossipGroup.POST("/leave", gossipHandler.LeaveCluster)
		}
	}

	// WebSocket endpoint for real-time visualization
	router.GET("/ws", apiHandler.WebSocketHandler)

	// Simple welcome page (until we build the frontend)
	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message":       "🌐 DynamoDB Distributed Key-Value Store",
			"version":       "Phase 3 - Vector Clocks & Causality Tracking",
			"node_id":       *nodeID,
			"api":           "/api/v1",
			"websocket":     "/ws",
			"replication":   "/internal/replicate",
			"merkle_tree":   "/api/v1/merkle-tree",
			"vector_clock":  "/api/v1/vector-clock",
			"event_history": "/api/v1/events",
		})
	})

	fmt.Printf("🌐 API Server starting on http://localhost:%s\n", *port)
	fmt.Printf("📊 Visualization available at http://localhost:%s\n", *port)
	fmt.Printf("🔄 Replication endpoint: http://localhost:%s/internal/replicate\n", *port)
	fmt.Printf("🌳 Merkle tree endpoint: http://localhost:%s/api/v1/merkle-tree\n", *port)
	if *enableGossip {
		fmt.Printf("🗣️ Gossip endpoint: http://localhost:%s/gossip\n", *port)
	}

	// Set up graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Start server in a goroutine
	go func() {
		if err := router.Run(":" + *port); err != nil {
			log.Fatal("Failed to start server:", err)
		}
	}()

	// Wait for shutdown signal
	<-sigChan
	fmt.Printf("\n🛑 Shutdown signal received, gracefully shutting down...\n")

	// Graceful leave if gossip is enabled
	if *enableGossip && gossipManager != nil {
		fmt.Printf("👋 Leaving cluster gracefully...\n")
		gossipManager.Stop()
	}

	fmt.Printf("✅ Server shutdown complete\n")
}
