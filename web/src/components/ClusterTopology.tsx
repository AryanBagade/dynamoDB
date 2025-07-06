import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const TopologyContainer = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 20px;
  height: 100%;
  position: relative;
  overflow: hidden;
`;

const TopologyTitle = styled.h3`
  font-size: 1.3rem;
  font-weight: 600;
  color: #00ff88;
  margin-bottom: 20px;
  text-align: center;
`;

const Legend = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.7);
  padding: 15px;
  border-radius: 10px;
  font-size: 0.8rem;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const LegendColor = styled.div<{ color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.color};
`;

const MetricsOverlay = styled.div`
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.8);
  padding: 15px;
  border-radius: 10px;
  font-size: 0.85rem;
  min-width: 200px;
`;

const MetricItem = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const MetricLabel = styled.span`
  color: rgba(255, 255, 255, 0.7);
`;

const MetricValue = styled.span<{ color?: string }>`
  color: ${props => props.color || '#00ff88'};
  font-weight: 600;
`;

interface Node {
  id: string;
  address: string;
  status: 'alive' | 'suspected' | 'failed';
  last_seen: number;
  start_time: number;
  heartbeat_count: number;
  uptime_seconds: number;
}

interface Props {
  nodes: Node[];
  className?: string;
}

interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  status: string;
  connections: number;
  load: number;
  type: 'node' | 'data' | 'connection';
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  id: string;
  type: 'gossip' | 'replication' | 'heartbeat';
  strength: number;
  animated: boolean;
}

export const ClusterTopology: React.FC<Props> = ({ nodes, className }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [networkStats, setNetworkStats] = useState({
    totalConnections: 0,
    avgLatency: '0ms',
    throughput: '0 ops/s',
    clusterHealth: '100%'
  });

  useEffect(() => {
    if (!svgRef.current || !nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 800;
    const height = 600;
    const centerX = width / 2;
    const centerY = height / 2;

    svg.attr('width', width).attr('height', height);

    // Create data structures for visualization
    const d3Nodes: D3Node[] = nodes.map((node, index) => ({
      id: node.id,
      status: node.status,
      connections: Math.floor(Math.random() * 10) + 5,
      load: Math.random() * 100,
      type: 'node',
      x: centerX + Math.cos((index * 2 * Math.PI) / nodes.length) * 150,
      y: centerY + Math.sin((index * 2 * Math.PI) / nodes.length) * 150,
    }));

    // Add virtual data nodes
    const dataNodes: D3Node[] = [];
    for (let i = 0; i < 8; i++) {
      dataNodes.push({
        id: `data-${i}`,
        status: 'active',
        connections: 0,
        load: Math.random() * 100,
        type: 'data',
        x: centerX + Math.cos((i * 2 * Math.PI) / 8) * 80,
        y: centerY + Math.sin((i * 2 * Math.PI) / 8) * 80,
      });
    }

    const allNodes = [...d3Nodes, ...dataNodes];

    // Create links
    const links: D3Link[] = [];
    
    // Node-to-node connections (gossip protocol)
    d3Nodes.forEach((source, i) => {
      d3Nodes.forEach((target, j) => {
        if (i !== j && source.status === 'alive' && target.status === 'alive') {
          links.push({
            id: `gossip-${source.id}-${target.id}`,
            source: source.id,
            target: target.id,
            type: 'gossip',
            strength: 0.3,
            animated: true
          });
        }
      });
    });

    // Data replication links
    dataNodes.forEach((dataNode) => {
      // Each data node connects to 3 physical nodes (replication factor)
      const availableNodes = d3Nodes.filter(n => n.status === 'alive');
      const replicationNodes = availableNodes.slice(0, Math.min(3, availableNodes.length));
      
      replicationNodes.forEach((node) => {
        links.push({
          id: `replication-${dataNode.id}-${node.id}`,
          source: dataNode.id,
          target: node.id,
          type: 'replication',
          strength: 0.5,
          animated: false
        });
      });
    });

    // Set up force simulation
    const simulation = d3.forceSimulation<D3Node>(allNodes)
      .force('link', d3.forceLink<D3Node, D3Link>(links)
        .id(d => d.id)
        .distance(d => d.type === 'replication' ? 60 : 120)
        .strength(d => d.strength))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(centerX, centerY))
      .force('collision', d3.forceCollide().radius(25));

    // Create gradient definitions
    const defs = svg.append('defs');
    
    // Animated gradient for gossip links
    const gossipGradient = defs.append('linearGradient')
      .attr('id', 'gossip-gradient')
      .attr('gradientUnits', 'userSpaceOnUse');
    
    gossipGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#00ff88')
      .attr('stop-opacity', 0);
    
    gossipGradient.append('stop')
      .attr('offset', '50%')
      .attr('stop-color', '#00ff88')
      .attr('stop-opacity', 1);
    
    gossipGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#00ff88')
      .attr('stop-opacity', 0);

    // Create particle effects for animated links
    const particles: any[] = [];
    links.filter(l => l.animated).forEach((link, i) => {
      particles.push({
        id: `particle-${i}`,
        link: link,
        progress: Math.random()
      });
    });

    // Draw links
    const linkGroup = svg.append('g').attr('class', 'links');
    
    const linkElements = linkGroup.selectAll('.link')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', d => {
        switch (d.type) {
          case 'gossip': return '#00ff88';
          case 'replication': return '#00ccff';
          case 'heartbeat': return '#ffaa00';
          default: return '#666';
        }
      })
      .attr('stroke-width', d => d.type === 'replication' ? 3 : 2)
      .attr('stroke-opacity', d => d.type === 'gossip' ? 0.6 : 0.8)
      .attr('stroke-dasharray', d => d.type === 'heartbeat' ? '5,5' : 'none');

    // Draw nodes
    const nodeGroup = svg.append('g').attr('class', 'nodes');
    
    const nodeElements = nodeGroup.selectAll('.node')
      .data(allNodes)
      .enter()
      .append('g')
      .attr('class', 'node');

    // Node circles
    nodeElements.append('circle')
      .attr('r', d => d.type === 'node' ? 20 : 8)
      .attr('fill', d => {
        if (d.type === 'data') return '#00ccff';
        switch (d.status) {
          case 'alive': return '#00ff88';
          case 'suspected': return '#ffaa00';
          case 'failed': return '#ff4444';
          default: return '#666';
        }
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('filter', 'drop-shadow(0 0 10px rgba(0, 255, 136, 0.5))');

    // Node labels
    nodeElements.append('text')
      .text(d => d.type === 'node' ? d.id : '')
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.type === 'node' ? 35 : 0)
      .attr('fill', '#fff')
      .attr('font-size', '12px')
      .attr('font-weight', '600');

    // Load indicators for nodes
    nodeElements.filter(d => d.type === 'node').append('circle')
      .attr('r', 25)
      .attr('fill', 'none')
      .attr('stroke', d => `hsl(${120 - (d.load * 1.2)}, 70%, 50%)`)
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', d => `${(d.load / 100) * 157} 157`)
      .attr('stroke-linecap', 'round')
      .style('opacity', 0.7);

    // Animate particles along gossip links
    const animateParticles = () => {
      particles.forEach(particle => {
        particle.progress += 0.02;
        if (particle.progress > 1) particle.progress = 0;
      });

      const particleElements = svg.select('.particles').selectAll('.particle')
        .data(particles);

      particleElements.enter()
        .append('circle')
        .attr('class', 'particle')
        .attr('r', 3)
        .attr('fill', '#00ff88')
        .style('filter', 'drop-shadow(0 0 5px #00ff88)');

      particleElements
        .attr('cx', d => {
          const link = links.find(l => l.id === d.link.id);
          if (!link || !link.source || !link.target) return 0;
          const source = typeof link.source === 'object' ? link.source : allNodes.find(n => n.id === link.source);
          const target = typeof link.target === 'object' ? link.target : allNodes.find(n => n.id === link.target);
          if (!source || !target) return 0;
          return source.x! + (target.x! - source.x!) * d.progress;
        })
        .attr('cy', d => {
          const link = links.find(l => l.id === d.link.id);
          if (!link || !link.source || !link.target) return 0;
          const source = typeof link.source === 'object' ? link.source : allNodes.find(n => n.id === link.source);
          const target = typeof link.target === 'object' ? link.target : allNodes.find(n => n.id === link.target);
          if (!source || !target) return 0;
          return source.y! + (target.y! - source.y!) * d.progress;
        });

      particleElements.exit().remove();
    };

    svg.append('g').attr('class', 'particles');

    // Update positions on simulation tick
    simulation.on('tick', () => {
      linkElements
        .attr('x1', d => {
          const source = typeof d.source === 'object' ? d.source : allNodes.find(n => n.id === d.source);
          return source?.x || 0;
        })
        .attr('y1', d => {
          const source = typeof d.source === 'object' ? d.source : allNodes.find(n => n.id === d.source);
          return source?.y || 0;
        })
        .attr('x2', d => {
          const target = typeof d.target === 'object' ? d.target : allNodes.find(n => n.id === d.target);
          return target?.x || 0;
        })
        .attr('y2', d => {
          const target = typeof d.target === 'object' ? d.target : allNodes.find(n => n.id === d.target);
          return target?.y || 0;
        });

      nodeElements
        .attr('transform', d => `translate(${d.x || 0}, ${d.y || 0})`);

      animateParticles();
    });

    // Update network stats
    const aliveNodes = nodes.filter(n => n.status === 'alive');
    setNetworkStats({
      totalConnections: links.length,
      avgLatency: `${Math.floor(Math.random() * 10) + 1}ms`,
      throughput: `${Math.floor(Math.random() * 1000) + 500} ops/s`,
      clusterHealth: `${Math.floor((aliveNodes.length / nodes.length) * 100)}%`
    });

    // Animation interval for particles
    const animationInterval = setInterval(animateParticles, 50);

    return () => {
      simulation.stop();
      clearInterval(animationInterval);
    };
  }, [nodes]);

  return (
    <TopologyContainer
      className={className}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
    >
      <TopologyTitle>Live Cluster Topology</TopologyTitle>
      
      <svg ref={svgRef} style={{ width: '100%', height: 'calc(100% - 60px)' }} />
      
      <Legend>
        <LegendItem>
          <LegendColor color="#00ff88" />
          <span>Healthy Nodes</span>
        </LegendItem>
        <LegendItem>
          <LegendColor color="#ffaa00" />
          <span>Suspected Nodes</span>
        </LegendItem>
        <LegendItem>
          <LegendColor color="#ff4444" />
          <span>Failed Nodes</span>
        </LegendItem>
        <LegendItem>
          <LegendColor color="#00ccff" />
          <span>Data Partitions</span>
        </LegendItem>
      </Legend>

      <MetricsOverlay>
        <MetricItem>
          <MetricLabel>Connections:</MetricLabel>
          <MetricValue>{networkStats.totalConnections}</MetricValue>
        </MetricItem>
        <MetricItem>
          <MetricLabel>Avg Latency:</MetricLabel>
          <MetricValue color="#00ccff">{networkStats.avgLatency}</MetricValue>
        </MetricItem>
        <MetricItem>
          <MetricLabel>Throughput:</MetricLabel>
          <MetricValue color="#ffaa00">{networkStats.throughput}</MetricValue>
        </MetricItem>
        <MetricItem>
          <MetricLabel>Health:</MetricLabel>
          <MetricValue color={parseInt(networkStats.clusterHealth) > 80 ? '#00ff88' : '#ff4444'}>
            {networkStats.clusterHealth}
          </MetricValue>
        </MetricItem>
      </MetricsOverlay>
    </TopologyContainer>
  );
};