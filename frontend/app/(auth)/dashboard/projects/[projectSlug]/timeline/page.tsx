"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Calendar,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getProjectMembers, ProjectMemberResponse } from "@/lib/api/projects";

import { cn, getAvatarColorClass } from "@/lib/utils";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { PROJECT_COLOR_MAP } from "@/lib/constants/colors";
// import { motion, AnimatePresence } from "framer-motion";
import { 
  deleteTask,
  TaskResponse
} from "@/lib/api/tasks";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import { useTaskStore } from "@/store/taskStore";
import { TaskDetailSheet } from "../board/components/TaskDetailSheet";
import { useWorkspaceStore } from "@/store/workspaceStore";

const STATUS_FILTER_OPTIONS = ["All", "Todo", "In Progress", "Review", "Done"];
const PRIORITY_FILTER_OPTIONS = ["All", "Urgent", "High", "Medium", "Low"];

const PRIORITY_COLORS: Record<string, { bar: string; border: string; text: string }> = {
  URGENT: {
    bar: "bg-gradient-to-r from-red-500/20 to-rose-600/20 backdrop-blur-sm",
    border: "border-red-500/40",
    text: "text-red-300"
  },
  HIGH: {
    bar: "bg-gradient-to-r from-amber-500/20 to-orange-600/20 backdrop-blur-sm",
    border: "border-amber-500/40",
    text: "text-amber-300"
  },
  MEDIUM: {
    bar: "bg-gradient-to-r from-blue-500/20 to-indigo-600/20 backdrop-blur-sm",
    border: "border-blue-500/40",
    text: "text-blue-300"
  },
  LOW: {
    bar: "bg-gradient-to-r from-zinc-500/10 to-zinc-600/10 backdrop-blur-sm",
    border: "border-zinc-500/30",
    text: "text-zinc-300"
  }
};

export default function ProjectTimelinePage() {
  const params = useParams();
  const { projects } = useProjects();
  const projectId = params?.projectSlug as string || "";

  const currentProject = projects.find(p => p.id === projectId);
  const themeColor = PROJECT_COLOR_MAP[currentProject?.color || ""] || "#7C5CFC";
  const displayTitle = currentProject?.name || "Project";
  const { activeWorkspace } = useWorkspaceStore();

  const { tasks, refresh } = useTasks(projectId);
  const updateTaskInStore = useTaskStore((state) => state.updateTask);
  const removeTaskFromStore = useTaskStore((state) => state.removeTask);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null;

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  const rightTimelineRef = useRef<HTMLDivElement>(null);

  // Query Project Members
  const { data: projectMembers = [] } = useQuery<ProjectMemberResponse[], Error>({
    queryKey: ["projectMembers", projectId],
    queryFn: () => getProjectMembers(projectId),
    enabled: !!projectId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId),
    staleTime: 30_000,
  });

  // Calculate dynamic project dates
  const startDateStr = currentProject?.startDate 
    ? new Date(currentProject.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) 
    : "";
  const endDateStr = currentProject?.endDate 
    ? new Date(currentProject.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) 
    : "";
  const dateRangeStr = startDateStr && endDateStr ? `${startDateStr} – ${endDateStr}` : "No dates set";

  // Generate 30 days calendar centered around today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [calendarDays, setCalendarDays] = useState<Date[]>([]);

  useEffect(() => {
    const startRange = new Date(today);
    startRange.setDate(startRange.getDate() - 7); // Start 7 days ago

    const days: Date[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(startRange);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    setCalendarDays(days);
  }, []);

  // Handle auto-scroll to today
  useEffect(() => {
    if (calendarDays.length > 0 && rightTimelineRef.current) {
      // Find today's index (which is index 7 because we start 7 days ago)
      const scrollPosition = 7 * 80 - 100; // 80px column width minus header offset
      rightTimelineRef.current.scrollLeft = scrollPosition;
    }
  }, [calendarDays]);

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

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (task.taskIdentifier && task.taskIdentifier.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "All" || 
                          task.status.toLowerCase().replace("_", "") === statusFilter.toLowerCase().replace(" ", "");
    
    const matchesPriority = priorityFilter === "All" || 
                            task.priority.toLowerCase() === priorityFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getTaskCoordinates = (task: TaskResponse) => {
    if (calendarDays.length === 0) return null;

    const taskStart = new Date(task.createdAt);
    taskStart.setHours(0, 0, 0, 0);

    const taskEnd = task.dueDate 
      ? new Date(task.dueDate) 
      : new Date(taskStart.getTime() + 2 * 24 * 60 * 60 * 1000); // 3 days default duration
    taskEnd.setHours(0, 0, 0, 0);

    const timelineStart = calendarDays[0];
    const timelineEnd = calendarDays[calendarDays.length - 1];

    if (taskEnd < timelineStart || taskStart > timelineEnd) {
      return null; // Out of range
    }

    const startIdx = calendarDays.findIndex(day => day.toDateString() === taskStart.toDateString());
    const endIdx = calendarDays.findIndex(day => day.toDateString() === taskEnd.toDateString());

    let left = 0;
    let width = 80 * 3; // Default 3 days span width (each col is 80px)

    if (startIdx !== -1) {
      left = startIdx * 80;
      if (endIdx !== -1) {
        width = Math.max(80, (endIdx - startIdx + 1) * 80);
      } else {
        // Spans beyond visible end
        width = Math.max(80, (calendarDays.length - startIdx) * 80);
      }
    } else {
      // Starts before visible start
      left = 0;
      if (endIdx !== -1) {
        width = Math.max(80, (endIdx + 1) * 80);
      } else {
        // Encompasses entire range
        width = calendarDays.length * 80;
      }
    }

    return { left, width };
  };

  const getInitials = (name?: string) => {
    if (!name) return "--";
    return name.trim().split(/\s+/).map(n => n[0]).join("").toUpperCase().substring(0, 2);
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden font-sans">
      {/* --- TOP BREADCRUMB BAR --- */}
      <header className="sticky top-0 z-30 flex h-[44px] shrink-0 items-center justify-between border-b border-border/50 bg-background/80 px-6 backdrop-blur-sm">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs text-muted-foreground">Hivespace</span>
          <span className="text-border">/</span>
          <span className="text-xs text-muted-foreground">{activeWorkspace?.name || "Workspace"}</span>
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
          <Link href={`/dashboard/projects/${projectId}/list`} className="flex h-full items-center px-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            List
          </Link>
          <button className="relative flex h-full items-center px-1 text-sm font-medium text-foreground">
            Timeline
            <div className="absolute bottom-0 left-0 h-[2px] w-full" style={{ backgroundColor: themeColor }} />
          </button>
          <Link href={`/dashboard/projects/${projectId}/backlog`} className="flex h-full items-center px-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Backlog
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
            <Calendar className="h-4.5 w-4.5 text-muted-foreground" style={{ color: themeColor }} />
            <h1 className="text-base font-bold text-[#E5E1E4]">Timeline view</h1>
          </div>
          <p className="text-xs text-muted-foreground">Visualize scheduled sprints, deadlines, and task trajectories.</p>
        </div>

        {/* Filters Panel */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-44 bg-muted/50 border border-border/40 rounded-md pl-8 pr-3 text-xs text-foreground outline-none focus:border-border transition-colors placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Status select filter */}
          <div className="flex items-center bg-muted/40 border border-border/40 rounded-md px-2.5 h-8 gap-1.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold text-foreground outline-none cursor-pointer"
            >
              {STATUS_FILTER_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-zinc-900">{opt}</option>)}
            </select>
          </div>

          {/* Priority select filter */}
          <div className="flex items-center bg-muted/40 border border-border/40 rounded-md px-2.5 h-8 gap-1.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Priority</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold text-foreground outline-none cursor-pointer"
            >
              {PRIORITY_FILTER_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-zinc-900">{opt}</option>)}
            </select>
          </div>

          <Button 
            onClick={() => {
              if (rightTimelineRef.current) {
                rightTimelineRef.current.scrollLeft = 7 * 80 - 100;
              }
            }}
            variant="outline" 
            className="h-8 text-xs font-semibold px-3 rounded-md bg-muted/30 border-border/40 hover:bg-muted"
          >
            Today
          </Button>
        </div>
      </div>

      {/* --- SCROLLABLE GANTT GRID CONTAINER --- */}
      <div className="flex-1 flex min-h-0 bg-hs-main relative">
        
        {/* Left Sticky Task Names Panel (width: 280px) */}
        <div className="w-[280px] shrink-0 border-r border-border/40 bg-background/95 backdrop-blur-sm z-10 flex flex-col min-h-0">
          <div className="h-[44px] shrink-0 border-b border-border/40 flex items-center px-4 text-xs font-extrabold uppercase tracking-wider text-zinc-500">
            Task Name ({filteredTasks.length})
          </div>
          
          <div className="flex-1 overflow-y-auto divide-y divide-border/20">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => (
                <div 
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className="h-[54px] flex items-center px-4 justify-between hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors cursor-pointer group"
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-sm font-bold text-zinc-200 truncate group-hover:text-white transition-colors">
                      {task.title}
                    </span>
                    <span className="text-xs font-mono text-zinc-500 mt-0.5">
                      {task.taskIdentifier || `HS-${task.id.substring(0, 4)}`}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Status Badge */}
                    <span className={cn(
                      "text-[10px] font-extrabold tracking-wider uppercase px-1.5 py-0.5 rounded border leading-none",
                      task.status === "DONE" && "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                      task.status === "IN_PROGRESS" && "text-blue-400 bg-blue-500/10 border-blue-500/20",
                      task.status === "IN_REVIEW" && "text-amber-400 bg-amber-500/10 border-amber-500/20",
                      task.status === "TODO" && "text-zinc-400 bg-zinc-500/10 border-zinc-500/20"
                    )}>
                      {task.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No matching tasks found.
              </div>
            )}
          </div>
        </div>

        {/* Right Horizontally Scrollable Timeline Sheet */}
        <div 
          ref={rightTimelineRef}
          className="flex-1 overflow-x-auto overflow-y-hidden flex flex-col min-h-0 relative select-none scroll-smooth"
        >
          {/* Timeline Width wrapper: 30 days * 80px = 2400px */}
          <div className="w-[2400px] flex flex-col h-full">
            
            {/* Days Calendar Header (height: 44px) */}
            <div className="h-[44px] shrink-0 border-b border-border/40 flex bg-background/50">
              {calendarDays.map((day) => {
                const isToday = day.toDateString() === today.toDateString();
                return (
                  <div 
                    key={day.toISOString()}
                    className={cn(
                      "w-[80px] shrink-0 flex flex-col items-center justify-center text-center border-r border-border/20 py-1.5 relative",
                      isToday && "bg-white/[0.02]"
                    )}
                  >
                    <span className={cn(
                      "text-[10px] font-extrabold uppercase tracking-wide",
                      isToday ? "text-foreground" : "text-zinc-400"
                    )}>
                      {day.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                    <span className={cn(
                      "text-sm font-extrabold font-mono mt-0.5 flex h-6 w-6 items-center justify-center rounded-full",
                      isToday ? "text-zinc-950 font-black" : "text-zinc-300"
                    )}
                    style={isToday ? { backgroundColor: themeColor } : {}}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Timeline Rows Container */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/20 relative">
              {/* Background day column lines */}
              <div className="absolute inset-y-0 left-0 right-0 pointer-events-none flex">
                {calendarDays.map((day) => (
                  <div 
                    key={`line-${day.toISOString()}`}
                    className={cn(
                      "w-[80px] shrink-0 border-r border-border/[0.04] h-full",
                      day.toDateString() === today.toDateString() && "border-r-border/20 border-l border-l-border/20 bg-white/[0.01]"
                    )}
                  />
                ))}
              </div>

              {/* Task Row timeline bars */}
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task) => {
                  const coords = getTaskCoordinates(task);
                  const pConfig = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.MEDIUM;
                  return (
                    <div 
                      key={`row-${task.id}`}
                      className="h-[54px] relative flex items-center bg-transparent/10 hover:bg-white/[0.01] transition-colors"
                    >
                      {coords && (
                        <div 
                          onClick={() => setSelectedTaskId(task.id)}
                          className={cn(
                            "absolute h-[38px] rounded-lg border px-3 flex items-center justify-between cursor-pointer shadow-md select-none group/bar transition-all duration-300 hover:brightness-110 active:scale-[0.99]",
                            pConfig.bar,
                            pConfig.border
                          )}
                          style={{ 
                            left: `${coords.left}px`, 
                            width: `${coords.width}px`
                          }}
                        >
                          <div className="flex items-center min-w-0 mr-2 gap-1.5">
                            <span className={cn("text-xs font-mono font-bold leading-none shrink-0", pConfig.text)}>
                              {task.taskIdentifier || `HS-${task.id.substring(0, 4)}`}
                            </span>
                            <span className="text-xs font-semibold truncate leading-none text-zinc-100 group-hover/bar:text-white transition-colors">
                              {task.title}
                            </span>
                          </div>
                          
                          {/* Mini Assignee Avatar */}
                          <div className="shrink-0 flex items-center">
                            <Avatar className="h-4.5 w-4.5 border border-zinc-800" username={task.assigneeName || "Unassigned"} email={task.assigneeName ? `${task.assigneeName.toLowerCase().replace(/\s+/g, '')}@hivespace.io` : ""}>
                              <AvatarFallback className="bg-zinc-800 text-[9px] text-zinc-400 font-extrabold">
                                {task.assigneeInitials || "--"}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground p-12">
                  No tasks to display on timeline.
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

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
    </div>
  );
}
