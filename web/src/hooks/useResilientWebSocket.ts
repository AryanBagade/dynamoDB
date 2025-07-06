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
  total_nodes: number;
  alive_nodes: number;
  quorum_available: boolean;
  current_node: string;
  node_health?: any;
}

export interface Operation {
  type: 'put' | 'get' | 'delete';
  operation: 'put' | 'get' | 'delete';
  key: string;
  value?: string;
  timestamp: number;
  node_id: string;
  result?: 'success' | 'failure';
  quorum_achieved?: boolean;
}

const WEBSOCKET_ENDPOINTS = [
  'ws://localhost:8081/ws',
  'ws://localhost:8082/ws', 
  'ws://localhost:8083/ws'
];

const API_ENDPOINTS = [
  'http://localhost:8081',
  'http://localhost:8082',
  'http://localhost:8083'
];

export function useResilientWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [ringData, setRingData] = useState<RingData | null>(null);
  const [replicationData, setReplicationData] = useState<ReplicationData | null>(null);
  const [lastOperation, setLastOperation] = useState<Operation | null>(null);
  const [currentEndpoint, setCurrentEndpoint] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<string>('Connecting...');
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const currentEndpointIndex = useRef(0);
  const dataFetchInterval = useRef<NodeJS.Timeout | null>(null);

  // Fetch data from available API endpoints when WebSocket is down
  const fetchDataFromAPI = async () => {
    for (const endpoint of API_ENDPOINTS) {
      try {
        // Try to get status from this endpoint
        const statusResponse = await fetch(`${endpoint}/api/v1/status`, {
          timeout: 2000
        } as any);
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          
          // Try to get gossip members
          const gossipResponse = await fetch(`${endpoint}/gossip/members`);
          if (gossipResponse.ok) {
            const gossipData = await gossipResponse.json();
            
            // Convert gossip data to our node format
            const nodeList: Node[] = Object.values(gossipData.cluster_members || {}).map((member: any) => ({
              id: member.node_id,
              address: member.address,
              status: member.status,
              last_seen: new Date(member.last_seen).getTime() / 1000,
              start_time: member.incarnation,
              heartbeat_count: member.heartbeat_seq,
              uptime_seconds: statusData.node?.uptime_seconds || 0
            }));
            
            setNodes(nodeList);
            
            // Ensure replicationData has required fields
            const replicationDataWithDefaults = {
              ...statusData.replication,
              current_node: statusData.replication?.current_node || statusData.node?.id || 'unknown',
              node_health: statusData.replication?.node_health || {}
            };
            setReplicationData(replicationDataWithDefaults);
            setConnectionStatus(`Connected via API: ${endpoint}`);
            
            // Try to get ring data
            try {
              const ringResponse = await fetch(`${endpoint}/api/v1/ring`);
              if (ringResponse.ok) {
                const ringResponseData = await ringResponse.json();
                setRingData(ringResponseData.ring);
              }
            } catch (e) {
              console.log('Ring data not available from', endpoint);
            }
            
            return; // Successfully got data, exit
          }
        }
      } catch (error) {
        console.log(`API endpoint ${endpoint} not available:`, error);
      }
    }
    
    setConnectionStatus('All endpoints unavailable');
  };

  const connect = (endpointIndex: number = 0) => {
    if (endpointIndex >= WEBSOCKET_ENDPOINTS.length) {
      console.log('🔄 All WebSocket endpoints failed, using API fallback');
      setIsConnected(false);
      setConnectionStatus('WebSocket failed, using API fallback');
      
      // Start API polling
      if (dataFetchInterval.current) {
        clearInterval(dataFetchInterval.current);
      }
      dataFetchInterval.current = setInterval(fetchDataFromAPI, 3000);
      fetchDataFromAPI(); // Immediate fetch
      
      // Retry WebSocket after delay
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        connect(0);
      }, 10000);
      return;
    }

    const url = WEBSOCKET_ENDPOINTS[endpointIndex];
    currentEndpointIndex.current = endpointIndex;
    
    try {
      console.log(`🔌 Attempting WebSocket connection to: ${url}`);
      setConnectionStatus(`Connecting to ${url}...`);
      setCurrentEndpoint(url);
      
      ws.current = new WebSocket(url);
      
      ws.current.onopen = () => {
        console.log(`✅ WebSocket connected to ${url}`);
        setIsConnected(true);
        setConnectionStatus(`Connected via WebSocket: ${url}`);
        reconnectAttempts.current = 0;
        
        // Clear API polling since WebSocket is working
        if (dataFetchInterval.current) {
          clearInterval(dataFetchInterval.current);
          dataFetchInterval.current = null;
        }
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received WebSocket data:', data);
          
          switch (data.type) {
            case 'ring_state':
              if (data.nodes) setNodes(data.nodes);
              if (data.ring) setRingData(data.ring);
              if (data.replication) {
                const replicationDataWithDefaults = {
                  ...data.replication,
                  current_node: data.replication?.current_node || 'unknown',
                  node_health: data.replication?.node_health || {}
                };
                setReplicationData(replicationDataWithDefaults);
              }
              break;
              
            case 'heartbeat':
              if (data.nodes) {
                const updatedNodes = data.nodes.map((node: any) => ({
                  ...node,
                  health_status: data.health_status?.[node.id]
                }));
                setNodes(updatedNodes);
              }
              if (data.replication) {
                const replicationDataWithDefaults = {
                  ...data.replication,
                  current_node: data.replication?.current_node || 'unknown',
                  node_health: data.replication?.node_health || {}
                };
                setReplicationData(replicationDataWithDefaults);
              }
              break;
              
            case 'operation':
              // Ensure operation has both 'type' and 'operation' fields for compatibility
              const operationWithType = {
                ...data,
                type: data.operation || data.type,
                operation: data.operation || data.type
              };
              setLastOperation(operationWithType);
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.log(`❌ WebSocket disconnected from ${url}`, event);
        setIsConnected(false);
        
        // Try next endpoint
        reconnectTimeoutRef.current = setTimeout(() => {
          connect(endpointIndex + 1);
        }, 2000);
      };

      ws.current.onerror = (error) => {
        console.error(`💥 WebSocket error on ${url}:`, error);
        setIsConnected(false);
        
        // Try next endpoint immediately on error
        setTimeout(() => {
          connect(endpointIndex + 1);
        }, 1000);
      };
      
    } catch (error) {
      console.error(`Failed to create WebSocket connection to ${url}:`, error);
      // Try next endpoint
      setTimeout(() => {
        connect(endpointIndex + 1);
      }, 1000);
    }
  };

  useEffect(() => {
    connect(0);
    
    return () => {
      if (ws.current) {
        ws.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (dataFetchInterval.current) {
        clearInterval(dataFetchInterval.current);
      }
    };
  }, []);

  return {
    isConnected,
    nodes,
    ringData,
    replicationData,
    lastOperation,
    currentEndpoint,
    connectionStatus
  };
}