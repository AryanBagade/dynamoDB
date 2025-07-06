# 🌐 **Cluster Operations Guide**

## Table of Contents
- [Cluster Bootstrap Process](#cluster-bootstrap-process)
- [Clean Restart Procedure](#clean-restart-procedure)
- [Node Recovery & Rejoining](#node-recovery--rejoining)
- [Advanced Cluster Configurations](#advanced-cluster-configurations)
- [Troubleshooting](#troubleshooting)

---

## 🚀 **Cluster Bootstrap Process**

### **The Bootstrap Problem**
In distributed systems, you face a "chicken and egg" problem:
- Node-1 needs Node-2 to discover the cluster
- Node-2 needs Node-1 to discover the cluster
- Node-3 needs existing nodes to join

**Solution**: Use a **bootstrap sequence** where ONE node starts alone, others join via seed nodes.

### **Correct Startup Sequence**

#### **Step 1: Start Bootstrap Node (Leader)**
```bash
# Terminal 1 - Bootstrap node starts ALONE (no seed-node parameter)
go run cmd/server/main.go --node-id=node-1 --port=8081 --data-dir=./data/node-1
```

**What happens:**
- ✅ Node-1 creates initial cluster
- ✅ Gossip protocol starts with single member
- ✅ Hash ring initializes with one node
- ✅ Ready to accept other nodes

#### **Step 2: Add Second Node**
```bash
# Terminal 2 - Wait 5 seconds after node-1, then start node-2
go run cmd/server/main.go --node-id=node-2 --port=8082 --data-dir=./data/node-2 --seed-node=localhost:8081
```

**What happens:**
- ✅ Node-2 connects to node-1 (seed)
- ✅ Gossip protocol exchanges membership
- ✅ Both nodes discover each other
- ✅ Hash ring rebalances for 2 nodes

#### **Step 3: Add Third Node**
```bash
# Terminal 3 - Wait 5 seconds after node-2, then start node-3
go run cmd/server/main.go --node-id=node-3 --port=8083 --data-dir=./data/node-3 --seed-node=localhost:8081
```

**What happens:**
- ✅ Node-3 connects to node-1 (seed)
- ✅ Gossip spreads node-3's arrival to node-2
- ✅ All three nodes know each other
- ✅ Hash ring rebalances for 3 nodes
- ✅ Quorum available (2/3 majority)

#### **Step 4: Verify Cluster Formation**
```bash
# Check all nodes see the complete cluster
curl http://localhost:8081/gossip/members
curl http://localhost:8082/gossip/members  
curl http://localhost:8083/gossip/members

# Expected output: "alive_members": 3, "total_members": 3
```

---

## 🔄 **Clean Restart Procedure**

### **When to Perform Clean Restart**
- Cluster is in split-brain state
- Nodes have inconsistent membership views
- Gossip protocol isn't working properly
- After system crashes or network partitions

### **Clean Restart Steps**

#### **Step 1: Shutdown All Nodes**
```bash
# In each terminal running a node, press Ctrl+C
# Wait for graceful shutdown messages
```

#### **Step 2: Optional - Clear Gossip State**
```bash
# If nodes still have stale membership data, restart Go processes
# This clears in-memory gossip state
```

#### **Step 3: Bootstrap Sequence Restart**
Follow the exact same bootstrap sequence as initial startup:

```bash
# Terminal 1 - Bootstrap (NO seed-node)
go run cmd/server/main.go --node-id=node-1 --port=8081 --data-dir=./data/node-1

# Wait 5 seconds...

# Terminal 2 - Join via node-1
go run cmd/server/main.go --node-id=node-2 --port=8082 --data-dir=./data/node-2 --seed-node=localhost:8081

# Wait 5 seconds...

# Terminal 3 - Join via node-1  
go run cmd/server/main.go --node-id=node-3 --port=8083 --data-dir=./data/node-3 --seed-node=localhost:8081
```

#### **Step 4: Verify Clean Cluster**
```bash
# All nodes should show identical membership
curl http://localhost:8081/gossip/members | jq '.alive_members'
curl http://localhost:8082/gossip/members | jq '.alive_members'
curl http://localhost:8083/gossip/members | jq '.alive_members'

# All should return: 3
```

---

## 🔄 **Node Recovery & Rejoining**

### **Scenario 1: Node-1 (Bootstrap) Goes Down**

**Problem**: If bootstrap node fails, how do remaining nodes accept new nodes?

**Solution**: Use ANY alive node as seed for rejoining nodes.

#### **When Node-1 Fails:**
```bash
# Node-1 crashes or is killed
# Node-2 and Node-3 continue operating
# Cluster has 2/3 nodes (quorum maintained)
```

#### **Restarting Node-1:**
```bash
# Option 1: Use node-2 as seed
go run cmd/server/main.go --node-id=node-1 --port=8081 --data-dir=./data/node-1 --seed-node=localhost:8082

# Option 2: Use node-3 as seed  
go run cmd/server/main.go --node-id=node-1 --port=8081 --data-dir=./data/node-1 --seed-node=localhost:8083
```

**What happens:**
- ✅ Node-1 connects to alive node (node-2 or node-3)
- ✅ Gossip protocol announces node-1's return
- ✅ All nodes update membership to show 3 alive
- ✅ Hash ring rebalances to include node-1
- ✅ Data synchronization occurs automatically

### **Scenario 2: Any Node Can Be Bootstrap**

**The beauty of your gossip protocol**: ANY alive node can serve as a seed for new/rejoining nodes.

#### **Dynamic Seed Selection:**
```bash
# Adding node-4 to existing cluster (node-1, node-2, node-3 all running)

# Option 1: Use node-1 as seed
go run cmd/server/main.go --node-id=node-4 --port=8084 --data-dir=./data/node-4 --seed-node=localhost:8081

# Option 2: Use node-2 as seed
go run cmd/server/main.go --node-id=node-4 --port=8084 --data-dir=./data/node-4 --seed-node=localhost:8082

# Option 3: Use node-3 as seed
go run cmd/server/main.go --node-id=node-4 --port=8084 --data-dir=./data/node-4 --seed-node=localhost:8083

# All options result in the same outcome: 4-node cluster
```

---

## 🏗️ **Advanced Cluster Configurations**

### **Multiple Seed Nodes (Production Pattern)**

For production resilience, you can specify multiple seed nodes:

```bash
# Enhanced startup with multiple seed options
go run cmd/server/main.go \
  --node-id=node-2 \
  --port=8082 \
  --data-dir=./data/node-2 \
  --seed-nodes=localhost:8081,localhost:8083
```

### **Seed Node Selection Strategy**

```bash
# Production-ready startup script
SEED_NODES="localhost:8081,localhost:8082,localhost:8083"

# Try connecting to any available seed
for seed in $(echo $SEED_NODES | tr ',' ' '); do
  if curl -s $seed/api/v1/status > /dev/null; then
    echo "Using seed: $seed"
    go run cmd/server/main.go --node-id=node-4 --port=8084 --data-dir=./data/node-4 --seed-node=$seed
    break
  fi
done
```

### **Cluster Discovery Patterns**

#### **Pattern 1: Fixed Bootstrap Node**
```bash
# Always use node-1 as initial seed (if available)
--seed-node=localhost:8081
```

#### **Pattern 2: Round-Robin Seeds**
```bash
# Distribute seed load across multiple nodes
NODE_2: --seed-node=localhost:8081
NODE_3: --seed-node=localhost:8082  
NODE_4: --seed-node=localhost:8083
```

#### **Pattern 3: Service Discovery**
```bash
# Use external service discovery (future enhancement)
--discovery-service=consul://localhost:8500/dynamodb-cluster
--discovery-service=etcd://localhost:2379/dynamodb-cluster
--discovery-service=dns://dynamodb-cluster.local
```

---

## 🛠️ **Troubleshooting**

### **Problem 1: Split Brain Cluster**

**Symptoms:**
```bash
# Node-1 shows: "alive_members": 1
# Node-2 shows: "alive_members": 1  
# Node-3 shows: "alive_members": 1
```

**Solution:**
```bash
# Perform clean restart following bootstrap sequence
# Kill all nodes, restart in order with proper seeds
```

### **Problem 2: Node Won't Join Cluster**

**Symptoms:**
```bash
# New node shows: "total_members": 1
# Existing nodes don't see new node
```

**Diagnosis:**
```bash
# Check if seed node is reachable
curl http://localhost:8081/api/v1/status

# Check if gossip endpoint is working
curl http://localhost:8081/gossip/status
```

**Solution:**
```bash
# Use different seed node
go run cmd/server/main.go --node-id=problem-node --port=8084 --data-dir=./data/problem-node --seed-node=localhost:8082
```

### **Problem 3: Inconsistent Cluster Views**

**Symptoms:**
```bash
# Nodes show different member counts or status
Node-1: "alive_members": 3
Node-2: "alive_members": 2
Node-3: "alive_members": 3
```

**Solution:**
```bash
# Wait for gossip convergence (30-60 seconds)
# If still inconsistent, perform clean restart
```

### **Problem 4: Frontend Disconnection**

**Symptoms:**
```bash
# Dashboard shows "Disconnected" or "Fallback Mode"
```

**Diagnosis:**
```bash
# Check if any node's WebSocket endpoint is available
curl http://localhost:8081/ws
curl http://localhost:8082/ws  
curl http://localhost:8083/ws
```

**Solution:**
```bash
# Frontend automatically tries all endpoints
# Ensure at least one node is running
# Frontend falls back to API polling when WebSocket fails
```

**Frontend Resilience Features:**
- **Multi-endpoint WebSocket**: Tries ws://localhost:8081/ws, 8082/ws, 8083/ws
- **Automatic failover**: Switches to next endpoint on connection failure
- **API fallback**: Uses REST APIs when all WebSockets fail
- **Auto-reconnection**: Attempts to restore WebSocket connections
- **Status indication**: Shows "Connected", "Fallback Mode", or "Disconnected"

---

## 🎯 **Production Deployment Checklist**

### **✅ Pre-Deployment**
- [ ] Plan bootstrap sequence
- [ ] Identify seed nodes
- [ ] Prepare monitoring for cluster formation
- [ ] Test clean restart procedures

### **✅ During Deployment**
- [ ] Start bootstrap node first
- [ ] Wait for bootstrap confirmation
- [ ] Add nodes sequentially with proper seeds
- [ ] Verify cluster membership after each addition

### **✅ Post-Deployment**
- [ ] Confirm all nodes see complete membership
- [ ] Test data operations across cluster
- [ ] Verify fault tolerance with node failures
- [ ] Document seed node configurations

---

## 📊 **Cluster Health Monitoring**

### **Essential Health Checks**

```bash
# Cluster membership consistency
for port in 8081 8082 8083; do
  echo "Node $port:"
  curl -s http://localhost:$port/gossip/members | jq '.alive_members'
done

# Quorum availability
for port in 8081 8082 8083; do
  echo "Node $port quorum:"
  curl -s http://localhost:$port/api/v1/status | jq '.replication.quorum_available'
done

# Data consistency check
for port in 8081 8082 8083; do
  echo "Node $port test data:"
  curl -s http://localhost:$port/api/v1/data/health:check || echo "Node unreachable"
done
```

### **Automated Health Script**

```bash
#!/bin/bash
# cluster-health.sh

echo "🏥 Cluster Health Check"
echo "======================"

NODES=(8081 8082 8083)
ALIVE_COUNT=0

for port in "${NODES[@]}"; do
  if curl -s -f http://localhost:$port/api/v1/status > /dev/null; then
    echo "✅ Node-$((port - 8080)) (localhost:$port) - HEALTHY"
    ALIVE_COUNT=$((ALIVE_COUNT + 1))
  else
    echo "❌ Node-$((port - 8080)) (localhost:$port) - DOWN"
  fi
done

echo ""
echo "📊 Cluster Status: $ALIVE_COUNT/3 nodes alive"

if [ $ALIVE_COUNT -ge 2 ]; then
  echo "✅ Quorum Available - Cluster Operational"
else
  echo "❌ Quorum Lost - Cluster Degraded"
fi
```

---

## 🚀 **Quick Reference Commands**

### **Fresh Cluster Startup**
```bash
# Terminal 1
go run cmd/server/main.go --node-id=node-1 --port=8081 --data-dir=./data/node-1

# Terminal 2 (wait 5s)
go run cmd/server/main.go --node-id=node-2 --port=8082 --data-dir=./data/node-2 --seed-node=localhost:8081

# Terminal 3 (wait 5s)
go run cmd/server/main.go --node-id=node-3 --port=8083 --data-dir=./data/node-3 --seed-node=localhost:8081
```

### **Node Recovery (any node as seed)**
```bash
# If node-1 fails, restart using node-2 as seed
go run cmd/server/main.go --node-id=node-1 --port=8081 --data-dir=./data/node-1 --seed-node=localhost:8082

# If node-2 fails, restart using node-3 as seed  
go run cmd/server/main.go --node-id=node-2 --port=8082 --data-dir=./data/node-2 --seed-node=localhost:8083

# If node-3 fails, restart using node-1 as seed
go run cmd/server/main.go --node-id=node-3 --port=8083 --data-dir=./data/node-3 --seed-node=localhost:8081
```

### **Cluster Verification**
```bash
# Quick membership check
curl http://localhost:8081/gossip/members | jq '.alive_members'

# Detailed cluster status
curl http://localhost:8081/api/v1/status | jq '.replication'

# Test cluster operations
curl -X PUT http://localhost:8081/api/v1/data/test:cluster -H "Content-Type: application/json" -d '{"value":"cluster operational"}'
```

---

**🎉 Your distributed system now has enterprise-grade operational procedures!**