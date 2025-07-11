// Backend API types - matching your Go structs exactly!

export interface Node {
  id: string
  address: string
  status: 'alive' | 'suspected' | 'failed'
  last_seen: number
  start_time: number
  heartbeat_count: number
  uptime_seconds: number
  health_status?: {
    is_alive: boolean
    failure_count: number
    last_checked?: string
    response_time?: number
  }
}

export interface RingData {
  physical_nodes: number
  virtual_nodes: number
  replicas: number
  ring: Array<{
    hash: number
    node_id: string
  }>
}

export interface ReplicationData {
  replication_factor: number
  quorum_size: number
  total_nodes: number
  alive_nodes: number
  quorum_available: boolean
  current_node: string
  node_health?: Record<string, any>
}

export interface StorageStats {
  node_id: string
  data_path: string
  key_count: number
  vector_clock: string
  event_count: number
  known_nodes: number
  current_time: number
  keys?: string[]
}

export interface NodeStatus {
  node: Node
  storage: StorageStats
  replication: ReplicationData
  timestamp: number
  message: string
}

export interface KeyValueOperation {
  key: string
  value?: string
  responsible_node: string
  replication_nodes: string[]
  vector_clock: string
  event_count: number
  timestamp: number
}

export interface MerkleTree {
  root: {
    hash: string
    is_leaf: boolean
    level: number
    position: number
  }
  node_id: string
  timestamp: number
  key_count: number
  tree_depth: number
}

export interface VectorClock {
  clocks: Record<string, number>
}

export interface Event {
  id: string
  type: 'put' | 'get' | 'delete'
  key: string
  value?: string
  node_id: string
  vector_clock: VectorClock
  timestamp: number
  causal_hash: string
}

export interface EventLog {
  events: Event[]
  node_id: string
  current_clock: VectorClock
  known_nodes: Record<string, boolean>
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'ring_state' | 'heartbeat' | 'operation' | 'error'
  timestamp: number
  data: any
}

export interface RingStateMessage extends WebSocketMessage {
  type: 'ring_state'
  nodes: Node[]
  ring: RingData
  replication: ReplicationData
  storage: StorageStats
}

export interface HeartbeatMessage extends WebSocketMessage {
  type: 'heartbeat'
  nodes: Node[]
  replication: ReplicationData
  storage: StorageStats
}

export interface OperationMessage extends WebSocketMessage {
  type: 'operation'
  operation: 'put' | 'get' | 'delete'
  key: string
  value?: string
  node_id: string
  result: 'success' | 'failure'
  quorum_achieved?: boolean
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  timestamp: number
}

export interface ClusterInfo {
  ring: RingData
  nodes: Node[]
  current_node: string
}

// Connection status
export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected' | 'error'

export interface ConnectionState {
  status: ConnectionStatus
  endpoint?: string
  lastConnected?: number
  reconnectAttempts: number
}