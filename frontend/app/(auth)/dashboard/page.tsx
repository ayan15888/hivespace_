"use client";

import {
  PlusCircle,
  Bell,
  TrendingUp,
  Clock,
  MessageSquare,
  GitPullRequest,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { CreateTaskModal } from "@/components/features/tasks/CreateTaskModal";
import { useRouter, useSearchParams } from "next/navigation";
import { CreateOrgModal } from "@/components/features/organizations/CreateOrgModal";
import { JoinOrgModal } from "@/components/features/organizations/JoinOrgModal";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useChatStore } from "@/store/chatStore";
import { getMessages } from "@/lib/api/messages";
import { cn, getAvatarColorClass } from "@/lib/utils";
import { PROJECT_COLOR_MAP } from "@/lib/constants/colors";

function DashboardPageContent() {
  const { user, loading } = useAuth();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const { tasks, loading: tasksLoading } = useTasks();
  const { projects, loading: projectsLoading } = useProjects();
  const { activeWorkspace } = useWorkspaceStore();
  const { channels } = useChatStore();
  const workspaceChannels = activeWorkspace ? (channels[activeWorkspace.id] ?? []) : [];

  const [lastMessages, setLastMessages] = useState<Record<string, { content: string; createdAt: string }>>({});

  useEffect(() => {
    if (workspaceChannels.length === 0) return;
    workspaceChannels.forEach((channel) => {
      if (lastMessages[channel.id]) return;
      getMessages(channel.id)
        .then((msgs) => {
          if (msgs && msgs.length > 0) {
            const latest = msgs[0];
            setLastMessages(prev => {
              if (prev[channel.id]) return prev;
              return {
                ...prev,
                [channel.id]: {
                  content: latest.content,
                  createdAt: latest.createdAt
                }
              };
            });
          }
        })
        .catch((err) => {
          console.error(`Failed to fetch messages for channel ${channel.id}`, err);
        });
    });
  }, [workspaceChannels]);

  const action = searchParams.get("action");
  /** User came from onboarding to open create/join modals — do not bounce back to /onboarding or block the page. */
  const allowOrgSetupModals =
    action === "create-organization" || action === "join-organization";

  useEffect(() => {
    if (!loading && user && !user.hasTenants && !allowOrgSetupModals) {
      router.push("/onboarding");
    }
  }, [user, loading, router, allowOrgSetupModals]);

  useEffect(() => {
    if (action === "create-organization") {
      queueMicrotask(() => setIsCreateModalOpen(true));
    } else if (action === "join-organization") {
      queueMicrotask(() => setIsJoinModalOpen(true));
    }
  }, [action]);

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    router.replace("/dashboard");
  };

  const handleCloseJoinModal = () => {
    setIsJoinModalOpen(false);
    router.replace("/dashboard");
  };

  // Computations for premium redesigned cards
  const totalTasks = tasks.length;
  const inProgressTasksCount = tasks.filter(t => t.status === "in_progress" || t.status === "IN_PROGRESS").length;
  const todoTasksCount = tasks.filter(t => t.status === "todo" || t.status === "TODO").length;

  const todayStr = new Date().toDateString();
  const tasksDueToday = tasks.filter(t => {
    if (!t.dueDate) return false;
    try {
      return new Date(t.dueDate).toDateString() === todayStr;
    } catch {
      return false;
    }
  });
  const dueTodayCount = tasksDueToday.length > 0 ? tasksDueToday.length : 3;

  const overdueTasksCount = tasks.filter(t => {
    if (!t.dueDate || t.status === "done" || t.status === "completed" || t.status === "DONE" || t.status === "COMPLETED") return false;
    try {
      return new Date(t.dueDate) < new Date();
    } catch {
      return false;
    }
  }).length;

  if (loading || (user && !user.hasTenants && !allowOrgSetupModals)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-hs-base">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-hs-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-screen w-full bg-hs-base text-hs-text">
        {/* TOP BAR */}
        <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-zinc-800/50 bg-hs-base/80 px-8 backdrop-blur-sm">
          <div className="flex flex-col flex-1">
            <h1 className="text-xl font-medium text-foreground tracking-tight">
              Good morning, {user?.fullName || user?.username || "Guest"}
            </h1>
            <p className="text-sm text-muted-foreground">Here&apos;s what needs your attention today.</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              className="relative font-medium border-none shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-sm rounded-xl px-4.5 py-2 text-white flex items-center justify-center gap-2 cursor-pointer"
              style={{
                backgroundColor: "var(--hs-accent)"
              }}
              onClick={() => setIsTaskModalOpen(true)}
            >
              <PlusCircle strokeWidth={2} className="h-4.5 w-4.5" />
              <span>New Task</span>
            </Button>
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground hover:bg-muted rounded-md">
              <Bell strokeWidth={1.5} className="h-5 w-5" />
              <span className="absolute top-2 right-2.5 flex h-[6px] w-[6px] items-center justify-center rounded-full bg-destructive">
                <span className="sr-only">Unread notifications</span>
              </span>
            </Button>
          </div>
        </header>

        <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto">

          {/* STATS ROW */}
          <div className="grid grid-cols-4 gap-5">
            {/* Card 1: My Open Tasks */}
            <Card className="relative bg-hs-main/15 border border-border/30 hover:border-violet-500/20 rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(139,92,246,0.03)] transition-all duration-300 group cursor-pointer hover:-translate-y-0.5">
              <CardContent className="p-6 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">My Open Tasks</span>
                    <div className="flex items-baseline gap-2 mt-2.5">
                      <span className="text-5xl font-extralight text-foreground tracking-tight group-hover:text-violet-400 transition-colors duration-300">
                        {totalTasks}
                      </span>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-violet-500/5 text-violet-400/80 border border-violet-500/10 group-hover:bg-violet-500/10 group-hover:text-violet-400 transition-all duration-300 shadow-sm">
                    <TrendingUp strokeWidth={1.5} className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/25 pt-3.5">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-500/60" />
                    {inProgressTasksCount} in progress
                  </span>
                  <span className="text-zinc-500/90 font-medium">
                    {totalTasks > 0 ? Math.round((inProgressTasksCount / totalTasks) * 100) : 0}% active
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Due Date */}
            <Card className="relative bg-hs-main/15 border border-border/30 hover:border-amber-500/20 rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(245,158,11,0.03)] transition-all duration-300 group cursor-pointer hover:-translate-y-0.5">
              <CardContent className="p-6 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">Due Date</span>
                    <div className="flex items-baseline gap-2 mt-2.5">
                      <span className="text-5xl font-extralight text-foreground tracking-tight group-hover:text-amber-400 transition-colors duration-300">
                        {dueTodayCount}
                      </span>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-500/5 text-amber-400/80 border border-amber-500/10 group-hover:bg-amber-500/10 group-hover:text-amber-400 transition-all duration-300 shadow-sm">
                    <Clock strokeWidth={1.5} className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/25 pt-3.5">
                  <span className="flex items-center gap-1.5 font-medium">
                    {overdueTasksCount > 0 ? (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500/80 animate-pulse" />
                        <span className="text-rose-400/85 font-medium">{overdueTasksCount} overdue</span>
                      </>
                    ) : (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500/60" />
                        <span>All clear today</span>
                      </>
                    )}
                  </span>
                  <span className="text-zinc-500/80 truncate max-w-[110px] font-medium">
                    {tasksDueToday[0]?.title || "Staging review"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Unread Messages */}
            <Card className="relative bg-hs-main/15 border border-border/30 hover:border-blue-500/20 rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(59,130,246,0.03)] transition-all duration-300 group cursor-pointer hover:-translate-y-0.5">
              <CardContent className="p-6 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">Unread Messages</span>
                    <div className="flex items-baseline gap-2 mt-2.5">
                      <span className="text-5xl font-extralight text-foreground tracking-tight group-hover:text-blue-400 transition-colors duration-300">
                        8
                      </span>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-500/5 text-blue-400/80 border border-blue-500/10 group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-all duration-300 shadow-sm">
                    <MessageSquare strokeWidth={1.5} className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/25 pt-3.5">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500/60" />
                    3 active chats
                  </span>
                  <span className="text-zinc-500/90 font-medium">#engineering</span>
                </div>
              </CardContent>
            </Card>

            {/* Card 4: PRs Awaiting Review */}
            <Card className="relative bg-hs-main/15 border border-border/30 hover:border-emerald-500/20 rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(16,185,129,0.03)] transition-all duration-300 group cursor-pointer hover:-translate-y-0.5">
              <CardContent className="p-6 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">PRs Awaiting Review</span>
                    <div className="flex items-baseline gap-2 mt-2.5">
                      <span className="text-5xl font-extralight text-foreground tracking-tight group-hover:text-emerald-400 transition-colors duration-300">
                        2
                      </span>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/5 text-emerald-400/80 border border-emerald-500/10 group-hover:bg-emerald-500/10 group-hover:text-emerald-400 transition-all duration-300 shadow-sm">
                    <GitPullRequest strokeWidth={1.5} className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/25 pt-3.5">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/60" />
                    2 pending approval
                  </span>
                  <span className="text-zinc-500/90 font-medium">#82 Sprint 3</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* MAIN GRID */}
          <div className="grid grid-cols-10 gap-6 items-start">

            {/* LEFT COLUMN (60%) */}
            <div className="col-span-6 flex flex-col gap-6 w-full">

              {/* My Tasks */}
              <Card className="bg-hs-main border-none shadow-none rounded-[24px] overflow-hidden relative">
                <CardHeader className="py-4 px-5 flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">My Tasks</CardTitle>
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/40 rounded-md">
                    View all
                  </Button>
                </CardHeader>
                <div className="p-5 pt-0">
                  <div className="flex flex-col gap-2.5 relative z-10">
                    {tasks.length > 0 ? (
                      tasks.slice(0, 5).map((task) => (
                        <div
                          key={task.id}
                          onClick={() => {
                            if (task.projectId) {
                              router.push(`/dashboard/projects/${task.projectId}/board`);
                            }
                          }}
                          className="flex items-center gap-3.5 py-3 px-4 bg-zinc-900/10 border border-zinc-800/35 hover:border-zinc-700/40 hover:bg-zinc-900/30 transition-all duration-200 cursor-pointer group rounded-2xl"
                        >
                          {/* Checkbox / Completion Ring */}
                          <div className="flex items-center justify-center shrink-0">
                            {(() => {
                              const isDone = ["done", "completed", "DONE", "COMPLETED"].includes(task.status);
                              return (
                                <div className={cn(
                                  "h-4 w-4 rounded-full border flex items-center justify-center transition-all duration-300",
                                  isDone
                                    ? "border-emerald-500/80 bg-emerald-500/10 text-emerald-400"
                                    : "border-zinc-700 group-hover:border-zinc-500 text-transparent"
                                )}>
                                  <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-none stroke-current" strokeWidth={3}>
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Task Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-sm font-medium transition-colors truncate max-w-[320px]",
                                ["done", "completed", "DONE", "COMPLETED"].includes(task.status)
                                  ? "text-zinc-500 line-through decoration-zinc-700"
                                  : "text-zinc-200 group-hover:text-white"
                              )}>
                                {task.title}
                              </span>
                            </div>

                            {/* Metadata Subtitle */}
                            <div className="flex items-center flex-wrap gap-2 mt-1.5 text-[11px] text-zinc-500 select-none">
                              <span className="font-mono text-zinc-500 bg-zinc-900/35 px-1.5 py-0.5 rounded border border-zinc-800/40 text-[10px]">{task.taskIdentifier || task.id.slice(0, 6)}</span>

                              {/* Grouped Project & Status Capsule */}
                              <div className="flex items-center gap-1.5 bg-zinc-900/40 border border-zinc-800/45 px-2 py-0.5 rounded-full">
                                <span
                                  style={{ color: task.projectColor ? PROJECT_COLOR_MAP[task.projectColor] : "inherit" }}
                                  className="font-bold text-[9px] uppercase tracking-wider"
                                >
                                  {task.projectName || "Project"}
                                </span>
                                <span className="text-zinc-700 font-light text-[9px]">•</span>
                                <span className="capitalize text-zinc-400 font-medium text-[10px]">{task.status.replace('_', ' ').toLowerCase()}</span>
                              </div>

                              {task.dueDate && (
                                <span className="flex items-center gap-1 text-zinc-500 text-[10px]">
                                  <Calendar className="h-3 w-3 text-zinc-600" strokeWidth={1.5} />
                                  {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right Elements (Priority Indicator & Assignee) */}
                          <div className="flex items-center gap-3 shrink-0">
                            {/* Priority Indicator Pill */}
                            {(() => {
                              const p = (task.priority || "normal").toLowerCase();
                              if (p === "urgent" || p === "high") {
                                return (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] font-bold rounded-full bg-rose-500/10 text-rose-400 border-rose-500/20 px-2 py-0.5 select-none uppercase tracking-wider"
                                  >
                                    {p}
                                  </Badge>
                                );
                              }
                              return null;
                            })()}

                            <Avatar
                              className="h-6 w-6 rounded-full border border-zinc-800 shrink-0"
                              username={task.assigneeName || "Unassigned"}
                              email={task.assigneeName ? `${task.assigneeInitials?.toLowerCase() || "user"}@hivespace.io` : undefined}
                            >
                              <AvatarFallback className={cn("text-[9px] font-bold", getAvatarColorClass(task.assigneeInitials || task.assigneeName || task.id))}>
                                {task.assigneeInitials || "??"}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </div>
                      ))
                    ) : tasksLoading ? (
                      // Skeleton loading state
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between py-4 px-5 border-b border-border/10 last:border-0">
                          <div className="flex items-center gap-4">
                            <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />
                            <div className="h-3 w-12 bg-muted animate-pulse rounded" />
                            <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                            <div className="h-7 w-7 rounded-full bg-muted animate-pulse" />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                        <p className="text-sm text-muted-foreground">No tasks assigned to you yet.</p>
                        <Button
                          variant="link"
                          className="text-primary text-xs mt-1"
                          onClick={() => setIsTaskModalOpen(true)}
                        >
                          Create your first task
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Recent Activity */}
              <Card className="bg-hs-main border-border/50 shadow-none rounded-[24px] overflow-hidden">
                <CardHeader className="py-4 px-5">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Recent Activity</CardTitle>
                </CardHeader>
                <div className="p-5 pt-0 flex flex-col relative w-full">
                  {/* Timeline wrapper to contain borders on items */}
                  <div className="flex flex-col gap-0 relative w-full">
                    {[
                      { time: "10m ago", text: "Meera V. opened PR #82 in Sprint 3", initials: "MV" },
                      { time: "2h ago", text: "David dropped a comment on HS-044", initials: "DK" },
                      { time: "Yesterday", text: "Rahul completed task HS-021: Fix search bug", initials: "RS" },
                      { time: "Mon 4:30pm", text: "Meera V. updated status of Sprint 3 to 'In Progress'", initials: "MV" }
                    ].map((activity, i, arr) => (
                      <div key={i} className="flex gap-4 items-start relative w-full">
                        {/* Timeline line - connecting avatars */}
                        {i !== arr.length - 1 && (
                          <div className="absolute left-[13px] top-6 bottom-0 w-px border-l-2 border-border h-[calc(100%-2px)]" />
                        )}

                        <Avatar className="h-7 w-7 rounded-full shrink-0 relative z-10 ring-4 ring-hs-main mt-0.5">
                          <AvatarFallback className={cn("text-xs font-semibold", getAvatarColorClass(activity.initials || activity.text))}>
                            {activity.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-1 justify-between items-start py-3 w-full min-w-0 pr-1">
                          <p className="text-sm text-foreground leading-relaxed pr-4">{activity.text}</p>
                          <span className="text-xs text-muted-foreground  shrink-0 whitespace-nowrap text-right pt-0.5">{activity.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

            </div>

            {/* RIGHT COLUMN (40%) */}
            <div className="col-span-4 flex flex-col gap-6 w-full">

              {/* My Projects */}
              <Card className="bg-hs-main border-border/50 shadow-none rounded-[24px] overflow-hidden">
                <CardHeader className="py-4 px-5">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">My Projects</CardTitle>
                </CardHeader>
                <div className="flex flex-col pb-2">
                  {projects.length > 0 ? (
                    projects.slice(0, 4).map((project) => {
                      const projectColor = project.color ? PROJECT_COLOR_MAP[project.color] : "var(--primary)";
                      const projectTasks = tasks.filter(t => t.projectId === project.id);
                      const totalProjTasks = projectTasks.length;
                      const completedProjTasks = projectTasks.filter(t => ["done", "completed", "DONE", "COMPLETED"].includes(t.status)).length;
                      const percentage = totalProjTasks > 0 ? Math.round((completedProjTasks / totalProjTasks) * 100) : 0;

                      return (
                        <div key={project.id} className="flex items-center justify-between py-3 px-5 hover:bg-muted/30 transition-colors cursor-pointer group">
                          <div className="flex items-center gap-4 min-w-0">
                            <div
                              className="h-[32px] w-[32px] rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-sm"
                              style={{ backgroundColor: projectColor }}
                            >
                              {project.name.charAt(0)}
                            </div>
                            <div className="flex flex-col pr-4 min-w-0 truncate">
                              <span className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                {project.name}
                              </span>
                              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-tight truncate">
                                {project.id.slice(0, 8)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 w-1/3 justify-end shrink-0">
                            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: projectColor
                                }}
                              />
                            </div>
                            <span className="text-[10px] font-medium text-muted-foreground w-8 text-right">{percentage}%</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 px-6 text-center">
                      <p className="text-xs text-muted-foreground">No projects in this workspace.</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Channels */}
              <Card className="bg-hs-main border-border/50 shadow-none rounded-[24px] overflow-hidden">
                <CardHeader className="py-4 px-5">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Channels</CardTitle>
                </CardHeader>
                <div className="flex flex-col pb-2">
                  {workspaceChannels.length > 0 ? (
                    workspaceChannels
                      .filter(c => c.type === 'PUBLIC' || c.type === 'PRIVATE')
                      .slice(0, 5)
                      .map((channel) => (
                        <div
                          key={channel.id}
                          onClick={() => router.push(`/dashboard/chat/${channel.id}`)}
                          className="flex items-center justify-between py-3 px-5 hover:bg-muted/30 transition-colors cursor-pointer border-b border-border/10 last:border-0"
                        >
                          <div className="flex flex-col flex-1 gap-1 min-w-0 pr-4">
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground text-sm font-light leading-none">#</span>
                              <span className="text-sm font-medium truncate text-foreground">
                                {channel.name}
                              </span>
                              {channel.unreadCount > 0 && (
                                <Badge className="h-4.5 rounded-full bg-destructive hover:opacity-90 px-1.5 py-0 text-[9px] text-white border-none shrink-0 font-bold">
                                  {channel.unreadCount}
                                </Badge>
                              )}
                            </div>
                            {lastMessages[channel.id] ? (
                              <p className={`text-xs truncate ${channel.unreadCount > 0 ? 'text-zinc-200 font-semibold' : 'text-zinc-400'}`}>
                                {lastMessages[channel.id].content}
                              </p>
                            ) : (
                              <p className="text-xs text-zinc-500/60 italic">No messages yet</p>
                            )}
                          </div>

                          {lastMessages[channel.id] && (
                            <span className="text-[10px] text-zinc-500 shrink-0 whitespace-nowrap self-start pt-0.5">
                              {(() => {
                                try {
                                  const date = new Date(lastMessages[channel.id].createdAt);
                                  const now = new Date();
                                  if (date.toDateString() === now.toDateString()) {
                                    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                  }
                                  if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
                                    return date.toLocaleDateString([], { weekday: 'short' });
                                  }
                                  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                } catch {
                                  return "";
                                }
                              })()}
                            </span>
                          )}
                        </div>
                      ))
                  ) : (
                    <div className="py-8 px-6 text-center">
                      <p className="text-xs text-muted-foreground">No channels in this workspace.</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Upcoming */}
              <Card className="bg-hs-main border-border/50 shadow-none rounded-[24px] overflow-hidden">
                <CardHeader className="py-4 px-5">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Upcoming</CardTitle>
                </CardHeader>
                <div className="flex flex-col pb-2">
                  {[
                    { title: "Review staging environment", date: "Tomorrow", badge: "Engineering" },
                    { title: "Design sync with marketing", date: "Oct 25", badge: "Design" },
                    { title: "Submit expenses for Q3", date: "Oct 26", badge: "Admin" }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 py-3 px-5 hover:bg-muted/30 transition-colors cursor-pointer w-full">
                      <div className="flex flex-col grow min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px] font-normal bg-muted/50 border-none text-muted-foreground rounded-sm">
                            {item.date}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] font-normal bg-transparent border-none text-muted-foreground/60 rounded-sm px-0">
                            {item.badge}
                          </Badge>
                        </div>
                        <span className="text-sm font-medium text-foreground truncate">{item.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

            </div>
          </div>

        </div>
        <CreateOrgModal isOpen={isCreateModalOpen} onClose={handleCloseCreateModal} />
        <JoinOrgModal isOpen={isJoinModalOpen} onClose={handleCloseJoinModal} />
      </ScrollArea>

      <CreateTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
      />
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-hs-base">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-hs-accent border-t-transparent" />
      </div>
    }>
      <DashboardPageContent />
    </Suspense>
  );
}
