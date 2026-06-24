"use client";

import { 
  Calendar, 
  UserPlus, 
  Share2, 
  Settings, 
  PlusCircle, 
  ChevronRight, 
  FileText,
  CheckSquare,
  Link2,
  Trash2,
  GitGraph as Github
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";
import { PROJECT_COLOR_MAP } from "@/lib/constants/colors";
import { 
  getProjectMembers, 
  ProjectMemberResponse,
  getProjectTeams,
  assignProjectTeam,
  unassignProjectTeam
} from "@/lib/api/projects";
import { getTeamsByWorkspace, TeamResponse } from "@/lib/api/teams";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useShareStore } from "@/store/shareStore";
import { useOrgStore } from "@/store/orgStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useProjectOverviewStore } from "./store";
import { queryKeys } from "@/lib/queryKeys";
import { useWorkspaceStore } from "@/store/workspaceStore";

// Dynamic API fetches
import { 
  getTasksByProject, 
  getTaskActivities, 
  TaskResponse, 
  TaskActivityResponse 
} from "@/lib/api/tasks";
import { 
  getDocumentsByProject, 
  DocumentResponse 
} from "@/lib/api/documents";
import { CreateTaskModal } from "@/components/features/tasks/CreateTaskModal";
import { getLinkedRepos, GithubRepoLinkResponse } from "@/lib/api/github";

interface ActivityWithTask extends TaskActivityResponse {
  taskTitle: string;
  taskIdentifier: string;
}

const PRIORITY_COLOR_MAP: Record<string, string> = {
  LOW: "bg-blue-500/80",
  MEDIUM: "bg-amber-500",
  HIGH: "bg-red-500",
  URGENT: "bg-red-600",
};

const STATUS_COLOR_MAP: Record<string, string> = {
  TODO: "text-zinc-400 bg-zinc-400/10",
  IN_PROGRESS: "text-violet-400 bg-violet-400/10",
  IN_REVIEW: "text-blue-400 bg-blue-400/10",
  DONE: "text-emerald-400 bg-emerald-400/10",
  CANCELLED: "text-red-400 bg-red-400/10"
};

const getInitials = (name?: string | null) => {
  if (!name) return "--";
  return name.trim().split(/\s+/).map(n => n[0]).join("").toUpperCase().substring(0, 2);
};

export default function ProjectOverviewPage() {
  const params = useParams();
  const { projects, refreshProjects } = useProjects();
  const projectId = params?.projectSlug as string || "";

  const currentProject = projects.find(p => p.id === projectId);
  const themeColor = PROJECT_COLOR_MAP[currentProject?.color || ""] || "#7C5CFC";

  // Zustand UI Store
  const {
    isTeamsDialogOpen,
    setIsTeamsDialogOpen,
    selectedTeamToAssign,
    setSelectedTeamToAssign,
    isCreateModalOpen,
    setIsCreateModalOpen,
  } = useProjectOverviewStore();

  const { activeWorkspace } = useWorkspaceStore();

  // Share store integration
  const { shareLinks, fetchOrCreateShareLink, revokeProjectShareLink } = useShareStore();
  const { activeOrg } = useOrgStore();

  const activeLink = currentProject ? shareLinks[currentProject.id] : null;

  const queryClient = useQueryClient();

  // TanStack Queries
  const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const { data: projectMembers = [] } = useQuery<ProjectMemberResponse[], Error>({
    queryKey: ["projectMembers", projectId],
    queryFn: () => getProjectMembers(projectId),
    enabled: !!projectId && isUuid(projectId),
    staleTime: 30_000,
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery<TaskResponse[], Error>({
    queryKey: ["projectTasks", projectId],
    queryFn: () => getTasksByProject(projectId),
    enabled: !!projectId && isUuid(projectId),
    staleTime: 10_000,
  });

  const { data: documents = [], isLoading: loadingDocs } = useQuery<DocumentResponse[], Error>({
    queryKey: queryKeys.documents(projectId),
    queryFn: () => getDocumentsByProject(projectId),
    enabled: !!projectId && isUuid(projectId),
    staleTime: 15_000,
  });

  const { data: activities = [], isLoading: loadingActivity } = useQuery<ActivityWithTask[], Error>({
    queryKey: ["projectActivities", projectId],
    queryFn: async () => {
      const tasksData = await getTasksByProject(projectId);
      if (tasksData.length === 0) return [];
      const promises = tasksData.slice(0, 10).map(async (task) => {
        try {
          const acts = await getTaskActivities(task.id);
          return acts.map(act => ({
            ...act,
            taskTitle: task.title,
            taskIdentifier: task.taskIdentifier || `HS-${task.id.substring(0, 4)}`
          }));
        } catch {
          return [];
        }
      });
      const results = await Promise.all(promises);
      return results.flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
    },
    enabled: !!projectId,
    staleTime: 10_000,
  });

  const { data: assignedTeams = [], isLoading: loadingAssignedTeams } = useQuery<TeamResponse[], Error>({
    queryKey: ["projectTeams", projectId],
    queryFn: () => getProjectTeams(projectId),
    enabled: !!projectId && isTeamsDialogOpen,
    staleTime: 15_000,
  });

  const { data: repoLinks = [], isLoading: loadingRepoLinks } = useQuery<GithubRepoLinkResponse[], Error>({
    queryKey: ["projectRepoLinks", projectId],
    queryFn: () => getLinkedRepos(projectId),
    enabled: !!projectId && isUuid(projectId),
    staleTime: 20_000,
  });

  const { data: allWorkspaceTeams = [], isLoading: loadingWorkspaceTeams } = useQuery<TeamResponse[], Error>({
    queryKey: queryKeys.teams(currentProject?.workspaceId || ""),
    queryFn: () => getTeamsByWorkspace(currentProject!.workspaceId),
    enabled: !!currentProject?.workspaceId && isTeamsDialogOpen,
    staleTime: 30_000,
  });

  const loadingTeams = loadingAssignedTeams || loadingWorkspaceTeams;

  // TanStack Mutations
  const assignTeamMutation = useMutation({
    mutationFn: (teamId: string) => assignProjectTeam(projectId, teamId),
    onSuccess: () => {
      toast.success("Team assigned successfully");
      setSelectedTeamToAssign("");
      queryClient.invalidateQueries({ queryKey: ["projectTeams", projectId] });
      refreshProjects();
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to assign team");
    }
  });

  const unassignTeamMutation = useMutation({
    mutationFn: (teamId: string) => unassignProjectTeam(projectId, teamId),
    onSuccess: () => {
      toast.success("Team unassigned successfully");
      queryClient.invalidateQueries({ queryKey: ["projectTeams", projectId] });
      refreshProjects();
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to unassign team");
    }
  });

  const handleCopyLink = () => {
    if (!activeLink || !activeOrg) return;
    const shareUrl = `${window.location.origin}/share/${activeOrg.slug}/project/${activeLink.token}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Public share link copied to clipboard!");
  };

  const handleRevoke = async () => {
    if (!currentProject?.id || !activeLink) return;
    try {
      await revokeProjectShareLink(currentProject.id, activeLink.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerate = async () => {
    if (!currentProject?.id) return;
    try {
      await fetchOrCreateShareLink(currentProject.id);
      toast.success("Share link generated successfully!");
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignTeam = () => {
    if (!selectedTeamToAssign) return;
    assignTeamMutation.mutate(selectedTeamToAssign);
  };

  const handleUnassignTeam = (teamId: string) => {
    unassignTeamMutation.mutate(teamId);
  };

  const displayTitle = currentProject?.name || "Project";

  const unassignedTeams = allWorkspaceTeams.filter(
    (wt) => !assignedTeams.some((at) => at.id === wt.id)
  );

  // Date and Progress calculations
  const startDateStr = currentProject?.startDate 
    ? new Date(currentProject.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) 
    : "";
  const endDateStr = currentProject?.endDate 
    ? new Date(currentProject.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) 
    : "";
  const dateRangeStr = startDateStr && endDateStr ? `${startDateStr} – ${endDateStr}` : "No dates set";

  let daysRemaining: number | null = null;
  if (currentProject?.endDate) {
    const end = new Date(currentProject.endDate);
    const now = new Date();
    end.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - now.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  let daysRemainingText = "";
  let isOverdue = false;
  if (daysRemaining !== null) {
    if (daysRemaining > 0) {
      daysRemainingText = `${daysRemaining} DAYS REMAINING`;
    } else if (daysRemaining === 0) {
      daysRemainingText = "ENDS TODAY";
    } else {
      daysRemainingText = `${Math.abs(daysRemaining)} DAYS OVERDUE`;
      isOverdue = true;
    }
  }

  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.status === "DONE").length;
  const progressPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const todoCount = tasks.filter(t => t.status === "TODO").length;
  const inProgressCount = tasks.filter(t => t.status === "IN_PROGRESS").length;
  const inReviewCount = tasks.filter(t => t.status === "IN_REVIEW").length;
  const doneCount = tasks.filter(t => t.status === "DONE").length;

  return (
    <ScrollArea className="h-screen w-full bg-background text-foreground">
      <div className="relative min-h-full w-full overflow-hidden flex flex-col pb-16">
        {/* ─── DYNAMIC BACKGROUND GLOW ─── */}
        <div 
          className="absolute top-0 left-0 right-0 h-[380px] pointer-events-none opacity-20 filter blur-[120px] transition-all duration-1000"
          style={{
            background: `radial-gradient(100% 100% at 50% 0%, ${themeColor} 0%, transparent 100%)`
          }}
        />

        {/* ─── TOP BAR ─── */}
        <header className="sticky top-0 z-30 flex h-[48px] shrink-0 items-center justify-between border-b border-white/[0.04] bg-background/50 px-8 backdrop-blur-lg">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-zinc-500 font-semibold tracking-wide">Hivespace</span>
            <span className="text-zinc-800 text-[10px] select-none">/</span>
            <span className="text-xs text-zinc-500 font-semibold tracking-wide">{activeWorkspace?.name || "Workspace"}</span>
            <span className="text-zinc-800 text-[10px] select-none">/</span>
            <span className="text-xs font-semibold text-zinc-300">{displayTitle}</span>
          </div>

          <nav className="flex h-full items-center gap-6">
            <Link href={`/dashboard/projects/${projectId}`} className="relative flex h-full items-center px-1 text-xs font-extrabold uppercase tracking-widest text-white transition-colors">
              Overview
              <div className="absolute bottom-0 left-0 h-[2px] w-full shadow-[0_-4px_10px_currentColor]" style={{ backgroundColor: themeColor, color: themeColor }} />
            </Link>
            <Link href={`/dashboard/projects/${projectId}/board`} className="flex h-full items-center px-1 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-200 transition-colors">
              Board
            </Link>
            <Link href={`/dashboard/projects/${projectId}/list`} className="flex h-full items-center px-1 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-200 transition-colors">
              List
            </Link>
            <Link href={`/dashboard/projects/${projectId}/timeline`} className="flex h-full items-center px-1 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-200 transition-colors">
              Timeline
            </Link>
            <Link href={`/dashboard/projects/${projectId}/backlog`} className="flex h-full items-center px-1 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-200 transition-colors">
              Backlog
            </Link>

            <Link href="/dashboard/docs" className="flex h-full items-center px-1 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-200 transition-colors">
              Docs
            </Link>
            <button 
              onClick={() => setIsTeamsDialogOpen(true)}
              className="flex h-full items-center px-1 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              Settings
            </button>
          </nav>

          <div className="flex items-center justify-end gap-2 flex-1">
            <Button 
              className="h-8 font-bold border-none transition-all duration-300 text-[11px] uppercase tracking-wider rounded-lg px-4 flex items-center gap-1.5 text-zinc-950"
              style={{ 
                backgroundColor: themeColor,
                boxShadow: `0 0 15px ${themeColor}25` 
              }}
              onClick={() => setIsCreateModalOpen(true)}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 0 25px ${themeColor}50`;
                e.currentTarget.style.opacity = "0.95";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = `0 0 15px ${themeColor}25`;
                e.currentTarget.style.opacity = "1";
              }}
            >
              <PlusCircle strokeWidth={2} className="h-3.5 w-3.5" />
              New Task
            </Button>
          </div>
        </header>

        {/* ─── PROJECT HEADER ─── */}
        <div className="flex flex-col px-8 pt-8 pb-4 relative z-10">
          <div className="flex items-start justify-between">
            <div className="flex gap-6 items-start">
              <div 
                className="h-16 w-16 rounded-2xl flex items-center justify-center text-3xl font-extrabold border shadow-2xl transition-transform duration-500 hover:scale-105 select-none"
                style={{ 
                  backgroundColor: `${themeColor}10`,
                  borderColor: `${themeColor}30`,
                  color: themeColor,
                  boxShadow: `0 0 30px ${themeColor}15`
                }}
              >
                {displayTitle.substring(0, 1).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{activeWorkspace?.name || "Workspace"}</span>
                <h1 className="text-3xl font-extrabold tracking-tight text-white mt-1">{displayTitle}</h1>
                <p className="text-sm text-zinc-400 mt-2 max-w-2xl leading-relaxed font-medium">
                  {currentProject?.description || "No description provided."}
                </p>
                <div className="flex items-center gap-2 mt-4 text-zinc-500 bg-white/[0.02] border border-white/[0.04] rounded-full px-3 py-1 w-fit">
                  <Calendar className="h-3.5 w-3.5 text-zinc-600" strokeWidth={1.5} />
                  <span className="text-xs font-medium font-mono">{dateRangeStr}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-4 shrink-0">
              <div className="flex items-center -space-x-2.5">
                {projectMembers.length > 0 ? (
                  <>
                    {projectMembers.slice(0, 5).map((member, i) => (
                      <Avatar 
                        key={member.id} 
                        className={cn(
                          "h-8 w-8 ring-4 ring-background bg-muted border border-white/[0.08] relative group transition-transform hover:-translate-y-0.5",
                          member.role === "LEAD" && "border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.25)]"
                        )}
                        username={member.fullName || member.username}
                        email={member.email || `${member.username.toLowerCase()}@hivespace.io`}
                        style={{ zIndex: 10 + i }}
                      >
                        <AvatarFallback className={cn("bg-zinc-900 text-[10px] text-zinc-400 font-extrabold", member.role === "LEAD" && "text-amber-400")}>
                          {member.fullName ? member.fullName.substring(0, 2).toUpperCase() : member.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {projectMembers.length > 5 && (
                      <div className="h-8 w-8 rounded-full ring-4 ring-background bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-[10px] text-zinc-400 font-extrabold z-30">
                        +{projectMembers.length - 5}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-8 w-8 rounded-full ring-4 ring-background bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-[10px] text-zinc-500 font-bold">
                    --
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1 backdrop-blur-md shadow-lg">
                <Button variant="ghost" size="sm" className="h-7 px-3 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-all" onClick={() => setIsTeamsDialogOpen(true)}>
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
                  Invite
                </Button>
                <div className="h-3 w-px bg-zinc-800" />
                <Button variant="ghost" size="sm" className="h-7 px-3 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-all" onClick={handleCopyLink}>
                  <Share2 className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
                  Share
                </Button>
                <div className="h-3 w-px bg-zinc-800" />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-3 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                  onClick={() => setIsTeamsDialogOpen(true)}
                >
                  <Settings className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
                  Teams
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── MAIN GRID ─── */}
        <div className="grid grid-cols-10 gap-8 px-8 relative z-10">
          
          {/* LEFT COLUMN (60%) */}
          <div className="col-span-6 flex flex-col gap-8">

             {/* Sprint Progress */}
             <div className="bg-zinc-900 border border-white/[0.06] rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
                <div className="flex flex-col md:flex-row gap-6 items-center md:items-stretch">
                   {/* Left Mini-Stat Block */}
                   <div 
                     className="flex flex-col items-center justify-center px-6 py-5 rounded-2xl border shrink-0 text-center min-w-[130px] select-none"
                     style={{
                       backgroundColor: `${themeColor}08`,
                       borderColor: `${themeColor}20`
                     }}
                   >
                      <span className="text-3xl font-black tracking-tight" style={{ color: themeColor }}>
                        {progressPercent}%
                      </span>
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1.5">
                        Progress
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 mt-1">
                        {completedTasksCount} / {totalTasksCount} done
                      </span>
                   </div>

                   {/* Right Progress & Timeline Details */}
                   <div className="flex-1 flex flex-col justify-between py-1 w-full">
                      <div className="flex items-center justify-between mb-2">
                         <div className="flex flex-col">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Sprint Tracking</h4>
                            <span className="text-[10px] text-zinc-500 font-mono mt-0.5">{dateRangeStr}</span>
                         </div>
                         {daysRemainingText && (
                           <span className={cn(
                             "text-[9px] font-extrabold tracking-widest px-2.5 py-0.5 rounded-full border uppercase shrink-0",
                             isOverdue 
                               ? "text-red-400 bg-red-500/10 border-red-500/20" 
                               : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                           )}>
                             {daysRemainingText}
                           </span>
                         )}
                      </div>

                      {/* Main bar */}
                      <div className="relative h-2.5 w-full bg-zinc-950/60 rounded-full overflow-hidden border border-white/5 p-[1px] my-3">
                        <Progress 
                          value={progressPercent} 
                          className="h-full bg-transparent transition-all duration-500" 
                          indicatorStyle={{ 
                            backgroundColor: themeColor, 
                            boxShadow: `0 0 8px ${themeColor}50` 
                          }} 
                        />
                      </div>

                      {/* Status Pills Grid */}
                      <div className="grid grid-cols-4 gap-2 mt-2">
                         <div className="flex flex-col bg-zinc-950/20 border border-white/[0.02] p-2 rounded-xl text-center hover:bg-zinc-950/40 transition-colors">
                           <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">Todo</span>
                           <span className="text-sm font-semibold text-zinc-200 mt-0.5 font-mono">{todoCount}</span>
                         </div>
                         <div className="flex flex-col bg-zinc-950/20 border border-white/[0.02] p-2 rounded-xl text-center hover:bg-zinc-950/40 transition-colors">
                           <span className="text-[9px] font-bold uppercase tracking-wide font-bold" style={{ color: themeColor }}>In Progress</span>
                           <span className="text-sm font-semibold text-zinc-200 mt-0.5 font-mono">{inProgressCount}</span>
                         </div>
                         <div className="flex flex-col bg-zinc-950/20 border border-white/[0.02] p-2 rounded-xl text-center hover:bg-zinc-950/40 transition-colors">
                           <span className="text-[9px] font-bold uppercase tracking-wide font-bold text-blue-400">Review</span>
                           <span className="text-sm font-semibold text-zinc-200 mt-0.5 font-mono">{inReviewCount}</span>
                         </div>
                         <div className="flex flex-col bg-zinc-950/20 border border-white/[0.02] p-2 rounded-xl text-center hover:bg-zinc-950/40 transition-colors">
                           <span className="text-[9px] font-bold uppercase tracking-wide font-bold text-emerald-400">Done</span>
                           <span className="text-sm font-semibold text-zinc-200 mt-0.5 font-mono">{doneCount}</span>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
            
            {/* Recent Tasks */}
            <section className="flex flex-col">
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-xs font-extrabold tracking-widest text-zinc-500 uppercase">Recent Tasks</h3>
                <Link href={`/dashboard/projects/${projectId}/board`} className="text-[11px] font-bold hover:opacity-80 transition-opacity flex items-center gap-1 group/btn" style={{ color: themeColor }}>
                  View Board <ChevronRight className="h-3 w-3 group-hover/btn:translate-x-0.5 transition-transform" />
                </Link>
              </div>
              <div className="flex flex-col bg-zinc-900/30 border border-white/[0.05] rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
                {loadingTasks ? (
                  <div className="text-xs text-zinc-500 py-10 text-center">Loading tasks...</div>
                ) : tasks.length > 0 ? (
                  tasks.slice(0, 5).map((task, i) => {
                    const priorityColor = PRIORITY_COLOR_MAP[task.priority] || "bg-zinc-500";
                    const statusColor = STATUS_COLOR_MAP[task.status] || "text-zinc-400 bg-zinc-400/10";
                    return (
                      <Link href={`/dashboard/projects/${projectId}/board`} key={task.id}>
                        <div 
                          className={cn(
                            "flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] active:bg-white/[0.04] transition-all duration-300 group/item cursor-pointer border-l-2 border-l-transparent",
                            i !== Math.min(tasks.length, 5) - 1 && "border-b border-white/[0.03]"
                          )}
                          onMouseEnter={(e) => e.currentTarget.style.borderLeftColor = themeColor}
                          onMouseLeave={(e) => e.currentTarget.style.borderLeftColor = "transparent"}
                        >
                          <div className="flex items-center gap-4 transition-transform duration-300 group-hover/item:translate-x-1">
                            <div className="h-4 w-4 border border-zinc-700/80 rounded flex items-center justify-center bg-zinc-950/60 group-hover/item:border-zinc-500 transition-colors shadow-inner shrink-0" />
                            <div className={cn("h-1.5 w-1.5 rounded-full shadow-[0_0_6px_currentColor]", priorityColor)} style={{ color: priorityColor.includes("blue") ? "#3B82F6" : priorityColor.includes("amber") ? "#F59E0B" : "#EF4444" }} />
                            <span className="font-mono text-xs text-zinc-500 group-hover/item:text-zinc-400 font-semibold">{task.taskIdentifier}</span>
                            <span className="text-sm font-semibold text-zinc-200 truncate max-w-[280px] group-hover/item:text-white transition-colors">{task.title}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge className={cn("border-none text-[9px] font-bold h-5 uppercase tracking-wider rounded-md", statusColor)}>
                              {task.status}
                            </Badge>
                            <Avatar className="h-6 w-6 border border-zinc-800" username={task.assigneeName || "Unassigned"} email={task.assigneeName ? `${task.assigneeName.toLowerCase().replace(/\s+/g, '')}@hivespace.io` : ""}>
                              <AvatarFallback className="bg-zinc-800 text-[9px] text-zinc-400 font-extrabold">
                                {task.assigneeInitials || "--"}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <CheckSquare className="h-8 w-8 text-zinc-600 mb-2" strokeWidth={1} />
                    <p className="text-xs text-zinc-400 font-semibold">No tasks created yet</p>
                    <p className="text-[11px] text-zinc-500 mt-1">Click &apos;New Task&apos; in the header to get started.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Recent Docs */}
            <section className="flex flex-col bg-zinc-900/30 border border-white/[0.05] rounded-3xl p-6 backdrop-blur-md shadow-2xl">
              <div className="flex items-center justify-between mb-4 px-2">
                 <h3 className="text-xs font-extrabold tracking-widest text-zinc-500 uppercase">Recent Docs</h3>
                 <Link href="/dashboard/docs" className="text-[10px] font-bold text-zinc-500 hover:text-white transition-colors tracking-wider">ALL DOCS</Link>
              </div>
              <div className="flex flex-col gap-2">
                {loadingDocs ? (
                  <div className="text-xs text-zinc-500 py-6 text-center">Loading documents...</div>
                ) : documents.length > 0 ? (
                  documents.slice(0, 3).map((doc) => (
                    <Link href={`/dashboard/docs?docId=${doc.id}`} key={doc.id}>
                      <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-950/20 hover:bg-white/[0.02] border border-white/[0.03] hover:border-white/[0.08] rounded-xl transition-all duration-300 group/doc cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div 
                            className="h-8 w-8 rounded-lg bg-zinc-900 border border-white/[0.05] flex items-center justify-center text-zinc-500 transition-all group-hover/doc:scale-105"
                            style={{ 
                              color: themeColor,
                              backgroundColor: `${themeColor}10`
                            }}
                          >
                            <FileText className="h-4.5 w-4.5" strokeWidth={1.5} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-zinc-200 group-hover/doc:text-white transition-colors">{doc.title}</span>
                            <span className="text-[10px] text-zinc-600 font-mono tracking-wider">DOCUMENT</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-zinc-500 font-mono italic">
                            edited {new Date(doc.updatedAt).toLocaleDateString()}
                          </span>
                          <Avatar className="h-6 w-6 border border-zinc-800" username={doc.createdByName || "System"} email={doc.createdByName ? `${doc.createdByName.toLowerCase()}@hivespace.io` : ""}>
                            <AvatarFallback className="bg-zinc-800 text-[9px] text-zinc-400 font-extrabold">
                              {getInitials(doc.createdByName)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                    <FileText className="h-8 w-8 text-zinc-600 mb-2" strokeWidth={1} />
                    <p className="text-xs text-zinc-400 font-semibold">No documents created yet</p>
                    <p className="text-[11px] text-zinc-500 mt-1">Go to the &apos;Docs&apos; tab to create a document.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Recent Activity */}
            <section className="flex flex-col">
              <h3 className="text-xs font-extrabold tracking-widest text-zinc-500 uppercase mb-6 px-2">Recent Activity</h3>
              <div className="relative flex flex-col gap-8 pl-8">
                <div className="absolute left-3.5 top-2 bottom-4 w-[1px] bg-zinc-800/80" />
                
                {loadingActivity ? (
                  <div className="text-xs text-zinc-500 py-4">Loading activities...</div>
                ) : activities.length > 0 ? (
                  activities.map((activity) => (
                    <div key={activity.id} className="relative flex gap-4 animate-in fade-in slide-in-from-left-2 duration-300">
                      <Avatar className="h-7 w-7 ring-4 ring-background absolute -left-[42px] z-10 border border-zinc-800 shadow-md" username={activity.fullName || activity.username || "System"} email={activity.username ? `${activity.username.toLowerCase()}@hivespace.io` : ""}>
                        <AvatarFallback className="bg-zinc-800 text-[9px] text-zinc-400 font-extrabold">
                          {getInitials(activity.fullName || activity.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-1">
                        <p className="text-sm text-zinc-400 leading-relaxed">
                          <span className="text-white font-semibold">{activity.fullName || activity.username || "System"}</span>{" "}
                          {activity.type === "CREATED" && "created task"}
                          {activity.type === "STATUS_CHANGED" && (
                            <>
                              moved task to <Badge className={cn("border-none text-[9px] font-bold h-4.5 px-1.5 rounded-md", STATUS_COLOR_MAP[activity.newValue || ""] || "text-zinc-400 bg-zinc-400/10")}>{activity.newValue}</Badge>
                            </>
                          )}
                          {activity.type === "PRIORITY_CHANGED" && `changed priority to ${activity.newValue}`}
                          {activity.type === "TITLE_CHANGED" && `renamed task to "${activity.newValue}"`}
                          {activity.type === "DESCRIPTION_CHANGED" && "updated description"}
                          {activity.type === "OWNER_CHANGED" && `reassigned task to ${activity.newValue}`}
                          {activity.type === "TEAM_CHANGED" && `changed team to ${activity.newValue}`}
                          {" "}on <span className="font-semibold text-zinc-300" style={{ color: themeColor }}>{activity.taskIdentifier}</span> · <span className="italic text-zinc-500 text-xs">{activity.taskTitle}</span>
                        </p>
                        <span className="text-[10px] text-zinc-600 font-mono">
                          {new Date(activity.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-zinc-500 py-4 px-2">No recent activity.</div>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN (40%) */}
          <div className="col-span-4 flex flex-col gap-8">
            
            {/* GitHub Status */}
            <section className="flex flex-col bg-zinc-900/30 border border-white/[0.05] rounded-3xl p-6 shadow-2xl backdrop-blur-md relative overflow-hidden group">
              <div 
                className="absolute -top-[20px] -right-[20px] w-[100px] h-[100px] pointer-events-none opacity-[0.03] filter blur-[30px]"
                style={{ background: `radial-gradient(circle, ${themeColor} 0%, transparent 100%)` }}
              />
              <div className="flex items-center justify-between mb-5 px-1">
                 <h3 className="text-xs font-extrabold tracking-widest text-zinc-500 uppercase">Github</h3>
                 <Link href="/dashboard/github" className="text-[10px] font-bold text-zinc-500 hover:text-white transition-colors tracking-wider">VISIT GITHUB</Link>
              </div>
              <div className="flex flex-col items-center text-center py-6 px-4 bg-zinc-950/40 border border-dashed border-white/[0.06] rounded-2xl group-hover:border-white/[0.12] transition-colors">
                 {loadingRepoLinks ? (
                   <div className="flex flex-col items-center py-4">
                     <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                     <p className="text-xs text-zinc-500 mt-2">Checking repository links...</p>
                   </div>
                 ) : repoLinks.length > 0 ? (
                   <>
                     <Github className="h-8 w-8 text-emerald-400 mb-2.5 transition-transform duration-500 group-hover:rotate-12" strokeWidth={1} />
                     <p className="text-xs text-emerald-400 font-semibold mb-1">Repository Linked</p>
                     <a 
                       href={`https://github.com/${repoLinks[0].githubRepoFullName}`}
                       target="_blank"
                       rel="noreferrer"
                       className="text-xs font-bold text-white hover:underline mb-4 truncate max-w-[220px]"
                     >
                       {repoLinks[0].githubRepoFullName}
                     </a>
                     <Link href="/dashboard/github" className="w-full">
                       <Button 
                         variant="outline" 
                         className="w-full h-8 text-[11px] font-bold border-white/[0.08] hover:border-white/20 bg-transparent hover:bg-white/[0.02] text-zinc-300 rounded-lg transition-all"
                         style={{ color: themeColor }}
                       >
                         Manage GitHub
                       </Button>
                     </Link>
                   </>
                 ) : (
                   <>
                     <Github className="h-8 w-8 text-zinc-600 mb-2.5 transition-transform duration-500 group-hover:rotate-12" strokeWidth={1} />
                     <p className="text-xs text-zinc-300 font-semibold mb-1">No Repository Connected</p>
                     <p className="text-[11px] text-zinc-500 mb-4 leading-relaxed max-w-[200px]">Link a GitHub repository to track PRs, commits, and automate workflows.</p>
                     <Link href="/dashboard/github" className="w-full">
                       <Button 
                         variant="outline" 
                         className="w-full h-8 text-[11px] font-bold border-white/[0.08] hover:border-white/20 bg-transparent hover:bg-white/[0.02] text-zinc-300 rounded-lg transition-all"
                         style={{ color: themeColor }}
                       >
                         Connect GitHub
                       </Button>
                     </Link>
                   </>
                 )}
              </div>
            </section>

            {/* Stakeholder Share */}
            <section className="flex flex-col bg-[#111113] rounded-3xl border border-white/[0.05] p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
               <div className="flex items-center justify-between mb-4 px-1">
                  <h3 className="text-xs font-extrabold tracking-widest text-zinc-500 uppercase">Stakeholder Share</h3>
                  <Share2 className="h-4 w-4 text-zinc-500 hover:text-white cursor-pointer transition-colors" strokeWidth={1.5} onClick={handleCopyLink} />
               </div>
               <div className="flex flex-col">
                  {activeLink && activeLink.isActive ? (
                    <>
                      <div className="flex items-center gap-2 mb-4">
                         <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10B981]" />
                         <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Public link active</span>
                      </div>
                      <div className="bg-zinc-950/60 border border-white/[0.05] rounded-xl px-3 py-2 flex items-center justify-between mb-4">
                         <span className="font-mono text-xs text-zinc-400 truncate mr-4">
                           {typeof window !== "undefined" ? `${window.location.origin}/share/${activeOrg?.slug}/project/${activeLink.token}` : ""}
                         </span>
                         <button className="text-zinc-500 hover:text-white transition-colors" onClick={handleCopyLink}>
                            <Link2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                         </button>
                      </div>
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] text-zinc-600 font-medium">Expires: Never (active)</span>
                         <div className="flex gap-3">
                            <button className="text-[11px] font-semibold text-zinc-400 hover:text-white transition-colors" onClick={handleRevoke}>Revoke</button>
                            <button className="text-[11px] font-semibold hover:opacity-80 transition-colors" style={{ color: themeColor }} onClick={handleCopyLink}>Copy link</button>
                         </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-4">
                         <div className="h-2 w-2 rounded-full bg-zinc-600" />
                         <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">No active share link</span>
                      </div>
                      <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
                         Generate a public, read-only link for external stakeholders to track this project&apos;s sprint progress and task status.
                      </p>
                      <Button 
                        className="h-8 font-bold border-none text-[11px] uppercase tracking-wider rounded-lg w-full text-zinc-950 hover:opacity-90 transition-opacity shadow-lg shadow-black/10"
                        style={{ backgroundColor: themeColor }}
                        onClick={handleGenerate}
                      >
                        Generate Share Link
                      </Button>
                    </>
                  )}
               </div>
            </section>

            {/* Settings Quick Access */}
            <section className="flex flex-col">
               <h3 className="text-xs font-extrabold tracking-widest text-zinc-500 uppercase mb-3 px-1">Project Actions</h3>
               <div className="flex flex-col gap-2">
                   <div onClick={() => setIsTeamsDialogOpen(true)}>
                     <QuickLink icon={UserPlus} label="Manage project teams" themeColor={themeColor} />
                   </div>
                   <Link href="/dashboard/github">
                     <QuickLink icon={Github} label="Configure GitHub settings" themeColor={themeColor} />
                   </Link>
               </div>
            </section>

          </div>
        </div>
      </div>
      
      <Dialog open={isTeamsDialogOpen} onOpenChange={setIsTeamsDialogOpen}>
        <DialogContent className="bg-[#111113] border-white/[0.08] text-foreground max-w-md rounded-2xl p-6 shadow-2xl shadow-black/80">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Manage Project Teams</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Assign or remove teams working on this project. Team members are automatically suggested for task assignment.
            </DialogDescription>
          </DialogHeader>

          {loadingTeams ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" style={{ borderColor: themeColor, borderTopColor: "transparent" }} />
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 font-semibold">Assigned Teams ({assignedTeams.length})</h4>
                {assignedTeams.length > 0 ? (
                  assignedTeams.map((team) => (
                    <div key={team.id} className="flex items-center justify-between p-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors">
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1 mr-2">
                        <span className="text-sm font-semibold text-zinc-100 truncate">{team.name}</span>
                        <span className="text-xs text-zinc-500 truncate">{team.description || "No description"}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[9px] text-zinc-400 font-mono uppercase bg-zinc-800 px-2 py-0.5 rounded-full">{team.membersCount} members</span>
                        <Button
                           variant="ghost"
                           size="icon"
                           className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                           onClick={() => handleUnassignTeam(team.id)}
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-500 italic py-2">No teams assigned to this project yet.</p>
                )}
              </div>

              <div className="mt-2 border-t border-zinc-850 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Assign Team</h4>
                {unassignedTeams.length > 0 ? (
                  <div className="flex gap-2">
                    <select
                      value={selectedTeamToAssign}
                      onChange={(e) => setSelectedTeamToAssign(e.target.value)}
                      className="flex-1 h-9 rounded-xl border border-white/[0.08] bg-zinc-900/60 px-3 text-xs text-foreground outline-none focus:border-zinc-700 transition-colors"
                    >
                      <option value="">Select a team to assign...</option>
                      {unassignedTeams.map((team) => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </select>
                    <Button
                      onClick={handleAssignTeam}
                      disabled={!selectedTeamToAssign}
                      className="h-9 hover:opacity-95 text-zinc-950 font-bold rounded-xl text-xs px-4 border-none transition-all"
                      style={{ backgroundColor: themeColor }}
                    >
                      Assign
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 italic">All workspace teams are assigned to this project.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CreateTaskModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        projectId={projectId} 
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["projectTasks", projectId] });
          queryClient.invalidateQueries({ queryKey: ["projectActivities", projectId] });
          refreshProjects();
        }}
        defaultStatus="Todo"
      />
    </ScrollArea>
  );
}

function QuickLink({ icon: Icon, label, themeColor }: { icon: React.ElementType; label: string; themeColor: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] hover:border-white/[0.08] rounded-2xl transition-all duration-300 group cursor-pointer shadow-sm">
      <div 
        className="h-8 w-8 rounded-lg flex items-center justify-center border border-white/[0.05] transition-all group-hover:scale-105"
        style={{ backgroundColor: `${themeColor}10`, color: themeColor }}
      >
        <Icon className="h-4 w-4" strokeWidth={1.5} />
      </div>
      <span className="text-xs font-semibold text-zinc-400 group-hover:text-zinc-200 transition-colors">{label}</span>
      <ChevronRight className="h-4 w-4 ml-auto text-zinc-600 group-hover:text-zinc-400 transition-all group-hover:translate-x-0.5" strokeWidth={2} />
    </div>
  );
}
