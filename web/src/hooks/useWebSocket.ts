import { useState, useEffect, useRef } from 'react';

export interface Node {
  id: string;
  address: string;
  status: 'alive' | 'suspected' | 'failed';
  last_seen: number;
  start_time: number;
  heartbeat_count: number;
  uptime_seconds: number;
  health_status?: {
    is_alive: boolean;
    failure_count: number;
    last_checked?: string;
    response_time?: number;
  };
}

export interface RingData {
  physical_nodes: number;
  virtual_nodes: number;
  replicas: number;
  ring: Array<{
    hash: number;
    node_id: string;
  }>;
}

export interface ReplicationData {
  replication_factor: number;
  quorum_size: number;
  current_node: string;
  total_nodes: number;
  alive_nodes: number;
  quorum_available: boolean;
}

export interface Operation {
  type: 'put' | 'get' | 'delete';
  key: string;
  value?: string;
  timestamp: number;
  node_id: string;
  result?: 'success' | 'failure';
  quorum_achieved?: boolean;
}

export function useWebSocket(url: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [ringData, setRingData] = useState<RingData | null>(null);
  const [replicationData, setReplicationData] = useState<ReplicationData | null>(null);
  const [lastOperation, setLastOperation] = useState<Operation | null>(null);
  const [connectionHistory, setConnectionHistory] = useState<Array<{ timestamp: number; event: string }>>([]);
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  const connect = () => {
    try {
      console.log('🔌 Attempting to connect to WebSocket:', url);
      ws.current = new WebSocket(url);
      
      ws.current.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        setConnectionHistory(prev => [...prev, { 
          timestamp: Date.now(), 
          event: 'Connected to cluster' 
        }].slice(-50)); // Keep last 50 events
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received data:', data);
          
          switch (data.type) {
            case 'ring_state':
              if (data.nodes) setNodes(data.nodes);
              if (data.ring) setRingData(data.ring);
              if (data.replication) setReplicationData(data.replication);
              break;
              
            case 'heartbeat':
              // Handle new format with full nodes array and health status
              if (data.nodes) {
                console.log('🩺 Updating nodes with health status:', data.nodes);
                setNodes(data.nodes);
              }
              if (data.replication) {
                console.log('📊 Updating replication status:', data.replication);
                setReplicationData(data.replication);
              }
              break;
              
            case 'operation':
              setLastOperation(data.operation);
              setConnectionHistory(prev => [...prev, { 
                timestamp: Date.now(), 
                event: `${data.operation.type.toUpperCase()}: ${data.operation.key}` 
              }].slice(-50));
              break;
              
            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setIsConnected(false);
        setConnectionHistory(prev => [...prev, { 
          timestamp: Date.now(), 
          event: 'Disconnected from cluster' 
        }].slice(-50));
        
        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < 10) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      ws.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };
      
    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error);
    }
  };

  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [url]);

  const sendMessage = (message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send message');
    }
  };

  return {
    isConnected,
    nodes,
    ringData,
    replicationData,
    lastOperation,
    connectionHistory,
    sendMessage,
  };
} 