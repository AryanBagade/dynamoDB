import React from 'react';

interface Node {
  id: string;
  address: string;
  status: 'alive' | 'suspected' | 'failed';
  uptime_seconds: number;
  heartbeat_count: number;
  health_status?: {
    is_alive: boolean;
    failure_count: number;
    last_checked?: string;
    response_time?: number;
  };
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

export const LiveStats: React.FC<Props> = ({ nodes, ringData }) => {
  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    background: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '15px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '30px',
    overflow: 'auto'
  };

  const totalUptime = nodes.reduce((sum, node) => sum + node.uptime_seconds, 0);
  const avgUptime = nodes.length > 0 ? totalUptime / nodes.length : 0;
  const totalHeartbeats = nodes.reduce((sum, node) => sum + node.heartbeat_count, 0);
  const aliveNodes = nodes.filter(node => node.status === 'alive').length;

  const statCardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '15px',
    padding: '20px',
    textAlign: 'center',
    minHeight: '120px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ 
        color: '#00ff88', 
        marginBottom: '30px',
        fontSize: '2rem',
        textAlign: 'center'
      }}>
        📊 Live System Statistics
      </h2>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{
          ...statCardStyle,
          background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.1), rgba(0, 255, 136, 0.05))',
          border: '1px solid rgba(0, 255, 136, 0.3)'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🟢</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#00ff88' }}>
            {aliveNodes}
          </div>
          <div style={{ color: '#aaa' }}>Alive Nodes</div>
        </div>

        <div style={{
          ...statCardStyle,
          background: 'linear-gradient(135deg, rgba(0, 204, 255, 0.1), rgba(0, 204, 255, 0.05))',
          border: '1px solid rgba(0, 204, 255, 0.3)'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🔄</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#00ccff' }}>
            {ringData?.virtual_nodes || 0}
          </div>
          <div style={{ color: '#aaa' }}>Virtual Nodes</div>
        </div>

        <div style={{
          ...statCardStyle,
          background: 'linear-gradient(135deg, rgba(255, 170, 0, 0.1), rgba(255, 170, 0, 0.05))',
          border: '1px solid rgba(255, 170, 0, 0.3)'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>💓</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ffaa00' }}>
            {totalHeartbeats}
          </div>
          <div style={{ color: '#aaa' }}>Total Heartbeats</div>
        </div>

        <div style={{
          ...statCardStyle,
          background: 'linear-gradient(135deg, rgba(255, 68, 68, 0.1), rgba(255, 68, 68, 0.05))',
          border: '1px solid rgba(255, 68, 68, 0.3)'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>⏱️</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff4444' }}>
            {formatTime(avgUptime)}
          </div>
          <div style={{ color: '#aaa' }}>Avg Uptime</div>
        </div>
      </div>

      {/* Node Details Table */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '15px',
        padding: '20px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h3 style={{ color: '#00ccff', marginBottom: '20px', fontSize: '1.5rem' }}>
          Node Details
        </h3>
        
        {nodes.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
            No nodes connected
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr',
              gap: '15px',
              alignItems: 'center',
              padding: '10px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              fontWeight: 'bold',
              color: '#aaa'
            }}>
              <div>Node ID</div>
              <div>Address</div>
              <div>Status</div>
              <div>Uptime</div>
              <div>Heartbeats</div>
            </div>

            {nodes.map(node => (
              <div 
                key={node.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr',
                  gap: '15px',
                  alignItems: 'center',
                  padding: '15px 10px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  transition: 'background 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ fontWeight: 'bold', color: '#00ff88' }}>
                  {node.id}
                </div>
                <div style={{ color: '#ccc', fontFamily: 'monospace' }}>
                  {node.address}
                </div>
                <div>
                  <span style={{
                    color: node.status === 'alive' ? '#00ff88' : '#ff4444',
                    fontWeight: 'bold'
                  }}>
                    {node.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ color: '#00ccff' }}>
                  {formatTime(node.uptime_seconds)}
                </div>
                <div style={{ color: '#ffaa00' }}>
                  {node.heartbeat_count}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {ringData && (
        <div style={{
          marginTop: '30px',
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '15px',
          padding: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h3 style={{ color: '#00ccff', marginBottom: '15px', fontSize: '1.5rem' }}>
            Ring Statistics
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            fontSize: '1rem'
          }}>
            <div>
              <span style={{ color: '#aaa' }}>Physical Nodes:</span>
              <span style={{ color: '#00ff88', fontWeight: 'bold', marginLeft: '10px' }}>
                {ringData.physical_nodes}
              </span>
            </div>
            <div>
              <span style={{ color: '#aaa' }}>Virtual Nodes:</span>
              <span style={{ color: '#00ccff', fontWeight: 'bold', marginLeft: '10px' }}>
                {ringData.virtual_nodes}
              </span>
            </div>
            <div>
              <span style={{ color: '#aaa' }}>Replicas/Node:</span>
              <span style={{ color: '#ffaa00', fontWeight: 'bold', marginLeft: '10px' }}>
                {ringData.replicas}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 