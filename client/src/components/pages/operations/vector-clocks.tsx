import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function VectorClocks() {
  const clockData = [
    { 
      key: "user:12345:profile", 
      vectorClock: { "node-1": 5, "node-2": 3, "node-3": 8, "node-4": 2 },
      lastUpdate: "2024-01-10 14:23:15",
      conflicted: false
    },
    { 
      key: "session:abc789", 
      vectorClock: { "node-1": 2, "node-2": 7, "node-3": 4, "node-4": 6 },
      lastUpdate: "2024-01-10 14:23:10",
      conflicted: true
    },
    { 
      key: "config:feature_flags", 
      vectorClock: { "node-1": 12, "node-2": 12, "node-3": 12, "node-4": 12 },
      lastUpdate: "2024-01-10 14:22:45",
      conflicted: false
    },
  ]

  const clockStats = {
    totalClocks: 125840,
    conflictedKeys: 24,
    syncOperations: 1420,
    resolutionRate: 99.1
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Vector Clocks</h1>
        <p className="text-muted-foreground">Monitor causality tracking and conflict resolution across distributed nodes</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Clocks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clockStats.totalClocks.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conflicted Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{clockStats.conflictedKeys}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sync Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{clockStats.syncOperations}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{clockStats.resolutionRate}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vector Clock States</CardTitle>
          <CardDescription>Current vector clock values for sample keys</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {clockData.map((item, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-mono text-sm font-medium">{item.key}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.conflicted ? "destructive" : "default"}>
                      {item.conflicted ? "Conflicted" : "Synced"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{item.lastUpdate}</span>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-4">
                  {Object.entries(item.vectorClock).map(([node, count]) => (
                    <div key={node} className="bg-muted p-2 rounded text-center">
                      <div className="text-xs text-muted-foreground">{node}</div>
                      <div className="text-lg font-bold">{count}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Conflict Resolution</CardTitle>
            <CardDescription>Automatic conflict resolution strategies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Last-Write-Wins</span>
                <Badge variant="outline">45 resolved</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Manual Resolution</span>
                <Badge variant="secondary">12 pending</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Multi-Value</span>
                <Badge variant="outline">8 preserved</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Custom Merge</span>
                <Badge variant="outline">31 merged</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Causality Metrics</CardTitle>
            <CardDescription>Vector clock performance data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-2xl font-bold text-green-600">2.8ms</div>
                <div className="text-sm text-muted-foreground">Avg Clock Update Time</div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-blue-600">156</div>
                <div className="text-sm text-muted-foreground">Concurrent Updates/sec</div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-orange-600">4.2KB</div>
                <div className="text-sm text-muted-foreground">Avg Clock Size</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 