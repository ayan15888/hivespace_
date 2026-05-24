"use client";

import { useState } from "react";
import { 
  Search, 
  UserPlus, 
  MoreHorizontal,
  Info
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
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { InviteModal } from "@/components/common/InviteModal";

const workspaceRoleColors: Record<string, string> = {
  ADMIN: "text-[#7C5CFC] bg-[#7C5CFC]/10 border-[#7C5CFC]/20",
  MEMBER: "text-zinc-300 bg-zinc-800 border-zinc-700",
  VIEWER: "text-blue-400 bg-blue-400/10 border-blue-400/20",
};

export default function WorkspaceMembersSettings() {
  const { activeWorkspace } = useWorkspaceStore();
  const { members, loading } = useWorkspaceMembers();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const filteredMembers = members.filter((member) => {
    const matchesSearch = 
      !searchQuery ||
      member.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.username?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || member.role === roleFilter;

    return matchesSearch && matchesRole;
  });

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
          {members.length} members in the <span className="text-violet-400 font-medium">{activeWorkspace.name}</span> workspace
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
          <InviteModal
            trigger={
              <button className="flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-500">
                <UserPlus className="h-3.5 w-3.5" />
                Invite to Workspace
              </button>
            }
          />
        </div>
      </div>

      <div className="space-y-1">
        {loading ? (
          <div className="py-8 text-center text-zinc-500 text-sm">
            Loading members...
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-lg bg-zinc-900/10">
            No workspace members found matching the filters.
          </div>
        ) : (
          filteredMembers.map((member) => {
            const displayName = member.fullName || member.username;
            const initials = displayName ? displayName.substring(0, 2).toUpperCase() : "JD";
            const memberRole = member.role || "MEMBER";

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
                    {user?.id === member.userId && (
                      <span className="text-[10px] text-zinc-500 font-medium">
                        (you)
                      </span>
                    )}
                  </div>
                  {member.email && (
                    <span className="text-xs text-zinc-400 truncate">
                      {member.email}
                    </span>
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

                <div className="ml-auto text-xs text-zinc-500 shrink-0">Just now</div>

                <button className="p-2 text-zinc-500 hover:text-zinc-200 transition-opacity opacity-0 group-hover:opacity-100 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
