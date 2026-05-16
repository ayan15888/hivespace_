"use client";
import { 
  Search, 
  UserPlus, 
  MoreHorizontal, 
  Mail, 
  Link as LinkIcon, 
  ExternalLink, 
  RefreshCw, 
  Plus 
} from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CTAButton } from "@/components/common/CTAButton"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"


import { useMembers } from "@/hooks/useMembers";
import { useAuth } from "@/hooks/useAuth";
import { useOrgStore } from "@/store/orgStore";

const pendingInvites = [
  { email: "dev@acme.com", role: "Member", expires: "48h" },
  { email: "pm@acme.com", role: "Project Lead", expires: "12h" },
]

const inviteLinks = [
  { id: 1, role: "Member", used: 3, createdBy: "JD", status: "Active", url: "hivespace.io/invite/xK9mP2...", expires: "Apr 22, 2026", daysLeft: 3, maxUses: "Unlimited" },
  { id: 2, role: "Viewer", used: 0, createdBy: "MV", status: "Active", url: "hivespace.io/invite/qR7nL5...", expires: "Apr 20, 2026", daysLeft: 1, maxUses: "10 (0 used)" },
  { id: 3, role: "Team Lead", used: 1, createdBy: "JD", status: "Expired", url: "hivespace.io/invite/mT3kJ8...", expires: "Apr 8, 2026", daysLeft: 0, maxUses: "5 (1 used)" },
]

const roleColors: Record<string, string> = {
  "Org Owner": "text-[#7C5CFC] bg-[#7C5CFC]/10 border-[#7C5CFC]/20",
  "Org Admin": "text-blue-400 bg-blue-400/10 border-blue-400/20",
  "Workspace Admin": "text-teal-400 bg-teal-400/10 border-teal-400/20",
  "Team Lead": "text-amber-400 bg-amber-400/10 border-amber-400/20",
  "Member": "text-zinc-400 bg-zinc-800 border-zinc-700",
  "Viewer": "text-zinc-500 bg-zinc-800 border-zinc-700",
  "Billing Admin": "text-green-400 bg-green-400/10 border-green-400/20",
}

import { InviteModal } from "@/components/common/InviteModal"

export default function MembersSettings() {
  const { members, loading } = useMembers();
  const { user } = useAuth();
  const { activeOrg } = useOrgStore();
  return (
    <div className="max-w-4xl px-8 py-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-[#E5E1E4]">Members</h1>
        <p className="text-sm text-zinc-400 mt-1">{members.length} members in {activeOrg?.name || "Organization"} {activeOrg?.ownerEmail && `· Owner: ${activeOrg.ownerEmail}`}</p>
      </header>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input 
            placeholder="Search members..." 
            className="pl-9 bg-zinc-800 border-zinc-700 h-9 text-sm focus-visible:ring-hs-accent/50"
          />
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="w-[140px] bg-zinc-800 border-zinc-700 h-9 text-sm text-zinc-300">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="owner">Org Owner</SelectItem>
            <SelectItem value="admin">Org Admin</SelectItem>
            <SelectItem value="lead">Team Lead</SelectItem>
            <SelectItem value="member">Member</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <InviteModal trigger={
            <CTAButton className="flex items-center gap-2">
              <UserPlus className="h-3.5 w-3.5" />
              Invite Member
            </CTAButton>
          } />
        </div>
      </div>

      <div className="space-y-1">
        {loading ? (
          <div className="py-4 text-center text-zinc-500 text-sm">Loading members...</div>
        ) : members.length === 0 ? (
          <div className="py-4 text-center text-zinc-500 text-sm">No members found.</div>
        ) : members.map((member) => (
          <div 
            key={member.id} 
            className="h-14 flex items-center gap-3 px-4 rounded-md transition-colors hover:bg-zinc-800/30 group"
          >
            <div className="relative">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-zinc-800 text-xs text-zinc-400 font-medium">
                  {member.fullName?.substring(0, 2).toUpperCase() || member.username?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className={cn(
                "absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#201F21] bg-green-500"
              )} />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#E5E1E4] truncate">{member.fullName}</span>
                {user?.id === member.id && <span className="text-[10px] text-zinc-500 font-medium">(you)</span>}
              </div>
              <span className="text-xs text-zinc-400 truncate">{member.email}</span>
            </div>

            <div className="ml-6">
              <Select defaultValue={member.role === "ADMIN" ? "Org Owner" : "Member"}>
                <SelectTrigger className={cn(
                  "h-7 text-[10px] px-2 py-0 min-w-[110px] border font-medium rounded-sm bg-transparent",
                  roleColors[member.role === "ADMIN" ? "Org Owner" : "Member"]
                )}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
                  <SelectItem value="Org Owner">Org Owner</SelectItem>
                  <SelectItem value="Team Lead">Team Lead</SelectItem>
                  <SelectItem value="Member">Member</SelectItem>
                  <SelectItem value="Billing Admin">Billing Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto text-xs text-zinc-500">
              {/* member.joined  (No date in current API, leaving blank or add static text) */}
              Just now
            </div>

            <button className="p-2 text-zinc-500 hover:text-zinc-200 transition-opacity opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-10">
        <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-4 px-4">
          PENDING INVITES
        </h3>
        <div className="space-y-1">
          {pendingInvites.map((invite) => (
            <div key={invite.email} className="h-12 flex items-center gap-3 px-4 rounded-md hover:bg-zinc-800/20 group">
              <div className="h-8 w-8 rounded-md bg-zinc-800 flex items-center justify-center">
                <Mail className="h-4 w-4 text-zinc-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-zinc-300">{invite.email}</span>
                <span className="text-[10px] text-zinc-500 mt-0.5">{invite.role}</span>
              </div>
              <div className="ml-auto flex items-center gap-4">
                <span className="text-[10px] text-zinc-600">Expires in {invite.expires}</span>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="text-[10px] text-zinc-400 hover:text-zinc-200 uppercase font-bold tracking-widest px-2 py-1">Resend</button>
                  <button className="text-[10px] text-red-400/70 hover:text-red-400 uppercase font-bold tracking-widest px-2 py-1">Revoke</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-4">
          INVITE LINKS
        </h3>
        <p className="text-xs text-zinc-400 mb-6 px-4">
          Share these links to let people join without sending individual emails. Anyone with the link can join with the assigned role.
        </p>
        
        <div className="space-y-3">
          {inviteLinks.map((link) => (
            <div 
              key={link.id} 
              className={cn(
                "bg-[#272629] border border-zinc-800/50 rounded-lg p-4 group",
                link.status === "Expired" && "opacity-60"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-3.5 w-3.5 text-zinc-400" />
                  <Badge variant="outline" className="bg-zinc-800 border-zinc-700 text-xs font-medium px-2 py-0.5 text-zinc-300 rounded-sm">
                    {link.role}
                  </Badge>
                  <span className="text-xs text-zinc-500 ml-3 font-medium">Used {link.used} times</span>
                  <span className="text-xs text-zinc-600">by {link.createdBy}</span>
                </div>
                <Badge className={cn(
                  "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border",
                  link.status === "Active" 
                    ? "bg-green-500/10 border-green-500/20 text-green-400" 
                    : "bg-zinc-800 border-zinc-700 text-zinc-600"
                )}>
                  {link.status}
                </Badge>
              </div>

              <div className="flex items-center gap-2 mt-3">
                <div className="bg-zinc-800 rounded px-2 py-1 flex-1 min-w-0">
                  <p className="font-mono text-[10px] text-zinc-400 truncate">
                    {link.url}
                  </p>
                </div>
                <button className="text-[10px] font-bold text-[#7C5CFC] uppercase tracking-wider hover:opacity-80 transition-opacity ml-2 shrink-0">
                  Copy
                </button>
                <button className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors shrink-0">
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-4 flex items-center gap-5 text-[10px] font-medium text-zinc-600">
                <div className="flex items-center gap-1.5">
                  <span className={cn(link.daysLeft === 1 && "text-amber-500")}>
                    Expires: {link.expires} · {link.daysLeft === 0 ? "Expired" : `${link.daysLeft} days left`}
                  </span>
                </div>
                <span>Max uses: {link.maxUses}</span>
                <button className="flex items-center gap-1.5 hover:text-zinc-400 transition-colors">
                  <RefreshCw className="h-3 w-3" />
                  Regenerate
                </button>
                <button className={cn(
                  "hover:text-red-400 transition-colors",
                  link.status === "Active" ? "text-red-400/60" : "text-zinc-700 cursor-not-allowed"
                )}>
                  Deactivate
                </button>
              </div>
            </div>
          ))}
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <button className="mt-4 w-full h-11 flex items-center justify-center gap-2 border border-dashed border-zinc-700 rounded-lg text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-300 transition-all">
              <Plus className="h-3.5 w-3.5" />
              Create invite link
            </button>
          </PopoverTrigger>
          <PopoverContent className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 w-72 shadow-2xl">
            <h3 className="text-sm font-medium text-[#E5E1E4] mb-4">Create Invite Link</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">
                  Invite as
                </label>
                <Select defaultValue="Member">
                  <SelectTrigger className="w-full bg-zinc-800 border-zinc-700 h-9 text-xs text-zinc-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-300">
                    <SelectItem value="Member">Member</SelectItem>
                    <SelectItem value="Workspace Admin">Workspace Admin</SelectItem>
                    <SelectItem value="Team Lead">Team Lead</SelectItem>
                    <SelectItem value="Viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">
                  Expires in
                </label>
                <Select defaultValue="72h">
                  <SelectTrigger className="w-full bg-zinc-800 border-zinc-700 h-9 text-xs text-zinc-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-300">
                    <SelectItem value="24h">24 hours</SelectItem>
                    <SelectItem value="72h">72 hours</SelectItem>
                    <SelectItem value="7d">7 days</SelectItem>
                    <SelectItem value="30d">30 days</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
                  Limit uses
                </label>
                <Switch className="data-[state=checked]:bg-[#7C5CFC]" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">
                  Max uses
                </label>
                <Input 
                  type="number" 
                  defaultValue={10}
                  className="bg-zinc-800 border-zinc-700 h-9 text-xs w-24 focus-visible:ring-[#7C5CFC]/30"
                />
              </div>

              <CTAButton className="w-full h-10 mt-2">
                Generate Link
              </CTAButton>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
