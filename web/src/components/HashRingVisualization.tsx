import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface Node {
  id: string;
  address: string;
  status: 'alive' | 'suspected' | 'failed';
}

interface RingData {
  physical_nodes: number;
  virtual_nodes: number;
  replicas: number;
  ring: Array<{
    hash: number;
    node_id: string;
  }>;
}

interface Props {
  nodes: Node[];
  ringData: RingData | null;
}

export const HashRingVisualization: React.FC<Props> = ({ nodes, ringData }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !ringData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 800;
    const height = 600;
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(width, height) / 2 - 80;
    const innerRadius = outerRadius - 40;

    svg.attr('width', width).attr('height', height);

    // Create main group
    const g = svg.append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);

    // Draw outer ring (consistent hash ring)
    g.append('circle')
      .attr('r', outerRadius)
      .attr('fill', 'none')
      .attr('stroke', '#00ff88')
      .attr('stroke-width', 3)
      .attr('opacity', 0.6);

    // Draw inner ring
    g.append('circle')
      .attr('r', innerRadius)
      .attr('fill', 'none')
      .attr('stroke', '#00ccff')
      .attr('stroke-width', 2)
      .attr('opacity', 0.3);

    // Add hash ring labels
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', -outerRadius - 20)
      .attr('fill', '#00ff88')
      .attr('font-size', '18px')
      .attr('font-weight', 'bold')
      .text('Consistent Hash Ring');

    // Calculate positions for virtual nodes
    const maxHash = Math.pow(2, 32); // 32-bit hash space
    
    // Group virtual nodes by physical node
    const nodeGroups = d3.group(ringData.ring, d => d.node_id);
    const colors = d3.scaleOrdinal(d3.schemeCategory10);

    // Draw virtual nodes
    ringData.ring.forEach((virtualNode, i) => {
      const angle = (virtualNode.hash / maxHash) * 2 * Math.PI - Math.PI / 2;
      const x = Math.cos(angle) * outerRadius;
      const y = Math.sin(angle) * outerRadius;
      
      const physicalNode = nodes.find(n => n.id === virtualNode.node_id);
      const nodeColor = colors(virtualNode.node_id);
      
      // Virtual node circle
      g.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 4)
        .attr('fill', nodeColor)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .attr('opacity', 0.8)
        .style('cursor', 'pointer')
        .on('mouseover', function() {
          d3.select(this).attr('r', 6);
          
          // Show tooltip
          const tooltip = g.append('g')
            .attr('class', 'tooltip')
            .attr('transform', `translate(${x + 15}, ${y})`);
          
          const rect = tooltip.append('rect')
            .attr('width', 120)
            .attr('height', 40)
            .attr('fill', 'rgba(0, 0, 0, 0.8)')
            .attr('stroke', nodeColor)
            .attr('rx', 5);
          
          tooltip.append('text')
            .attr('x', 60)
            .attr('y', 15)
            .attr('text-anchor', 'middle')
            .attr('fill', '#fff')
            .attr('font-size', '12px')
            .text(`Node: ${virtualNode.node_id}`);
          
          tooltip.append('text')
            .attr('x', 60)
            .attr('y', 30)
            .attr('text-anchor', 'middle')
            .attr('fill', '#aaa')
            .attr('font-size', '10px')
            .text(`Hash: ${virtualNode.hash.toString(16)}`);
        })
        .on('mouseout', function() {
          d3.select(this).attr('r', 4);
          g.select('.tooltip').remove();
        });
    });

    // Draw physical nodes in the center
    const nodeRadius = 80;
    const angleStep = (2 * Math.PI) / nodes.length;
    
    nodes.forEach((node, i) => {
      const angle = i * angleStep;
      const x = Math.cos(angle) * nodeRadius;
      const y = Math.sin(angle) * nodeRadius;
      const nodeColor = colors(node.id);
      
      // Node circle
      const nodeGroup = g.append('g')
        .attr('transform', `translate(${x}, ${y})`)
        .style('cursor', 'pointer');
      
      // Outer glow effect
      nodeGroup.append('circle')
        .attr('r', 25)
        .attr('fill', nodeColor)
        .attr('opacity', 0.1)
        .attr('stroke', nodeColor)
        .attr('stroke-width', 2);
      
      // Main node circle
      nodeGroup.append('circle')
        .attr('r', 20)
        .attr('fill', node.status === 'alive' ? nodeColor : '#666')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('filter', 'drop-shadow(0 0 10px rgba(0, 255, 136, 0.5))');
      
      // Node ID text
      nodeGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('y', 5)
        .attr('fill', '#fff')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .text(node.id);
      
      // Status indicator
      nodeGroup.append('circle')
        .attr('cx', 15)
        .attr('cy', -15)
        .attr('r', 5)
        .attr('fill', node.status === 'alive' ? '#00ff88' : '#ff4444')
        .style('animation', node.status === 'alive' ? 'pulse 2s infinite' : 'none');
      
      // Draw lines to virtual nodes
      const virtualNodes = ringData.ring.filter(vn => vn.node_id === node.id);
      virtualNodes.forEach(vn => {
        const vAngle = (vn.hash / maxHash) * 2 * Math.PI - Math.PI / 2;
        const vx = Math.cos(vAngle) * outerRadius;
        const vy = Math.sin(vAngle) * outerRadius;
        
        g.append('line')
          .attr('x1', x)
          .attr('y1', y)
          .attr('x2', vx)
          .attr('y2', vy)
          .attr('stroke', nodeColor)
          .attr('stroke-width', 1)
          .attr('opacity', 0.3);
      });
    });

    // Add statistics
    const stats = g.append('g')
      .attr('transform', `translate(${-outerRadius}, ${outerRadius + 30})`);
    
    stats.append('text')
      .attr('fill', '#00ff88')
      .attr('font-size', '14px')
      .text(`Physical Nodes: ${ringData.physical_nodes}`);
    
    stats.append('text')
      .attr('y', 20)
      .attr('fill', '#00ccff')
      .attr('font-size', '14px')
      .text(`Virtual Nodes: ${ringData.virtual_nodes}`);
    
    stats.append('text')
      .attr('y', 40)
      .attr('fill', '#ffaa00')
      .attr('font-size', '14px')
      .text(`Replicas per Node: ${ringData.replicas}`);

  }, [nodes, ringData]);

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      background: 'rgba(255, 255, 255, 0.02)',
      borderRadius: '15px',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <svg ref={svgRef} style={{ maxWidth: '100%', maxHeight: '100%' }} />
    </div>
  );
}; 