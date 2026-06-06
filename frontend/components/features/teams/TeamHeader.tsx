"use client";

import { useEffect, useState } from "react";
import { Crown, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getTeamMembers, TeamMemberResponse } from "@/lib/api/teams";
import { useTaskStore } from "@/store/taskStore";
import { useTeams } from "@/hooks/useTeams";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { getAvatarColorClass } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface TeamHeaderProps {
  teamId: string;
  teamName: string;
}

export function TeamHeader({ teamId, teamName }: TeamHeaderProps) {
  const { activeWorkspace } = useWorkspaceStore();
  const { teams } = useTeams(activeWorkspace?.id);
  const currentTeam = teams.find(t => t.id === teamId);
  
  const [members, setMembers] = useState<TeamMemberResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const { tasks } = useTaskStore();

  useEffect(() => {
    if (teamId) {
      setLoading(true);
      getTeamMembers(teamId)
        .then(setMembers)
        .catch(err => console.error("Failed to fetch team members in header", err))
        .finally(() => setLoading(false));
    }
  }, [teamId]);

  const teamTasks = tasks.filter(t => t.teamId === teamId);
  const openTasksCount = teamTasks.filter(t => t.status !== "DONE" && t.status !== "CANCELLED").length;
  
  const distinctProjects = new Set(teamTasks.map(t => t.projectId).filter(Boolean));
  const activeProjectsCount = distinctProjects.size;

  const leadMember = members.find(m => m.role === "LEAD");
  const leadInitials = leadMember?.fullName 
    ? leadMember.fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  // Simulate PR count or compute based on task review status
  const prsCount = teamTasks.filter(t => t.status === "IN_REVIEW").length;

  return (
    <div className="flex w-full flex-col bg-hs-main p-6">
      <div className="flex flex-col md:flex-row items-start justify-between gap-6">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-hs-accent/30 bg-hs-accent/10 shrink-0">
            <Users className="h-6 w-6 text-hs-accent" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold text-foreground">{teamName}</h1>
            <p className="mt-1 text-xs text-zinc-500 uppercase tracking-wider">
              {activeWorkspace?.name || "Workspace"}
            </p>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground leading-relaxed">
              {currentTeam?.description || "No description provided for this team."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-8 px-2">
          <div className="flex flex-col gap-1 min-w-[60px]">
            <span className="text-2xl font-semibold text-foreground">{members.length}</span>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Members</span>
          </div>
          <div className="flex flex-col gap-1 min-w-[60px]">
            <span className="text-2xl font-semibold text-foreground">{openTasksCount}</span>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Open Tasks</span>
          </div>
          <div className="flex flex-col gap-1 min-w-[60px]">
            <span className="text-2xl font-semibold text-foreground">{activeProjectsCount}</span>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Active Projects</span>
          </div>
          <div className="flex flex-col gap-1 min-w-[60px]">
            <span className="text-2xl font-semibold text-foreground">{prsCount}</span>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">In Review</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-bold">
          Team Lead
        </span>
        {leadMember ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7 border border-border/50">
              {leadMember.avatarUrl && <AvatarImage src={leadMember.avatarUrl} />}
              <AvatarFallback className={cn("text-[10px] font-semibold text-white", getAvatarColorClass(leadInitials))}>
                {leadInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-foreground font-medium">
                {leadMember.fullName || leadMember.username}
              </span>
              <Crown className="h-3 w-3 text-amber-400 fill-none" />
            </div>
          </div>
        ) : (
          <span className="text-xs text-zinc-500 italic">No designated team lead.</span>
        )}
      </div>
    </div>
  );
}
