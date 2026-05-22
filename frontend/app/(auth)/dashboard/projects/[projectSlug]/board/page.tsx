"use client";

import { useState } from "react";
import { 
  ChevronRight, 
  SlidersHorizontal, 
  LayoutList, 
  PlusCircle,
  MoreHorizontal,
  Calendar,
  GitPullRequest,
  Plus,
  GitCommit,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useParams } from "next/navigation";

import { cn, getAvatarColorClass } from "@/lib/utils";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { PROJECT_COLOR_MAP } from "@/lib/constants/colors";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TaskResponse, 
  createTask,
  getTaskAssignees, 
  addTaskAssignee, 
  changeTaskOwner, 
  removeTaskAssignee, 
  TaskAssigneeResponse,
  updateTaskStatus,
  updateTask,
  deleteTask
} from "@/lib/api/tasks";
import { columnNameToStatus, statusMatchesColumn } from "@/lib/taskUtils";
import { getProjectMembers, ProjectMemberResponse } from "@/lib/api/projects";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import { useTaskStore } from "@/store/taskStore";
import { CreateTaskModal } from "@/components/features/tasks/CreateTaskModal";

// --- TYPES & CONSTANTS ---

const PRIORITIES = {
  urgent: "#E24B4A",
  high: "#EF9F27",
  normal: "#71717A", // zinc-500
};

const ASSIGNEE_COLORS: Record<string, string> = {
  "MV": "bg-amber-600",
  "RK": "bg-blue-600",
  "DK": "bg-green-600",
  "SA": "bg-red-600",
  "PL": "bg-purple-600",
  "RS": "bg-indigo-600",
};

type Priority = keyof typeof PRIORITIES;

const COLUMN_NAMES = ["Backlog", "Todo", "In Progress", "Review", "Done"];

export default function SprintThreeBoardPage() {
  const params = useParams();
  const { projects } = useProjects();
  const projectId = params?.projectSlug as string || "";
  

  const currentProject = projects.find(p => p.id === projectId);
  const themeColor = PROJECT_COLOR_MAP[currentProject?.color || ""] || "#7C5CFC";

  const displayTitle = currentProject?.name || "Project";

  const [selectedTask, setSelectedTask] = useState<TaskResponse | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState("Todo");

  const [assignees, setAssignees] = useState<TaskAssigneeResponse[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMemberResponse[]>([]);

  const { tasks, refresh } = useTasks(projectId);
  const updateTaskInStore = useTaskStore((state) => state.updateTask);
  const addTaskToStore = useTaskStore((state) => state.addTask);
  const removeTaskFromStore = useTaskStore((state) => state.removeTask);
  const [activeDragColumn, setActiveDragColumn] = useState<string | null>(null);
  const [quickAddColumn, setQuickAddColumn] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [quickAddLoading, setQuickAddLoading] = useState(false);

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      toast.success("Task deleted successfully");
      removeTaskFromStore(taskId);
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }
    } catch (err) {
      toast.error("Failed to delete task");
    }
  };

  const handleQuickCreate = async (columnName: string) => {
    const title = quickAddTitle.trim();
    if (!title || !projectId) {
      setQuickAddColumn(null);
      setQuickAddTitle("");
      return;
    }

    const backendStatus = columnNameToStatus(columnName);
    const tempId = `temp-${Date.now()}`;
    const optimistic: TaskResponse = {
      id: tempId,
      title,
      description: "",
      status: backendStatus,
      priority: "MEDIUM",
      labels: "",
      dueDate: "",
      points: 0,
      projectId,
      projectName: currentProject?.name || "",
      projectColor: currentProject?.color,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addTaskToStore(optimistic);
    setQuickAddTitle("");
    setQuickAddColumn(null);
    setQuickAddLoading(true);

    try {
      const created = await createTask(projectId, {
        title,
        status: backendStatus,
        priority: "MEDIUM",
      });
      removeTaskFromStore(tempId);
      addTaskToStore(created);
      toast.success("Task created");
    } catch {
      removeTaskFromStore(tempId);
      toast.error("Failed to create task");
    } finally {
      setQuickAddLoading(false);
    }
  };

  const handleTaskDrop = async (taskId: string, columnName: string) => {
    const targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask || targetTask.id.startsWith("temp-")) return;
    
    const originalTask = { ...targetTask };
    const backendStatus = columnNameToStatus(columnName);
    const updatedTask = { ...targetTask, status: backendStatus };
    
    updateTaskInStore(updatedTask);
    
    try {
      await updateTaskStatus(taskId, backendStatus);
      toast.success(`Moved to ${columnName}`);
      refresh();
    } catch (err) {
      updateTaskInStore(originalTask);
      toast.error("Failed to move task");
    }
  };

  const toInitials = (name: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const fetchAssigneesAndMembers = async (taskId: string) => {
    try {
      const [assigneeData, memberData] = await Promise.all([
        getTaskAssignees(taskId),
        getProjectMembers(projectId)
      ]);
      setAssignees(assigneeData);
      setProjectMembers(memberData);
    } catch (err) {
      console.error("Failed to fetch assignees or project members", err);
    }
  };

  const handleTaskClick = (task: TaskResponse) => {
    setSelectedTask(task);
    setEditedTitle(task.title);
    fetchAssigneesAndMembers(task.id);
  };

  const handleNewTask = (status?: string) => {
    if (status) setDefaultStatus(status);
    setIsCreateModalOpen(true);
  };

  // Group tasks by status
  const columns = COLUMN_NAMES.map(name => {
    const filteredTasks = tasks.filter(t => statusMatchesColumn(String(t.status), name));
    
    return {
      name,
      tasks: filteredTasks,
      count: filteredTasks.length,
      accent: name === "In Progress",
      muted: name === "Done"
    };
  });

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden font-sans">
      
      {/* --- TOP BREADCRUMB BAR --- */}
      <header className="sticky top-0 z-30 flex h-[44px] shrink-0 items-center justify-between border-b border-border/50 bg-background/80 px-6 backdrop-blur-sm">
        
        {/* Left: Breadcrumbs */}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs text-muted-foreground">Hivespace</span>
          <span className="text-border">/</span>
          <span className="text-xs text-muted-foreground">Engineering</span>
          <span className="text-border">/</span>
          <span className="text-xs font-medium text-foreground">{displayTitle}</span>
          
          <div className="ml-3 flex items-center rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground font-medium">
            {displayTitle} · Apr 1–15
          </div>
        </div>

        {/* Center: Tabs */}
        <nav className="flex h-full items-center gap-6">
          <button className="flex h-full items-center px-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Overview
          </button>
          <button className="relative flex h-full items-center px-1 text-sm font-medium text-foreground">
            Board
            <div className="absolute bottom-0 left-0 h-[2px] w-full" style={{ backgroundColor: themeColor }} />
          </button>
          <button className="flex h-full items-center px-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            List
          </button>
          <button className="flex h-full items-center px-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Timeline
          </button>
          <button className="flex h-full items-center px-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Backlog
          </button>
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center justify-end gap-2 flex-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md">
            <SlidersHorizontal strokeWidth={1.5} className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md">
            <LayoutList strokeWidth={1.5} className="h-3.5 w-3.5" />
          </Button>
          
          <div className="flex items-center ml-2 mr-2">
            {["MV", "RK", "PL", "RS"].map((initials, i) => (
              <Avatar key={initials} className={`h-6 w-6 ring-2 ring-background -ml-1.5 first:ml-0 border border-border/50`}>
                <AvatarFallback className={cn("text-[9px] font-semibold", getAvatarColorClass(initials))}>{initials}</AvatarFallback>
              </Avatar>
            ))}
          </div>

          <Button 
            className="h-7 text-zinc-950 font-bold border-none hover:opacity-90 transition-opacity text-[10px] uppercase tracking-wider rounded-md px-3"
            style={{ backgroundColor: themeColor }}
            onClick={() => handleNewTask("Todo")}
          >
            <PlusCircle strokeWidth={1.5} className="mr-1.5 h-3.5 w-3.5" />
            New Task
          </Button>
        </div>
      </header>

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 flex flex-col min-h-0 bg-hs-main">
        
        {/* Sprint Progress Bar */}
        <div className="flex flex-col px-8 py-5 shrink-0 gap-2.5">
          <div className="flex items-baseline gap-3">
            <h1 className="text-sm font-medium text-[#E5E1E4]">{displayTitle}</h1>
            <span className="text-xs text-zinc-400">Apr 1 – Apr 15, 2026</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative h-1.5 flex-1 max-w-[400px] bg-muted rounded-full overflow-hidden">
              <div className="absolute top-0 left-0 h-full rounded-full transition-all" style={{ width: '68%', backgroundColor: themeColor }} />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">17/25 tasks complete</span>
          </div>
        </div>

        {/* --- KANBAN BOARD --- */}
        <ScrollArea className="flex-1 w-full whitespace-nowrap px-8 pb-8">
          <div className="flex gap-4 h-full min-h-[calc(100vh-160px)]" style={{ width: 'max-content' }}>
            <AnimatePresence>
              {columns.map((col) => (
                <motion.div 
                  key={col.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (activeDragColumn !== col.name) {
                      setActiveDragColumn(col.name);
                    }
                  }}
                  onDragLeave={() => {
                    if (activeDragColumn === col.name) {
                      setActiveDragColumn(null);
                    }
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setActiveDragColumn(null);
                    const taskId = e.dataTransfer.getData("text/plain");
                    if (taskId) {
                      handleTaskDrop(taskId, col.name);
                    }
                  }}
                  className={cn(
                    "flex flex-col w-[280px] shrink-0 bg-hs-nav rounded-lg h-full overflow-hidden shadow-sm transition-all duration-200 border border-transparent",
                    activeDragColumn === col.name && "border-hs-accent/40 bg-hs-nav/80 ring-2 ring-hs-accent/10"
                  )}
                >
                  
                  {/* Column Header */}
                  <div className="flex items-center justify-between p-3 shrink-0">
                    <div className="flex items-center">
                      <span className="text-sm font-medium" style={{ color: col.name === 'In Progress' ? themeColor : col.accent ? themeColor : 'var(--foreground)' }}>
                        {col.name}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">{col.count}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                        onClick={() => handleNewTask(col.name)}
                      >
                        <Plus strokeWidth={1.5} className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md">
                        <MoreHorizontal strokeWidth={1.5} className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Task List */}
                  <div className="flex flex-col gap-2 p-2 pt-0 min-h-0 overflow-y-auto">
                    <AnimatePresence initial={false}>
                      {col.tasks.map((task) => (
                        <motion.div
                          key={task.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                        >
                          <TaskCard 
                            task={task} 
                            isMuted={col.muted} 
                            onClick={() => handleTaskClick(task)} 
                            onDelete={() => handleDeleteTask(task.id)}
                            themeColor={themeColor}
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/plain", task.id);
                              e.dataTransfer.effectAllowed = "move";
                            }}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {quickAddColumn === col.name ? (
                      <div className="flex items-center gap-2 px-1 py-1">
                        <input
                          autoFocus
                          disabled={quickAddLoading}
                          placeholder="Task title..."
                          value={quickAddTitle}
                          onChange={(e) => setQuickAddTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void handleQuickCreate(col.name);
                            if (e.key === "Escape") {
                              setQuickAddColumn(null);
                              setQuickAddTitle("");
                            }
                          }}
                          onBlur={() => {
                            if (quickAddTitle.trim()) void handleQuickCreate(col.name);
                            else setQuickAddColumn(null);
                          }}
                          className="flex-1 bg-hs-card border border-border/50 rounded-md px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-hs-accent/40"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setQuickAddColumn(col.name);
                          setQuickAddTitle("");
                        }}
                        className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] text-muted-foreground/70 hover:text-foreground transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        Add task
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Add Column Button */}
            <button className="flex h-10 w-48 shrink-0 items-center justify-center gap-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-border/80 hover:text-foreground transition-all mt-2.5">
              <Plus className="h-3.5 w-3.5" />
              <span>Add column</span>
            </button>
          </div>
          <ScrollBar orientation="horizontal" className="bg-zinc-900/50" />
        </ScrollArea>
      </div>

      {/* --- TASK DETAIL SHEET --- */}
      <Sheet open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <SheetContent side="right" className="w-[380px] p-0 bg-hs-nav border-l border-border/50 shadow-2xl flex flex-col gap-0 outline-none">
          <ScrollArea className="flex-1">
            <div className="p-6 flex flex-col gap-6">
              
              {/* Header Info */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground tracking-tight">
                  {selectedTask?.taskIdentifier || selectedTask?.id?.slice(0, 8)}
                </span>
                <Select 
                  value={selectedTask?.status?.toLowerCase() || "todo"}
                  onValueChange={async (val) => {
                    if (!selectedTask) return;
                    let backendStatus = "TODO";
                    if (val === "backlog") backendStatus = "BACKLOG";
                    else if (val === "todo") backendStatus = "TODO";
                    else if (val === "in-progress") backendStatus = "IN_PROGRESS";
                    else if (val === "review") backendStatus = "IN_REVIEW";
                    else if (val === "done") backendStatus = "DONE";

                    try {
                      const updated = await updateTaskStatus(selectedTask.id, backendStatus);
                      setSelectedTask(updated);
                      updateTaskInStore(updated);
                      toast.success(`Status updated to ${val}`);
                    } catch (err) {
                      toast.error("Failed to update status");
                    }
                  }}
                >
                  <SelectTrigger className="w-auto h-7 text-xs bg-[#1C1B1F] border border-zinc-800 text-foreground focus:ring-0 shadow-none px-2 rounded-md hover:bg-muted transition-colors">
                    <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: themeColor }} />
                      <SelectValue placeholder="Status" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-hs-main border-border text-foreground rounded-md">
                    <SelectItem value="backlog">Backlog</SelectItem>
                    <SelectItem value="todo">Todo</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Editable Title */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Title</span>
                <input 
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={async () => {
                    if (!selectedTask || editedTitle.trim() === "" || editedTitle === selectedTask.title) return;
                    try {
                      const updated = await updateTask(selectedTask.id, { title: editedTitle });
                      setSelectedTask(updated);
                      updateTaskInStore(updated);
                      toast.success("Title updated");
                    } catch (err) {
                      toast.error("Failed to update title");
                      setEditedTitle(selectedTask.title);
                    }
                  }}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                  className="text-lg font-medium bg-transparent border-none text-foreground focus:outline-none focus:ring-1 focus:ring-border rounded px-1 -ml-1 hover:bg-muted/20 transition-colors w-full cursor-text"
                />
              </div>

              {/* Description Section */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Description</span>
                <textarea
                  value={selectedTask?.description || ""}
                  onChange={(e) => {
                    if (!selectedTask) return;
                    setSelectedTask({ ...selectedTask, description: e.target.value });
                  }}
                  onBlur={async (e) => {
                    if (!selectedTask || e.target.value === selectedTask.description) return;
                    try {
                      const updated = await updateTask(selectedTask.id, { description: e.target.value });
                      setSelectedTask(updated);
                      updateTaskInStore(updated);
                      toast.success("Description updated");
                    } catch (err) {
                      toast.error("Failed to update description");
                    }
                  }}
                  placeholder="Add a detailed description..."
                  className="w-full min-h-[80px] bg-hs-card border border-border/50 rounded-md p-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 resize-none"
                />
              </div>

              {/* Metadata Table */}
              <div className="flex flex-col text-[13px]">
                <MetadataRow label="Owner">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5 border border-border/50">
                      <AvatarFallback className={cn("text-[9px] font-semibold uppercase", getAvatarColorClass(selectedTask?.assigneeInitials || ""))}>
                        {selectedTask?.assigneeInitials || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <select
                      value={selectedTask?.assigneeId || ""}
                      onChange={async (e) => {
                        const newOwnerId = e.target.value;
                        if (!newOwnerId || !selectedTask) return;
                        try {
                          await changeTaskOwner(selectedTask.id, newOwnerId);
                          toast.success("Owner changed successfully");
                          const ownerMember = projectMembers.find(m => m.userId === newOwnerId);
                          if (ownerMember) {
                            const updatedTask = {
                              ...selectedTask,
                              assigneeId: newOwnerId,
                              assigneeName: ownerMember.fullName,
                              assigneeInitials: toInitials(ownerMember.fullName)
                            };
                            // Update local detail panel state
                            setSelectedTask(updatedTask);
                            // Sync to global Zustand store so board cards update immediately
                            updateTaskInStore(updatedTask);
                          }
                          fetchAssigneesAndMembers(selectedTask.id);
                        } catch (err) {
                          toast.error("Failed to change owner");
                        }
                      }}
                      className="bg-transparent border-none text-foreground outline-none text-xs cursor-pointer font-medium hover:underline bg-[#1B1B1D]"
                    >
                      <option value="" disabled className="bg-[#1B1B1D]">Unassigned</option>
                      {projectMembers.map((m) => (
                        <option key={m.id} value={m.userId} className="bg-[#1B1B1D]">
                          {m.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                </MetadataRow>
                
                <MetadataRow label="Collaborators">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {assignees.filter(a => a.role !== 'OWNER').map((assignee) => {
                      const initials = toInitials(assignee.fullName);
                      return (
                        <div key={assignee.id} className="group relative flex items-center bg-hs-card border border-border/50 rounded-full pl-1.5 pr-2 py-0.5 text-xs gap-1.5 hover:bg-muted/30">
                          <Avatar className="h-4.5 w-4.5 border border-border/50">
                            <AvatarFallback className={cn("text-[8px] font-semibold", getAvatarColorClass(initials))}>
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[11px] text-zinc-300 font-medium">{assignee.fullName}</span>
                          <span className="text-[9px] text-zinc-500 uppercase tracking-wider">{assignee.role.toLowerCase()}</span>
                          <button
                            onClick={async () => {
                              if (!selectedTask) return;
                              try {
                                await removeTaskAssignee(selectedTask.id, assignee.userId);
                                toast.success("Assignee removed");
                                fetchAssigneesAndMembers(selectedTask.id);
                              } catch (err) {
                                toast.error("Failed to remove assignee");
                              }
                            }}
                            className="text-zinc-500 hover:text-red-400 font-bold ml-1 text-[10px]"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                    
                    {selectedTask && (
                      <div className="relative flex items-center">
                        <select
                          value=""
                          onChange={async (e) => {
                            const val = e.target.value;
                            if (!val) return;
                            const [userId, role] = val.split(":");
                            try {
                              await addTaskAssignee(selectedTask.id, userId, role);
                              toast.success("Assignee added");
                              fetchAssigneesAndMembers(selectedTask.id);
                            } catch (err) {
                              toast.error("Failed to add assignee");
                            }
                          }}
                          className="bg-zinc-800 text-zinc-400 border border-zinc-700/50 rounded-full px-2 py-0.5 text-[10px] outline-none cursor-pointer hover:bg-zinc-700 transition-colors"
                        >
                          <option value="">+ Add</option>
                          {projectMembers
                            .filter(m => !assignees.some(a => a.userId === m.userId))
                            .map((m) => (
                              <optgroup key={m.id} label={m.fullName} className="bg-[#1B1B1D]">
                                <option value={`${m.userId}:COLLABORATOR`} className="bg-[#1B1B1D]">As Collaborator</option>
                                <option value={`${m.userId}:REVIEWER`} className="bg-[#1B1B1D]">As Reviewer</option>
                              </optgroup>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                </MetadataRow>

                <MetadataRow label="Priority">
                  <Select 
                    value={selectedTask?.priority?.toLowerCase() || "medium"}
                    onValueChange={async (val) => {
                      if (!selectedTask) return;
                      try {
                        const updated = await updateTask(selectedTask.id, { priority: val.toUpperCase() });
                        setSelectedTask(updated);
                        updateTaskInStore(updated);
                        toast.success("Priority updated");
                      } catch (err) {
                        toast.error("Failed to update priority");
                      }
                    }}
                  >
                    <SelectTrigger className="w-auto h-7 text-xs bg-[#1C1B1F] border border-zinc-800 text-foreground focus:ring-0 shadow-none px-2 rounded-md hover:bg-muted transition-colors">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-1.5 w-1.5 rounded-full" 
                          style={{ backgroundColor: PRIORITIES[selectedTask?.priority?.toLowerCase() as Priority] || PRIORITIES.normal }} 
                        />
                        <SelectValue placeholder="Priority" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-hs-main border-border text-foreground rounded-md">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </MetadataRow>

                <MetadataRow label="Due date">
                  <input
                    type="date"
                    value={selectedTask?.dueDate ? new Date(selectedTask.dueDate).toISOString().split('T')[0] : ""}
                    onChange={async (e) => {
                      if (!selectedTask) return;
                      const val = e.target.value;
                      try {
                        const updated = await updateTask(selectedTask.id, { 
                          dueDate: val ? new Date(val).toISOString() : undefined 
                        });
                        setSelectedTask(updated);
                        updateTaskInStore(updated);
                        toast.success("Due date updated");
                      } catch (err) {
                        toast.error("Failed to update due date");
                      }
                    }}
                    className="bg-[#1C1B1F] border border-zinc-800 text-foreground rounded-md px-2 py-1 text-xs focus:outline-none [color-scheme:dark]"
                  />
                </MetadataRow>

                <MetadataRow label="Created">
                  <span className="text-muted-foreground">
                    {selectedTask?.createdAt ? new Date(selectedTask.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "N/A"}
                  </span>
                </MetadataRow>

                <MetadataRow label="Sprint">
                  <span className="font-medium cursor-pointer hover:underline underline-offset-2 transition-all" style={{ color: themeColor }}>{displayTitle}</span>
                </MetadataRow>

                <MetadataRow label="Labels">
                  <input
                    type="text"
                    placeholder="e.g. frontend, bug"
                    defaultValue={selectedTask?.labels || ""}
                    onBlur={async (e) => {
                      if (!selectedTask || e.target.value === (selectedTask.labels || "")) return;
                      try {
                        const updated = await updateTask(selectedTask.id, { labels: e.target.value });
                        setSelectedTask(updated);
                        updateTaskInStore(updated);
                        toast.success("Labels updated");
                      } catch (err) {
                        toast.error("Failed to update labels");
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                    className="bg-[#1C1B1F] border border-zinc-800 text-foreground rounded-md px-2 py-1 text-xs focus:outline-none w-full"
                  />
                </MetadataRow>

                <MetadataRow label="Estimate">
                  <Select 
                    value={selectedTask?.points ? String(selectedTask.points) : "unestimated"}
                    onValueChange={async (val) => {
                      if (!selectedTask) return;
                      try {
                        const pts = val === "unestimated" ? undefined : Number(val);
                        const updated = await updateTask(selectedTask.id, { points: pts });
                        setSelectedTask(updated);
                        updateTaskInStore(updated);
                        toast.success("Estimate updated");
                      } catch (err) {
                        toast.error("Failed to update estimate");
                      }
                    }}
                  >
                    <SelectTrigger className="w-auto h-7 text-xs bg-[#1C1B1F] border border-zinc-800 text-foreground focus:ring-0 shadow-none px-2 rounded-md hover:bg-muted transition-colors">
                      <SelectValue placeholder="Estimate" />
                    </SelectTrigger>
                    <SelectContent className="bg-hs-main border-border text-foreground rounded-md">
                      <SelectItem value="unestimated">Unestimated</SelectItem>
                      <SelectItem value="1">1 point</SelectItem>
                      <SelectItem value="2">2 points</SelectItem>
                      <SelectItem value="3">3 points</SelectItem>
                      <SelectItem value="5">5 points</SelectItem>
                      <SelectItem value="8">8 points</SelectItem>
                    </SelectContent>
                  </Select>
                </MetadataRow>
              </div>

              {/* GitHub Section */}
              <div className="mt-2 flex flex-col gap-3">
                <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Development</span>
                <div className="flex flex-col bg-[#272629]/50 rounded-md border border-zinc-800/50 p-3 gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <GitPullRequest className="h-4 w-4 text-emerald-500" strokeWidth={1.5} />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-foreground">PR #82</span>
                          <span className="bg-emerald-500/10 text-emerald-500 text-[10px] px-1 rounded-sm border-none font-medium h-4 flex items-center">OPEN</span>
                        </div>
                        <span className="text-xs text-muted-foreground">feat/stomp-broadcast</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-6 text-zinc-500">
                    <GitCommit className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span className="font-mono text-[11px]">a4f2e91</span>
                    <span className="text-[11px] text-zinc-400 truncate">Add STOMP broker config</span>
                  </div>
                </div>
              </div>

              {/* Activity Section */}
              <div className="mt-2 flex flex-col gap-4">
                <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Activity</span>
                <div className="relative pl-7 flex flex-col gap-6">
                  <div className="absolute left-3 top-2 bottom-0 w-[1px] bg-zinc-800" />
                  <div className="relative flex flex-col gap-1">
                    <Avatar className="absolute -left-7 top-0 h-6 w-6 ring-4 ring-[#1B1B1D]">
                      <AvatarFallback className={cn("text-[9px] font-semibold", getAvatarColorClass("DK"))}>DK</AvatarFallback>
                    </Avatar>
                    <div className="flex items-start justify-between">
                      <p className="text-xs text-zinc-300 leading-tight">
                        <span className="font-semibold text-white">David K.</span> identified the leak in the Hike config
                      </p>
                      <span className="text-[10px] text-zinc-500 shrink-0 ml-4">2d ago</span>
                    </div>
                  </div>

                  <div className="relative flex flex-col gap-1">
                    <Avatar className="absolute -left-7 top-0 h-6 w-6 ring-4 ring-[#1B1B1D]">
                      <AvatarFallback className={cn("text-[9px] font-semibold", getAvatarColorClass("SM"))}>SM</AvatarFallback>
                    </Avatar>
                    <div className="flex items-start justify-between">
                      <p className="text-xs text-zinc-300 leading-tight">
                        <span className="font-semibold text-white">Sarah M.</span> assigned the task to Alex R.
                      </p>
                      <span className="text-[10px] text-zinc-500 shrink-0 ml-4">3d ago</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </ScrollArea>

          {/* Comment Input */}
          <div className="p-4 bg-hs-nav border-t border-border/50 shrink-0">
            <div className="relative flex items-center">
              <input 
                type="text" 
                placeholder="Type a comment..." 
                className="w-full bg-hs-card border border-border/50 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 transition-all pr-10"
                style={{ "--tw-ring-color": `${themeColor}80` } as React.CSSProperties}
              />
              <button className="absolute right-2 h-6 w-6 flex items-center justify-center text-white rounded hover:opacity-90 transition-opacity" style={{ backgroundColor: themeColor }}>
                <ArrowRight strokeWidth={2} className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* --- CREATE TASK MODAL --- */}
      <CreateTaskModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        projectId={currentProject?.id || ""} 
        onSuccess={refresh}
        defaultStatus={defaultStatus}
      />
    </div>
  );
}

// --- SUB-COMPONENTS ---

function TaskCard({ 
  task, 
  isMuted, 
  onClick, 
  themeColor,
  onDragStart,
  onDelete
}: { 
  task: TaskResponse; 
  isMuted?: boolean; 
  onClick: () => void; 
  themeColor: string;
  onDragStart?: (e: React.DragEvent) => void;
  onDelete: () => void;
}) {
  const isDone = isMuted;

  return (
    <div 
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
      className={cn(
        "group relative flex flex-col gap-2.5 bg-hs-card p-3 rounded-md border border-border/50 hover:bg-muted/20 cursor-grab active:cursor-grabbing transition-all hover:scale-[1.01] duration-150",
        isDone && "opacity-50"
      )}
      style={task.status === "IN_PROGRESS" ? { borderLeftWidth: "2px", borderLeftColor: themeColor } : {}}
    >
      {/* Row 1: Priority & ID */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div 
            className="h-1 w-1 rounded-full shrink-0" 
            style={{ backgroundColor: PRIORITIES[task.priority.toLowerCase() as Priority] || PRIORITIES.normal }} 
          />
          <span className="font-mono text-[10px] text-zinc-500 tracking-tight">
            {task.taskIdentifier || task.id.slice(0, 8)}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              onClick={(e) => e.stopPropagation()} 
              className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center text-zinc-600 hover:text-zinc-400 transition-all rounded"
            >
              <MoreHorizontal strokeWidth={1.5} className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-hs-card border-border text-foreground">
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }} 
              className="focus:bg-muted focus:text-foreground"
            >
              Edit Task
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }} 
              className="focus:bg-muted text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Row 2: Title */}
      <p className={`text-sm leading-snug font-medium line-clamp-2 overflow-hidden text-ellipsis ${isDone ? 'line-through text-muted-foreground/60' : 'text-foreground'}`}>
        {task.title}
      </p>

      {/* Row 3: Labels */}
      {task.labels && (
        <div className="flex flex-wrap gap-1.5">
          {(typeof task.labels === 'string' ? task.labels.split(',') : task.labels).map(l => l.trim()).filter(Boolean).slice(0, 2).map(label => (
            <Badge key={label} className="bg-muted/50 text-muted-foreground border border-border/50 h-5 px-1.5 py-0.5 font-normal text-xs rounded-sm hover:bg-muted shadow-none">
              {label}
            </Badge>
          ))}
          {(typeof task.labels === 'string' ? task.labels.split(',') : task.labels).filter(l => l.trim()).length > 2 && (
            <Badge className="bg-zinc-800 text-zinc-400 border border-zinc-700 h-5 px-1.5 py-0.5 font-normal text-xs rounded-sm hover:bg-zinc-800 shadow-none">
              +{(typeof task.labels === 'string' ? task.labels.split(',') : task.labels).filter(l => l.trim()).length - 2} more
            </Badge>
          )}
        </div>
      )}

      {/* Row 4: Bottom Metadata */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-3">
          {task.dueDate && (
            <div className="flex items-center gap-1 text-[10px] text-zinc-500">
              <Calendar strokeWidth={1.5} className="h-3 w-3" />
              <span className="font-medium">{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </div>
          )}
          {/* PR Info (Mocked if not in API) */}
          {(task as any).pr && (
            <div className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-emerald-500 transition-colors">
              <GitPullRequest strokeWidth={1.5} className="h-3 w-3" />
              <span className="font-mono">{(task as any).pr}</span>
            </div>
          )}
        </div>

        {/* Assignee Avatar - Positioned Bottom Right */}
        <div className="absolute bottom-3 right-3 shrink-0">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-6 w-6 rounded-full border border-border/40 shrink-0">
                  <AvatarFallback className={cn("text-xs font-semibold", getAvatarColorClass(task.assigneeInitials || ""))}>{task.assigneeInitials}</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent className="bg-black text-[10px] border-zinc-800">{task.assigneeName || "Unassigned"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}

function MetadataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center py-2.5">
      <span className="w-28 shrink-0 text-zinc-500 font-normal">{label}</span>
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
