# 🌐 DynamoDB Distributed Key-Value Store - Complete API Documentation

> **The Ultimate Guide to Every Single API Endpoint** - So simple, even your grandma could use it! 🚀

## 📋 Table of Contents

1. [🏠 Base Information](#-base-information)
2. [🔧 Core API Endpoints](#-core-api-endpoints)
3. [💾 Key-Value Storage Operations](#-key-value-storage-operations)
4. [🔄 Cluster Management](#-cluster-management)
5. [🌳 Merkle Tree Operations](#-merkle-tree-operations)
6. [⏰ Vector Clock & Causality](#-vector-clock--causality)
7. [🗣️ Gossip Protocol](#️-gossip-protocol)
8. [🔌 WebSocket Real-time Updates](#-websocket-real-time-updates)
9. [🔧 Internal Operations](#-internal-operations)
10. [📊 Response Examples](#-response-examples)

---

## 🏠 Base Information

### Server Ports
- **Node 1**: `http://localhost:8081`
- **Node 2**: `http://localhost:8082`
- **Node 3**: `http://localhost:8083`

### Base URL Structure
```
http://localhost:{PORT}/api/v1/{endpoint}
```

### Authentication
- **None required** - This is a development/demo system
- All endpoints accept CORS from any origin

---

## 🔧 Core API Endpoints

### 1. 🏠 Welcome Page
**What it does**: Shows you basic info about the node and available endpoints

```http
GET /
```

**Response**:
```json
{
  "message": "🌐 DynamoDB Distributed Key-Value Store",
  "version": "Phase 3 - Vector Clocks & Causality Tracking",
  "node_id": "node-1",
  "api": "/api/v1",
  "websocket": "/ws",
  "replication": "/internal/replicate",
  "merkle_tree": "/api/v1/merkle-tree",
  "vector_clock": "/api/v1/vector-clock",
  "event_history": "/api/v1/events"
}
```

### 2. 💚 Node Health Status
**What it does**: Tells you if the node is alive and healthy, plus storage and replication info

```http
GET /api/v1/status
```

**Response**:
```json
{
  "node": {
    "id": "node-1",
    "address": "localhost:8081",
    "status": "alive",
    "last_seen": 1642123456,
    "start_time": 1642120000,
    "heartbeat_count": 150,
    "uptime_seconds": 3456
  },
  "storage": {
    "node_id": "node-1",
    "data_path": "./data/node-1",
    "key_count": 42,
    "vector_clock": "node-1:15,node-2:8,node-3:12",
    "event_count": 35,
    "known_nodes": 3,
    "current_time": 1642123456
  },
  "replication": {
    "replication_factor": 3,
    "quorum_size": 2,
    "total_nodes": 3,
    "alive_nodes": 3,
    "quorum_available": true,
    "current_node": "node-1"
  },
  "timestamp": 1642123456,
  "message": "Node is healthy"
}
```

### 3. 🔗 Hash Ring Information
**What it does**: Shows you how data is distributed across nodes in the cluster

```http
GET /api/v1/ring
```

**Response**:
```json
{
  "ring": {
    "physical_nodes": 3,
    "virtual_nodes": 150,
    "replicas": 50,
    "ring": [
      {"hash": 123456789, "node_id": "node-1"},
      {"hash": 234567890, "node_id": "node-2"},
      {"hash": 345678901, "node_id": "node-3"}
    ]
  },
  "nodes": [
    {
      "id": "node-1",
      "address": "localhost:8081",
      "status": "alive"
    }
  ]
}
```

### 4. 📊 Storage Statistics
**What it does**: Gives you detailed info about what's stored on this node

```http
GET /api/v1/storage
```

**Response**:
```json
{
  "node_id": "node-1",
  "data_path": "./data/node-1",
  "key_count": 42,
  "vector_clock": "node-1:15,node-2:8,node-3:12",
  "event_count": 35,
  "known_nodes": 3,
  "current_time": 1642123456,
  "keys": ["user:123", "session:abc", "config:main"]
}
```

---

## 💾 Key-Value Storage Operations

### 1. 📝 Store Data (PUT)
**What it does**: Saves a key-value pair with automatic replication across nodes

```http
PUT /api/v1/data/{key}
Content-Type: application/json

{
  "value": "your data here"
}
```

**Example**:
```bash
curl -X PUT http://localhost:8081/api/v1/data/user:123 \
  -H "Content-Type: application/json" \
  -d '{"value": "John Doe"}'
```

**Response**:
```json
{
  "key": "user:123",
  "value": "John Doe",
  "responsible_node": "node-2",
  "replication_nodes": ["node-1", "node-2", "node-3"],
  "replication_result": {
    "success": true,
    "replicated_to": 3,
    "quorum_achieved": true
  },
  "vector_clock": "node-1:16,node-2:8,node-3:12",
  "event_count": 36,
  "timestamp": 1642123456
}
```

### 2. 📖 Get Data (GET)
**What it does**: Retrieves a value by key with quorum read for consistency

```http
GET /api/v1/data/{key}
```

**Example**:
```bash
curl http://localhost:8081/api/v1/data/user:123
```

**Response**:
```json
{
  "key": "user:123",
  "value": "John Doe",
  "responsible_node": "node-2",
  "replication_nodes": ["node-1", "node-2", "node-3"],
  "read_result": {
    "value": "John Doe",
    "quorum_achieved": true,
    "nodes_responded": 3
  },
  "timestamp": 1642123456
}
```

### 3. 🗑️ Delete Data (DELETE)
**What it does**: Removes a key-value pair from all replicas

```http
DELETE /api/v1/data/{key}
```

**Example**:
```bash
curl -X DELETE http://localhost:8081/api/v1/data/user:123
```

**Response**:
```json
{
  "key": "user:123",
  "message": "Key deleted successfully",
  "responsible_node": "node-2",
  "replication_nodes": ["node-1", "node-2", "node-3"],
  "replication_result": {
    "success": true,
    "deleted_from": 3,
    "quorum_achieved": true
  },
  "vector_clock": "node-1:17,node-2:8,node-3:12",
  "event_count": 37,
  "timestamp": 1642123456
}
```

---

## 🔄 Cluster Management

### 1. 🤝 Join Cluster
**What it does**: Adds a new node to the cluster

```http
POST /api/v1/cluster/join
Content-Type: application/json

{
  "node_id": "node-4",
  "address": "localhost:8084"
}
```

**Response**:
```json
{
  "message": "Node node-4 joined cluster",
  "cluster": {
    "ring": {
      "physical_nodes": 4,
      "virtual_nodes": 200
    },
    "nodes": [
      {"id": "node-1", "address": "localhost:8081"},
      {"id": "node-4", "address": "localhost:8084"}
    ]
  }
}
```

### 2. 🏘️ Get Cluster Info
**What it does**: Shows you all nodes in the cluster

```http
GET /api/v1/cluster
```

**Response**:
```json
{
  "cluster": {
    "ring": {
      "physical_nodes": 3,
      "virtual_nodes": 150
    },
    "nodes": [
      {"id": "node-1", "address": "localhost:8081", "status": "alive"},
      {"id": "node-2", "address": "localhost:8082", "status": "alive"},
      {"id": "node-3", "address": "localhost:8083", "status": "failed"}
    ]
  },
  "current_node": "node-1"
}
```

---

## 🌳 Merkle Tree Operations

### 1. 🌲 Get Merkle Tree
**What it does**: Shows you the data integrity tree for this node

```http
GET /api/v1/merkle-tree
```

**Response**:
```json
{
  "merkle_tree": {
    "root": {
      "hash": "abc123def456",
      "is_leaf": false,
      "level": 0,
      "position": 0
    },
    "node_id": "node-1",
    "timestamp": 1642123456,
    "key_count": 42,
    "tree_depth": 6
  },
  "timestamp": 1642123456,
  "message": "Merkle tree built successfully"
}
```

### 2. 🔍 Compare Trees Between Nodes
**What it does**: Compares data integrity between two nodes

```http
GET /api/v1/merkle-tree/compare/{target_node}
```

**Example**:
```bash
curl http://localhost:8081/api/v1/merkle-tree/compare/node-2
```

**Response**:
```json
{
  "comparison": {
    "is_consistent": false,
    "missing_keys": ["user:456", "session:xyz"],
    "mismatched_keys": ["config:main"],
    "extra_keys": ["temp:abc"]
  },
  "source_tree": { /* merkle tree data */ },
  "target_tree": { /* merkle tree data */ },
  "timestamp": 1642123456
}
```

### 3. 🔄 Sync Data Between Nodes
**What it does**: Fixes data inconsistencies between nodes

```http
POST /api/v1/merkle-tree/sync
Content-Type: application/json

{
  "target_node_id": "node-2",
  "dry_run": true
}
```

**Response**:
```json
{
  "message": "Anti-entropy analysis complete",
  "comparison": {
    "is_consistent": false,
    "missing_keys": 2,
    "mismatched_keys": 1
  },
  "actions": [
    "Would copy 2 missing keys from target",
    "Would resolve 1 mismatched keys"
  ],
  "dry_run": true,
  "timestamp": 1642123456
}
```

---

## ⏰ Vector Clock & Causality

### 1. 🕐 Get Vector Clock
**What it does**: Shows you the logical time and causality info

```http
GET /api/v1/vector-clock
```

**Response**:
```json
{
  "node_id": "node-1",
  "vector_clock": {
    "node-1": 15,
    "node-2": 8,
    "node-3": 12
  },
  "event_log": {
    "events": [
      {
        "id": "evt-123",
        "type": "put",
        "key": "user:123",
        "value": "John Doe",
        "node_id": "node-1",
        "vector_clock": {"node-1": 15},
        "timestamp": 1642123456,
        "causal_hash": "abc123"
      }
    ],
    "node_id": "node-1",
    "current_clock": {"node-1": 15, "node-2": 8},
    "known_nodes": {"node-1": true, "node-2": true}
  },
  "conflicts": [],
  "timestamp": 1642123456,
  "message": "Vector clock retrieved successfully"
}
```

### 2. 📚 Get Event History
**What it does**: Shows you all the operations that happened (optionally for a specific key)

```http
GET /api/v1/events
GET /api/v1/events?key=user:123
```

**Response**:
```json
{
  "node_id": "node-1",
  "total_events": 35,
  "events": [
    {
      "id": "evt-123",
      "type": "put",
      "key": "user:123",
      "value": "John Doe",
      "node_id": "node-1",
      "timestamp": 1642123456
    }
  ],
  "conflicts": [],
  "key_history": [
    /* events for specific key if requested */
  ],
  "vector_clock": {"node-1": 15, "node-2": 8},
  "timestamp": 1642123456
}
```

### 3. ⚖️ Compare Vector Clocks
**What it does**: Compares logical time between two nodes

```http
GET /api/v1/vector-clock/compare/{target_node}
```

**Response**:
```json
{
  "source_node": "node-1",
  "target_node": "node-2",
  "source_clock": {"node-1": 15, "node-2": 8},
  "target_clock": {"node-1": 12, "node-2": 10},
  "relationship": "concurrent",
  "conflicts": [],
  "timestamp": 1642123456
}
```

### 4. 🔄 Sync Vector Clocks
**What it does**: Synchronizes logical time between nodes

```http
POST /api/v1/vector-clock/sync
Content-Type: application/json

{
  "target_node_id": "node-2",
  "dry_run": true
}
```

---

## 🗣️ Gossip Protocol

### 1. 👥 Get Cluster Members
**What it does**: Shows you all nodes discovered via gossip

```http
GET /gossip/members
```

**Response**:
```json
{
  "cluster_members": {
    "node-1": {
      "node_id": "node-1",
      "address": "localhost:8081",
      "status": "alive",
      "last_seen": 1642123456
    },
    "node-2": {
      "node_id": "node-2", 
      "address": "localhost:8082",
      "status": "alive",
      "last_seen": 1642123450
    }
  },
  "total_members": 2,
  "alive_members": 2
}
```

### 2. 📊 Gossip Status
**What it does**: Shows you gossip protocol health and statistics

```http
GET /gossip/status
```

**Response**:
```json
{
  "gossip_status": {
    "current_node": "node-1",
    "cluster_size": 3,
    "alive_nodes": 2,
    "suspected_nodes": 1,
    "dead_nodes": 0,
    "active_rumors": 5
  },
  "config": {
    "gossip_interval": "1s",
    "probe_interval": "5s", 
    "suspicion_timeout": "10s"
  }
}
```

### 3. 📢 Get Rumors
**What it does**: Shows you what gossip messages are spreading

```http
GET /gossip/rumors
```

**Response**:
```json
{
  "rumors": {
    "rumor-123": {
      "type": "node_join",
      "data": {"node_id": "node-4"},
      "origin": "node-2",
      "timestamp": 1642123456,
      "spread_count": 3
    }
  },
  "total_rumors": 1
}
```

### 4. 🤝 Join via Gossip
**What it does**: Joins the cluster using gossip protocol

```http
POST /gossip/join
Content-Type: application/json

{
  "node_id": "node-4",
  "address": "localhost:8084"
}
```

### 5. 👋 Leave Cluster
**What it does**: Gracefully leaves the cluster

```http
POST /gossip/leave
```

### 6. 📨 Receive Gossip (Internal)
**What it does**: Receives gossip messages from other nodes

```http
POST /gossip/receive
Content-Type: application/json

{
  "type": "join",
  "from_node": "node-2",
  "to_node": "node-1",
  "timestamp": 1642123456,
  "data": {"node_id": "node-4", "address": "localhost:8084"},
  "message_id": "msg-123"
}
```

---

## 🔌 WebSocket Real-time Updates

### Connection
**What it does**: Gives you real-time updates about the cluster

```javascript
const ws = new WebSocket('ws://localhost:8081/ws');
```

### Message Types You'll Receive:

#### 1. 🏠 Initial Ring State
```json
{
  "type": "ring_state",
  "ring": { /* ring info */ },
  "nodes": [ /* node info */ ],
  "storage": { /* storage stats */ },
  "replication": { /* replication status */ }
}
```

#### 2. 💓 Heartbeat Updates (every 2 seconds)
```json
{
  "type": "heartbeat",
  "timestamp": 1642123456,
  "nodes": [
    {
      "id": "node-1",
      "status": "alive",
      "health_status": {
        "is_alive": true,
        "failure_count": 0
      }
    }
  ],
  "storage": { /* current storage stats */ },
  "replication": { /* current replication status */ }
}
```

---

## 🔧 Internal Operations

### 1. 🔄 Handle Replication (Node-to-Node)
**What it does**: Internal endpoint for nodes to replicate data to each other

```http
POST /internal/replicate
Content-Type: application/json

{
  "operation": "put",
  "key": "user:123",
  "value": "John Doe",
  "vector_clock": {"node-1": 15},
  "source_node": "node-1"
}
```

---

## 📊 Response Examples

### ✅ Success Response
```json
{
  "key": "user:123",
  "value": "John Doe",
  "timestamp": 1642123456,
  "message": "Operation successful"
}
```

### ❌ Error Response
```json
{
  "error": "Key not found",
  "timestamp": 1642123456
}
```

### 🔄 Replication Response
```json
{
  "success": true,
  "replicated_to": 3,
  "quorum_achieved": true,
  "failed_nodes": []
}
```

---

## 🚀 Quick Start Examples

### Store and Retrieve Data
```bash
# Store data
curl -X PUT http://localhost:8081/api/v1/data/hello \
  -H "Content-Type: application/json" \
  -d '{"value": "world"}'

# Get data
curl http://localhost:8081/api/v1/data/hello

# Delete data
curl -X DELETE http://localhost:8081/api/v1/data/hello
```

### Check Cluster Health
```bash
# Node status
curl http://localhost:8081/api/v1/status

# Cluster info
curl http://localhost:8081/api/v1/cluster

# Gossip status
curl http://localhost:8081/gossip/status
```

### Data Integrity
```bash
# Get Merkle tree
curl http://localhost:8081/api/v1/merkle-tree

# Compare with another node
curl http://localhost:8081/api/v1/merkle-tree/compare/node-2
```

---

## 🎯 Common Use Cases

1. **🏪 E-commerce Session Storage**: Store user sessions across multiple nodes
2. **👤 User Profile Cache**: Distributed user data with automatic replication
3. **⚙️ Configuration Management**: Replicated config data with consistency checks
4. **📊 Real-time Analytics**: Event tracking with causality preservation
5. **🔄 Microservices State**: Shared state between distributed services

---

## 🐛 Troubleshooting

### Node Not Responding?
```bash
curl http://localhost:8081/api/v1/status
```

### Data Inconsistency?
```bash
curl http://localhost:8081/api/v1/merkle-tree/compare/node-2
```

### Gossip Issues?
```bash
curl http://localhost:8081/gossip/status
```

---

**That's it! You now have every single API endpoint documented. Happy coding! 🎉**



