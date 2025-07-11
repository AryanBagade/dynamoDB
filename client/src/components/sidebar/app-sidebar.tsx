"use client"

import * as React from "react"
import {
  Database,
  Server,
  Activity,
  BarChart3,
  Network,
  Cpu,
  HardDrive,
  Users,
  Shield,
  ChartNoAxesCombined,
  Logs
} from "lucide-react"

import { NavMain } from "@/components/sidebar/nav-main"
import { NavProjects } from "@/components/sidebar/nav-projects"
import { SystemStatus } from "@/components/sidebar/system-status"
import { TeamSwitcher } from "@/components/sidebar/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// Database cluster data
const data = {
  user: {
    name: "Aryan Bagade",
    email: "aryan@aryanbagade.com",
    avatar: "/avatars/admin.jpg",
  },
  teams: [
    {
      name: "Production",
      logo: Database,
      plan: "Multi-Region",
    },
    {
      name: "Staging",
      logo: Server,
      plan: "Single-Region",
    },
    {
      name: "Development",
      logo: Cpu,
      plan: "Local",
    },
  ],
  navMain: [
    {
      title: "Clusters",
      url: "#",
      icon: Network,
      isActive: true,
      items: [
        {
          title: "Node Status",
          url: "/clusters/node-status",
        },
        {
          title: "Hash Ring",
          url: "/clusters/hash-ring",
        },
        {
          title: "Gossips Logging",
          url: "/clusters/gossips-logging",
        },
        {
          title: "Replication",
          url: "/clusters/replication",
        },
      ],
    },
    {
      title: "Operations",
      url: "#",
      icon: Database,
      items: [
        {
          title: "Key-Value Store",
          url: "/operations/key-value-store",
        },
        {
          title: "Vector Clocks",
          url: "/operations/vector-clocks",
        },
        {
          title: "Merkle Trees",
          url: "/operations/merkle-trees",
        },
        {
          title: "Consistent Hashing",
          url: "/operations/consistent-hashing",
        },
      ],
    },
    {
      title: "Performance",
      url: "#",
      icon: Activity,
      items: [
        {
          title: "Live Metrics",
          url: "/performance/live-metrics",
        },
        {
          title: "Throughput",
          url: "/performance/throughput",
        },
        {
          title: "Latency",
          url: "/performance/latency",
        },
        {
          title: "Resource Usage",
          url: "/performance/resource-usage",
        },
      ],
    },
    {
      title: "Logs",
      url: "#",
      icon: Logs,
      items: [
        {
          title: "Configuration",
          url: "/logs/configuration",
        },
        {
          title: "Security",
          url: "/logs/security",
        },
        {
          title: "Backup",
          url: "/logs/backup",
        },
        {
          title: "Logging",
          url: "/logs/logging",
        },
      ],
    },
    {
      title: "Analytics",
      url: "#",
      icon: ChartNoAxesCombined,
      items: [
        {
          title: "Analytics Dashboard",
          url: "/analytics/analytics-dashboard",
        },
        {
          title: "Data Insights",
          url: "/analytics/data-insights",
        },
        {
          title: "Query Analytics",
          url: "/analytics/query-analytics",
        },
        {
          title: "Performance Reports",
          url: "/analytics/performance-reports",
        },
      ],
    },
  ],
  projects: [
    {
      name: "User Sessions",
      url: "#",
      icon: Users,
    },
    {
      name: "Analytics Data",
      url: "#",
      icon: BarChart3,
    },
    {
      name: "Security Logs",
      url: "#",
      icon: Shield,
    },
    {
      name: "Cache Layer",
      url: "#",
      icon: HardDrive,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <SystemStatus />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
} 