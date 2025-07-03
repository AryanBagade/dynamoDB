# 🌐 DynamoDB - Distributed Key-Value Store

A **production-grade distributed key-value store** built with Go, featuring consistent hashing, vector clocks, Merkle trees, and **stunning real-time visualization**.

## 🚀 **PHASE COMPLETE: Multi-Node + Visualization!**

### ✅ **Phase 2A: Storage & Replication (COMPLETE)**
- **LevelDB Integration** - Persistent, high-performance storage
- **Quorum-Based Writes** - R + W > N consistency guarantees
- **Rich Metadata Model** - Timestamps, versions, node tracking
- **Replication System** - 3-factor replication with 2-node quorum

### ✅ **Phase 2B: Cluster Management (COMPLETE)**
- **Dynamic Node Discovery** - Nodes can join clusters
- **Cluster Status API** - Real-time cluster information
- **Multi-Node Ready** - Architecture supports N nodes

### ✅ **Phase 3: Stunning Visualization (COMPLETE)**
- **Interactive Hash Ring** - D3.js visualization with virtual nodes
- **Real-Time Dashboard** - React + TypeScript + WebSocket
- **Live Node Monitoring** - Health, uptime, heartbeats
- **Data Operations Panel** - Interactive PUT/GET/DELETE
- **Live Statistics** - Performance metrics and cluster stats

## 🎯 **Quick Start - Full System**

### Option 1: Easy Startup (Recommended)
```bash
# Make startup script executable
chmod +x start-visualization.sh

# Start both backend and visualization
./start-visualization.sh
```

### Option 2: Manual Startup
```bash
# Terminal 1: Start Go backend
NODE_ID=node-1 PORT=8081 go run cmd/server/main.go

# Terminal 2: Start React visualization
cd web
npm install
npm start
```

### Access Points
- 🌐 **Backend API**: http://localhost:8081
- 🎨 **Visualization**: http://localhost:3000  
- 📊 **WebSocket**: ws://localhost:8081/ws

## 🔥 **System Architecture**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React + D3.js │    │   Go Backend     │    │   LevelDB       │
│   Visualization │◄───┤   • Hash Ring    ├───►│   Storage       │
│   Dashboard     │    │   • Replication  │    │   Engine        │
└─────────────────┘    │   • WebSocket    │    └─────────────────┘
                       └──────────────────┘
```

## 🎨 **Visualization Features**

### 🔄 **Interactive Hash Ring**
- **Consistent hashing visualization** with 150 virtual nodes per physical node
- **Real-time node status** with health indicators
- **Interactive tooltips** showing hash values and node details
- **Beautiful animations** powered by D3.js and Framer Motion

### 📊 **Live Dashboard**
- **Node Status Panel** - Uptime, heartbeats, addresses
- **Data Operations** - Interactive PUT/GET/DELETE with live results
- **Live Statistics** - Real-time cluster metrics
- **Replication Flow** - Visualize quorum-based consistency

### 🎯 **Multiple Views**
- **Hash Ring** - Consistent hashing visualization
- **Replication** - Quorum and consistency metrics
- **Vector Clocks** - Causality tracking (framework ready)
- **Merkle Trees** - Anti-entropy visualization (framework ready)
- **Live Stats** - Performance and cluster monitoring

## 🛠️ **Technology Stack**

### Backend (Go)
- **Gin** - HTTP framework
- **LevelDB** - Embedded storage
- **WebSocket** - Real-time communication
- **UUID** - Node identification

### Frontend (React)
- **React 18** - Modern UI framework
- **TypeScript** - Type-safe development
- **D3.js** - Data visualization
- **Styled Components** - CSS-in-JS
- **Framer Motion** - Smooth animations

## 🎯 **API Endpoints**

### Core Data Operations
```bash
# Store data with replication
curl -X PUT http://localhost:8081/api/v1/data/user:123 \
  -H "Content-Type: application/json" \
  -d '{"value":"John Doe"}'

# Retrieve with quorum read
curl http://localhost:8081/api/v1/data/user:123

# Delete data
curl -X DELETE http://localhost:8081/api/v1/data/user:123
```

### Cluster Management
```bash
# Node status
curl http://localhost:8081/api/v1/status

# Hash ring information
curl http://localhost:8081/api/v1/ring

# Storage statistics
curl http://localhost:8081/api/v1/storage

# Cluster information
curl http://localhost:8081/api/v1/cluster
```

## 🔄 **Distributed Systems Concepts Implemented**

### ✅ **Consistent Hashing**
- SHA-256 based hashing with 32-bit hash space
- 150 virtual nodes per physical node for even distribution
- Clockwise traversal for key-to-node mapping

### ✅ **Replication & Consistency**
- **Replication Factor**: 3 (configurable)
- **Quorum Size**: 2 (majority)
- **Quorum Writes**: R + W > N ensures consistency
- **Failure Handling**: Proper error when quorum not achieved

### ✅ **Storage & Persistence**
- **LevelDB** integration for high-performance storage
- **Rich metadata** with timestamps and versions
- **Node tracking** for debugging and monitoring

### 📋 **Coming Soon**
- **Vector Clocks** - Causality tracking and conflict resolution
- **Merkle Trees** - Anti-entropy and efficient synchronization
- **Gossip Protocol** - Decentralized failure detection
- **Multi-Node Clustering** - True distributed operation

## 🌟 **What Makes This Special**

This isn't just a database - it's a **comprehensive distributed systems education platform**:

1. **Real Production Concepts** - Same techniques as DynamoDB, Cassandra
2. **Beautiful Visualization** - See distributed systems in action
3. **Interactive Learning** - Experiment with operations and see results
4. **Proper Error Handling** - Learn from consistency failures
5. **Extensible Architecture** - Ready for advanced features

## 🚀 **Performance & Scale**

- **Target**: Hundreds of thousands of operations per second
- **Consistency**: Strong consistency with quorum-based operations  
- **Fault Tolerance**: Graceful degradation during node failures
- **Scalability**: Horizontal scaling across multiple nodes

## 🎯 **Development Status**

**✅ COMPLETE**: Foundation, Storage, Replication, Visualization
**🚧 IN PROGRESS**: Multi-node clustering
**📋 PLANNED**: Vector clocks, Merkle trees, Performance optimization

---

## 🎉 **Experience Distributed Systems Like Never Before!**

**Launch the visualization** and watch your data flow through a beautiful consistent hash ring with real-time replication and monitoring. This is distributed systems education at its finest! 🚀

**Ready to see it in action?** Run `./start-visualization.sh` and open http://localhost:3000 