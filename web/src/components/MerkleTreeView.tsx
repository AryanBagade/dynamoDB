import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import styled from 'styled-components';

const Container = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 25px;
  height: 500px;
  position: relative;
  overflow: hidden;
`;

const Title = styled.h3`
  color: #fff;
  margin: 0 0 20px 0;
  font-size: 1.4rem;
  font-weight: 600;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const TreeContainer = styled.div`
  width: 100%;
  height: 420px;
  position: relative;
  border-radius: 15px;
  background: rgba(0, 0, 0, 0.2);
  overflow: hidden;
`;

const Controls = styled.div`
  position: absolute;
  top: 15px;
  right: 15px;
  display: flex;
  gap: 10px;
  z-index: 10;
`;

const Button = styled.button`
  background: rgba(102, 126, 234, 0.8);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(102, 126, 234, 1);
    transform: translateY(-2px);
  }

  &:disabled {
    background: rgba(102, 126, 234, 0.4);
    cursor: not-allowed;
    transform: none;
  }
`;

const InfoPanel = styled.div`
  position: absolute;
  bottom: 15px;
  left: 15px;
  background: rgba(0, 0, 0, 0.7);
  padding: 10px 15px;
  border-radius: 10px;
  color: white;
  font-size: 0.85rem;
  z-index: 10;
  max-width: 250px;
`;

interface MerkleNode {
  hash: string;
  is_leaf: boolean;
  key?: string;
  value?: string;
  left?: MerkleNode;
  right?: MerkleNode;
  level: number;
  position: number;
}

interface MerkleTree {
  root: MerkleNode;
  node_id: string;
  timestamp: number;
  key_count: number;
  tree_depth: number;
  leaves: MerkleNode[];
}

interface Props {
  merkleData?: MerkleTree;
  comparisonData?: any;
}

const MerkleTreeView: React.FC<Props> = ({ merkleData: initialMerkleData, comparisonData }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<MerkleNode | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [merkleData, setMerkleData] = useState<MerkleTree | null>(initialMerkleData || null);
  const [isLoading, setIsLoading] = useState(false);

  // Update local state when prop changes
  useEffect(() => {
    if (initialMerkleData) {
      setMerkleData(initialMerkleData);
    }
  }, [initialMerkleData]);

  useEffect(() => {
    if (!merkleData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 400;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };

    // Create tree layout
    const tree = d3.tree<MerkleNode>()
      .size([width - margin.left - margin.right, height - margin.top - margin.bottom]);

    // Convert our tree structure to d3 hierarchy
    const root = d3.hierarchy(merkleData.root, (d) => {
      const children = [];
      if (d.left) children.push(d.left);
      if (d.right) children.push(d.right);
      return children.length > 0 ? children : null;
    });

    const treeData = tree(root);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create gradient definitions
    const defs = svg.append("defs");
    
    // Gradient for internal nodes
    const internalGradient = defs.append("linearGradient")
      .attr("id", "internalGradient")
      .attr("gradientUnits", "objectBoundingBox");
    
    internalGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#667eea");
    
    internalGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#764ba2");

    // Gradient for leaf nodes
    const leafGradient = defs.append("linearGradient")
      .attr("id", "leafGradient")
      .attr("gradientUnits", "objectBoundingBox");
    
    leafGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#43cea2");
    
    leafGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#185a9d");

    // Draw links
    g.selectAll(".link")
      .data(treeData.links())
      .enter().append("path")
      .attr("class", "link")
      .attr("d", d3.linkVertical<any, any>()
        .x((d: any) => d.x)
        .y((d: any) => d.y) as any)
      .style("fill", "none")
      .style("stroke", "rgba(255, 255, 255, 0.5)")
      .style("stroke-width", 2)
      .style("stroke-dasharray", "5,5")
      .style("opacity", 0)
      .transition()
      .duration(1000)
      .style("opacity", 1);

    // Draw nodes
    const node = g.selectAll(".node")
      .data(treeData.descendants())
      .enter().append("g")
      .attr("class", "node")
      .attr("transform", (d: any) => `translate(${d.x},${d.y})`)
      .style("opacity", 0)
      .style("cursor", "pointer");

    // Add circles for nodes
    node.append("circle")
      .attr("r", (d: any) => d.data.is_leaf ? 20 : 25)
      .style("fill", (d: any) => d.data.is_leaf ? "url(#leafGradient)" : "url(#internalGradient)")
      .style("stroke", "rgba(255, 255, 255, 0.8)")
      .style("stroke-width", 2)
      .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.3))")
      .on("click", function(event, d: any) {
        setSelectedNode(d.data);
      })
      .on("mouseover", function(event, d: any) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", (d.data.is_leaf ? 25 : 30))
          .style("stroke-width", 3);
      })
      .on("mouseout", function(event, d: any) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", (d.data.is_leaf ? 20 : 25))
          .style("stroke-width", 2);
      });

    // Add labels for leaf nodes (key names)
    node.filter((d: any) => d.data.is_leaf && d.data.key)
      .append("text")
      .attr("dy", 35)
      .attr("text-anchor", "middle")
      .style("font-family", "'JetBrains Mono', monospace")
      .style("font-size", "10px")
      .style("fill", "#fff")
      .style("font-weight", "bold")
      .text((d: any) => d.data.key ? d.data.key.substring(0, 8) + (d.data.key.length > 8 ? '...' : '') : '');

    // Add hash labels (first 6 characters)
    node.append("text")
      .attr("dy", 4)
      .attr("text-anchor", "middle")
      .style("font-family", "'JetBrains Mono', monospace")
      .style("font-size", "9px")
      .style("fill", "#fff")
      .style("font-weight", "600")
      .text((d: any) => d.data.hash.substring(0, 6));

    // Animate nodes
    node.transition()
      .duration(1000)
      .delay((d: any, i) => i * 100)
      .style("opacity", 1);

    // Add pulsing animation for root node
    node.filter((d: any, i) => i === 0)
      .select("circle")
      .style("animation", "pulse 2s infinite");

    // Add CSS for pulse animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.7; }
        100% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);

  }, [merkleData]);

  const refreshTree = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8081/api/v1/merkle-tree');
      const data = await response.json();
      if (data.merkle_tree) {
        setMerkleData(data.merkle_tree);
        console.log('🌳 Refreshed Merkle tree:', data.merkle_tree);
      }
    } catch (error) {
      console.error('Failed to refresh tree:', error);
    }
    setIsLoading(false);
  };

  const compareWithNode2 = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8081/api/v1/merkle-tree/compare/node-2');
      const data = await response.json();
      console.log('🔍 Tree comparison:', data);
      if (data.comparison) {
        setShowComparison(true);
        // You could store comparison data in state here if needed
      }
    } catch (error) {
      console.error('Failed to compare trees:', error);
    }
    setIsLoading(false);
  };

  return (
    <Container>
      <Title>🌳 Merkle Tree - Data Integrity Verification</Title>
      
      <Controls>
        <Button onClick={refreshTree} disabled={isLoading}>
          {isLoading ? '⏳' : '🔄'} Refresh
        </Button>
        <Button onClick={compareWithNode2} disabled={isLoading}>
          🔍 Compare
        </Button>
      </Controls>

      <TreeContainer>
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox="0 0 800 400"
          preserveAspectRatio="xMidYMid meet"
        />
      </TreeContainer>

      <InfoPanel>
        {merkleData ? (
          <>
            <div><strong>Node:</strong> {merkleData.node_id}</div>
            <div><strong>Keys:</strong> {merkleData.key_count}</div>
            <div><strong>Depth:</strong> {merkleData.tree_depth}</div>
            <div><strong>Root Hash:</strong> {merkleData.root.hash.substring(0, 12)}...</div>
            <div><strong>Last Updated:</strong> {new Date(merkleData.timestamp * 1000).toLocaleTimeString()}</div>
            {selectedNode && (
              <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: '8px' }}>
                <div><strong>Selected:</strong> {selectedNode.is_leaf ? 'Leaf' : 'Internal'}</div>
                <div><strong>Hash:</strong> {selectedNode.hash.substring(0, 16)}...</div>
                {selectedNode.key && <div><strong>Key:</strong> {selectedNode.key}</div>}
                {selectedNode.value && <div><strong>Value:</strong> {selectedNode.value.substring(0, 20)}...</div>}
              </div>
            )}
          </>
        ) : (
          <div>No Merkle tree data available</div>
        )}
        
        {showComparison && (
          <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: '8px' }}>
            <div style={{ color: '#43cea2' }}><strong>✅ Comparison Complete</strong></div>
            <div>Check console for details</div>
          </div>
        )}
      </InfoPanel>
    </Container>
  );
};

export default MerkleTreeView; 