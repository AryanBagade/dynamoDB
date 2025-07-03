import React from 'react';

interface Node {
  id: string;
  address: string;
  status: 'alive' | 'suspected' | 'failed';
}

interface ReplicationData {
  replication_factor: number;
  quorum_size: number;
  current_node: string;
  total_nodes: number;
  alive_nodes: number;
  quorum_available: boolean;
}

interface Props {
  nodes: Node[];
  replicationData: ReplicationData | null;
}

export const ReplicationFlow: React.FC<Props> = ({ nodes, replicationData }) => {
  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    background: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '15px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '30px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  };

  if (!replicationData) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          No replication data available
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h2 style={{ 
        color: '#00ff88', 
        marginBottom: '30px',
        fontSize: '2rem',
        textAlign: 'center'
      }}>
        🔄 Replication Flow
      </h2>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        width: '100%',
        maxWidth: '800px'
      }}>
        <div style={{
          background: 'rgba(0, 255, 136, 0.1)',
          border: '1px solid rgba(0, 255, 136, 0.3)',
          borderRadius: '10px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📊</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00ff88' }}>
            {replicationData.replication_factor}
          </div>
          <div style={{ color: '#aaa' }}>Replication Factor</div>
        </div>
        
        <div style={{
          background: 'rgba(0, 204, 255, 0.1)',
          border: '1px solid rgba(0, 204, 255, 0.3)',
          borderRadius: '10px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>✅</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00ccff' }}>
            {replicationData.quorum_size}
          </div>
          <div style={{ color: '#aaa' }}>Quorum Size</div>
        </div>
        
        <div style={{
          background: 'rgba(255, 170, 0, 0.1)',
          border: '1px solid rgba(255, 170, 0, 0.3)',
          borderRadius: '10px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🖥️</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffaa00' }}>
            {replicationData.total_nodes}
          </div>
          <div style={{ color: '#aaa' }}>Total Nodes</div>
        </div>
      </div>

      <div style={{
        marginTop: '40px',
        textAlign: 'center',
        fontSize: '1.1rem',
        color: '#ccc',
        lineHeight: '1.6'
      }}>
        <p>
          📝 <strong>Consistency Model:</strong> R + W &gt; N ensures strong consistency
        </p>
        <p style={{ marginTop: '10px' }}>
          🎯 <strong>Current Setup:</strong> {replicationData.quorum_size} out of {replicationData.replication_factor} replicas required
        </p>
                 <p style={{ marginTop: '10px', color: replicationData.quorum_available ? '#00ff88' : '#ff4444' }}>
           💡 <strong>Status:</strong> {replicationData.quorum_available ? 'Quorum Available' : 'Quorum Unavailable'} 
           ({replicationData.alive_nodes}/{replicationData.total_nodes} nodes alive)
         </p>
      </div>
    </div>
  );
}; 