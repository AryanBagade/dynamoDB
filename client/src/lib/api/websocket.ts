// Real-time WebSocket connection with resilient fallback

import type { 
  WebSocketMessage, 
  RingStateMessage, 
  HeartbeatMessage, 
  OperationMessage,
  ConnectionState,
  ConnectionStatus 
} from './types'

// WebSocket endpoints matching your backend
const WEBSOCKET_ENDPOINTS = [
  'ws://localhost:8081/ws',
  'ws://localhost:8082/ws', 
  'ws://localhost:8083/ws'
]

type MessageHandler = (message: WebSocketMessage) => void
type ConnectionHandler = (state: ConnectionState) => void

class WebSocketManager {
  private ws: WebSocket | null = null
  private currentEndpointIndex = 0
  private reconnectTimeout: NodeJS.Timeout | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private maxReconnectDelay = 30000

  private messageHandlers = new Set<MessageHandler>()
  private connectionHandlers = new Set<ConnectionHandler>()

  private connectionState: ConnectionState = {
    status: 'disconnected',
    reconnectAttempts: 0
  }

  constructor() {
    // Auto-reconnect on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.connectionState.status === 'disconnected') {
        this.connect()
      }
    })

    // Auto-reconnect on online
    window.addEventListener('online', () => {
      if (this.connectionState.status === 'disconnected') {
        this.connect()
      }
    })
  }

  connect(endpointIndex = 0): void {
    if (endpointIndex >= WEBSOCKET_ENDPOINTS.length) {
      console.log('🔄 All WebSocket endpoints failed, will retry after delay')
      this.updateConnectionState({
        status: 'error',
        reconnectAttempts: this.reconnectAttempts
      })
      this.scheduleReconnect()
      return
    }

    const url = WEBSOCKET_ENDPOINTS[endpointIndex]
    this.currentEndpointIndex = endpointIndex

    try {
      console.log(`🔌 Connecting to WebSocket: ${url}`)
      this.updateConnectionState({
        status: 'reconnecting',
        endpoint: url,
        reconnectAttempts: this.reconnectAttempts
      })

      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        console.log(`✅ WebSocket connected: ${url}`)
        this.reconnectAttempts = 0
        this.updateConnectionState({
          status: 'connected',
          endpoint: url,
          lastConnected: Date.now(),
          reconnectAttempts: 0
        })
        
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout)
          this.reconnectTimeout = null
        }
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          console.log('📨 WebSocket message:', message.type, message)
          
          // Notify all handlers
          this.messageHandlers.forEach(handler => {
            try {
              handler(message)
            } catch (error) {
              console.error('Error in message handler:', error)
            }
          })
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      this.ws.onclose = (event) => {
        console.log(`❌ WebSocket closed: ${url}`, event.code, event.reason)
        this.updateConnectionState({
          status: 'disconnected',
          reconnectAttempts: this.reconnectAttempts
        })

        // Try next endpoint or reconnect
        setTimeout(() => {
          this.connect(endpointIndex + 1)
        }, 1000)
      }

      this.ws.onerror = (error) => {
        console.error(`💥 WebSocket error: ${url}`, error)
        this.updateConnectionState({
          status: 'error',
          reconnectAttempts: this.reconnectAttempts
        })

        // Try next endpoint immediately
        setTimeout(() => {
          this.connect(endpointIndex + 1)
        }, 500)
      }

    } catch (error) {
      console.error(`Failed to create WebSocket: ${url}`, error)
      setTimeout(() => {
        this.connect(endpointIndex + 1)
      }, 500)
    }
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.updateConnectionState({
      status: 'disconnected',
      reconnectAttempts: 0
    })
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }

    this.reconnectAttempts++
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay)

    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      console.log(`⏰ Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`)
      this.reconnectTimeout = setTimeout(() => {
        this.connect(0)
      }, delay)
    } else {
      console.log('❌ Max reconnect attempts reached')
      this.updateConnectionState({
        status: 'error',
        reconnectAttempts: this.reconnectAttempts
      })
    }
  }

  private updateConnectionState(updates: Partial<ConnectionState>): void {
    this.connectionState = { ...this.connectionState, ...updates }
    this.connectionHandlers.forEach(handler => {
      try {
        handler(this.connectionState)
      } catch (error) {
        console.error('Error in connection handler:', error)
      }
    })
  }

  // Public methods for managing handlers
  addMessageHandler(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }

  addConnectionHandler(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler)
    return () => this.connectionHandlers.delete(handler)
  }

  getConnectionState(): ConnectionState {
    return { ...this.connectionState }
  }

  getCurrentEndpoint(): string | undefined {
    return WEBSOCKET_ENDPOINTS[this.currentEndpointIndex]
  }

  // Force reconnect
  reconnect(): void {
    this.disconnect()
    this.reconnectAttempts = 0
    this.connect(0)
  }
}

// Singleton instance
export const wsManager = new WebSocketManager()
export default wsManager