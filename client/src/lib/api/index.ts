// API layer exports - your data gateway! 

export { apiClient, default as api } from './client'
export { wsManager, default as websocket } from './websocket'
export * from './types'

// Re-export for convenience
export type {
  Node,
  RingData, 
  ReplicationData,
  StorageStats,
  NodeStatus,
  KeyValueOperation,
  ConnectionStatus,
  WebSocketMessage,
  ApiResponse
} from './types'