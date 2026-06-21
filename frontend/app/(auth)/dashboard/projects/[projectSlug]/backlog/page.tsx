"use client";

import { useState, useEffect } from "react";
import { 
  ChevronRight, 
  SlidersHorizontal, 
  LayoutList, 
  PlusCircle,
  Calendar,
  Search,
  Filter,
  ArrowLeft,
  Clock,
  ChevronLeft,
  Plus,
  Play,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getProjectMembers, ProjectMemberResponse } from "@/lib/api/projects";
import { 
  createSprint, 
  getSprintsForProject, 
  startSprint, 
  completeSprint, 
  associateTaskWithSprint,
  SprintResponse
} from "@/lib/api/sprints";

import { cn, getAvatarColorClass } from "@/lib/utils";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { PROJECT_COLOR_MAP } from "@/lib/constants/colors";
import { motion, AnimatePresence } from "framer-motion";
import { 
  deleteTask,
  TaskResponse
} from "@/lib/api/tasks";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import { useTaskStore } from "@/store/taskStore";
import { TaskDetailSheet } from "../board/components/TaskDetailSheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BulkCreateModal } from "@/components/features/tasks/BulkCreateModal";

export default function ProjectBacklogPage() {
  const params = useParams();
  const router = useRouter();
  const { projects } = useProjects();
  const projectId = params?.projectSlug as string || "";

  const currentProject = projects.find(p => p.id === projectId);
  const themeColor = PROJECT_COLOR_MAP[currentProject?.color || ""] || "#7C5CFC";
  const displayTitle = currentProject?.name || "Project";

  const { tasks, refresh } = useTasks(projectId);
  const updateTaskInStore = useTaskStore((state) => state.updateTask);
  const removeTaskFromStore = useTaskStore((state) => state.removeTask);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null;

  // Sprint state
  const [sprints, setSprints] = useState<SprintResponse[]>([]);
  const [sprintsLoading, setSprintsLoading] = useState(true);
  
  // Dialog/Modal states
  const [isNewSprintOpen, setIsNewSprintOpen] = useState(false);
  const [newSprintName, setNewSprintName] = useState("");
  const [newSprintGoal, setNewSprintGoal] = useState("");
  const [newSprintStart, setNewSprintStart] = useState("");
  const [newSprintEnd, setNewSprintEnd] = useState("");
  const [submittingSprint, setSubmittingSprint] = useState(false);

  // Complete sprint dialog states
  const [completingSprintObj, setCompletingSprintObj] = useState<SprintResponse | null>(null);
  const [targetSprintId, setTargetSprintId] = useState<string>("backlog");
  const [completingSprint, setCompletingSprint] = useState(false);

  // AI Bulk generator modal
  const [isBulkCreateOpen, setIsBulkCreateOpen] = useState(false);

  // Fetch Sprints
  const fetchProjectSprints = async () => {
    try {
      const data = await getSprintsForProject(projectId);
      setSprints(data);
    } catch (err) {
      console.error("Failed to load project sprints:", err);
      toast.error("Failed to load sprints");
    } finally {
      setSprintsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectSprints();
    }
  }, [projectId]);

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      toast.success("Task deleted successfully");
      removeTaskFromStore(taskId);
      if (selectedTaskId === taskId) {
        setSelectedTaskId(null);
      }
      refresh();
    } catch (err) {
      toast.error("Failed to delete task");
    }
  };

  // Query Project Members
  const { data: projectMembers = [] } = useQuery<ProjectMemberResponse[], Error>({
    queryKey: ["projectMembers", projectId],
    queryFn: () => getProjectMembers(projectId),
    enabled: !!projectId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId),
    staleTime: 30_000,
  });

  const startDateStr = currentProject?.startDate 
    ? new Date(currentProject.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) 
    : "";
  const endDateStr = currentProject?.endDate 
    ? new Date(currentProject.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) 
    : "";
  const dateRangeStr = startDateStr && endDateStr ? `${startDateStr} – ${endDateStr}` : "No dates set";

  const getInitials = (name?: string) => {
    if (!name) return "--";
    return name.trim().split(/\s+/).map(n => n[0]).join("").toUpperCase().substring(0, 2);
  };

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleDrop = async (e: React.DragEvent, sprintId: string | null) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;

    try {
      await associateTaskWithSprint(taskId, sprintId);
      // update task in store locally
      const taskToUpdate = tasks.find(t => t.id === taskId);
      if (taskToUpdate) {
        const matchingSprint = sprints.find(s => s.id === sprintId);
        updateTaskInStore({
          ...taskToUpdate,
          sprintId: sprintId || undefined,
          sprintName: matchingSprint ? matchingSprint.name : undefined
        });
      }
      toast.success(sprintId ? "Task added to sprint" : "Task moved to backlog");
      refresh();
    } catch (err) {
      toast.error("Failed to move task");
    }
  };

  // Sprint action handlers
  const handleCreateSprintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSprintName.trim()) {
      toast.error("Sprint name is required");
      return;
    }
    setSubmittingSprint(true);
    try {
      await createSprint(projectId, {
        name: newSprintName.trim(),
        goal: newSprintGoal.trim() || undefined,
        startDate: newSprintStart || undefined,
        endDate: newSprintEnd || undefined,
      });
      toast.success("Sprint created successfully");
      setIsNewSprintOpen(false);
      setNewSprintName("");
      setNewSprintGoal("");
      setNewSprintStart("");
      setNewSprintEnd("");
      fetchProjectSprints();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create sprint");
    } finally {
      setSubmittingSprint(false);
    }
  };

  const handleStartSprint = async (sprintId: string) => {
    try {
      await startSprint(sprintId);
      toast.success("Sprint started successfully!");
      fetchProjectSprints();
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start sprint");
    }
  };

  const handleCompleteSprintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingSprintObj) return;

    setCompletingSprint(true);
    try {
      const targetVal = targetSprintId === "backlog" ? undefined : targetSprintId;
      await completeSprint(completingSprintObj.id, targetVal);
      toast.success("Sprint completed successfully!");
      setCompletingSprintObj(null);
      fetchProjectSprints();
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to complete sprint");
    } finally {
      setCompletingSprint(false);
    }
  };

  // Calculations for display totals
  const backlogTasks = tasks.filter(t => !t.sprintId && t.status !== "DONE" && t.status !== "CANCELLED");
  const completedBacklogTasks = tasks.filter(t => !t.sprintId && (t.status === "DONE" || t.status === "CANCELLED"));

  const getSprintTasks = (sprintId: string) => tasks.filter(t => t.sprintId === sprintId);

  const calculateSprintPoints = (sprintTasks: TaskResponse[]) => {
    let total = 0;
    let unestimated = 0;
    sprintTasks.forEach(t => {
      if (t.points != null) {
        total += t.points;
      } else {
        unestimated += 1;
      }
    });
    return { total, unestimated };
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden font-sans">
      {/* --- TOP BREADCRUMB BAR --- */}
      <header className="sticky top-0 z-30 flex h-[44px] shrink-0 items-center justify-between border-b border-border/50 bg-background/80 px-6 backdrop-blur-sm">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs text-muted-foreground">Hivespace</span>
          <span className="text-border">/</span>
          <span className="text-xs text-muted-foreground">Engineering</span>
          <span className="text-border">/</span>
          <span className="text-xs font-medium text-foreground">{displayTitle}</span>
          
          <div className="ml-3 flex items-center rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground font-medium">
            {displayTitle} · {dateRangeStr}
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="flex h-full items-center gap-6">
          <Link href={`/dashboard/projects/${projectId}`} className="flex h-full items-center px-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Overview
          </Link>
          <Link href={`/dashboard/projects/${projectId}/board`} className="flex h-full items-center px-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Board
          </Link>
          <button className="flex h-full items-center px-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-not-allowed opacity-60">
            List
          </button>
          <Link href={`/dashboard/projects/${projectId}/timeline`} className="flex h-full items-center px-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Timeline
          </Link>
          <Link href={`/dashboard/projects/${projectId}/backlog`} className="relative flex h-full items-center px-1 text-sm font-medium text-foreground">
            Backlog
            <div className="absolute bottom-0 left-0 h-[2px] w-full" style={{ backgroundColor: themeColor }} />
          </Link>
        </nav>

        {/* Right Members Avatars */}
        <div className="flex items-center justify-end gap-2 flex-1">
          <div className="flex items-center ml-2 mr-2">
            {projectMembers.slice(0, 5).map((member) => {
              const name = member.fullName || member.username;
              const initials = getInitials(name);
              return (
                <Avatar key={member.id} className="h-6 w-6 ring-2 ring-background -ml-1.5 first:ml-0 border border-border/50" username={name} email={member.email || `${member.username.toLowerCase()}@hivespace.io`}>
                  <AvatarFallback className={cn("text-[9px] font-semibold", getAvatarColorClass(initials))}>{initials}</AvatarFallback>
                </Avatar>
              );
            })}
            {projectMembers.length > 5 && (
              <div className="h-6 w-6 rounded-full ring-2 ring-background bg-zinc-900 border border-border/50 flex items-center justify-center text-[9px] text-zinc-400 font-extrabold -ml-1.5 z-30">
                +{projectMembers.length - 5}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* --- DASHBOARD HEADER PANEL --- */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-8 py-5 border-b border-border/40 shrink-0 gap-4 bg-background">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4.5 w-4.5 text-muted-foreground" style={{ color: themeColor }} />
            <h1 className="text-base font-bold text-[#E5E1E4]">Sprint Backlog</h1>
          </div>
          <p className="text-xs text-muted-foreground">Estimate tasks, schedule upcoming milestones, and organize sprints.</p>
        </div>

        {/* Action Panel */}
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setIsBulkCreateOpen(true)}
            variant="outline" 
            className="h-8 text-xs font-semibold px-3.5 rounded-xl bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20 text-purple-300 flex items-center gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Brief Import
          </Button>

          <Button 
            onClick={() => setIsNewSprintOpen(true)}
            className="h-8 text-xs font-semibold px-3.5 rounded-xl flex items-center gap-1.5 text-white"
            style={{ backgroundColor: themeColor }}
          >
            <Plus className="h-4 w-4" />
            Create Sprint
          </Button>
        </div>
      </div>

      {/* --- BACKLOG LAYOUT splits left (Sprints) and right (Backlog List) --- */}
      <div className="flex-1 flex min-h-0 bg-hs-main overflow-hidden p-6 gap-6">
        
        {/* Left Section: Sprints list */}
        <div className="flex-1 flex flex-col min-w-0 bg-background/30 rounded-[24px] border border-border/40 p-4 overflow-y-auto">
          <h2 className="text-sm font-bold text-[#E5E1E4] mb-4 flex items-center gap-2">
            <span>Sprints</span>
            <span className="text-xs font-normal text-muted-foreground">({sprints.length})</span>
          </h2>

          {sprintsLoading ? (
            <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
              Loading sprints...
            </div>
          ) : sprints.length > 0 ? (
            <div className="flex flex-col gap-4">
              {sprints.map((sprint) => {
                const sprintTasks = getSprintTasks(sprint.id);
                const { total: totalPoints, unestimated } = calculateSprintPoints(sprintTasks);
                
                return (
                  <div 
                    key={sprint.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, sprint.id)}
                    className={cn(
                      "border rounded-2xl p-4 flex flex-col transition-all duration-200",
                      sprint.status === "ACTIVE" 
                        ? "border-purple-500/30 bg-purple-500/[0.02]" 
                        : sprint.status === "COMPLETED" 
                        ? "border-border/30 bg-black/10 opacity-75"
                        : "border-border/50 bg-black/20"
                    )}
                  >
                    {/* Sprint Header */}
                    <div className="flex items-center justify-between gap-4 mb-3 border-b border-border/20 pb-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#E5E1E4]">{sprint.name}</span>
                          <span className={cn(
                            "text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider border",
                            sprint.status === "ACTIVE" && "text-purple-400 bg-purple-500/10 border-purple-500/20",
                            sprint.status === "COMPLETED" && "text-zinc-500 bg-zinc-800 border-zinc-700",
                            sprint.status === "PLANNING" && "text-amber-400 bg-amber-500/10 border-amber-500/20"
                          )}>
                            {sprint.status}
                          </span>
                        </div>
                        {sprint.goal && (
                          <span className="text-xs text-muted-foreground mt-0.5 italic truncate max-w-[320px]">
                           &quot;{sprint.goal}&quot;
                          </span>
                        )}
                        {sprint.startDate && (
                          <span className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            {new Date(sprint.startDate).toLocaleDateString()} - {sprint.endDate ? new Date(sprint.endDate).toLocaleDateString() : "No end date"}
                          </span>
                        )}
                      </div>

                      {/* Right sprint controllers */}
                      <div className="flex items-center gap-2">
                        {sprint.status === "PLANNING" && (
                          <Button 
                            onClick={() => handleStartSprint(sprint.id)}
                            size="sm" 
                            className="h-7 text-[10px] font-bold rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 flex items-center gap-1"
                          >
                            <Play className="h-3 w-3 fill-emerald-400" />
                            Start
                          </Button>
                        )}
                        {sprint.status === "ACTIVE" && (
                          <Button 
                            onClick={() => setCompletingSprintObj(sprint)}
                            size="sm" 
                            className="h-7 text-[10px] font-bold rounded-lg bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 flex items-center gap-1"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Complete
                          </Button>
                        )}
                        
                        <div className="text-right">
                          <div className="text-xs font-bold text-zinc-300">
                            {totalPoints} pts
                          </div>
                          {unestimated > 0 && (
                            <div className="text-[9px] text-yellow-500/80">
                              {unestimated} unestimated
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Sprint Tasks List */}
                    <div className="flex flex-col gap-2 min-h-[50px]">
                      {sprintTasks.length > 0 ? (
                        sprintTasks.map((task) => (
                          <div 
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            onClick={() => setSelectedTaskId(task.id)}
                            className="bg-black/30 border border-border/20 rounded-xl p-2.5 flex items-center justify-between hover:border-zinc-700 hover:bg-black/50 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-xs font-mono text-zinc-500 group-hover:text-zinc-400">
                                {task.taskIdentifier}
                              </span>
                              <span className="text-xs font-medium text-zinc-200 truncate group-hover:text-white">
                                {task.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {task.points !== undefined && (
                                <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded text-zinc-400">
                                  {task.points} pts
                                </span>
                              )}
                              <span className={cn(
                                "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border leading-none",
                                task.status === "DONE" && "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                                task.status === "IN_PROGRESS" && "text-blue-400 bg-blue-500/10 border-blue-500/20",
                                task.status === "TODO" && "text-zinc-400 bg-zinc-500/10 border-zinc-500/20"
                              )}>
                                {task.status}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-[11px] text-muted-foreground/60 italic text-center py-3 border border-dashed border-border/30 rounded-xl">
                          Drag and drop tasks here to plan
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-border/30 rounded-2xl">
              <PlusCircle className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <span className="text-xs text-muted-foreground">No sprints created yet.</span>
              <Button 
                onClick={() => setIsNewSprintOpen(true)}
                variant="link" 
                className="text-xs font-semibold mt-1"
                style={{ color: themeColor }}
              >
                Create your first sprint
              </Button>
            </div>
          )}
        </div>

        {/* Right Section: Backlog lists */}
        <div 
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, null)}
          className="w-[380px] shrink-0 flex flex-col bg-background/30 rounded-[24px] border border-border/40 p-4"
        >
          <div className="flex items-center justify-between border-b border-border/20 pb-3 mb-3">
            <h2 className="text-sm font-bold text-[#E5E1E4] flex items-center gap-2">
              <span>Project Backlog</span>
              <span className="text-xs font-normal text-muted-foreground">({backlogTasks.length})</span>
            </h2>
            <div className="text-[10px] text-zinc-500 font-medium">
              Drag tasks from here to a sprint
            </div>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
            {backlogTasks.length > 0 ? (
              backlogTasks.map((task) => (
                <div 
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onClick={() => setSelectedTaskId(task.id)}
                  className="bg-black/40 border border-border/20 hover:border-zinc-700/60 rounded-xl p-3 flex flex-col gap-2 hover:bg-black/60 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-zinc-500 group-hover:text-zinc-400">
                      {task.taskIdentifier}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {task.points !== undefined && (
                        <span className="text-[9px] font-bold bg-muted px-1.5 py-0.5 rounded text-zinc-400">
                          {task.points} pts
                        </span>
                      )}
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border leading-none",
                        task.status === "DONE" && "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                        task.status === "IN_PROGRESS" && "text-blue-400 bg-blue-500/10 border-blue-500/20",
                        task.status === "TODO" && "text-zinc-400 bg-zinc-500/10 border-zinc-500/20"
                      )}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-zinc-200 group-hover:text-white truncate">
                    {task.title}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-border/20 rounded-xl text-muted-foreground/60">
                <AlertCircle className="h-6 w-6 mb-2 opacity-50" />
                <span className="text-xs">Backlog is empty</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* --- DIALOG: CREATE NEW SPRINT --- */}
      <Dialog open={isNewSprintOpen} onOpenChange={setIsNewSprintOpen}>
        <DialogContent className="bg-hs-main border-border/50 text-foreground rounded-[28px] max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Create New Sprint</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the sprint parameters and select planning dates.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSprintSubmit} className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="name" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sprint Name</Label>
              <Input 
                id="name"
                value={newSprintName}
                onChange={(e) => setNewSprintName(e.target.value)}
                placeholder="e.g. Sprint 1 - Core Features"
                className="bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-0 rounded-xl text-foreground"
                disabled={submittingSprint}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="goal" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sprint Goal</Label>
              <Textarea 
                id="goal"
                value={newSprintGoal}
                onChange={(e) => setNewSprintGoal(e.target.value)}
                placeholder="What is this sprint's core objective?"
                className="bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-0 rounded-xl min-h-[80px] resize-none text-foreground"
                disabled={submittingSprint}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="start" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Start Date</Label>
                <Input 
                  id="start"
                  type="date"
                  value={newSprintStart}
                  onChange={(e) => setNewSprintStart(e.target.value)}
                  className="bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-0 rounded-xl text-foreground text-xs"
                  disabled={submittingSprint}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="end" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">End Date</Label>
                <Input 
                  id="end"
                  type="date"
                  value={newSprintEnd}
                  onChange={(e) => setNewSprintEnd(e.target.value)}
                  className="bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-0 rounded-xl text-foreground text-xs"
                  disabled={submittingSprint}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsNewSprintOpen(false)}
                className="rounded-xl border border-zinc-800 hover:bg-muted text-xs font-semibold"
                disabled={submittingSprint}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="rounded-xl text-xs font-semibold text-white"
                style={{ backgroundColor: themeColor }}
                disabled={submittingSprint}
              >
                Create Sprint
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- DIALOG: COMPLETE SPRINT --- */}
      <Dialog open={!!completingSprintObj} onOpenChange={() => setCompletingSprintObj(null)}>
        <DialogContent className="bg-hs-main border-border/50 text-foreground rounded-[28px] max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Complete Active Sprint</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Close &quot;{completingSprintObj?.name}&quot;. Choose what to do with the remaining incomplete tasks.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCompleteSprintSubmit} className="space-y-4">
            <div className="grid gap-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Incomplete Tasks Target</Label>
              <select
                value={targetSprintId}
                onChange={(e) => setTargetSprintId(e.target.value)}
                className="bg-muted border border-border/50 focus:border-primary/50 rounded-xl text-foreground text-xs p-3 outline-none"
              >
                <option value="backlog">Move to Backlog</option>
                {sprints
                  .filter(s => s.id !== completingSprintObj?.id && s.status === "PLANNING")
                  .map(s => (
                    <option key={s.id} value={s.id}>Move to {s.name}</option>
                  ))
                }
              </select>
            </div>

            <DialogFooter className="pt-2">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setCompletingSprintObj(null)}
                className="rounded-xl border border-zinc-800 hover:bg-muted text-xs font-semibold"
                disabled={completingSprint}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="rounded-xl text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white"
                disabled={completingSprint}
              >
                Complete Sprint
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- TASK DETAIL SHEET OVERLAY --- */}
      <TaskDetailSheet 
        selectedTask={selectedTask}
        onClose={() => setSelectedTaskId(null)}
        projectId={projectId}
        themeColor={themeColor}
        displayTitle={displayTitle}
        onUpdateTask={updateTaskInStore}
        onDeleteTask={handleDeleteTask}
      />

      {/* --- AI BULK IMPORT MODAL --- */}
      <BulkCreateModal 
        isOpen={isBulkCreateOpen}
        onClose={() => setIsBulkCreateOpen(false)}
        projectId={projectId}
        onSuccess={() => {
          refresh();
        }}
      />
    </div>
  );
}
