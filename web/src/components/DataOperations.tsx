import React, { useState } from 'react';

export const DataOperations: React.FC = () => {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [getKey, setGetKey] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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

  const sectionStyle: React.CSSProperties = {
    marginBottom: '25px',
    padding: '15px',
    background: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.05)'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    marginBottom: '10px'
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(45deg, #00ff88, #00ccff)',
    border: 'none',
    borderRadius: '8px',
    color: '#000',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  };

  const resultStyle: React.CSSProperties = {
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '15px',
    marginTop: '15px',
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#00ff88',
    maxHeight: '200px',
    overflow: 'auto'
  };

  const executeOperation = async (operation: 'put' | 'get' | 'delete', operationKey: string, operationValue?: string) => {
    setLoading(true);
    setResult(null);

    try {
      let response;
      
      if (operation === 'put') {
        response = await fetch(`http://localhost:8081/api/v1/data/${operationKey}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: operationValue })
        });
      } else if (operation === 'get') {
        response = await fetch(`http://localhost:8081/api/v1/data/${operationKey}`);
      } else {
        response = await fetch(`http://localhost:8081/api/v1/data/${operationKey}`, {
          method: 'DELETE'
        });
      }

      const data = await response.json();
      setResult({
        operation,
        status: response.status,
        success: response.ok,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      setResult({
        operation,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePut = () => {
    if (key && value) {
      executeOperation('put', key, value);
    }
  };

  const handleGet = () => {
    if (getKey) {
      executeOperation('get', getKey);
    }
  };

  const handleDelete = () => {
    if (getKey) {
      executeOperation('delete', getKey);
    }
  };

  return (
    <div style={containerStyle}>
      <h3 style={headerStyle}>
        ⚡ Data Operations
      </h3>

      {/* PUT Operation */}
      <div style={sectionStyle}>
        <h4 style={{ color: '#00ff88', marginBottom: '15px', fontSize: '1rem' }}>
          PUT Key-Value
        </h4>
        <input
          style={inputStyle}
          type="text"
          placeholder="Enter key (e.g., user:123)"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <input
          style={inputStyle}
          type="text"
          placeholder="Enter value (e.g., John Doe)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          style={buttonStyle}
          onClick={handlePut}
          disabled={loading || !key || !value}
          onMouseEnter={(e) => {
            if (!loading && key && value) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 255, 136, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {loading ? '⏳ Storing...' : '💾 Store Data'}
        </button>
      </div>

      {/* GET/DELETE Operations */}
      <div style={sectionStyle}>
        <h4 style={{ color: '#00ccff', marginBottom: '15px', fontSize: '1rem' }}>
          GET / DELETE Key
        </h4>
        <input
          style={inputStyle}
          type="text"
          placeholder="Enter key to retrieve/delete"
          value={getKey}
          onChange={(e) => setGetKey(e.target.value)}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            style={{ ...buttonStyle, background: 'linear-gradient(45deg, #00ccff, #0099ff)' }}
            onClick={handleGet}
            disabled={loading || !getKey}
          >
            {loading ? '⏳' : '📥'} GET
          </button>
          <button
            style={{ ...buttonStyle, background: 'linear-gradient(45deg, #ff4444, #cc0000)' }}
            onClick={handleDelete}
            disabled={loading || !getKey}
          >
            {loading ? '⏳' : '🗑️'} DELETE
          </button>
        </div>
      </div>

      {/* Result Display */}
      {result && (
        <div style={resultStyle}>
          <div style={{ marginBottom: '10px', color: '#00ccff', fontWeight: 'bold' }}>
            {result.operation?.toUpperCase()} Result:
          </div>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {/* Sample Operations */}
      <div style={{ 
        marginTop: '20px', 
        padding: '10px', 
        background: 'rgba(255, 255, 255, 0.02)', 
        borderRadius: '8px',
        fontSize: '12px',
        color: '#aaa'
      }}>
        <strong>💡 Try these sample operations:</strong><br/>
        • user:alice → "Alice Cooper"<br/>
        • product:laptop → "MacBook Pro M3"<br/>
        • session:abc123 → "active_token"
      </div>
    </div>
  );
}; 