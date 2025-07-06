import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Activity, Zap, Database, Network, Clock, TrendingUp } from 'lucide-react';

const DashboardContainer = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: repeat(3, 1fr);
  gap: 20px;
  height: 100%;
  padding: 20px;
`;

const MetricCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
`;

const CardTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CardValue = styled.div<{ color?: string }>`
  font-size: 1.8rem;
  font-weight: 700;
  color: ${props => props.color || '#00ff88'};
`;

const CardSubtitle = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 4px;
`;

const ChartContainer = styled.div`
  flex: 1;
  min-height: 0;
`;

const StatusGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-top: 10px;
`;

const StatusItem = styled.div`
  text-align: center;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
`;

const StatusValue = styled.div<{ color?: string }>`
  font-size: 1.2rem;
  font-weight: 600;
  color: ${props => props.color || '#00ff88'};
`;

const StatusLabel = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 4px;
`;

const AlertBadge = styled(motion.div)<{ severity: 'info' | 'warning' | 'error' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  background: ${props => {
    switch (props.severity) {
      case 'error': return 'linear-gradient(45deg, #ff4444, #cc0000)';
      case 'warning': return 'linear-gradient(45deg, #ffaa00, #ff8800)';
      default: return 'linear-gradient(45deg, #00ccff, #0088cc)';
    }
  }};
  color: white;
`;

interface Props {
  nodes: any[];
}

export const PerformanceDashboard: React.FC<Props> = ({ nodes }) => {
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [latencyData, setLatencyData] = useState<any[]>([]);
  const [throughputData, setThroughputData] = useState<any[]>([]);
  const [nodeUtilization, setNodeUtilization] = useState<any[]>([]);
  const [networkStats, setNetworkStats] = useState<any[]>([]);

  // Generate realistic performance data
  useEffect(() => {
    const generateData = () => {
      const now = Date.now();
      const timePoints = Array.from({ length: 20 }, (_, i) => now - (19 - i) * 5000);

      // Performance metrics over time
      const perfData = timePoints.map((time, i) => ({
        time: new Date(time).toLocaleTimeString(),
        timestamp: time,
        reads: Math.floor(Math.random() * 1000) + 800,
        writes: Math.floor(Math.random() * 600) + 400,
        deletes: Math.floor(Math.random() * 100) + 50,
        errors: Math.floor(Math.random() * 10),
      }));

      // Latency data
      const latData = timePoints.map((time, i) => ({
        time: new Date(time).toLocaleTimeString(),
        p50: Math.random() * 5 + 2,
        p95: Math.random() * 15 + 8,
        p99: Math.random() * 30 + 20,
      }));

      // Throughput by operation type
      const throughData = [
        { name: 'Reads', value: Math.floor(Math.random() * 5000) + 3000, color: '#00ff88' },
        { name: 'Writes', value: Math.floor(Math.random() * 3000) + 1500, color: '#00ccff' },
        { name: 'Deletes', value: Math.floor(Math.random() * 500) + 200, color: '#ffaa00' },
      ];

      // Node utilization
      const nodeUtil = nodes.map(node => ({
        node: node.id,
        cpu: Math.random() * 80 + 10,
        memory: Math.random() * 70 + 20,
        network: Math.random() * 60 + 30,
        storage: Math.random() * 50 + 25,
      }));

      // Network statistics
      const netStats = [
        { name: 'Gossip Messages', value: Math.floor(Math.random() * 1000) + 500 },
        { name: 'Heartbeats', value: Math.floor(Math.random() * 2000) + 1000 },
        { name: 'Replication', value: Math.floor(Math.random() * 800) + 400 },
        { name: 'Health Checks', value: Math.floor(Math.random() * 600) + 300 },
      ];

      setPerformanceData(perfData);
      setLatencyData(latData);
      setThroughputData(throughData);
      setNodeUtilization(nodeUtil);
      setNetworkStats(netStats);
    };

    generateData();
    const interval = setInterval(generateData, 5000);
    return () => clearInterval(interval);
  }, [nodes]);

  const totalOps = performanceData.length > 0 ? 
    performanceData[performanceData.length - 1]?.reads + 
    performanceData[performanceData.length - 1]?.writes + 
    performanceData[performanceData.length - 1]?.deletes : 0;

  const avgLatency = latencyData.length > 0 ? latencyData[latencyData.length - 1]?.p50 : 0;
  const errorRate = performanceData.length > 0 ? 
    (performanceData[performanceData.length - 1]?.errors / totalOps * 100) : 0;

  const customTooltip = (props: any) => {
    if (props.active && props.payload && props.payload.length) {
      return (
        <div style={{
          background: 'rgba(0, 0, 0, 0.9)',
          padding: '10px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          {props.payload.map((entry: any, index: number) => (
            <div key={index} style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Real-time Operations */}
      <MetricCard
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <CardHeader>
          <CardTitle>
            <Activity size={20} />
            Operations/sec
          </CardTitle>
          <AlertBadge severity="info">LIVE</AlertBadge>
        </CardHeader>
        <CardValue color="#00ff88">{totalOps.toLocaleString()}</CardValue>
        <CardSubtitle>Total operations per second</CardSubtitle>
        <ChartContainer>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={performanceData}>
              <CartesianGrid strokeDasharray="3,3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="time" stroke="rgba(255,255,255,0.6)" fontSize={10} />
              <YAxis stroke="rgba(255,255,255,0.6)" fontSize={10} />
              <Tooltip content={customTooltip} />
              <Area type="monotone" dataKey="reads" stackId="1" stroke="#00ff88" fill="#00ff88" fillOpacity={0.3} />
              <Area type="monotone" dataKey="writes" stackId="1" stroke="#00ccff" fill="#00ccff" fillOpacity={0.3} />
              <Area type="monotone" dataKey="deletes" stackId="1" stroke="#ffaa00" fill="#ffaa00" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </MetricCard>

      {/* Latency Metrics */}
      <MetricCard
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <CardHeader>
          <CardTitle>
            <Clock size={20} />
            Latency (ms)
          </CardTitle>
          <AlertBadge severity={avgLatency > 10 ? 'warning' : 'info'}>
            {avgLatency > 10 ? 'HIGH' : 'NORMAL'}
          </AlertBadge>
        </CardHeader>
        <CardValue color={avgLatency > 10 ? '#ffaa00' : '#00ccff'}>
          {avgLatency.toFixed(1)}ms
        </CardValue>
        <CardSubtitle>P50 latency</CardSubtitle>
        <ChartContainer>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={latencyData}>
              <CartesianGrid strokeDasharray="3,3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="time" stroke="rgba(255,255,255,0.6)" fontSize={10} />
              <YAxis stroke="rgba(255,255,255,0.6)" fontSize={10} />
              <Tooltip content={customTooltip} />
              <Line type="monotone" dataKey="p50" stroke="#00ccff" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="p95" stroke="#ffaa00" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="p99" stroke="#ff4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </MetricCard>

      {/* Throughput Distribution */}
      <MetricCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <CardHeader>
          <CardTitle>
            <TrendingUp size={20} />
            Throughput Distribution
          </CardTitle>
        </CardHeader>
        <ChartContainer>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={throughputData}
                cx="50%"
                cy="50%"
                outerRadius={60}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {throughputData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={customTooltip} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </MetricCard>

      {/* Node Utilization */}
      <MetricCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <CardHeader>
          <CardTitle>
            <Database size={20} />
            Node Utilization
          </CardTitle>
        </CardHeader>
        <ChartContainer>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={nodeUtilization}>
              <CartesianGrid strokeDasharray="3,3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="node" stroke="rgba(255,255,255,0.6)" fontSize={10} />
              <YAxis stroke="rgba(255,255,255,0.6)" fontSize={10} />
              <Tooltip content={customTooltip} />
              <Bar dataKey="cpu" fill="#00ff88" />
              <Bar dataKey="memory" fill="#00ccff" />
              <Bar dataKey="network" fill="#ffaa00" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </MetricCard>

      {/* Network Statistics */}
      <MetricCard
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
      >
        <CardHeader>
          <CardTitle>
            <Network size={20} />
            Network Activity
          </CardTitle>
        </CardHeader>
        <StatusGrid>
          {networkStats.map((stat, index) => (
            <StatusItem key={stat.name}>
              <StatusValue color={index === 0 ? '#00ff88' : index === 1 ? '#00ccff' : index === 2 ? '#ffaa00' : '#ff88cc'}>
                {stat.value}
              </StatusValue>
              <StatusLabel>{stat.name}</StatusLabel>
            </StatusItem>
          ))}
        </StatusGrid>
      </MetricCard>

      {/* System Health */}
      <MetricCard
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6 }}
      >
        <CardHeader>
          <CardTitle>
            <Zap size={20} />
            System Health
          </CardTitle>
          <AlertBadge severity={errorRate > 1 ? 'error' : errorRate > 0.5 ? 'warning' : 'info'}>
            {errorRate > 1 ? 'CRITICAL' : errorRate > 0.5 ? 'WARNING' : 'HEALTHY'}
          </AlertBadge>
        </CardHeader>
        <StatusGrid>
          <StatusItem>
            <StatusValue color="#00ff88">{nodes.filter(n => n.status === 'alive').length}/{nodes.length}</StatusValue>
            <StatusLabel>Nodes Online</StatusLabel>
          </StatusItem>
          <StatusItem>
            <StatusValue color={errorRate > 1 ? '#ff4444' : '#00ff88'}>
              {errorRate.toFixed(2)}%
            </StatusValue>
            <StatusLabel>Error Rate</StatusLabel>
          </StatusItem>
          <StatusItem>
            <StatusValue color="#00ccff">99.9%</StatusValue>
            <StatusLabel>Uptime</StatusLabel>
          </StatusItem>
          <StatusItem>
            <StatusValue color="#ffaa00">2.1s</StatusValue>
            <StatusLabel>Recovery Time</StatusLabel>
          </StatusItem>
        </StatusGrid>
      </MetricCard>
    </DashboardContainer>
  );
};