import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { 
  Server, 
  Cpu, 
  MemoryStick, 
  Wifi, 
  Clock, 
  Plus,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react"

interface NodeInfo {
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
  }
  // Simulated metrics for demo
  cpu_usage?: number
  memory_usage?: number
  latency?: number
}

interface ClusterStats {
  total_nodes: number
  healthy_nodes: number
  total_keys: number
  avg_latency: number
}

export function NodeStatus() {
  const [nodes, setNodes] = useState<NodeInfo[]>([])
  const [stats, setStats] = useState<ClusterStats>({
    total_nodes: 0,
    healthy_nodes: 0,
    total_keys: 0,
    avg_latency: 0
  })
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // First, fetch initial data from REST API
    fetchInitialData()
    
    // Then connect to WebSocket for real-time updates
    connectWebSocket()
    
    return () => {
      // Cleanup WebSocket connection
    }
  }, [])

  const fetchInitialData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/v1/ring')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.nodes && Array.isArray(data.nodes)) {
        setNodes(data.nodes)
        updateStats(data.nodes)
      } else {
        setNodes([])
        updateStats([])
      }
      
      setIsLoading(false)
    } catch (error) {
      console.error('Failed to fetch initial data:', error)
      setError(error instanceof Error ? error.message : 'Failed to connect to backend')
      setNodes([])
      updateStats([])
      setIsLoading(false)
    }
  }

  const connectWebSocket = () => {
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${wsProtocol}//${window.location.host}/ws`
      const ws = new WebSocket(wsUrl)
      
      ws.onopen = () => {
        setIsConnected(true)
        setError(null)
        console.log('WebSocket connected to backend')
      }
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.nodes && Array.isArray(data.nodes)) {
            setNodes(data.nodes)
            updateStats(data.nodes)
          }
        } catch (parseError) {
          console.error('Failed to parse WebSocket message:', parseError)
        }
      }
      
      ws.onclose = () => {
        setIsConnected(false)
        // Reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000)
      }
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsConnected(false)
      }
      
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
      setIsConnected(false)
    }
  }



  const updateStats = (nodeList: NodeInfo[]) => {
    const healthy = nodeList.filter(n => n.status === 'alive').length
    const avgLatency = nodeList.length > 0 
      ? nodeList.reduce((sum, n) => sum + (n.latency || 0), 0) / nodeList.length 
      : 0
    
    setStats({
      total_nodes: nodeList.length,
      healthy_nodes: healthy,
      total_keys: 0, // Will be fetched from backend storage stats
      avg_latency: Math.round(avgLatency)
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'alive':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Healthy</Badge>
      case 'suspected':
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">Warning</Badge>
      case 'failed':
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'alive':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'suspected':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Server className="h-4 w-4 text-gray-500" />
    }
  }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const formatLastSeen = (timestamp: number) => {
    const diff = Date.now() / 1000 - timestamp
    if (diff < 60) return `${Math.floor(diff)}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  }



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Cluster Nodes</h1>
          <p className="text-muted-foreground">Monitor node health and performance across your distributed cluster</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Node
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">TOTAL NODES</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Server className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{stats.total_nodes}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">HEALTHY NODES</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold text-green-600">{stats.healthy_nodes}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">TOTAL KEYS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <MemoryStick className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{stats.total_keys.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">AVG LATENCY</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Wifi className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{stats.avg_latency}ms</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-muted-foreground">Connecting to cluster...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-800 dark:text-red-400">
              <XCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Failed to connect to backend</p>
                <p className="text-sm">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={fetchInitialData}
                >
                  Retry Connection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && nodes.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center space-y-4">
            <Server className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <p className="text-lg font-medium">No nodes found</p>
              <p className="text-muted-foreground">Start your cluster nodes or check backend connection</p>
            </div>
            <Button onClick={fetchInitialData}>
              <Plus className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Nodes List */}
      {!isLoading && !error && nodes.length > 0 && (
        <div className="space-y-4">
          {nodes.map((node) => (
          <Card key={node.id} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getStatusIcon(node.status)}
                <div>
                  <h3 className="text-lg font-semibold">{node.id}</h3>
                  <p className="text-sm text-muted-foreground">{node.address}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {getStatusBadge(node.status)}
                <Button variant="outline" size="sm">Manage</Button>
              </div>
            </div>

                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
               {node.cpu_usage !== undefined && (
                 <div className="space-y-1">
                   <div className="flex items-center space-x-1">
                     <Cpu className="h-4 w-4 text-muted-foreground" />
                     <span className="text-muted-foreground">CPU</span>
                   </div>
                   <div className="font-medium">{node.cpu_usage}%</div>
                   <div className="w-full bg-muted rounded-full h-2">
                     <div 
                       className="h-2 rounded-full transition-all duration-300"
                       style={{ 
                         width: `${node.cpu_usage}%`,
                         backgroundColor: node.cpu_usage >= 80 ? '#ef4444' : node.cpu_usage >= 60 ? '#f59e0b' : '#22c55e'
                       }}
                     />
                   </div>
                 </div>
               )}

               {node.memory_usage !== undefined && (
                 <div className="space-y-1">
                   <div className="flex items-center space-x-1">
                     <MemoryStick className="h-4 w-4 text-muted-foreground" />
                     <span className="text-muted-foreground">Memory</span>
                   </div>
                   <div className="font-medium">{node.memory_usage}%</div>
                   <div className="w-full bg-muted rounded-full h-2">
                     <div 
                       className="h-2 rounded-full transition-all duration-300"
                       style={{ 
                         width: `${node.memory_usage}%`,
                         backgroundColor: node.memory_usage >= 80 ? '#ef4444' : node.memory_usage >= 60 ? '#f59e0b' : '#22c55e'
                       }}
                     />
                   </div>
                 </div>
               )}

               <div className="space-y-1">
                 <div className="flex items-center space-x-1">
                   <Clock className="h-4 w-4 text-muted-foreground" />
                   <span className="text-muted-foreground">Last Seen</span>
                 </div>
                 <div className="font-medium">{formatLastSeen(node.last_seen)}</div>
               </div>

               <div className="space-y-1">
                 <span className="text-muted-foreground">Uptime</span>
                 <div className="font-medium">{formatUptime(node.uptime_seconds)}</div>
               </div>
             </div>
             
             {/* Additional node info */}
             <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mt-4 pt-4 border-t">
               <div className="space-y-1">
                 <span className="text-muted-foreground">Node ID</span>
                 <div className="font-mono text-xs">{node.id}</div>
               </div>
               
               <div className="space-y-1">
                 <span className="text-muted-foreground">Heartbeats</span>
                 <div className="font-medium">{node.heartbeat_count.toLocaleString()}</div>
               </div>

               {node.health_status && (
                 <div className="space-y-1">
                   <span className="text-muted-foreground">Failures</span>
                   <div className="font-medium">{node.health_status.failure_count}</div>
                 </div>
               )}
             </div>
                     </Card>
          ))}
        </div>
      )}

      {/* Connection Status */}
      {!isConnected && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2 text-orange-800 dark:text-orange-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Connecting to real-time updates...</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 