// Real-time WebSocket hook with automatic connection management

import { useEffect, useState, useCallback, useRef } from 'react'
import { wsManager } from '@/lib/api/websocket'
import type { 
  WebSocketMessage, 
  ConnectionState, 
  RingStateMessage,
  HeartbeatMessage,
  OperationMessage 
} from '@/lib/api/types'

interface UseWebSocketOptions {
  autoConnect?: boolean
  onMessage?: (message: WebSocketMessage) => void
  onConnectionChange?: (state: ConnectionState) => void
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { autoConnect = true, onMessage, onConnectionChange } = options
  
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    wsManager.getConnectionState()
  )
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  
  // Refs to avoid stale closures
  const onMessageRef = useRef(onMessage)
  const onConnectionChangeRef = useRef(onConnectionChange)
  
  // Update refs when options change
  useEffect(() => {
    onMessageRef.current = onMessage
    onConnectionChangeRef.current = onConnectionChange
  }, [onMessage, onConnectionChange])

  // Message handler
  const handleMessage = useCallback((message: WebSocketMessage) => {
    setLastMessage(message)
    onMessageRef.current?.(message)
  }, [])

  // Connection state handler
  const handleConnectionChange = useCallback((state: ConnectionState) => {
    setConnectionState(state)
    onConnectionChangeRef.current?.(state)
  }, [])

  // Setup WebSocket connection and handlers
  useEffect(() => {
    // Add handlers
    const removeMessageHandler = wsManager.addMessageHandler(handleMessage)
    const removeConnectionHandler = wsManager.addConnectionHandler(handleConnectionChange)

    // Auto-connect if enabled
    if (autoConnect && connectionState.status === 'disconnected') {
      wsManager.connect()
    }

    // Cleanup
    return () => {
      removeMessageHandler()
      removeConnectionHandler()
    }
  }, [autoConnect, handleMessage, handleConnectionChange])

  // Public methods
  const connect = useCallback(() => {
    wsManager.connect()
  }, [])

  const disconnect = useCallback(() => {
    wsManager.disconnect()
  }, [])

  const reconnect = useCallback(() => {
    wsManager.reconnect()
  }, [])

  return {
    // Connection state
    connectionState,
    isConnected: connectionState.status === 'connected',
    isConnecting: connectionState.status === 'reconnecting',
    isDisconnected: connectionState.status === 'disconnected',
    hasError: connectionState.status === 'error',
    
    // Last message received
    lastMessage,
    
    // Connection methods
    connect,
    disconnect,
    reconnect,
    
    // Connection info
    currentEndpoint: wsManager.getCurrentEndpoint(),
    reconnectAttempts: connectionState.reconnectAttempts,
  }
}

// Specialized hooks for different message types
export function useWebSocketData() {
  const [nodes, setNodes] = useState<any[]>([])
  const [ringData, setRingData] = useState<any>(null)
  const [replicationData, setReplicationData] = useState<any>(null)
  const [storageData, setStorageData] = useState<any>(null)
  const [lastOperation, setLastOperation] = useState<any>(null)

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'ring_state': {
        const msg = message as RingStateMessage
        if (msg.nodes) setNodes(msg.nodes)
        if (msg.ring) setRingData(msg.ring)
        if (msg.replication) setReplicationData(msg.replication)
        if (msg.storage) setStorageData(msg.storage)
        break
      }
      
      case 'heartbeat': {
        const msg = message as HeartbeatMessage
        if (msg.nodes) setNodes(msg.nodes)
        if (msg.replication) setReplicationData(msg.replication)
        if (msg.storage) setStorageData(msg.storage)
        break
      }
      
      case 'operation': {
        const msg = message as OperationMessage
        setLastOperation(msg)
        break
      }
    }
  }, [])

  const wsState = useWebSocket({
    autoConnect: true,
    onMessage: handleMessage
  })

  return {
    ...wsState,
    // Real-time data
    nodes,
    ringData,
    replicationData,
    storageData,
    lastOperation,
  }
}