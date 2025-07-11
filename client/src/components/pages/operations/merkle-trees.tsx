import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function MerkleTrees() {
  const treeData = [
    { 
      partition: "partition-1", 
      rootHash: "0xa1b2c3d4e5f6", 
      depth: 8, 
      leafCount: 256, 
      lastVerified: "2024-01-10 14:23:15",
      status: "verified"
    },
    { 
      partition: "partition-2", 
      rootHash: "0x7f8e9d0c1b2a", 
      depth: 7, 
      leafCount: 128, 
      lastVerified: "2024-01-10 14:23:10",
      status: "mismatch"
    },
    { 
      partition: "partition-3", 
      rootHash: "0x4e5f6a1b2c3d", 
      depth: 9, 
      leafCount: 512, 
      lastVerified: "2024-01-10 14:23:12",
      status: "verified"
    },
  ]

  const merkleStats = {
    totalTrees: 24,
    verificationRate: 97.8,
    avgDepth: 8.2,
    syncConflicts: 3
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Merkle Trees</h1>
        <p className="text-muted-foreground">Monitor data integrity and synchronization across distributed partitions</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Trees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{merkleStats.totalTrees}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Verification Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{merkleStats.verificationRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Tree Depth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{merkleStats.avgDepth}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sync Conflicts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{merkleStats.syncConflicts}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Merkle Tree Status</CardTitle>
          <CardDescription>Current state of merkle trees across partitions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {treeData.map((tree, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-medium">{tree.partition}</div>
                  <Badge variant={tree.status === "verified" ? "default" : "destructive"}>
                    {tree.status}
                  </Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Root Hash</div>
                    <div className="font-mono">{tree.rootHash}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Depth</div>
                    <div className="font-medium">{tree.depth} levels</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Leaf Count</div>
                    <div className="font-medium">{tree.leafCount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Last Verified</div>
                    <div className="font-medium">{tree.lastVerified}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tree Visualization</CardTitle>
            <CardDescription>Merkle tree structure for partition-1</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded mx-auto w-24">
                <div className="text-xs">Root</div>
                <div className="font-mono text-xs">0xa1b2</div>
              </div>
              <div className="flex justify-center space-x-4">
                <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded w-20">
                  <div className="text-xs">Left</div>
                  <div className="font-mono text-xs">0x7f8e</div>
                </div>
                <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded w-20">
                  <div className="text-xs">Right</div>
                  <div className="font-mono text-xs">0x4e5f</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Tree continues for {treeData[0].depth - 2} more levels...
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integrity Metrics</CardTitle>
            <CardDescription>Data integrity verification statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-2xl font-bold text-green-600">1,247</div>
                <div className="text-sm text-muted-foreground">Successful Verifications</div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-red-600">28</div>
                <div className="text-sm text-muted-foreground">Hash Mismatches</div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-orange-600">5.2ms</div>
                <div className="text-sm text-muted-foreground">Avg Verification Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 