import React, { useState, useEffect } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { HashRingVisualization } from './components/HashRingVisualization';
import { NodeStatus } from './components/NodeStatus';
import { ReplicationFlow } from './components/ReplicationFlow';
import { LiveStats } from './components/LiveStats';
import { DataOperations } from './components/DataOperations';
import { VectorClockTimeline } from './components/VectorClockTimeline';
import MerkleTreeView from './components/MerkleTreeView';
import { DemoMode } from './components/DemoMode';
import { ClusterTopology } from './components/ClusterTopology';
import { PerformanceDashboard } from './components/PerformanceDashboard';
import { useResilientWebSocket } from './hooks/useResilientWebSocket';
import { Zap, Database, Network, BarChart3, Clock, TreePine, Play, Activity } from 'lucide-react';

const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #16213e 100%);
    color: #ffffff;
    overflow-x: hidden;
  }
`;

const AppContainer = styled.div`
  width: 100vw;
  height: 100vh;
  display: grid;
  grid-template-columns: 300px 1fr 350px;
  grid-template-rows: 80px 1fr;
  grid-template-areas:
    "header header header"
    "sidebar main rightbar";
  gap: 20px;
  padding: 20px;
`;

const Header = styled.header`
  grid-area: header;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 0 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(45deg, #00ff88, #00ccff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  display: flex;
  align-items: center;
  gap: 15px;
`;

const StatusBadge = styled(motion.div)<{ status: 'connected' | 'disconnected' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  background: ${props => 
    props.status === 'connected' 
      ? 'linear-gradient(45deg, #00ff88, #00cc44)' 
      : 'linear-gradient(45deg, #ff4444, #cc0000)'
  };
  color: white;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
`;

const StatusDot = styled.div<{ status: 'connected' | 'disconnected' }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: white;
  animation: ${props => props.status === 'connected' ? 'pulse 2s infinite' : 'none'};
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const Sidebar = styled.aside`
  grid-area: sidebar;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const MainContent = styled.main`
  grid-area: main;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow: hidden;
`;

const RightPanel = styled.aside`
  grid-area: rightbar;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
`;

const TabContainer = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
`;

const Tab = styled(motion.button)<{ active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  background: ${props => 
    props.active 
      ? 'linear-gradient(45deg, #00ff88, #00ccff)' 
      : 'rgba(255, 255, 255, 0.05)'
  };
  color: ${props => props.active ? '#000' : '#fff'};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => 
      props.active 
        ? 'linear-gradient(45deg, #00ff88, #00ccff)' 
        : 'rgba(255, 255, 255, 0.1)'
    };
  }
`;

type ViewMode = 'ring' | 'replication' | 'vector-clocks' | 'merkle' | 'stats' | 'topology' | 'performance' | 'demo';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('demo');
  const [merkleData, setMerkleData] = useState<any>(null);
  const { 
    isConnected, 
    nodes, 
    ringData, 
    replicationData, 
    lastOperation,
    connectionStatus
  } = useResilientWebSocket();

  // Fetch Merkle tree data when switching to Merkle view
  useEffect(() => {
    if (viewMode === 'merkle' && isConnected) {
      fetchMerkleData();
    }
  }, [viewMode, isConnected]);

  const fetchMerkleData = async () => {
    try {
      const response = await fetch('http://localhost:8081/api/v1/merkle-tree');
      const data = await response.json();
      if (data.merkle_tree) {
        setMerkleData(data.merkle_tree);
      }
    } catch (error) {
      console.error('Failed to fetch Merkle tree data:', error);
    }
  };

  const tabs = [
    { id: 'demo' as ViewMode, label: 'Demo Mode', icon: Play },
    { id: 'topology' as ViewMode, label: 'Cluster Topology', icon: Network },
    { id: 'performance' as ViewMode, label: 'Performance', icon: Activity },
    { id: 'ring' as ViewMode, label: 'Hash Ring', icon: Database },
    { id: 'replication' as ViewMode, label: 'Replication', icon: Zap },
    { id: 'vector-clocks' as ViewMode, label: 'Vector Clocks', icon: Clock },
    { id: 'merkle' as ViewMode, label: 'Merkle Trees', icon: TreePine },
    { id: 'stats' as ViewMode, label: 'Live Stats', icon: BarChart3 },
  ];

  const renderMainContent = () => {
    switch (viewMode) {
      case 'demo':
        return <DemoMode onOperationExecute={(op) => console.log('Demo operation:', op)} />;
      case 'topology':
        return <ClusterTopology nodes={nodes} />;
      case 'performance':
        return <PerformanceDashboard nodes={nodes} />;
      case 'ring':
        return <HashRingVisualization nodes={nodes} ringData={ringData} />;
      case 'replication':
        return <ReplicationFlow nodes={nodes} replicationData={replicationData} />;
      case 'vector-clocks':
        return <VectorClockTimeline nodes={nodes} lastOperation={lastOperation} />;
      case 'merkle':
        return <MerkleTreeView merkleData={merkleData} />;
      case 'stats':
        return <LiveStats nodes={nodes} ringData={ringData} />;
      default:
        return <DemoMode onOperationExecute={(op) => console.log('Demo operation:', op)} />;
    }
  };

  return (
    <>
      <GlobalStyle />
      <AppContainer>
        <Header>
          <Title>
            <Zap size={32} />
            DynamoDB Distributed System
          </Title>
          <StatusBadge
            status={isConnected ? 'connected' : 'disconnected'}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            title={connectionStatus}
          >
            <StatusDot status={isConnected ? 'connected' : 'disconnected'} />
            {isConnected ? 'Connected' : 'Fallback Mode'}
          </StatusBadge>
        </Header>

        <Sidebar>
          <NodeStatus nodes={nodes} />
          <DataOperations />
        </Sidebar>

        <MainContent>
          <TabContainer>
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <Tab
                  key={tab.id}
                  active={viewMode === tab.id}
                  onClick={() => setViewMode(tab.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <IconComponent size={18} />
                  {tab.label}
                </Tab>
              );
            })}
          </TabContainer>

          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              style={{ height: '100%', overflow: 'hidden' }}
            >
              {renderMainContent()}
            </motion.div>
          </AnimatePresence>
        </MainContent>

        <RightPanel>
          {viewMode === 'demo' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '20px',
                borderRadius: '15px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <h4 style={{ color: '#00ff88', marginBottom: '15px' }}>🎭 Demo Features</h4>
              <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'rgba(255,255,255,0.8)' }}>
                <p>• <strong>Auto-generated operations</strong> showing system in action</p>
                <p>• <strong>Fault tolerance</strong> demonstrations</p>
                <p>• <strong>Performance testing</strong> scenarios</p>
                <p>• <strong>Vector clock causality</strong> examples</p>
                <p>• <strong>Real-time visualization</strong> of distributed operations</p>
              </div>
            </motion.div>
          )}
          {viewMode === 'topology' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '20px',
                borderRadius: '15px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <h4 style={{ color: '#00ccff', marginBottom: '15px' }}>🌐 Network Topology</h4>
              <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'rgba(255,255,255,0.8)' }}>
                <p>• <strong>Live node connections</strong> with animated data flow</p>
                <p>• <strong>Gossip protocol</strong> message propagation</p>
                <p>• <strong>Replication paths</strong> visualization</p>
                <p>• <strong>Node health indicators</strong> with load metrics</p>
                <p>• <strong>Network latency</strong> and throughput stats</p>
              </div>
            </motion.div>
          )}
          {viewMode === 'performance' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '20px',
                borderRadius: '15px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <h4 style={{ color: '#ffaa00', marginBottom: '15px' }}>📊 Performance Metrics</h4>
              <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'rgba(255,255,255,0.8)' }}>
                <p>• <strong>Real-time operations</strong> per second tracking</p>
                <p>• <strong>Latency percentiles</strong> (P50, P95, P99)</p>
                <p>• <strong>Throughput distribution</strong> by operation type</p>
                <p>• <strong>Node utilization</strong> (CPU, Memory, Network)</p>
                <p>• <strong>System health</strong> and error rate monitoring</p>
              </div>
            </motion.div>
          )}
        </RightPanel>
      </AppContainer>
    </>
  );
}

export default App; 