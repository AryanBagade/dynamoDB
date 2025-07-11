"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"

type ConnectionStatus = "online" | "fallback" | "offline"

export function ConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>("offline")

  // Simulate connection status changes
  useEffect(() => {
    const checkStatus = () => {
      const random = Math.random()
      if (random > 0.2) {
        setStatus("offline")
      } else if (random > 0.6) {
        setStatus("fallback")
      } else {
        setStatus("online")
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 8000) // Check every 8 seconds

    return () => clearInterval(interval)
  }, [])

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
    <Badge variant={config.variant} className={`gap-1.5 ${config.className}`}>
      <div className={`h-2 w-2 rounded-full ${config.dotColor} ${config.animation}`} />
      {config.text}
    </Badge>
  )
} 