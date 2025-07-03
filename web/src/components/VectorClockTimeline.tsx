import React from 'react';

interface Node {
  id: string;
  status: 'alive' | 'suspected' | 'failed';
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

interface Props {
  nodes: Node[];
  lastOperation: Operation | null;
}

export const VectorClockTimeline: React.FC<Props> = ({ nodes, lastOperation }) => {
  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    background: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '15px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '30px',
    display: 'flex',
    flexDirection: 'column'
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ 
        color: '#00ff88', 
        marginBottom: '30px',
        fontSize: '2rem',
        textAlign: 'center'
      }}>
        🕒 Vector Clock Timeline
      </h2>
      
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          fontSize: '4rem',
          marginBottom: '20px'
        }}>
          ⏰
        </div>
        
        <div style={{
          textAlign: 'center',
          color: '#ccc',
          fontSize: '1.2rem'
        }}>
          Vector Clock Implementation Coming Soon!
        </div>
        
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '10px',
          padding: '20px',
          textAlign: 'center',
          maxWidth: '600px'
        }}>
          <h3 style={{ color: '#00ccff', marginBottom: '15px' }}>
            🔮 What's Coming:
          </h3>
          <ul style={{ 
            textAlign: 'left', 
            color: '#aaa',
            lineHeight: '1.8',
            listStyle: 'none',
            padding: 0
          }}>
            <li>📊 Causality tracking across operations</li>
            <li>⚡ Conflict detection and resolution</li>
            <li>🎯 Visual timeline of vector clock evolution</li>
            <li>🌊 Concurrent operation visualization</li>
            <li>📈 Logical time progression</li>
          </ul>
        </div>

        {lastOperation && (
          <div style={{
            background: 'rgba(0, 255, 136, 0.1)',
            border: '1px solid rgba(0, 255, 136, 0.3)',
            borderRadius: '10px',
            padding: '20px',
            marginTop: '20px',
            minWidth: '300px'
          }}>
            <h4 style={{ color: '#00ff88', marginBottom: '10px' }}>
              Last Operation:
            </h4>
            <div style={{ fontFamily: 'monospace', fontSize: '14px' }}>
              <div>Type: {lastOperation.type.toUpperCase()}</div>
              <div>Key: {lastOperation.key}</div>
              <div>Node: {lastOperation.node_id}</div>
              <div>Time: {new Date(lastOperation.timestamp).toLocaleTimeString()}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 