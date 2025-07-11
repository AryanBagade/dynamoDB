"use client"

import {
  Globe,
  Github,
  Linkedin,
  Twitter,
  Mail,
  ExternalLink,
  Code,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const handleLinkClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Code className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">User menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-64 rounded-lg"
        side="bottom"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Button variant="outline" size="icon" className="pointer-events-none">
              <Code className="h-[1.2rem] w-[1.2rem]" />
            </Button>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem 
            onClick={() => handleLinkClick('https://aryanbagade.com')}
            className="cursor-pointer"
          >
            <Globe />
            <span>aryanbagade.com</span>
            <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleLinkClick('mailto:aryan@aryanbagade.com')}
            className="cursor-pointer"
          >
            <Mail />
            <span>Email Me</span>
            <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem 
            onClick={() => handleLinkClick('https://github.com/aryanbagade')}
            className="cursor-pointer"
          >
            <Github />
            <span>GitHub</span>
            <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleLinkClick('https://linkedin.com/in/aryanbagade')}
            className="cursor-pointer"
          >
            <Linkedin />
            <span>LinkedIn</span>
            <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleLinkClick('https://x.com/aryanbagade')}
            className="cursor-pointer"
          >
            <Twitter />
            <span>Twitter/X</span>
            <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 