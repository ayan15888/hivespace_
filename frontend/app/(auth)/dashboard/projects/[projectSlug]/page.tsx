"use client";

import { 
  Zap, 
  Calendar, 
  UserPlus, 
  Share2, 
  Settings, 
  PlusCircle, 
  ChevronRight, 
  Search,
  MoreHorizontal,
  FileText,
  MessageSquare,
  Clock,
  GitBranch,
  ExternalLink,
  CheckCircle2,
  GitPullRequest,
  CheckSquare,
  Link2,
  Trash2,
  Users,
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
import { useState, useEffect, useCallback } from "react";
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

// --- MOCK DATA ---

const RECENT_TASKS = [
  { id: "HS-044", title: "STOMP WebSocket chat broadcast", status: "In Progress", statusColor: "text-violet-400 bg-violet-400/10", priority: "bg-red-500", assignee: "MV" },
  { id: "HS-042", title: "Tiptap editor setup + auto-save", status: "In Progress", statusColor: "text-violet-400 bg-violet-400/10", priority: "bg-amber-500", assignee: "RS" },
  { id: "HS-041", title: "Invite token expiry edge cases", status: "Todo", statusColor: "text-zinc-400 bg-zinc-400/10", priority: "bg-amber-500", assignee: "RK" },
  { id: "HS-039", title: "GitHub webhook HMAC validation", status: "Review", statusColor: "text-blue-400 bg-blue-400/10", priority: "bg-zinc-500", assignee: "SA" },
  { id: "HS-038", title: "Kanban column CRUD endpoints", status: "Backlog", statusColor: "text-zinc-600 bg-zinc-600/10", priority: "bg-zinc-500", assignee: "RS" },
];

const RECENT_DOCS = [
  { title: "Backend Design", edited: "2h ago", author: "RS" },
  { title: "Database Schema", edited: "5h ago", author: "MV" },
  { title: "Apr 8 Standup", edited: "Yesterday", author: "DK" },
];

const RECENT_PRs = [
  { id: "#82", title: "STOMP WebSocket broadcast", author: "MV", time: "2h" },
  { id: "#79", title: "Tiptap editor", author: "RS", time: "5h" },
  { id: "#74", title: "HMAC validation", author: "SA", time: "2d" },
];


export default function ProjectOverviewPage() {
  const params = useParams();
  const { projects, refreshProjects } = useProjects();
  const projectId = params?.projectSlug as string || "";

  const currentProject = projects.find(p => p.id === projectId);
  const themeColor = PROJECT_COLOR_MAP[currentProject?.color || ""] || "#7C5CFC";
  const [projectMembers, setProjectMembers] = useState<ProjectMemberResponse[]>([]);

  // Dialog State
  const [isTeamsDialogOpen, setIsTeamsDialogOpen] = useState(false);
  const [assignedTeams, setAssignedTeams] = useState<TeamResponse[]>([]);
  const [allWorkspaceTeams, setAllWorkspaceTeams] = useState<TeamResponse[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [selectedTeamToAssign, setSelectedTeamToAssign] = useState("");

  const loadTeamsInfo = useCallback(async () => {
    if (!currentProject?.id || !currentProject?.workspaceId) return;
    setLoadingTeams(true);
    try {
      const [assigned, all] = await Promise.all([
        getProjectTeams(currentProject.id),
        getTeamsByWorkspace(currentProject.workspaceId)
      ]);
      setAssignedTeams(assigned);
      setAllWorkspaceTeams(all);
    } catch (err) {
      console.error("Failed to load teams", err);
      toast.error("Failed to load team assignments");
    } finally {
      setLoadingTeams(false);
    }
  }, [currentProject?.id, currentProject?.workspaceId]);

  useEffect(() => {
    if (isTeamsDialogOpen) {
      loadTeamsInfo();
    }
  }, [isTeamsDialogOpen, loadTeamsInfo]);

  const handleAssignTeam = async () => {
    if (!currentProject?.id || !selectedTeamToAssign) return;
    try {
      await assignProjectTeam(currentProject.id, selectedTeamToAssign);
      toast.success("Team assigned successfully");
      setSelectedTeamToAssign("");
      loadTeamsInfo();
      refreshProjects();
    } catch (err) {
      console.error(err);
      toast.error("Failed to assign team");
    }
  };

  const handleUnassignTeam = async (teamId: string) => {
    if (!currentProject?.id) return;
    try {
      await unassignProjectTeam(currentProject.id, teamId);
      toast.success("Team unassigned successfully");
      loadTeamsInfo();
      refreshProjects();
    } catch (err) {
      console.error(err);
      toast.error("Failed to unassign team");
    }
  };

  const fetchProjectMembers = useCallback(async () => {
    if (!currentProject?.id) return;
    try {
      const data = await getProjectMembers(currentProject.id);
      setProjectMembers(data);
    } catch (err) {
      console.error(err);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    fetchProjectMembers();
  }, [fetchProjectMembers]);

  const displayTitle = currentProject?.name || "Project";

  const unassignedTeams = allWorkspaceTeams.filter(
    (wt) => !assignedTeams.some((at) => at.id === wt.id)
  );

  return (
    <ScrollArea className="h-screen w-full bg-background text-foreground">
      {/* ─── TOP BAR ─── */}
      <header className="sticky top-0 z-30 flex h-[44px] shrink-0 items-center justify-between border-b border-border/50 bg-background/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs text-muted-foreground">Hivespace</span>
          <span className="text-border text-[10px]">/</span>
          <span className="text-xs text-muted-foreground">Engineering</span>
          <span className="text-border text-[10px]">/</span>
          <span className="text-xs font-medium text-foreground">{displayTitle}</span>
        </div>

        <nav className="flex h-full items-center gap-6">
          <Link href={`/dashboard/projects/${projectId}`} className="relative flex h-full items-center px-1 text-sm font-medium text-foreground">
            Overview
            <div className="absolute bottom-0 left-0 h-[2px] w-full" style={{ backgroundColor: themeColor }} />
          </Link>
          <Link href={`/dashboard/projects/${projectId}/board`} className="flex h-full items-center px-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Board
          </Link>
          <button className="flex h-full items-center px-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            List
          </button>
          <button className="flex h-full items-center px-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Timeline
          </button>
          <button className="flex h-full items-center px-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Backlog
          </button>
          <Link href="/dashboard/docs" className="flex h-full items-center px-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Docs
          </Link>
          <button 
            onClick={() => setIsTeamsDialogOpen(true)}
            className="flex h-full items-center px-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Settings
          </button>
        </nav>

        <div className="flex items-center justify-end gap-2 flex-1">
           <Button 
            className="h-7 text-zinc-950 font-bold border-none hover:opacity-90 transition-opacity text-[10px] uppercase tracking-wider rounded-md px-3"
            style={{ backgroundColor: themeColor }}
          >
            <PlusCircle strokeWidth={1.5} className="mr-1.5 h-3.5 w-3.5" />
            New Task
          </Button>
        </div>
      </header>

      {/* ─── PROJECT HEADER ─── */}
      <div className="flex flex-col p-8 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex gap-6">
            <div 
              className="h-16 w-16 rounded-xl flex items-center justify-center text-3xl border"
              style={{ 
                backgroundColor: `${themeColor}20`,
                borderColor: `${themeColor}30`
              }}
            >
              ⚡
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{displayTitle}</h1>
              <p className="text-xs font-medium text-muted-foreground">Engineering workspace</p>
              <p className="text-sm text-muted-foreground/80 mt-2 max-w-2xl leading-relaxed">
                Core backend infrastructure sprint — WebSocket, Auth, GitHub integration, and Docs editor. 
                Focused on stabilizing real-time communication and document synchronization.
              </p>
              <div className="flex items-center gap-2 mt-3 text-zinc-500">
                <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span className="text-xs">Apr 1 – Apr 15, 2026</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-4">
            <div className="flex items-center">
              {projectMembers.length > 0 ? (
                <>
                  {projectMembers.slice(0, 5).map((member, i) => (
                    <Avatar 
                      key={member.id} 
                      className={cn(
                        "h-8 w-8 ring-4 ring-background -ml-2.5 first:ml-0 bg-muted border border-border/50 relative group",
                        i === 0 && "z-10",
                        i === 1 && "z-20",
                        i === 2 && "z-30",
                        i === 3 && "z-40",
                        i === 4 && "z-50",
                        member.role === "LEAD" && "border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                      )}
                      username={member.fullName || member.username}
                      email={member.email || `${member.username.toLowerCase()}@hivespace.io`}
                    >
                      <AvatarFallback className={cn("bg-muted text-[10px] text-muted-foreground font-bold", member.role === "LEAD" && "text-amber-500")}>
                        {member.fullName ? member.fullName.substring(0, 2).toUpperCase() : member.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {projectMembers.length > 5 && (
                    <div className="h-8 w-8 rounded-full ring-4 ring-background -ml-2.5 bg-muted border border-border flex items-center justify-center text-[10px] text-muted-foreground font-medium z-50">
                      +{projectMembers.length - 5}
                    </div>
                  )}
                </>
              ) : (
                <div className="h-8 w-8 rounded-full ring-4 ring-background bg-muted border border-border flex items-center justify-center text-[10px] text-muted-foreground font-bold">
                  --
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md">
                <UserPlus className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
                Invite
              </Button>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md">
                <Share2 className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
                Share
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                onClick={() => setIsTeamsDialogOpen(true)}
              >
                <Settings className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
                Manage Teams
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SPRINT PROGRESS ─── */}
      <div className="px-8 mb-8 mt-2">
        <div className="bg-hs-card border border-border/30 rounded-[28px] p-6">
           <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <span className="text-sm font-semibold text-foreground">Sprint Progress</span>
                <span className="text-[10px] text-muted-foreground font-mono ml-3 uppercase tracking-wider">Apr 1–15, 2026</span>
                <span className="text-[10px] font-bold text-amber-500 ml-4 bg-amber-500/10 px-2 py-0.5 rounded-full ring-1 ring-amber-500/20">8 DAYS REMAINING</span>
              </div>
              <span className="text-xs font-mono text-muted-foreground">17/25 tasks complete · 68%</span>
           </div>
           <Progress value={68} className="h-2 bg-muted/50" indicatorStyle={{ backgroundColor: themeColor }} />
           
           <div className="flex gap-2.5 mt-5">
              <div className="flex items-center gap-2 bg-hs-main px-3 py-1.5 rounded-full border border-border/50">
                <div className="h-1.5 w-1.5 rounded-full bg-border" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Backlog</span>
                <span className="text-xs font-mono text-muted-foreground/60 ml-1">3</span>
              </div>
              <div className="flex items-center gap-2 bg-hs-main px-3 py-1.5 rounded-full border border-border/50">
                <div className="h-1.5 w-1.5 rounded-full bg-border" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Todo</span>
                <span className="text-xs font-mono text-muted-foreground/60 ml-1">4</span>
              </div>
              <div className="flex items-center gap-2 bg-hs-main px-3 py-1.5 rounded-full border border-border/50">
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: themeColor }} />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">In Progress</span>
                <span className="text-xs font-mono text-muted-foreground/60 ml-1">3</span>
              </div>
              <div className="flex items-center gap-2 bg-hs-main px-3 py-1.5 rounded-full border border-border/50">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Review</span>
                <span className="text-xs font-mono text-muted-foreground/60 ml-1">2</span>
              </div>
              <div className="flex items-center gap-2 bg-hs-main px-3 py-1.5 rounded-full border border-border/50">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Done</span>
                <span className="text-xs font-mono text-muted-foreground/60 ml-1">8</span>
              </div>
           </div>
        </div>
      </div>

      {/* ─── MAIN GRID ─── */}
      <div className="grid grid-cols-10 gap-8 px-8 pb-16">
        
        {/* LEFT COLUMN (60%) */}
        <div className="col-span-6 flex flex-col gap-10">
          
          {/* Recent Tasks */}
          <section className="flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold tracking-widest text-zinc-600 uppercase">Recent Tasks</h3>
              <Link href={`/dashboard/projects/${projectId}/board`} className="text-[11px] font-semibold hover:opacity-80 transition-opacity flex items-center gap-1 group" style={{ color: themeColor }}>
                View board <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            <div className="flex flex-col bg-hs-nav rounded-lg overflow-hidden border border-border/10 shadow-xl shadow-black/10">
              {RECENT_TASKS.map((task, i) => (
                <div key={task.id} className={cn(
                  "flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors group cursor-pointer",
                  i !== RECENT_TASKS.length - 1 && "border-b border-zinc-800/30"
                )}>
                  <div className="flex items-center gap-4">
                    <div className="h-4 w-4 border border-zinc-700 rounded-sm flex items-center justify-center bg-zinc-950 group-hover:border-zinc-500 transition-colors" />
                    <div className={cn("h-1.5 w-1.5 rounded-full", task.priority)} />
                    <span className="font-mono text-xs text-muted-foreground group-hover:text-foreground/80">{task.id}</span>
                    <span className="text-sm font-medium text-foreground truncate max-w-[280px]">{task.title}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={cn("border-none text-[10px] font-bold h-5 uppercase tracking-wide", task.statusColor)}>
                      {task.status}
                    </Badge>
                    {(() => {
                      const details = {
                        "MV": { name: "Meera Valenzuela", email: "meera@hivespace.io" },
                        "RS": { name: "Reid Smith", email: "reid@hivespace.io" },
                        "RK": { name: "Rajesh Kumar", email: "rajesh@hivespace.io" },
                        "SA": { name: "Sarah Adams", email: "sarah@hivespace.io" },
                        "DK": { name: "David K.", email: "david@hivespace.io" }
                      }[task.assignee] || { name: task.assignee, email: `${task.assignee.toLowerCase()}@hivespace.io` };
                      return (
                        <Avatar className="h-6 w-6" username={details.name} email={details.email}>
                          <AvatarFallback className="bg-zinc-800 text-[9px] text-zinc-400 font-bold">{task.assignee}</AvatarFallback>
                        </Avatar>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Docs */}
          <section className="flex flex-col bg-hs-card rounded-[28px] border border-border/30 p-6">
            <div className="flex items-center justify-between mb-4 px-2">
               <h3 className="text-xs font-bold tracking-widest text-zinc-600 uppercase">Recent Docs</h3>
               <Link href="/dashboard/docs" className="text-[10px] font-bold text-zinc-500 hover:text-white transition-colors">ALL DOCS</Link>
            </div>
            <div className="flex flex-col">
              {RECENT_DOCS.map((doc, i) => (
                <div key={doc.title} className={cn(
                  "flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors group cursor-pointer",
                  i !== RECENT_DOCS.length - 1 && "border-b border-zinc-800/30"
                )}>
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-8 w-8 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 transition-colors group-hover:opacity-80"
                      style={{ color: themeColor }}
                    >
                      <FileText className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">{doc.title}</span>
                      <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-tighter">Architecture · Sprint 3</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-zinc-500 font-mono italic">edited {doc.edited}</span>
                    {(() => {
                      const details = {
                        "MV": { name: "Meera Valenzuela", email: "meera@hivespace.io" },
                        "RS": { name: "Reid Smith", email: "reid@hivespace.io" },
                        "RK": { name: "Rajesh Kumar", email: "rajesh@hivespace.io" },
                        "SA": { name: "Sarah Adams", email: "sarah@hivespace.io" },
                        "DK": { name: "David K.", email: "david@hivespace.io" }
                      }[doc.author] || { name: doc.author, email: `${doc.author.toLowerCase()}@hivespace.io` };
                      return (
                        <Avatar className="h-6 w-6" username={details.name} email={details.email}>
                          <AvatarFallback className="bg-zinc-800 text-[9px] text-zinc-400 font-bold">{doc.author}</AvatarFallback>
                        </Avatar>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Activity */}
          <section className="flex flex-col">
            <h3 className="text-xs font-bold tracking-widest text-zinc-600 uppercase mb-6">Recent Activity</h3>
            <div className="relative flex flex-col gap-8 pl-8">
              <div className="absolute left-3.5 top-2 bottom-4 w-px bg-zinc-800" />
              
              <div className="relative flex gap-4">
                <Avatar className="h-7 w-7 ring-4 ring-[#000000] absolute -left-10 z-10" username="Meera Valenzuela" email="meera@hivespace.io">
                  <AvatarFallback className="bg-zinc-800 text-[10px] text-zinc-400">MV</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    <span className="text-white font-semibold">Meera V.</span> merged PR <span className="font-mono text-emerald-400">#82</span> · <span className="italic text-zinc-500">STOMP WebSocket broadcast</span>
                  </p>
                  <span className="text-[10px] text-zinc-600 font-mono">10:42 AM Today</span>
                </div>
              </div>

              <div className="relative flex gap-4">
                  <div className="h-7 w-7 rounded-full absolute -left-10 z-10 flex items-center justify-center border" style={{ backgroundColor: `${themeColor}10`, borderColor: `${themeColor}20` }}>
                    <CheckCircle2 className="h-3.5 w-3.5" style={{ color: themeColor }} />
                  </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Task <span className="font-medium" style={{ color: themeColor }}>HS-044</span> moved to <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[10px] h-4 px-1 rounded-sm">DONE</Badge>
                  </p>
                  <span className="text-[10px] text-zinc-600 font-mono">Yesterday</span>
                </div>
              </div>

              <div className="relative flex gap-4">
                 <Avatar className="h-7 w-7 ring-4 ring-[#000000] absolute -left-10 z-10" username="David K." email="david@hivespace.io">
                  <AvatarFallback className="bg-zinc-800 text-[10px] text-zinc-400">DK</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    <span className="text-white font-semibold">David K.</span> commented on <span className="text-zinc-200">Database Schema</span>
                  </p>
                  <div className="bg-background border-l-2 border-border p-2 mt-1 rounded-r-md">
                    <p className="text-xs text-zinc-500 italic">&quot;Looks good, but we should index the channel_id column...&quot;</p>
                  </div>
                  <span className="text-[10px] text-zinc-600 font-mono">Yesterday</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN (40%) */}
        <div className="col-span-4 flex flex-col gap-8">
          
          {/* GitHub Status */}
          <section className="flex flex-col bg-hs-card rounded-[28px] border border-border/30 p-6 shadow-2xl shadow-black/10">
            <div className="flex items-center justify-between mb-4 px-2">
               <h3 className="text-xs font-bold tracking-widest text-zinc-600 uppercase">Github</h3>
               <Link href="#" className="text-[10px] font-bold text-zinc-500 hover:text-white transition-colors">VISIT REPO</Link>
            </div>
            <div className="flex flex-col">
               <div className="flex items-start justify-between mb-4">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                     <Github className="h-4 w-4 text-muted-foreground" />
                       <span className="font-mono text-sm text-foreground">acme-corp/backend</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                       <Badge className="bg-zinc-800 text-zinc-500 border-zinc-700 font-mono text-[10px] h-5 rounded-md flex items-center gap-1.5 px-2">
                         <GitBranch className="h-2.5 w-2.5" />
                         main
                       </Badge>
                       <span className="text-[10px] text-zinc-600 font-medium">Protected branch</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                     <span className="text-xs font-bold text-white">4 open PRs</span>
                     <span className="text-[10px] text-zinc-500 mt-0.5">23 commits this week</span>
                  </div>
               </div>

               <div className="h-px bg-zinc-800/50 my-4" />

               <div className="flex flex-col gap-3">
                  {RECENT_PRs.map(pr => (
                    <div key={pr.id} className="flex items-center justify-between group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <GitPullRequest className="h-3.5 w-3.5 text-emerald-500" strokeWidth={1.5} />
                        <div className="flex flex-col min-w-0">
                           <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] text-zinc-500">{pr.id}</span>
                              <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors truncate">{pr.title}</span>
                           </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const details = {
                            "MV": { name: "Meera Valenzuela", email: "meera@hivespace.io" },
                            "RS": { name: "Reid Smith", email: "reid@hivespace.io" },
                            "RK": { name: "Rajesh Kumar", email: "rajesh@hivespace.io" },
                            "SA": { name: "Sarah Adams", email: "sarah@hivespace.io" },
                            "DK": { name: "David K.", email: "david@hivespace.io" }
                          }[pr.author] || { name: pr.author, email: `${pr.author.toLowerCase()}@hivespace.io` };
                          return (
                            <Avatar className="h-5 w-5" username={details.name} email={details.email}>
                              <AvatarFallback className="bg-zinc-800 text-[8px] text-zinc-400 font-bold">{pr.author}</AvatarFallback>
                            </Avatar>
                          );
                        })()}
                        <span className="text-[10px] text-zinc-600 font-mono">{pr.time}</span>
                      </div>
                    </div>
                  ))}
               </div>

               <Button variant="ghost" className="w-full mt-4 h-8 text-[11px] font-semibold hover:bg-white/5 rounded-md" style={{ color: themeColor }}>
                 View all PRs <ArrowRight className="h-3 w-3 ml-1.5" />
               </Button>
            </div>
          </section>



          {/* Stakeholder Share */}
          <section className="flex flex-col bg-[#1C1B1F] rounded-[28px] border border-zinc-800/30 p-6 shadow-2xl shadow-black/40">
             <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-xs font-bold tracking-widest text-zinc-600 uppercase">Stakeholder Share</h3>
                <Share2 className="h-4 w-4 text-zinc-500 hover:text-white cursor-pointer transition-colors" strokeWidth={1.5} />
             </div>
             <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                   <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">Public link active</span>
                </div>
                <div className="bg-zinc-950/50 border border-zinc-800 rounded px-3 py-2 flex items-center justify-between mb-4">
                   <span className="font-mono text-xs text-zinc-600 truncate mr-4">{process.env.NEXT_PUBLIC_APP_DOMAIN || "hivespace.app"}/share/abc123xyz789</span>
                   <button className="text-zinc-500 hover:text-white transition-colors">
                      <PlusCircle className="h-3.5 w-3.5 rotate-45" strokeWidth={1.5} />
                   </button>
                </div>
                <div className="flex items-center justify-between">
                   <span className="text-[10px] text-zinc-600 font-medium">Viewed 12 times in last 7 days</span>
                   <div className="flex gap-3">
                      <button className="text-[11px] font-semibold text-zinc-400 hover:text-white transition-colors">Revoke</button>
                       <button className="text-[11px] font-semibold hover:opacity-80 transition-colors" style={{ color: themeColor }}>Copy link</button>
                   </div>
                </div>
             </div>
          </section>

          {/* Settings Quick Access */}
          <section className="flex flex-col">
             <h3 className="text-xs font-bold tracking-widest text-zinc-600 uppercase mb-3 text-zinc-600">Settings</h3>
             <div className="flex flex-col gap-1.5">
                 <QuickLink icon={UserPlus} label="Manage members" themeColor={themeColor} />
                 <QuickLink icon={Github} label="Linked repo: acme-corp/backend" themeColor={themeColor} />
                 <QuickLink icon={Zap} label="3 automation rules active" themeColor={themeColor} />
             </div>
          </section>

        </div>
      </div>
      
      <Dialog open={isTeamsDialogOpen} onOpenChange={setIsTeamsDialogOpen}>
        <DialogContent className="bg-[#1B1B1D] border-zinc-800/80 text-foreground max-w-md rounded-2xl p-6 shadow-2xl shadow-black/40">
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

              <div className="mt-2 border-t border-zinc-800/80 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Assign Team</h4>
                {unassignedTeams.length > 0 ? (
                  <div className="flex gap-2">
                    <select
                      value={selectedTeamToAssign}
                      onChange={(e) => setSelectedTeamToAssign(e.target.value)}
                      className="flex-1 h-9 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 text-xs text-foreground outline-none focus:border-zinc-700 transition-colors"
                    >
                      <option value="">Select a team to assign...</option>
                      {unassignedTeams.map((team) => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </select>
                    <Button
                      onClick={handleAssignTeam}
                      disabled={!selectedTeamToAssign}
                      className="h-9 bg-primary hover:opacity-95 text-zinc-950 font-bold rounded-xl text-xs px-4 border-none transition-all"
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

    </ScrollArea>
  );
}

// --- SMALL UI COMPONENT HELPERS ---

function ArrowRight({ className, ...props }: React.ComponentProps<typeof ChevronRight>) {
  return <ChevronRight className={cn("h-3 w-3", className)} {...props} />
}

function QuickLink({ icon: Icon, label, themeColor }: { icon: React.ElementType; label: string; themeColor: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-white/5 transition-all group cursor-pointer">
      <Icon className="h-3.5 w-3.5 text-zinc-500 transition-colors" style={{ color: themeColor }} strokeWidth={1.5} />
      <span className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors">{label}</span>
      <ChevronRight className="h-3 w-3 ml-auto text-zinc-800 group-hover:text-zinc-600 transition-all group-hover:translate-x-0.5" strokeWidth={2} />
    </div>
  )
}
