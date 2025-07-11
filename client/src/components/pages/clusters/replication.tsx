import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function Replication() {
  const replicationData = [
    { key: "user:12345", primary: "node-1", replicas: ["node-2", "node-3"], status: "synced", lastSync: "2024-01-10 14:23:15" },
    { key: "session:abc789", primary: "node-2", replicas: ["node-3", "node-4"], status: "syncing", lastSync: "2024-01-10 14:23:10" },
    { key: "cache:xyz456", primary: "node-3", replicas: ["node-1", "node-4"], status: "synced", lastSync: "2024-01-10 14:23:12" },
    { key: "data:def123", primary: "node-4", replicas: ["node-1", "node-2"], status: "out_of_sync", lastSync: "2024-01-10 14:22:45" },
  ]

  const replicationStats = {
    totalKeys: 15420,
    syncedKeys: 15384,
    replicationFactor: 3,
    averageSyncTime: 0.8
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Replication</h1>
        <p className="text-muted-foreground">Monitor data replication status and synchronization across cluster nodes</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{replicationStats.totalKeys.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Synced Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{replicationStats.syncedKeys.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Replication Factor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{replicationStats.replicationFactor}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Sync Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{replicationStats.averageSyncTime}ms</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Replication Status</CardTitle>
          <CardDescription>Current replication state for sample keys</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {replicationData.map((item, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{item.key}</div>
                  <Badge 
                    variant={
                      item.status === "synced" ? "default" : 
                      item.status === "syncing" ? "secondary" : "destructive"
                    }
                  >
                    {item.status}
                  </Badge>
                </div>
                <div className="grid gap-2 text-sm text-muted-foreground">
                  <div>Primary: <span className="font-medium">{item.primary}</span></div>
                  <div>Replicas: <span className="font-medium">{item.replicas.join(", ")}</span></div>
                  <div>Last Sync: <span className="font-medium">{item.lastSync}</span></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Replication Health</CardTitle>
          <CardDescription>Overall cluster replication metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="text-2xl font-bold text-green-600">99.8%</div>
              <div className="text-sm text-muted-foreground">Sync Success Rate</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-blue-600">36</div>
              <div className="text-sm text-muted-foreground">Out of Sync Keys</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-orange-600">2.4s</div>
              <div className="text-sm text-muted-foreground">Max Recovery Time</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 