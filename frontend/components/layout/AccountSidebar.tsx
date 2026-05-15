"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  User,
  Lock,
  Bell,
  GitGraph as Github,
  CreditCard,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"

import React from "react"
interface NavItem {
  id: string
  label: string
  icon: React.ElementType
  href: string
  color?: string
}

const navItems: NavItem[] = [
  { id: "profile", label: "Profile", icon: User, href: "/account/profile" },
  { id: "security", label: "Security", icon: Lock, href: "/account/security" },
  { id: "notifications", label: "Notifications", icon: Bell, href: "/account/notifications" },
  { id: "connections", label: "Connected Accounts", icon: Github, href: "/account/connections" },
  { id: "billing", label: "Billing", icon: CreditCard, href: "/account/billing" },
]

export function AccountSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-[56px] top-0 h-full w-[240px] bg-[#1B1B1D] px-3 py-4 flex flex-col">
      <div className="px-3 mb-4">
        <h2 className="text-sm font-semibold text-[#E5E1E4]">Account Settings</h2>
      </div>

      <div className="flex-1 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.id === 'profile' && pathname === '/account')
          const Icon = item.icon
          return (
            <Link
              key={item.id}
              href={item.href }
              className={cn(
                "w-full h-8 flex items-center gap-2 px-3 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              )}
            >
              <Icon strokeWidth={1.5} className="h-[18px] w-[18px]" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>

      <div className="mt-auto pt-4 border-t border-zinc-800/50">
        <button
          className="w-full h-8 flex items-center gap-2 px-3 rounded-md text-sm text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <LogOut strokeWidth={1.5} className="h-[18px] w-[18px]" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
