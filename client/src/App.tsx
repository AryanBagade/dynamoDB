import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { TopNavbar } from "@/components/navbar/top-navbar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

// Import all page components
import { NodeStatus } from './components/pages/clusters/node-status'
import { HashRing } from './components/pages/clusters/hash-ring'
import { GossipsLogging } from './components/pages/clusters/gossips-logging'
import { Replication } from './components/pages/clusters/replication'

import { KeyValueStore } from './components/pages/operations/key-value-store'
import { VectorClocks } from './components/pages/operations/vector-clocks'
import { MerkleTrees } from './components/pages/operations/merkle-trees'
import { ConsistentHashing } from './components/pages/operations/consistent-hashing'

import { LiveMetrics } from './components/pages/performance/live-metrics'
import { Throughput } from './components/pages/performance/throughput'
import { Latency } from './components/pages/performance/latency'
import { ResourceUsage } from './components/pages/performance/resource-usage'

import { Configuration } from './components/pages/logs/configuration'
import { Security } from './components/pages/logs/security'
import { Backup } from './components/pages/logs/backup'
import { Logging } from './components/pages/logs/logging'

import { AnalyticsDashboard } from './components/pages/analytics/analytics-dashboard'
import { DataInsights } from './components/pages/analytics/data-insights'
import { QueryAnalytics } from './components/pages/analytics/query-analytics'
import { PerformanceReports } from './components/pages/analytics/performance-reports'

// Default dashboard component
function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">🚀 DynamoDB Dashboard</h1>
        <p className="text-muted-foreground">Advanced distributed database management system</p>
      </div>
      
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="bg-muted/50 aspect-video rounded-xl flex items-center justify-center">
          <span className="text-sm text-muted-foreground">Cluster Overview</span>
        </div>
        <div className="bg-muted/50 aspect-video rounded-xl flex items-center justify-center">
          <span className="text-sm text-muted-foreground">Performance Metrics</span>
        </div>
        <div className="bg-muted/50 aspect-video rounded-xl flex items-center justify-center">
          <span className="text-sm text-muted-foreground">System Health</span>
        </div>
      </div>
      
      <div className="bg-muted/50 min-h-[300px] rounded-xl flex items-center justify-center">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Welcome to DynamoDB Dashboard</h2>
          <p className="text-muted-foreground">Select a page from the sidebar to get started!</p>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <TopNavbar />
            
            <div className="flex flex-1 flex-col gap-4 p-6">
              <Routes>
                {/* Default route */}
                <Route path="/" element={<Dashboard />} />
                
                {/* Clusters routes */}
                <Route path="/clusters/node-status" element={<NodeStatus />} />
                <Route path="/clusters/hash-ring" element={<HashRing />} />
                <Route path="/clusters/gossips-logging" element={<GossipsLogging />} />
                <Route path="/clusters/replication" element={<Replication />} />
                
                {/* Operations routes */}
                <Route path="/operations/key-value-store" element={<KeyValueStore />} />
                <Route path="/operations/vector-clocks" element={<VectorClocks />} />
                <Route path="/operations/merkle-trees" element={<MerkleTrees />} />
                <Route path="/operations/consistent-hashing" element={<ConsistentHashing />} />
                
                {/* Performance routes */}
                <Route path="/performance/live-metrics" element={<LiveMetrics />} />
                <Route path="/performance/throughput" element={<Throughput />} />
                <Route path="/performance/latency" element={<Latency />} />
                <Route path="/performance/resource-usage" element={<ResourceUsage />} />
                
                {/* Logs routes */}
                <Route path="/logs/configuration" element={<Configuration />} />
                <Route path="/logs/security" element={<Security />} />
                <Route path="/logs/backup" element={<Backup />} />
                <Route path="/logs/logging" element={<Logging />} />
                
                {/* Analytics routes */}
                <Route path="/analytics/analytics-dashboard" element={<AnalyticsDashboard />} />
                <Route path="/analytics/data-insights" element={<DataInsights />} />
                <Route path="/analytics/query-analytics" element={<QueryAnalytics />} />
                <Route path="/analytics/performance-reports" element={<PerformanceReports />} />
              </Routes>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
