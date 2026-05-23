"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2,
  Users,
  Shield,
  Bell,
  Palette,
  GitGraph,
  Mail,
  Zap,
  Webhook,
  CreditCard,
  Receipt,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { usePermission } from "@/hooks/usePermission"

import React from "react"
interface NavItem {
  id: string
  label: string
  icon: React.ElementType
  href: string
  color?: string
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: "WORKSPACE",
    items: [
      { id: "general", label: "General", icon: Building2, href: "/settings/general" },
      { id: "members", label: "Members", icon: Users, href: "/settings/members" },
      { id: "roles", label: "Roles & Permissions", icon: Shield, href: "/settings/roles" },
      { id: "notifications", label: "Notifications", icon: Bell, href: "/settings/notifications" },
      { id: "appearance", label: "Appearance", icon: Palette, href: "/settings/appearance" },
    ],
  },
  {
    label: "INTEGRATIONS",
    items: [
      { id: "github", label: "GitHub", icon: GitGraph, href: "/settings/github" },
      { id: "email", label: "Email", icon: Mail, href: "/settings/email" },
      { id: "automations", label: "Automations", icon: Zap, href: "/settings/automations" },
      { id: "webhooks", label: "Webhooks", icon: Webhook, href: "/settings/webhooks" },
    ],
  },
  {
    label: "BILLING",
    items: [
      { id: "subscription", label: "Subscription", icon: CreditCard, href: "/settings/subscription" },
      { id: "invoices", label: "Invoices", icon: Receipt, href: "/settings/invoices" },
      { id: "seats", label: "Seats", icon: Users, href: "/settings/seats" },
    ],
  },
  {
    label: "DANGER",
    items: [
      { id: "danger", label: "Delete Workspace", icon: Trash2, href: "/settings/danger", color: "text-red-400" },
    ],
  },
]

export function SettingsSidebar() {
  const pathname = usePathname()
  const { canAccessBilling, canManageMembers } = usePermission()

  const filteredGroups = navGroups
    .map((group) => {
      let items = group.items
      if (group.label === "WORKSPACE") {
        items = items.filter((item) => {
          if (item.id === "members" || item.id === "roles") {
            return canManageMembers
          }
          return true
        })
      }
      return { ...group, items }
    })
    .filter((group) => {
      if (group.label === "BILLING") {
        return canAccessBilling
      }
      return group.items.length > 0
    })

  return (
    <aside className="fixed left-[56px] top-0 h-full w-[240px] bg-sidebar px-3 py-4 border-none">
      <div className="px-3 mb-4">
        <h2 className="text-sm font-semibold text-[#E5E1E4]">Settings</h2>
      </div>

      <div className="space-y-4">
        {filteredGroups.map((group) => (
          <div key={group.label}>
            <h3 className="px-3 mb-1 text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">
              {group.label}
            </h3>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.id === 'general' && pathname === '/settings')
                const Icon = item.icon
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={cn(
                      "w-full h-8 flex items-center gap-2 px-3 rounded-md text-sm transition-colors",
                      isActive
                        ? "bg-zinc-800 text-white"
                        : cn(
                            "hover:bg-zinc-800/50 hover:text-zinc-200",
                            item.color || "text-zinc-400"
                          )
                    )}
                  >
                    <Icon strokeWidth={1.5} className="h-[18px] w-[18px]" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
