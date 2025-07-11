"use client"

import { useState, useEffect } from "react"
import { Wifi, WifiOff } from "lucide-react"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function SystemStatus() {
  const [isOnline, setIsOnline] = useState(true)

  // Simulate checking system status
  useEffect(() => {
    const checkStatus = () => {
      setIsOnline(Math.random() > 0.1) // 90% uptime simulation
    }

    checkStatus()
    const interval = setInterval(checkStatus, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [])

  const StatusIcon = isOnline ? Wifi : WifiOff

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton 
          tooltip={isOnline ? "Online" : "Offline"}
          className="cursor-default pointer-events-none"
        >
          <StatusIcon className={`${
            isOnline 
              ? 'text-green-500' 
              : 'text-red-500'
          }`} />
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
} 