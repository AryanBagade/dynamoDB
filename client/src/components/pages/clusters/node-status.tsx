import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useNodeDashboard } from "@/hooks/useNodes"
import { useState, useEffect } from "react"

import { 
  Server, 
  Cpu, 
  MemoryStick, 
  Wifi, 
  Clock, 
  Plus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Heart,
  Info
} from "lucide-react"

// Info tooltip component
function MetricInfo({ description }: { description: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="h-3 w-3 text-muted-foreground hover:text-primary cursor-help transition-colors" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-xs">{description}</p>
      </TooltipContent>
    </Tooltip>
  )
}

export function NodeStatus() {
  const { 
    nodeStatus, 
    storage, 
    stats, 
    isLoading, 
    isError, 
    isRealTime,
    connectionStatus 
  } = useNodeDashboard()

  const nodes = nodeStatus.nodes || []
  
  // Real-time clock for live updates
  const [currentTime, setCurrentTime] = useState(Date.now())
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

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
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold">Cluster Nodes</h1>
            {isRealTime && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse mr-2" />
                LIVE
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Monitor node health and performance across your distributed cluster
            <span className="ml-2 text-xs">
              • Last update: {new Date().toLocaleTimeString('en-US', { hour12: true, second: '2-digit' })}
            </span>
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Node
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="transition-all duration-300 hover:shadow-lg hover:scale-105 hover:bg-blue-50/10 group">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">TOTAL NODES</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Server className="h-5 w-5 text-blue-500 group-hover:animate-bounce" />
              <span className="text-2xl font-bold transition-all duration-500 group-hover:scale-110 font-mono">
                {stats.totalNodes}
              </span>
              {isRealTime && (
                <Badge variant="outline" className="text-xs animate-pulse border-green-500 text-green-600">
                  Live
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="transition-all duration-300 hover:shadow-lg hover:scale-105 hover:bg-green-50/10 group">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">HEALTHY NODES</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500 group-hover:animate-spin" />
              <span className="text-2xl font-bold text-green-600 font-mono transition-all duration-500 group-hover:scale-110">
                {stats.aliveNodes}
              </span>
              {connectionStatus === 'connected' && (
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="transition-all duration-300 hover:shadow-lg hover:scale-105 hover:bg-purple-50/10 group">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">TOTAL KEYS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <MemoryStick className="h-5 w-5 text-purple-500 group-hover:animate-pulse" />
              <span className="text-2xl font-bold text-purple-600 font-mono transition-all duration-500 group-hover:scale-110">
                {stats.totalKeys.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="transition-all duration-300 hover:shadow-lg hover:scale-105 hover:bg-red-50/10 group overflow-hidden relative">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">TOTAL HEARTBEATS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-red-500 animate-pulse group-hover:animate-bounce" />
              <span className="text-2xl font-bold text-red-600 font-mono transition-all duration-500 group-hover:scale-110">
                {stats.totalHeartbeats.toLocaleString()}
              </span>
              {isRealTime && (
                <div className="flex space-x-1">
                  <div className="h-2 w-2 bg-red-500 rounded-full animate-ping" />
                  <div className="h-1 w-1 bg-red-400 rounded-full animate-bounce" />
                </div>
              )}
            </div>
            {/* Heartbeat wave animation */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-red-500/20 to-pink-500/20 animate-pulse" />
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
      {isError && !isLoading && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-800 dark:text-red-400">
              <XCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Failed to connect to backend</p>
                <p className="text-sm">Connection Status: {connectionStatus}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => nodeStatus.refetch()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Connection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !isError && nodes.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center space-y-4">
            <Server className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <p className="text-lg font-medium">No nodes found</p>
              <p className="text-muted-foreground">Start your cluster nodes or check backend connection</p>
            </div>
            <Button onClick={() => nodeStatus.refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Nodes List */}
      {!isLoading && !isError && nodes.length > 0 && (
        <div className="space-y-4">
          {nodes.map((node, index) => (
          <Card 
            key={node.id} 
            className="p-6"
          >
            {/* Header Section */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                {getStatusIcon(node.status)}
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold">{node.id}</h3>
                    {node.status === 'alive' && (
                      <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">{node.address}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {getStatusBadge(node.status)}
                <Button variant="outline" size="sm">Manage</Button>
              </div>
            </div>

            {/* Performance Metrics - Compact */}
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Cpu className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-muted-foreground">CPU</span>
                    <MetricInfo description="Processor usage percentage. Shows how much computing power this node is currently using. Green: <60%, Orange: 60-79%, Red: 80%+" />
                  </div>
                  <span className="text-sm font-medium">{Math.round(node.cpu_usage || 0)}%</span>
                </div>
                <Progress 
                  value={node.cpu_usage || 0} 
                  className="h-2"
                  indicatorColor={(node.cpu_usage || 0) >= 80 ? '#ef4444' : (node.cpu_usage || 0) >= 60 ? '#f59e0b' : '#22c55e'}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MemoryStick className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-muted-foreground">Memory</span>
                    <MetricInfo description="RAM usage percentage. Indicates how much memory this node is consuming for data storage and operations. High memory usage may affect performance." />
                  </div>
                  <span className="text-sm font-medium">{Math.round(node.memory_usage || 0)}%</span>
                </div>
                <Progress 
                  value={node.memory_usage || 0} 
                  className="h-2"
                  indicatorColor={(node.memory_usage || 0) >= 80 ? '#ef4444' : (node.memory_usage || 0) >= 60 ? '#f59e0b' : '#22c55e'}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Wifi className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-muted-foreground">Connectivity</span>
                    <MetricInfo description="Inter-node connectivity status. Shows how many peer nodes this node can reach and the average response time. Essential for cluster health and data replication." />
                  </div>
                  <span className={`text-xs font-medium ${
                    node.connectivity_health === 'healthy' ? 'text-green-600' : 
                    node.connectivity_health === 'degraded' ? 'text-orange-600' : 
                    'text-red-600'
                  }`}>
                    Connected
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {node.connectivity_status}
                </div>
              </div>
            </div>
             
             {/* Node Details */}
             <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm pt-4 border-t">
               <div className="space-y-1">
                 <span className="text-muted-foreground">Node ID</span>
                 <div className="font-mono text-xs">{node.id}</div>
               </div>
               
               <div className="space-y-1">
                 <div className="flex items-center space-x-1">
                   <Heart className="h-4 w-4 text-red-500" />
                   <span className="text-muted-foreground">Heartbeats</span>
                   <MetricInfo description="Total heartbeats sent by this node. Heartbeats are used in the gossip protocol to detect node failures and maintain cluster membership. Higher numbers indicate longer uptime." />
                 </div>
                 <div className="font-medium font-mono">
                   {node.heartbeat_count.toLocaleString()}
                 </div>
               </div>

               <div className="space-y-1">
                 <div className="flex items-center space-x-1">
                   <MemoryStick className="h-4 w-4 text-blue-500" />
                   <span className="text-muted-foreground">Keys</span>
                   <MetricInfo description="Number of keys stored on this node. In a distributed system, keys are distributed across nodes using consistent hashing. Each node stores a subset of the total cluster data." />
                 </div>
                 <div className="font-medium font-mono">
                   {(node.key_count || 0).toLocaleString()}
                 </div>
               </div>

               <div className="space-y-1">
                 <div className="flex items-center space-x-1">
                   <Wifi className="h-4 w-4 text-orange-500" />
                   <span className="text-muted-foreground">API Latency</span>
                   <MetricInfo description="Response time for API calls from the frontend to this node. Measures client-to-database performance. Green: <50ms, Orange: 50-100ms, Red: >100ms." />
                 </div>
                 <div className={`font-medium ${
                   (node.client_latency || 0) > 100 ? 'text-red-600' : 
                   (node.client_latency || 0) > 50 ? 'text-orange-600' : 
                   'text-green-600'
                 }`}>
                   {Math.round(node.client_latency || 0)}ms
                 </div>
               </div>

               <div className="space-y-1">
                 <div className="flex items-center space-x-1">
                   <Clock className="h-4 w-4 text-muted-foreground" />
                   <span className="text-muted-foreground">Last Seen</span>
                   <MetricInfo description="Timestamp when this node was last detected as alive by the gossip protocol. Shows when the node last successfully communicated with other cluster members." />
                 </div>
                 <div className="font-medium">{formatTimestampToTime(node.last_seen)}</div>
               </div>

               <div className="space-y-1">
                 <div className="flex items-center space-x-1">
                   <span className="text-muted-foreground">Uptime</span>
                   <MetricInfo description="How long this node has been running since its last restart. Calculated from the node's start time. Longer uptimes indicate stability." />
                 </div>
                 <div className="font-medium">{formatUptimeClean(node.uptime_seconds || 0)}</div>
               </div>
             </div>
                     </Card>
          ))}
        </div>
      )}

      {/* Connection Status */}
      {!isRealTime && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2 text-orange-800 dark:text-orange-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">
                {connectionStatus === 'fallback' 
                  ? 'Using REST API fallback - attempting WebSocket connection...' 
                  : 'Connecting to real-time updates...'
                }
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Add CSS animations
const styles = `
  @keyframes slideInFromLeft {
    0% {
      transform: translateX(-100px);
      opacity: 0;
    }
    100% {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes numberUpdate {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
      color: #10b981;
    }
    100% {
      transform: scale(1);
    }
  }
  
  @keyframes heartbeat {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.2);
    }
  }
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = styles
  document.head.appendChild(styleSheet)
}

// Helper functions for crystal clear formatting
function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return `${hours}h ${minutes}m ${secs}s`
}

function formatUptimeClean(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return `${hours}h ${minutes}m ${secs}s`
}

function formatLastSeen(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toLocaleTimeString('en-US', { 
    hour12: true,
    hour: '2-digit',
    minute: '2-digit', 
    second: '2-digit'
  })
}

function formatTimestamp(timestamp: number): string {
  const now = Date.now() / 1000
  const diff = now - timestamp
  
  if (diff < 1) return 'Just now'
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function calculateLiveUptime(startTime: number, currentTime: number): number {
  return (currentTime / 1000) - startTime
}

function formatTimestampToTime(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toLocaleTimeString('en-US', { 
    hour12: true,
    hour: '2-digit',
    minute: '2-digit', 
    second: '2-digit'
  })
} 