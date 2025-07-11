"use client"

import { Badge } from "@/components/ui/badge"
import { useWebSocket } from "@/hooks/useWebSocket"

type ConnectionStatus = "online" | "fallback" | "offline"

export function ConnectionStatus() {
  const { isConnected, isConnecting, connectionState } = useWebSocket()
  
  // Map WebSocket status to our display status
  const getDisplayStatus = (): ConnectionStatus => {
    if (isConnected) return "online"
    if (isConnecting) return "fallback"
    return "offline"
  }
  
  const status = getDisplayStatus()

  const getStatusConfig = (status: ConnectionStatus) => {
    switch (status) {
      case "online":
        return {
          variant: "default" as const,
          className: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800",
          dotColor: "bg-green-500",
          text: "Online",
          animation: "animate-pulse"
        }
      case "fallback":
        return {
          variant: "secondary" as const,
          className: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-800",
          dotColor: "bg-orange-500",
          text: "Fallback",
          animation: "animate-pulse"
        }
      case "offline":
        return {
          variant: "destructive" as const,
          className: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800",
          dotColor: "bg-red-500",
          text: "Offline",
          animation: "animate-pulse animate-duration-100"
        }
    }
  }

  const config = getStatusConfig(status)

  return (
    <Badge 
      variant={config.variant} 
      className={`gap-1.5 ${config.className}`}
      title={`WebSocket: ${connectionState.status} | Endpoint: ${connectionState.endpoint || 'None'}`}
    >
      <div className={`h-2 w-2 rounded-full ${config.dotColor} ${config.animation}`} />
      {config.text}
      {connectionState.reconnectAttempts > 0 && (
        <span className="text-xs">({connectionState.reconnectAttempts})</span>
      )}
    </Badge>
  )
} 