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
  Hexagon,
  Palette
} from "lucide-react"
import { useTheme } from "next-themes"
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
import { useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useOrgs } from "@/hooks/useOrgs"
import { useOrgStore } from "@/store/orgStore"
import { useAuthStore } from "@/store/authStore"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { cn, getAvatarColorClass } from "@/lib/utils"
import { motion } from "framer-motion"
// import { useUiStore } from "@/store/uiStore"

export function NavRail() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const { orgs, loading: orgsLoading } = useOrgs()
  const { activeOrg, setActiveOrg } = useOrgStore()
  const { switchTenant } = useAuthStore()
  const { theme, setTheme } = useTheme()
  // const { isAiSidebarOpen, toggleAiSidebar } = useUiStore()

  const handleSwitchTenant = async (org: any) => {
    try {
      await switchTenant(org.id);
      setActiveOrg(org);
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Failed to switch organization:", err);
    }
  };

  const cycleTheme = () => {
    if (theme === "dark") setTheme("dark-blue")
    else if (theme === "dark-blue") setTheme("claude")
    else setTheme("dark")
  }

  useEffect(() => {
    if (!orgsLoading && orgs.length > 0 && !activeOrg) {
      setActiveOrg(orgs[0]);
    }
  }, [orgs, orgsLoading, activeOrg, setActiveOrg]);

  const navItems = [
    { name: "Home", href: "/dashboard", icon: Home },
    { name: "Inbox", href: "/dashboard/inbox", icon: Inbox, badge: "4" },
    { name: "Tasks", href: "/dashboard/tasks", icon: KanbanSquare },
    { name: "Chat", href: "/dashboard/chat", icon: MessageSquare },
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
      <aside className="fixed top-0 left-0 z-50 flex h-full w-[56px] flex-col items-center justify-between bg-sidebar py-4">
        {/* Top Section */}
        <div className="flex w-full flex-col items-center gap-4 px-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="outline-none h-9 w-9 flex items-center justify-center rounded-md hover:bg-zinc-800 transition-colors">
                <Avatar className="h-[26px] w-[26px] rounded-md">
                  <AvatarFallback className="rounded-md bg-[#7C5CFC] text-[#E5E1E4]">
                    <Hexagon className="h-5 w-5 fill-white/20" strokeWidth={2.5} />
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right" className="ml-2 bg-sidebar/95 backdrop-blur-xl border border-zinc-800 text-foreground rounded-md min-w-[200px]">
              <DropdownMenuLabel className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase">Organizations</DropdownMenuLabel>
              
              {orgsLoading ? (
                <div className="p-4 flex justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                </div>
              ) : orgs.length > 0 ? (
                orgs.map((org) => {
                  const isActive = org.id === activeOrg?.id;
                  if (isActive) {
                    return (
                      <DropdownMenuItem 
                        key={org.id} 
                        className="hover:bg-zinc-800 cursor-default flex justify-between items-center"
                      >
                        {org.name} <span className="text-[#7C5CFC] block">✓</span>
                      </DropdownMenuItem>
                    );
                  }
                  return (
                    <DropdownMenuItem 
                      key={org.id} 
                      className="hover:bg-zinc-800 cursor-pointer flex justify-between items-center w-full text-zinc-400 hover:text-white"
                      onClick={() => handleSwitchTenant(org)}
                    >
                      {org.name}
                    </DropdownMenuItem>
                  );
                })
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
              <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer text-zinc-400" asChild>
                <Link href="/settings/general">Org Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer text-zinc-400" asChild>
                <Link href="/settings/global-members">Members</Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer text-zinc-400" asChild>
                <Link href="/settings/subscription">Billing</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Middle Section */}
        <motion.div
          className="mt-4 flex w-full flex-1 flex-col items-center gap-2 overflow-y-auto px-2"
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
        >
          {items.map((item) => {
            const isAiItem = item.name === "AI Assistant";
            const isActive = item.href === "/dashboard"
              ? pathname === "/dashboard" || pathname === "/dashboard/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>
                  {item.soon ? (
                    <motion.div
                      variants={{ hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0 } }}
                      className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-md opacity-50"
                    >
                      <div className="relative flex items-center justify-center">
                        <Icon strokeWidth={1.5} className="h-[18px] w-[18px] text-zinc-600" />
                      </div>
                    </motion.div>
                  ) : isAiItem ? (
                    <motion.div
                      variants={{ hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0, transition: { duration: 0.25 } } }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.93 }}
                    >
                      <Link
                        href={item.href}
                        className={`group flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                          isActive
                            ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-md"
                            : "hover:bg-zinc-800"
                        }`}
                        aria-label="Hex AI Assistant"
                      >
                        <div className="relative flex items-center justify-center">
                          <Icon
                            strokeWidth={1.5}
                            className={`h-[18px] w-[18px] transition-colors ${
                              isActive
                                ? "text-white"
                                : "text-zinc-500 group-hover:text-zinc-400"
                            }`}
                          />
                          {isActive && (
                            <span className="absolute -top-1 -right-1 flex h-2 w-2 items-center justify-center rounded-full bg-violet-300">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                            </span>
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  ) : (
                    <motion.div
                      variants={{ hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0, transition: { duration: 0.25 } } }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.93 }}
                    >
                      <Link
                        href={item.href}
                        className={`group flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                          isActive ? "bg-hs-accent" : "hover:bg-zinc-800"
                        }`}
                      >
                        <div className="relative flex items-center justify-center">
                          <Icon
                            strokeWidth={1.5}
                            className={`h-[18px] w-[18px] transition-colors ${
                              isActive
                                ? "text-white"
                                : "text-zinc-500 group-hover:text-zinc-400"
                            }`}
                          />
                          {item.badge && (
                            <Badge className="absolute -top-1.5 -right-2 flex h-3 w-3 items-center justify-center rounded-full border-none bg-[#f95b4e] p-0 text-[8px] text-white hover:bg-[#f95b4e]">
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  )}
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="ml-2 border border-[#484555]/15 bg-background/70 text-foreground backdrop-blur-[20px] rounded-md"
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
        </motion.div>

        {/* Bottom Section */}
        <div className="flex w-full flex-col items-center gap-6 px-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={cycleTheme}
                className="group flex h-9 w-9 items-center justify-center rounded-md transition-colors text-zinc-500 hover:bg-zinc-800 hover:text-zinc-400 cursor-pointer"
              >
                <Palette strokeWidth={1.5} className="h-[18px] w-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              className="ml-2 border border-[#484555]/15 bg-background/70 text-foreground backdrop-blur-[20px] rounded-md"
            >
              <span className="capitalize">Theme: {theme}</span>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className={`group flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                  pathname === "/settings" || pathname.startsWith("/settings/")
                    ? "bg-hs-accent text-white"
                    : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-400"
                }`}
              >
                <Settings strokeWidth={1.5} className="h-[18px] w-[18px]" />
              </Link>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              className="ml-2 border border-[#484555]/15 bg-background/70 text-foreground backdrop-blur-[20px] rounded-md"
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
                  <AvatarFallback className={cn("text-xs font-semibold rounded-md", getAvatarColorClass(user?.avatarColor || user?.fullName || user?.username || "JD"))}>
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right" className="ml-2 bg-sidebar/95 backdrop-blur-xl border border-zinc-800 text-foreground rounded-md">
              <DropdownMenuLabel className="text-zinc-400">My Account</DropdownMenuLabel>
              <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer" asChild>
                <Link href="/account/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer" asChild>
                <Link href="/account/security">Security</Link>
              </DropdownMenuItem>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="block w-full">
                    <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed w-full">
                      Switch Org
                    </DropdownMenuItem>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-zinc-800 text-xs text-white border-zinc-700 ml-2">
                  Switching organizations coming soon
                </TooltipContent>
              </Tooltip>
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
