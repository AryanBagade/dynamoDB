"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/navbar/mode-toggle"
import { NavUser } from "@/components/navbar/nav-user"
import { ConnectionStatus } from "@/components/navbar/connection-status"
import { Separator } from "@/components/ui/separator"

export function TopNavbar() {
  const user = {
    name: "Aryan Bagade",
    email: "aryan@aryanbagade.com",
    avatar: "/avatars/admin.jpg",
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      
      {/* Logo/Title */}
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-foreground">DynamoDB Dashboard</h1>
      </div>
      
      {/* Spacer */}
      <div className="flex-1" />
      
      {/* Right side actions */}
      <div className="flex items-center gap-2">
        <ConnectionStatus />
        <ModeToggle />
        <Separator orientation="vertical" className="h-4" />
        <NavUser user={user} />
      </div>
    </header>
  )
} 