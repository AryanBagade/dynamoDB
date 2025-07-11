import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function HashRing() {
  const ringNodes = [
    { id: "node-1", hash: "0x1a2b3c", position: 15, tokens: 256, keys: 1250 },
    { id: "node-2", hash: "0x4d5e6f", position: 45, tokens: 256, keys: 1180 },
    { id: "node-3", hash: "0x7a8b9c", position: 78, tokens: 256, keys: 1320 },
    { id: "node-4", hash: "0xa1b2c3", position: 92, tokens: 256, keys: 1090 },
  ]

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Hash Ring</h1>
        <p className="text-muted-foreground">Visualize consistent hashing distribution across cluster nodes</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ring Visualization</CardTitle>
            <CardDescription>Current hash ring state</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative mx-auto h-64 w-64">
              <div className="absolute inset-0 rounded-full border-4 border-dashed border-muted-foreground/30"></div>
              {ringNodes.map((node) => (
                <div
                  key={node.id}
                  className="absolute h-4 w-4 rounded-full bg-blue-500"
                  style={{
                    top: `${50 + 45 * Math.cos((node.position / 100) * 2 * Math.PI - Math.PI / 2)}%`,
                    left: `${50 + 45 * Math.sin((node.position / 100) * 2 * Math.PI - Math.PI / 2)}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  title={node.id}
                ></div>
              ))}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-sm font-medium">Hash Ring</div>
                  <div className="text-xs text-muted-foreground">4 Nodes</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Node Distribution</CardTitle>
            <CardDescription>Key distribution across ring nodes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ringNodes.map((node) => (
                <div key={node.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <div className="font-medium">{node.id}</div>
                    <div className="text-sm text-muted-foreground">Hash: {node.hash}</div>
                  </div>
                  <div className="text-right">
                    <Badge >{node.keys} keys</Badge>
                    <div className="text-xs text-muted-foreground mt-1">{node.tokens} tokens</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ring Statistics</CardTitle>
          <CardDescription>Consistent hashing performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <div className="text-2xl font-bold">4,840</div>
              <div className="text-sm text-muted-foreground">Total Keys</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold">1,024</div>
              <div className="text-sm text-muted-foreground">Total Tokens</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold">97.2%</div>
              <div className="text-sm text-muted-foreground">Balance Score</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold">2.1ms</div>
              <div className="text-sm text-muted-foreground">Lookup Time</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 