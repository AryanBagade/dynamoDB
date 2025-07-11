import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function GossipsLogging() {
  const gossipLogs = [
    { timestamp: "2024-01-10 14:23:15", from: "node-1", to: "node-2", type: "heartbeat", status: "success" },
    { timestamp: "2024-01-10 14:23:14", from: "node-3", to: "node-1", type: "membership", status: "success" },
    { timestamp: "2024-01-10 14:23:13", from: "node-2", to: "node-4", type: "state_sync", status: "failed" },
    { timestamp: "2024-01-10 14:23:12", from: "node-4", to: "node-3", type: "heartbeat", status: "success" },
    { timestamp: "2024-01-10 14:23:11", from: "node-1", to: "node-3", type: "failure_detection", status: "success" },
  ]

  const gossipStats = {
    messagesPerSecond: 142,
    activeConnections: 12,
    failedMessages: 3,
    averageLatency: 1.2
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Gossips Logging</h1>
        <p className="text-muted-foreground">Monitor gossip protocol communication between cluster nodes</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Messages/sec</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{gossipStats.messagesPerSecond}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{gossipStats.activeConnections}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{gossipStats.failedMessages}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{gossipStats.averageLatency}ms</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Gossip Activity</CardTitle>
          <CardDescription>Real-time gossip protocol messages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {gossipLogs.map((log, index) => (
              <div key={index} className="flex items-center justify-between border-b pb-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium">
                    {log.from} → {log.to}
                  </div>
                  <div className="text-xs text-muted-foreground">{log.timestamp}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">{log.type}</Badge>
                  <Badge variant={log.status === "success" ? "default" : "destructive"}>
                    {log.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gossip Network Topology</CardTitle>
          <CardDescription>Current node communication patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Network topology visualization showing active gossip connections between nodes.
            Each node maintains connections to 3 other nodes for optimal fault tolerance.
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 