import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function KeyValueStore() {
  const kvData = [
    { key: "user:12345:profile", value: '{"name":"John Doe","email":"john@example.com"}', size: "156 bytes", ttl: "7d", hits: 1250 },
    { key: "session:abc789", value: "active_session_data_here", size: "89 bytes", ttl: "1h", hits: 45 },
    { key: "cache:trending:posts", value: "Array of 25 trending posts", size: "2.1 KB", ttl: "15m", hits: 890 },
    { key: "config:feature_flags", value: '{"dark_mode":true,"beta_features":false}', size: "67 bytes", ttl: "∞", hits: 3200 },
  ]

  const storeStats = {
    totalKeys: 125840,
    totalSize: "2.4 GB",
    hitRate: 96.2,
    avgResponseTime: 0.3
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Key-Value Store</h1>
        <p className="text-muted-foreground">Manage and monitor the distributed key-value storage system</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{storeStats.totalKeys.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Storage Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{storeStats.totalSize}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{storeStats.hitRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{storeStats.avgResponseTime}ms</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Key-Value Operations</CardTitle>
          <CardDescription>Sample data from the key-value store</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {kvData.map((item, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-mono text-sm font-medium">{item.key}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.size}</Badge>
                    <Badge variant={item.ttl === "∞" ? "default" : "secondary"}>TTL: {item.ttl}</Badge>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground mb-2 font-mono bg-muted p-2 rounded">
                  {item.value}
                </div>
                <div className="text-xs text-muted-foreground">
                  Cache hits: {item.hits.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Key Management</CardTitle>
            <CardDescription>Operations for managing keys</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full">Add New Key</Button>
            <Button variant="outline" className="w-full">Bulk Import</Button>
            <Button variant="outline" className="w-full">Export Keys</Button>
            <Button variant="destructive" className="w-full">Flush All</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Storage Metrics</CardTitle>
            <CardDescription>Key-value store performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm">Memory Usage</span>
                <span className="text-sm font-medium">68%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Disk Usage</span>
                <span className="text-sm font-medium">42%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Network I/O</span>
                <span className="text-sm font-medium">1.2 MB/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Active Connections</span>
                <span className="text-sm font-medium">156</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 