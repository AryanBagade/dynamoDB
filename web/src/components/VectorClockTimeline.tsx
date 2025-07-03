import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface Node {
  id: string;
  status: 'alive' | 'suspected' | 'failed';
  address?: string;
}

interface Operation {
  type: 'put' | 'get' | 'delete';
  key: string;
  value?: string;
  timestamp: number;
  node_id: string;
  result?: 'success' | 'failure';
  quorum_achieved?: boolean;
}

interface VectorClock {
  clocks: { [nodeId: string]: number };
}

interface Event {
  id: string;
  type: 'put' | 'get' | 'delete';
  key: string;
  value?: string;
  timestamp: number;
  node_id: string;
  vector_clock: VectorClock;
  causal_hash: string;
}

interface VectorClockData {
  node_id: string;
  vector_clock: VectorClock;
  event_log: {
    events: Event[];
  };
  conflicts: any[];
  timestamp: number;
  message: string;
}

interface Conflict {
  key: string;
  conflicting_events: {
    value: string;
    vector_clock: VectorClock;
    timestamp: number;
    node_id: string;
  }[];
}

interface Props {
  nodes: Node[];
  lastOperation: Operation | null;
}

export const VectorClockTimeline: React.FC<Props> = ({ nodes, lastOperation }) => {
  const [vectorClockData, setVectorClockData] = useState<VectorClockData | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [selectedNode, setSelectedNode] = useState<string>('node-1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Fetch vector clock data
  const fetchVectorClockData = async (nodeId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:808${nodeId === 'node-1' ? '1' : '2'}/api/v1/vector-clock`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setVectorClockData(data);
      setConflicts(data.conflicts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch vector clock data');
      console.error('Failed to fetch vector clock data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh data
  useEffect(() => {
    fetchVectorClockData(selectedNode);
    const interval = setInterval(() => {
      fetchVectorClockData(selectedNode);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedNode]);

  // D3.js Timeline Visualization
  useEffect(() => {
    if (!vectorClockData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 100 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.bottom - margin.top;

    const g = svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const events = vectorClockData.event_log.events || [];
    if (events.length === 0) return;

    // Create scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(events, d => new Date(d.timestamp * 1000)) as [Date, Date])
      .range([0, width]);

    const nodeIds = Array.from(new Set(events.map(e => e.node_id)));
    const yScale = d3.scaleBand()
      .domain(nodeIds)
      .range([0, height])
      .padding(0.2);

    // Color scale for event types
    const colorScale = d3.scaleOrdinal<string>()
      .domain(['put', 'get', 'delete'])
      .range(['#00ff88', '#00ccff', '#ff6b6b']);

    // Draw axes
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickFormat((domainValue: any) => {
        return d3.timeFormat('%H:%M:%S')(domainValue as Date);
      }));

    g.append('g')
      .call(d3.axisLeft(yScale));

    // Draw timeline lanes
    nodeIds.forEach(nodeId => {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', yScale(nodeId)! + yScale.bandwidth() / 2)
        .attr('y2', yScale(nodeId)! + yScale.bandwidth() / 2)
        .attr('stroke', 'rgba(255, 255, 255, 0.1)')
        .attr('stroke-width', 2);
    });

    // Draw events
    const eventGroups = g.selectAll('.event')
      .data(events)
      .enter()
      .append('g')
      .attr('class', 'event');

    // Event circles
    eventGroups
      .append('circle')
      .attr('cx', d => xScale(new Date(d.timestamp * 1000)))
      .attr('cy', d => yScale(d.node_id)! + yScale.bandwidth() / 2)
      .attr('r', 8)
      .attr('fill', d => colorScale(d.type))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer');

    // Event labels
    eventGroups
      .append('text')
      .attr('x', d => xScale(new Date(d.timestamp * 1000)))
      .attr('y', d => yScale(d.node_id)! + yScale.bandwidth() / 2 - 15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '10px')
      .text(d => `${d.type}: ${d.key}`);

    // Draw vector clock values
    eventGroups
      .append('text')
      .attr('x', d => xScale(new Date(d.timestamp * 1000)))
      .attr('y', d => yScale(d.node_id)! + yScale.bandwidth() / 2 + 20)
      .attr('text-anchor', 'middle')
      .attr('fill', '#aaa')
      .attr('font-size', '8px')
      .text(d => {
        const clocks = Object.entries(d.vector_clock.clocks)
          .map(([node, count]) => `${node}:${count}`)
          .join(', ');
        return `[${clocks}]`;
      });

    // Add legend
    const legend = g.append('g')
      .attr('transform', `translate(${width - 150}, 10)`);

    ['put', 'get', 'delete'].forEach((type, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);
      
      legendItem.append('circle')
        .attr('r', 6)
        .attr('fill', colorScale(type));
      
      legendItem.append('text')
        .attr('x', 15)
        .attr('y', 5)
        .attr('fill', '#fff')
        .attr('font-size', '12px')
        .text(type.toUpperCase());
    });

  }, [vectorClockData]);

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    background: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '15px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '30px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto'
  };

  return (
    <div style={containerStyle}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ 
          color: '#00ff88', 
          fontSize: '2rem',
          margin: 0
        }}>
          🕒 Vector Clock Timeline
        </h2>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          {['node-1', 'node-2'].map(nodeId => (
            <button
              key={nodeId}
              onClick={() => setSelectedNode(nodeId)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: selectedNode === nodeId 
                  ? 'linear-gradient(45deg, #00ff88, #00ccff)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: selectedNode === nodeId ? '#000' : '#fff',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              {nodeId}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(255, 107, 107, 0.1)',
          border: '1px solid rgba(255, 107, 107, 0.3)',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          color: '#ff6b6b'
        }}>
          ❌ Error: {error}
        </div>
      )}

      {isLoading && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '50px',
          color: '#aaa'
        }}>
          🔄 Loading vector clock data...
        </div>
      )}

      {vectorClockData && !isLoading && (
        <>
          {/* Current Vector Clock State */}
          <div style={{
            background: 'rgba(0, 255, 136, 0.1)',
            border: '1px solid rgba(0, 255, 136, 0.3)',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h3 style={{ color: '#00ff88', marginBottom: '15px' }}>
              📊 Current Vector Clock State ({selectedNode})
            </h3>
            <div style={{ 
              fontFamily: 'monospace',
              fontSize: '14px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '10px'
            }}>
              {Object.entries(vectorClockData.vector_clock.clocks || {}).map(([nodeId, count]) => (
                <div key={nodeId} style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#00ccff', fontSize: '12px' }}>{nodeId}</div>
                  <div style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>{count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Conflicts */}
          {conflicts.length > 0 && (
            <div style={{
              background: 'rgba(255, 107, 107, 0.1)',
              border: '1px solid rgba(255, 107, 107, 0.3)',
              borderRadius: '10px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <h3 style={{ color: '#ff6b6b', marginBottom: '15px' }}>
                ⚠️ Detected Conflicts ({conflicts.length})
              </h3>
              {conflicts.map((conflict, index) => (
                <div key={index} style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '10px',
                  fontFamily: 'monospace',
                  fontSize: '12px'
                }}>
                  <div style={{ color: '#ff6b6b', fontWeight: 'bold' }}>Key: {conflict.key}</div>
                  {conflict.conflicting_events.map((event: any, eventIndex: number) => (
                    <div key={eventIndex} style={{ marginTop: '5px', color: '#ccc' }}>
                      → {event.node_id}: "{event.value}" [{Object.entries(event.vector_clock.clocks).map(([n, c]) => `${n}:${c}`).join(', ')}]
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Timeline Visualization */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h3 style={{ color: '#00ccff', marginBottom: '15px' }}>
              📈 Event Timeline
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <svg ref={svgRef}></svg>
            </div>
          </div>

          {/* Event Log */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '10px',
            padding: '20px'
          }}>
            <h3 style={{ color: '#00ccff', marginBottom: '15px' }}>
              📋 Recent Events ({vectorClockData.event_log.events?.length || 0})
            </h3>
            <div style={{ 
              maxHeight: '300px', 
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: '12px'
            }}>
              {vectorClockData.event_log.events?.slice(-10).reverse().map((event, index) => (
                <div key={event.id} style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  marginBottom: '5px',
                  borderLeft: `3px solid ${event.type === 'put' ? '#00ff88' : event.type === 'get' ? '#00ccff' : '#ff6b6b'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#00ccff' }}>
                      {event.type.toUpperCase()}: {event.key}
                    </span>
                    <span style={{ color: '#aaa', fontSize: '10px' }}>
                      {new Date(event.timestamp * 1000).toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={{ color: '#aaa', marginTop: '4px' }}>
                    Node: {event.node_id} | VC: [{Object.entries(event.vector_clock.clocks).map(([n, c]) => `${n}:${c}`).join(', ')}]
                  </div>
                  {event.value && (
                    <div style={{ color: '#ccc', marginTop: '2px' }}>
                      Value: "{event.value}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}; 