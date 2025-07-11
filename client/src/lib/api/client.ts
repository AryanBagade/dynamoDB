// REST API client for your Go backend

import type { 
  ApiResponse, 
  NodeStatus, 
  ClusterInfo, 
  StorageStats,
  MerkleTree,
  EventLog,
  KeyValueOperation 
} from './types'

// API endpoints configuration
const API_ENDPOINTS = [
  'http://localhost:8081',
  'http://localhost:8082', 
  'http://localhost:8083'
]

class ApiClient {
  private currentEndpointIndex = 0
  private baseURL = API_ENDPOINTS[0]

  private async fetchWithFallback<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    for (let i = 0; i < API_ENDPOINTS.length; i++) {
      const url = `${API_ENDPOINTS[this.currentEndpointIndex]}${endpoint}`
      
      try {
        const response = await fetch(url, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          ...options,
        } as any)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        return data
      } catch (error) {
        console.warn(`API endpoint ${url} failed:`, error)
        
        // Try next endpoint
        this.currentEndpointIndex = (this.currentEndpointIndex + 1) % API_ENDPOINTS.length
        
        // If this was the last endpoint, throw the error
        if (i === API_ENDPOINTS.length - 1) {
          throw error
        }
      }
    }

    throw new Error('All API endpoints failed')
  }

  // Node operations
  async getStatus(): Promise<NodeStatus> {
    return this.fetchWithFallback<NodeStatus>('/api/v1/status')
  }

  async getCluster(): Promise<ClusterInfo> {
    return this.fetchWithFallback<ClusterInfo>('/api/v1/cluster')
  }

  async getRing(): Promise<ClusterInfo> {
    return this.fetchWithFallback<ClusterInfo>('/api/v1/ring')
  }

  async getStorageStats(): Promise<StorageStats> {
    return this.fetchWithFallback<StorageStats>('/api/v1/storage')
  }

  // Key-Value operations
  async putData(key: string, value: string): Promise<KeyValueOperation> {
    return this.fetchWithFallback<KeyValueOperation>(`/api/v1/data/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    })
  }

  async getData(key: string): Promise<KeyValueOperation> {
    return this.fetchWithFallback<KeyValueOperation>(`/api/v1/data/${key}`)
  }

  async deleteData(key: string): Promise<KeyValueOperation> {
    return this.fetchWithFallback<KeyValueOperation>(`/api/v1/data/${key}`, {
      method: 'DELETE',
    })
  }

  // Merkle Tree operations
  async getMerkleTree(): Promise<{ merkle_tree: MerkleTree }> {
    return this.fetchWithFallback<{ merkle_tree: MerkleTree }>('/api/v1/merkle-tree')
  }

  async compareMerkleTrees(targetNodeId: string): Promise<any> {
    return this.fetchWithFallback(`/api/v1/merkle-tree/compare/${targetNodeId}`)
  }

  // Vector Clock operations
  async getVectorClock(): Promise<{ 
    node_id: string
    vector_clock: any
    event_log: EventLog
    conflicts: any[]
  }> {
    return this.fetchWithFallback('/api/v1/vector-clock')
  }

  async getEventHistory(key?: string): Promise<{
    node_id: string
    total_events: number
    events: any[]
    conflicts: any[]
    key_history?: any[]
    vector_clock: any
  }> {
    const url = key ? `/api/v1/events?key=${encodeURIComponent(key)}` : '/api/v1/events'
    return this.fetchWithFallback(url)
  }

  // Gossip protocol endpoints
  async getClusterMembers(): Promise<{ cluster_members: Record<string, any> }> {
    return this.fetchWithFallback('/gossip/members')
  }

  async getGossipStatus(): Promise<any> {
    return this.fetchWithFallback('/gossip/status')
  }

  async getRumors(): Promise<any> {
    return this.fetchWithFallback('/gossip/rumors')
  }

  // Utility methods
  getCurrentEndpoint(): string {
    return API_ENDPOINTS[this.currentEndpointIndex]
  }

  setEndpoint(index: number): void {
    if (index >= 0 && index < API_ENDPOINTS.length) {
      this.currentEndpointIndex = index
      this.baseURL = API_ENDPOINTS[index]
    }
  }
}

// Singleton instance
export const apiClient = new ApiClient()
export default apiClient