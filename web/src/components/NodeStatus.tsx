import React from 'react';

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
}

export const NodeStatus: React.FC<Props> = ({ nodes }) => {
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'alive': return '#00ff88';
      case 'suspected': return '#ffaa00';
      case 'failed': return '#ff4444';
      default: return '#666';
    }
  };

  const containerStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '15px',
    padding: '20px',
    height: 'fit-content'
  };

  const headerStyle: React.CSSProperties = {
    fontSize: '1.2rem',
    fontWeight: '600',
    marginBottom: '20px',
    background: 'linear-gradient(45deg, #00ff88, #00ccff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  };

  const nodeCardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    padding: '15px',
    marginBottom: '15px',
    transition: 'all 0.3s ease'
  };

  const statusDotStyle = (status: string): React.CSSProperties => ({
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: getStatusColor(status),
    display: 'inline-block',
    marginRight: '8px',
    animation: status === 'alive' ? 'pulse 2s infinite' : 'none'
  });

  const statRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '0.9rem'
  };

  return (
    <div style={containerStyle}>
      <h3 style={headerStyle}>
        🖥️ Cluster Nodes
      </h3>
      
      {nodes.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
          No nodes connected
        </div>
      ) : (
        nodes.map(node => (
          <div 
            key={node.id} 
            style={nodeCardStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '12px',
              fontSize: '1.1rem',
              fontWeight: '600'
            }}>
              <span style={statusDotStyle(node.status)}></span>
              {node.id}
            </div>
            
            <div style={statRowStyle}>
              <span style={{ color: '#aaa' }}>Address:</span>
              <span>{node.address}</span>
            </div>
            
            <div style={statRowStyle}>
              <span style={{ color: '#aaa' }}>Status:</span>
              <span style={{ color: getStatusColor(node.status), fontWeight: '600' }}>
                {node.status.toUpperCase()}
              </span>
            </div>
            
            <div style={statRowStyle}>
              <span style={{ color: '#aaa' }}>Uptime:</span>
              <span>{formatUptime(node.uptime_seconds)}</span>
            </div>
            
            <div style={statRowStyle}>
              <span style={{ color: '#aaa' }}>Heartbeats:</span>
              <span>{node.heartbeat_count}</span>
            </div>
            
            <div style={statRowStyle}>
              <span style={{ color: '#aaa' }}>Last Seen:</span>
              <span>{new Date(node.last_seen * 1000).toLocaleTimeString()}</span>
            </div>
          </div>
        ))
      )}
      
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
}; 