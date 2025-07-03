# 🌐 DynamoDB Visualization Dashboard

A **stunning real-time visualization** for the distributed key-value store featuring:

- 🔄 **Interactive Hash Ring** - See consistent hashing with virtual nodes
- 📊 **Live Node Status** - Real-time cluster health monitoring  
- ⚡ **Data Operations** - Interactive PUT/GET/DELETE operations
- 🔄 **Replication Flow** - Visualize quorum-based consistency
- 🕒 **Vector Clock Timeline** - Causality tracking (coming soon)
- 🌳 **Merkle Tree Sync** - Anti-entropy visualization (coming soon)
- 📈 **Live Statistics** - Real-time performance metrics

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Go server running on `localhost:8081`

### Installation & Running

```bash
# Navigate to web directory
cd web

# Install dependencies
npm install

# Start the development server
npm start
```

The visualization will open at **http://localhost:3000** and connect to your Go backend at **http://localhost:8081**

## 🎯 Features

### Hash Ring Visualization
- **Interactive D3.js ring** showing consistent hashing
- **Virtual nodes** distributed around the ring
- **Node status indicators** with real-time updates
- **Hover tooltips** with hash values and node details

### Real-Time Data Operations
- **PUT operations** - Store key-value pairs
- **GET operations** - Retrieve data with quorum reads
- **DELETE operations** - Remove keys from the cluster
- **Live results** - See replication success/failure in real-time

### Live Monitoring
- **Node health** - Uptime, heartbeats, status
- **Cluster statistics** - Ring metrics, replication factors
- **Performance data** - Operations per second, latency
- **WebSocket connection** - Real-time updates

## 🎨 Technology Stack

- **React 18** - Modern UI framework
- **TypeScript** - Type-safe development
- **D3.js** - Beautiful data visualizations
- **Styled Components** - CSS-in-JS styling
- **Framer Motion** - Smooth animations
- **WebSocket** - Real-time communication

## 🔧 Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

## 🌟 What Makes This Special

This isn't just a simple dashboard - it's a **comprehensive distributed systems education tool** that visualizes:

- **Consistent Hashing** - See how keys map to nodes
- **Replication Strategies** - Understand quorum-based consistency
- **Failure Scenarios** - Watch the system handle node failures
- **Data Distribution** - Observe load balancing across the ring

## 🎯 Coming Soon

- **Vector Clock Visualization** - See causality relationships
- **Merkle Tree Comparison** - Watch anti-entropy in action
- **Performance Graphs** - Real-time charts and metrics
- **3D Ring Visualization** - Immersive distributed systems view

---

**Experience distributed systems like never before!** 🚀 