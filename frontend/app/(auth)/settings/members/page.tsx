"use client";

import { useState, useEffect } from "react";
import {
  Search,
  UserPlus,
  Info,
  MoreHorizontal,
  UserMinus,
  ShieldAlert,
  Loader2,
  Building2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, getAvatarColorClass } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { InviteModal } from "@/components/common/InviteModal";
import { usePermission } from "@/hooks/usePermission";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { removeWorkspaceMember, WorkspaceMemberResponse, getWorkspacesByTenant, WorkspaceResponse } from "@/lib/api/workspaces";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import { useQueryClient } from "@tanstack/react-query";
import { AddToWorkspaceModal } from "@/components/features/settings/AddToWorkspaceModal";
import { getOrganizationMembers, MemberResponse } from "@/lib/api/orgs";
import { useOrgStore } from "@/store/orgStore";

const workspaceRoleColors: Record<string, string> = {
  ADMIN: "text-[#7C5CFC] bg-[#7C5CFC]/10 border-[#7C5CFC]/20",
  MEMBER: "text-zinc-300 bg-zinc-800 border-zinc-700",
  VIEWER: "text-blue-400 bg-blue-400/10 border-blue-400/20",
};

export default function WorkspaceMembersSettings() {
  const { activeWorkspace } = useWorkspaceStore();
  const { members, loading } = useWorkspaceMembers();
  const { user } = useAuth();
  const { canAdminWorkspace, loading: permissionsLoading } = usePermission();
  const { activeOrg } = useOrgStore();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Remove member confirmation state
  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMemberResponse | null>(null);
  const [removing, setRemoving] = useState(false);

  // Add existing member state
  const [addMemberTarget, setAddMemberTarget] = useState<MemberResponse | null>(null);
  const [orgMembers, setOrgMembers] = useState<MemberResponse[]>([]);
  const [allWorkspaces, setAllWorkspaces] = useState<WorkspaceResponse[]>([]);

  // Load org members + all workspaces (for AddToWorkspaceModal)
  useEffect(() => {
    if (!activeOrg?.id || !canAdminWorkspace) return;
    getOrganizationMembers(activeOrg.id)
      .then(setOrgMembers)
      .catch(() => {});
    getWorkspacesByTenant(activeOrg.id)
      .then(setAllWorkspaces)
      .catch(() => {});
  }, [activeOrg?.id, canAdminWorkspace]);

  // Org members not yet in THIS workspace (for quick-add)
  const memberUserIds = new Set(members.map((m) => m.userId));
  const nonWorkspaceMembers = orgMembers.filter((m) => !memberUserIds.has(m.id));

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      !searchQuery ||
      member.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.username?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || member.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const handleRemoveMember = async () => {
    if (!memberToRemove || !activeWorkspace) return;
    setRemoving(true);
    try {
      await removeWorkspaceMember(activeWorkspace.id, memberToRemove.userId);
      toast.success(`${memberToRemove.fullName || memberToRemove.username} removed from workspace`);
      // Invalidate the members list query so the UI refreshes
      queryClient.invalidateQueries({ queryKey: ["workspaceMembers", activeWorkspace.id] });
      setMemberToRemove(null);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to remove member");
    } finally {
      setRemoving(false);
    }
  };

  if (!activeWorkspace) {
    return (
      <div className="max-w-4xl px-8 py-12 flex flex-col items-center justify-center text-center">
        <div className="p-4 bg-zinc-800/40 rounded-full mb-4 border border-zinc-700/50">
          <Info className="h-8 w-8 text-zinc-500" />
        </div>
        <h1 className="text-xl font-semibold text-[#E5E1E4]">No Active Workspace</h1>
        <p className="text-sm text-zinc-400 mt-2 max-w-sm leading-relaxed">
          Please select or create a workspace from the sidebar menu to view its members.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl px-8 py-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-[#E5E1E4]">Workspace Members</h1>
        <p className="text-sm text-zinc-450 mt-1">
          {members.length} members in the{" "}
          <span className="text-violet-400 font-medium">{activeWorkspace.name}</span> workspace
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search workspace members..."
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
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="MEMBER">Member</SelectItem>
            <SelectItem value="VIEWER">Viewer</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto">
          {permissionsLoading ? (
            <button
              disabled
              className="flex h-9 items-center gap-2 rounded-md bg-emerald-600/30 px-4 text-xs font-semibold text-white/50 cursor-not-allowed"
            >
              <UserPlus className="h-3.5 w-3.5 animate-pulse" />
              Invite to Workspace
            </button>
          ) : canAdminWorkspace ? (
            <div className="flex items-center gap-2">
              {/* Add existing org member to this workspace */}
              {nonWorkspaceMembers.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex h-9 items-center gap-2 rounded-md bg-zinc-700 px-4 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-600">
                      <Building2 className="h-3.5 w-3.5" />
                      Add Existing Member
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-zinc-800 text-zinc-300 max-h-64 overflow-y-auto">
                    {nonWorkspaceMembers.map((m) => (
                      <DropdownMenuItem
                        key={m.id}
                        className="cursor-pointer gap-2 focus:bg-zinc-800"
                        onClick={() => setAddMemberTarget(m)}
                      >
                        <div className="h-5 w-5 rounded-full bg-zinc-700 flex items-center justify-center text-[9px] font-bold text-zinc-300 shrink-0">
                          {(m.fullName || m.username).substring(0, 2).toUpperCase()}
                        </div>
                        <span className="truncate text-xs">{m.fullName || m.username}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <InviteModal
                trigger={
                  <button className="flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-500">
                    <UserPlus className="h-3.5 w-3.5" />
                    Invite to Workspace
                  </button>
                }
              />
            </div>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="block">
                    <button
                      disabled
                      className="flex h-9 items-center gap-2 rounded-md bg-emerald-600/30 px-4 text-xs font-semibold text-white/50 cursor-not-allowed"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Invite to Workspace
                    </button>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="bg-zinc-800 border-zinc-700 text-xs text-zinc-300 ml-2">
                  Only workspace and organization admins can invite new members.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <div className="space-y-1">
        {loading ? (
          <div className="py-8 text-center text-zinc-500 text-sm">Loading members...</div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-lg bg-zinc-900/10">
            No workspace members found matching the filters.
          </div>
        ) : (
          filteredMembers.map((member) => {
            const displayName = member.fullName || member.username;
            const initials = displayName ? displayName.substring(0, 2).toUpperCase() : "JD";
            const memberRole = member.role || "MEMBER";
            const isCurrentUser = user?.id === member.userId;
            // Cannot remove yourself or the last admin
            const canRemove = canAdminWorkspace && !isCurrentUser;

            return (
              <div
                key={member.id}
                className="h-14 flex items-center gap-3 px-4 rounded-md transition-colors hover:bg-zinc-800/30 group"
              >
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback
                      className={cn(
                        "text-xs font-semibold text-white",
                        getAvatarColorClass(displayName || "JD")
                      )}
                    >
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
                    {isCurrentUser && (
                      <span className="text-[10px] text-zinc-500 font-medium">(you)</span>
                    )}
                  </div>
                  {member.email && (
                    <span className="text-xs text-zinc-400 truncate">{member.email}</span>
                  )}
                </div>

                <div className="ml-6 shrink-0">
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-7 shrink-0 text-[10px] px-2.5 py-0 font-medium rounded-sm border uppercase tracking-wide",
                      workspaceRoleColors[memberRole]
                    )}
                  >
                    {memberRole}
                  </Badge>
                </div>

                <div className="ml-auto text-xs text-zinc-500 shrink-0">
                  {member.joinedAt
                    ? new Date(member.joinedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </div>

                {/* Actions dropdown — visible to admins, hidden for self */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        "p-2 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/50 transition-all shrink-0",
                        canAdminWorkspace
                          ? "opacity-0 group-hover:opacity-100"
                          : "hidden"
                      )}
                      aria-label="Member actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48 bg-zinc-900 border-zinc-800 text-zinc-300"
                  >
                    {canRemove ? (
                      <>
                        <DropdownMenuSeparator className="bg-zinc-800" />
                        <DropdownMenuItem
                          className="text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer gap-2"
                          onClick={() => setMemberToRemove(member)}
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                          Remove from workspace
                        </DropdownMenuItem>
                      </>
                    ) : isCurrentUser ? (
                      <DropdownMenuItem disabled className="text-zinc-500 text-xs gap-2 cursor-default">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Cannot remove yourself
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })
        )}
      </div>

      {/* ── Remove confirmation dialog ── */}
      <Dialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <DialogContent className="sm:max-w-[400px] bg-zinc-900 border-zinc-800 text-zinc-100 rounded-2xl p-0 overflow-hidden">
          {/* Danger header stripe */}
          <div className="h-1.5 w-full bg-gradient-to-r from-red-600 to-rose-500" />
          <div className="p-6">
            <DialogHeader className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-9 w-9 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                  <UserMinus className="h-4 w-4 text-red-400" />
                </div>
                <DialogTitle className="text-base font-semibold text-zinc-100">
                  Remove member
                </DialogTitle>
              </div>
              <DialogDescription className="text-sm text-zinc-400 leading-relaxed">
                Are you sure you want to remove{" "}
                <span className="font-semibold text-zinc-200">
                  {memberToRemove?.fullName || memberToRemove?.username}
                </span>{" "}
                from{" "}
                <span className="font-semibold text-zinc-200">{activeWorkspace.name}</span>?
                <br />
                <span className="text-xs mt-1 block text-zinc-500">
                  They will lose access to all projects and teams within this workspace.
                </span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="border-0 bg-transparent p-0 -mx-0 -mb-0 mt-2">
              <Button
                variant="ghost"
                onClick={() => setMemberToRemove(null)}
                disabled={removing}
                className="text-zinc-400 hover:text-zinc-200 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRemoveMember}
                disabled={removing}
                className="bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold px-6"
              >
                {removing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Remove"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add existing org member to this workspace ── */}
      {activeOrg && (
        <AddToWorkspaceModal
          open={!!addMemberTarget}
          onClose={() => setAddMemberTarget(null)}
          member={addMemberTarget}
          workspaces={allWorkspaces}
          orgId={activeOrg.id}
        />
      )}
    </div>
  );
}
