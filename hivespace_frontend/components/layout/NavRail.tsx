"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Home,
  Inbox,
  KanbanSquare,
  MessageSquare,
  BookOpen,
  GitGraph,
  Mail,
  Sparkles,
  Settings,
  Hexagon
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { motion } from "framer-motion"
import { useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useOrgs } from "@/hooks/useOrgs"
import { useOrg } from "@/store/orgStore"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

export function NavRail() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const { orgs, loading: orgsLoading } = useOrgs()
  const { activeOrg, setActiveOrg } = useOrg()

  useEffect(() => {
    if (!orgsLoading && orgs.length > 0 && !activeOrg) {
      setActiveOrg(orgs[0]);
    }
  }, [orgs, orgsLoading, activeOrg, setActiveOrg]);

  const navItems = [
    { name: "Home", href: "/dashboard", icon: Home },
    { name: "Inbox", href: "/dashboard/inbox", icon: Inbox, badge: "4" },
    { name: "Tasks", href: "/dashboard/tasks", icon: KanbanSquare },
    { name: "Chat", href: "/dashboard/chat/backend-ops", icon: MessageSquare },
    { name: "Docs", href: "/dashboard/docs", icon: BookOpen },
    { name: "GitHub", href: "/dashboard/github", icon: GitGraph },
    { name: "Mail", href: "/dashboard/mail", icon: Mail },
    { name: "AI Assistant", href: "/dashboard/ai", icon: Sparkles },
  ] as const;

  type NavItem = typeof navItems[number] & { soon?: boolean; badge?: string };
  const items = navItems as unknown as NavItem[];

  const userInitials = user?.username 
    ? user.username.substring(0, 2).toUpperCase() 
    : user?.email 
      ? user.email.substring(0, 2).toUpperCase() 
      : "JD";

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="fixed top-0 left-0 z-50 flex h-full w-[56px] flex-col items-center justify-between bg-hs-base py-4">
        {/* Top Section */}
        <div className="flex w-full flex-col items-center gap-4 px-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="outline-none h-9 w-9 flex items-center justify-center rounded-md hover:bg-zinc-800 transition-colors">
                <Avatar className="h-[26px] w-[26px] rounded-md">
                  <AvatarFallback className="rounded-md bg-transparent text-[#7C5CFC]">
                    <Hexagon className="h-5 w-5 fill-[#7C5CFC]/20" strokeWidth={2.5} />
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right" className="ml-2 bg-hs-nav/95 backdrop-blur-xl border border-zinc-800 text-hs-text rounded-md min-w-[200px]">
              <DropdownMenuLabel className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase">Organizations</DropdownMenuLabel>
              
              {orgsLoading ? (
                <div className="p-4 flex justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                </div>
              ) : orgs.length > 0 ? (
                orgs.map((org) => (
                  <DropdownMenuItem 
                    key={org.id} 
                    className="hover:bg-zinc-800 cursor-pointer flex justify-between items-center"
                    onClick={() => setActiveOrg(org)}
                  >
                    {org.name} {org.id === activeOrg?.id && <span className="text-[#7C5CFC] block">✓</span>}
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem className="text-zinc-500 text-xs py-3">No organizations found</DropdownMenuItem>
              )}

              <DropdownMenuSeparator className="bg-zinc-800/50 my-1" />
              <DropdownMenuItem 
                className="hover:bg-zinc-800 cursor-pointer text-zinc-400"
                onClick={() => router.push("/dashboard?action=create-organization")}
              >
                <span className="text-zinc-400 mr-2">+</span> Create new organization
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800/50 my-1" />
              <DropdownMenuLabel className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase">Organization</DropdownMenuLabel>
              <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer text-zinc-400">Org Settings</DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer text-zinc-400">Members</DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer text-zinc-400">Billing</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Middle Section */}
        <div className="mt-4 flex w-full flex-1 flex-col items-center gap-2 overflow-y-auto px-2">
          {items.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>
                  {item.soon ? (
                    <div className="group flex h-12 w-full cursor-not-allowed items-center justify-center rounded-md opacity-50">
                      <div className="relative flex items-center justify-center">
                        <Icon strokeWidth={1.5} className="h-[18px] w-[18px] text-zinc-600" />
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      className="group relative flex h-12 w-full items-center justify-center transition-colors"
                    >
                      {/* MD3-style active indicator pill */}
                      {isActive && (
                        <motion.div
                          layoutId="nav-active"
                          className="absolute inset-x-2 h-8 rounded-full bg-[#7C5CFC]/20"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      
                      <div className="relative flex items-center justify-center">
                        <Icon
                          strokeWidth={isActive ? 2.5 : 1.5}
                          className={`h-[18px] w-[18px] transition-all duration-300 ${
                            isActive
                              ? "text-[#7C5CFC] scale-110"
                              : "text-zinc-500 group-hover:text-zinc-300"
                          }`}
                        />
                        {item.badge && (
                          <Badge className="absolute -top-1.5 -right-2 flex h-3 w-3 items-center justify-center rounded-full border-none bg-[#f95b4e] p-0 text-[8px] text-white">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  )}
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="ml-2 border border-[#484555]/15 bg-hs-main/70 text-hs-text backdrop-blur-[20px] rounded-md"
                >
                  <div className="flex items-center gap-2">
                    {item.name}
                    {item.soon && (
                      <Badge
                        variant="secondary"
                        className="pointer-events-none bg-zinc-800 text-[10px] text-zinc-400 rounded-md border-none"
                      >
                        V2 Soon
                      </Badge>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Bottom Section */}
        <div className="flex w-full flex-col items-center gap-6 px-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className={`group flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                  pathname === "/settings" || pathname.startsWith("/settings/")
                    ? "bg-hs-accent text-hs-text"
                    : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-400"
                }`}
              >
                <Settings strokeWidth={1.5} className="h-[18px] w-[18px]" />
              </Link>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              className="ml-2 border border-[#484555]/15 bg-hs-main/70 text-hs-text backdrop-blur-[20px] rounded-md"
            >
              Settings
            </TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Link
                href="/account"
                className="outline-none h-9 w-9 flex items-center justify-center rounded-md hover:bg-zinc-800 transition-colors"
              >
                <Avatar className="h-[26px] w-[26px] cursor-pointer rounded-md">
                  <AvatarFallback className="bg-zinc-900 text-xs text-zinc-400 rounded-md">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right" className="ml-2 bg-hs-nav/95 backdrop-blur-xl border border-zinc-800 text-hs-text rounded-md">
              <DropdownMenuLabel className="text-zinc-400">My Account</DropdownMenuLabel>
              <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer" asChild>
                <Link href="/account/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer" asChild>
                <Link href="/account/security">Security</Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer">Switch Org</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800/50 my-1" />
              <DropdownMenuItem 
                className="text-[#f95b4e] hover:bg-zinc-800 hover:text-[#f95b4e] cursor-pointer"
                onClick={() => logout()}
              >
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  );
}
