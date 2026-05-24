"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  UserPlus, 
  MoreHorizontal, 
  Mail, 
  Link as LinkIcon, 
  Eye, 
  EyeOff,
  Building,
  Layers
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, getAvatarColorClass } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useMembers } from "@/hooks/useMembers";
import { useAuth } from "@/hooks/useAuth";
import { useOrgStore } from "@/store/orgStore";
import { getTenantInvitations, generateInvite } from "@/lib/api/invites";
import { getWorkspacesByTenant, getWorkspaceMembers } from "@/lib/api/workspaces";
import { InviteResponse } from "@/types/invite";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import { InviteModal } from "@/components/common/InviteModal";
import { type TenantRole, roleLabel } from "@/types/roles";
import {
  canManageOrgMembers,
  canViewOrgMemberDirectory,
  normalizeTenantRole,
} from "@/lib/permissions/tenant";

const roleColors: Record<string, string> = {
  OWNER: "text-[#7C5CFC] bg-[#7C5CFC]/10 border-[#7C5CFC]/20",
  ADMIN: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  BILLING_ADMIN: "text-green-400 bg-green-400/10 border-green-400/20",
  MEMBER: "text-zinc-400 bg-zinc-800 border-zinc-700",
};

function TenantRoleChip({ role }: { role: TenantRole }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-7 shrink-0 text-[10px] px-2.5 py-0 font-medium rounded-sm border uppercase tracking-wide",
        roleColors[role],
      )}
    >
      {roleLabel(role)}
    </Badge>
  );
}

export default function GlobalMembersSettings() {
  const { members, loading } = useMembers();
  const { user } = useAuth();
  const { activeOrg } = useOrgStore();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  
  // Workspaces Data for Global View
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [workspaceMembersMap, setWorkspaceMembersMap] = useState<Record<string, any[]>>({});
  const [selectedWorkspaceFilter, setSelectedWorkspaceFilter] = useState<string>("all");

  // Dynamic Invite Links
  const [inviteLinks, setInviteLinks] = useState<InviteResponse[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});

  const togglePinVisibility = (id: string) => {
    setVisiblePins((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const fetchInvitations = async () => {
    if (!activeOrg?.id) return;
    setInvitesLoading(true);
    try {
      const data = await getTenantInvitations(activeOrg.id);
      setInviteLinks(data);
    } catch (err) {
      console.error("Failed to load invitations", err);
    } finally {
      setInvitesLoading(false);
    }
  };

  const canViewMembers = canViewOrgMemberDirectory(members, user?.email, activeOrg);
  const canManageMembers = canManageOrgMembers(members, user?.email, activeOrg);

  useEffect(() => {
    if (!activeOrg?.id || !canManageMembers) {
      setInviteLinks([]);
      return;
    }
    fetchInvitations();
  }, [activeOrg?.id, canManageMembers]);

  useEffect(() => {
    if (!activeOrg?.id) return;
    
    const loadWorkspaceData = async () => {
      try {
        const wsList = await getWorkspacesByTenant(activeOrg.id);
        setWorkspaces(wsList);
        
        const map: Record<string, any[]> = {};
        for (const ws of wsList) {
          try {
            const membersList = await getWorkspaceMembers(ws.id);
            map[ws.id] = membersList;
          } catch (e) {
            console.error(`Failed to load members for workspace ${ws.id}`, e);
          }
        }
        setWorkspaceMembersMap(map);
      } catch (err) {
        console.error("Failed to load workspace membership data", err);
      }
    };
    
    loadWorkspaceData();
  }, [activeOrg?.id]);

  const getMemberWorkspaces = (memberUserId: string) => {
    const wsBelonging: any[] = [];
    workspaces.forEach((ws) => {
      const wsMembers = workspaceMembersMap[ws.id] || [];
      const isMember = wsMembers.some((m) => m.userId === memberUserId);
      if (isMember) {
        wsBelonging.push(ws);
      }
    });
    return wsBelonging;
  };

  const filteredMembers = members.filter((member) => {
    // Search query filter
    const matchesSearch = 
      !searchQuery ||
      member.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.username?.toLowerCase().includes(searchQuery.toLowerCase());
      
    // Role filter
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    
    // Workspace filter
    let matchesWorkspace = true;
    if (selectedWorkspaceFilter !== "all") {
      const wsMembers = workspaceMembersMap[selectedWorkspaceFilter] || [];
      matchesWorkspace = wsMembers.some((m) => m.userId === member.id);
    }
    
    return matchesSearch && matchesRole && matchesWorkspace;
  });

  if (!loading && !canViewMembers) {
    return (
      <div className="max-w-4xl px-8 py-6">
        <header className="mb-6">
          <h1 className="text-xl font-semibold text-[#E5E1E4]">Global Member Directory</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Global directory access is limited to organization owners, admins, and members.
          </p>
        </header>
        <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 px-4 py-8 text-center text-sm text-zinc-500">
          You do not have permission to view the global member list for this organization.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl px-8 py-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-[#E5E1E4]">Global Member Directory</h1>
        <p className="text-sm text-zinc-400 mt-1">
          {members.length} members total in {activeOrg?.name || "Organization"}{" "}
          {activeOrg?.ownerEmail && `· Owner: ${activeOrg.ownerEmail}`}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search global members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-zinc-800 border-zinc-700 h-9 text-sm focus-visible:ring-hs-accent/50"
          />
        </div>
        
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[140px] bg-zinc-800 border-zinc-700 h-9 text-sm text-zinc-300">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="OWNER">{roleLabel("OWNER")}</SelectItem>
            <SelectItem value="ADMIN">{roleLabel("ADMIN")}</SelectItem>
            <SelectItem value="BILLING_ADMIN">{roleLabel("BILLING_ADMIN")}</SelectItem>
            <SelectItem value="MEMBER">{roleLabel("MEMBER")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedWorkspaceFilter} onValueChange={setSelectedWorkspaceFilter}>
          <SelectTrigger className="w-[180px] bg-zinc-800 border-zinc-700 h-9 text-sm text-zinc-300">
            <SelectValue placeholder="All Workspaces" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
            <SelectItem value="all">All Workspaces</SelectItem>
            {workspaces.map((ws) => (
              <SelectItem key={ws.id} value={ws.id}>
                {ws.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto">
          {canManageMembers && (
            <InviteModal
              trigger={
                <button className="flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-500">
                  <UserPlus className="h-3.5 w-3.5" />
                  Invite Member
                </button>
              }
            />
          )}
        </div>
      </div>

      <div className="space-y-1">
        {loading ? (
          <div className="py-4 text-center text-zinc-500 text-sm">
            Loading members...
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-4 text-center text-zinc-500 text-sm">
            No members found.
          </div>
        ) : (
          filteredMembers.map((member) => (
            (() => {
              const displayName = member.fullName || member.username;
              const initials = displayName ? displayName.substring(0, 2).toUpperCase() : "JD";
              const memberRole = normalizeTenantRole(member.role);
              const memberWorkspaces = getMemberWorkspaces(member.id);
              
              return (
                <div
                  key={member.id}
                  className="h-14 flex items-center gap-3 px-4 rounded-md transition-colors hover:bg-zinc-800/30 group"
                >
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className={cn("text-xs font-semibold text-white", getAvatarColorClass(displayName || "JD"))}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#201F21] bg-green-500" />
                  </div>
                  
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#E5E1E4] truncate">
                        {displayName}
                      </span>
                      {user?.id === member.id && (
                        <span className="text-[10px] text-zinc-500 font-medium">
                          (you)
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-400 truncate">
                      {member.email}
                    </span>
                  </div>

                  {/* Workspace badging */}
                  <div className="ml-4 flex flex-wrap gap-1 max-w-[220px]">
                    {memberWorkspaces.length === 0 ? (
                      <span className="text-[10px] text-zinc-650 italic">No workspaces</span>
                    ) : (
                      memberWorkspaces.map((ws) => (
                        <Badge 
                          key={ws.id} 
                          variant="outline" 
                          className="bg-zinc-900 border-zinc-800/80 text-[10px] px-1.5 py-0 rounded text-zinc-400 font-normal shrink-0"
                        >
                          {ws.name}
                        </Badge>
                      ))
                    )}
                  </div>

                  <div className="ml-6 shrink-0">
                    <TenantRoleChip role={memberRole} />
                  </div>

                  <div className="ml-auto text-xs text-zinc-500 shrink-0">Just now</div>

                  <button className="p-2 text-zinc-500 hover:text-zinc-200 transition-opacity opacity-0 group-hover:opacity-100 shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              );
            })()
          ))
        )}
      </div>

      {canManageMembers && (
        <div className="mt-10">
          <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-4">
            ACTIVE INVITE LINKS
          </h3>
          <p className="text-xs text-zinc-400 mb-6 px-4">
            Share these links to let people join without sending individual emails. Anyone
            with the link can join with the assigned role.
          </p>

          <div className="space-y-3">
            {invitesLoading ? (
              <div className="text-xs text-zinc-500 px-4 py-8 border border-dashed border-zinc-800/50 rounded-lg text-center animate-pulse">
                Loading invite link history...
              </div>
            ) : inviteLinks.length === 0 ? (
              <div className="text-xs text-[#E5E1E4]/60 px-4 py-8 border border-dashed border-zinc-800/60 rounded-lg text-center bg-zinc-950/20">
                No active invite links. Create one below to share!
              </div>
            ) : (
              inviteLinks.map((link) => {
                const isActive = link.status === "ACTIVE";
                const inviteUrl =
                  typeof window !== "undefined"
                    ? `${window.location.origin}/invite/${activeOrg?.slug}/${link.token}`
                    : `hivespace.app/invite/${activeOrg?.slug || "org"}/${link.token}`;

                const createdDate = new Date(link.createdAt).toLocaleDateString();
                const expiresDate = new Date(link.expiresAt).toLocaleDateString();

                const daysLeft = Math.max(
                  0,
                  Math.ceil(
                    (new Date(link.expiresAt).getTime() - Date.now()) /
                      (1000 * 60 * 60 * 24)
                  )
                );

                return (
                  <div
                    key={link.id}
                    className={cn(
                      "bg-[#272629] border border-zinc-800/50 rounded-lg p-4 group transition-all duration-300 hover:border-zinc-700/60",
                      !isActive && "opacity-60"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <LinkIcon className="h-3.5 w-3.5 text-zinc-400" />
                        <Badge
                          variant="outline"
                          className="bg-zinc-800 border-zinc-700 text-[10px] font-medium px-2 py-0.5 text-zinc-300 rounded-sm"
                        >
                          {roleLabel(normalizeTenantRole((link.tenantRole || link.role) as any))}
                        </Badge>
                        <span className="text-[11px] text-zinc-500 ml-3 font-medium">
                          Used {link.currentUses} times
                        </span>
                        <span className="text-[11px] text-zinc-600">
                          by {link.inviterUsername}
                        </span>
                      </div>
                      <Badge
                        className={cn(
                          "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border",
                          isActive
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : "bg-zinc-800 border-zinc-700 text-zinc-600"
                        )}
                      >
                        {link.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <div className="bg-zinc-800/60 rounded px-2.5 py-1.5 flex-1 min-w-0 border border-zinc-800">
                        <p className="text-[10px] font-mono text-zinc-400 truncate">
                          {inviteUrl}
                        </p>
                      </div>
                      <div className="flex items-center gap-3.5 shrink-0">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(inviteUrl);
                            toast.success("Invite link copied!");
                          }}
                          className="text-[10px] font-bold text-[#7C5CFC] uppercase tracking-wider hover:opacity-80 transition-opacity cursor-pointer"
                        >
                          Copy Link
                        </button>
                        {link.pin && link.pin.length < 20 && (
                          <div className="flex items-center gap-1.5 border-l border-zinc-850 pl-3">
                            <span className="text-[9px] text-zinc-550">PIN:</span>
                            <span className="bg-amber-500/10 border-amber-500/20 text-amber-400 font-mono text-[9px] rounded-sm px-1.5 py-0.5 tracking-wider min-w-[45px] text-center">
                              {visiblePins[link.id] ? link.pin : "••••••"}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePinVisibility(link.id)}
                              className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-zinc-200 cursor-pointer ml-0.5 shrink-0 flex items-center justify-center"
                              title={visiblePins[link.id] ? "Hide PIN" : "Show PIN"}
                            >
                              {visiblePins[link.id] ? (
                                <EyeOff className="h-3 w-3" />
                              ) : (
                                <Eye className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-5 text-[10px] font-medium text-zinc-600">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(daysLeft <= 1 && isActive && "text-amber-500")}
                        >
                          Expires: {expiresDate} ·{" "}
                          {daysLeft === 0 ? "Expired" : `${daysLeft} days left`}
                        </span>
                      </div>
                      <span>
                        Max uses:{" "}
                        {link.maxUses >= 999999
                          ? "Unlimited"
                          : `${link.maxUses} (${link.currentUses} used)`}
                      </span>
                      <span>Created: {createdDate}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
