"use client";

import { useState } from "react";
import { 
  ChevronRight, 
  SlidersHorizontal, 
  LayoutList, 
  PlusCircle,
  MoreHorizontal,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useParams } from "next/navigation";

import { cn, getAvatarColorClass } from "@/lib/utils";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { PROJECT_COLOR_MAP } from "@/lib/constants/colors";
import { motion, AnimatePresence } from "framer-motion";
import { 
  createTask,
  updateTaskStatus,
  deleteTask,
  TaskResponse
} from "@/lib/api/tasks";
import { columnNameToStatus, statusMatchesColumn } from "@/lib/taskUtils";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import { useTaskStore } from "@/store/taskStore";
import { CreateTaskModal } from "@/components/features/tasks/CreateTaskModal";

import { useBoardStore } from "./store";
import { TaskCard } from "./components/TaskCard";
import { TaskDetailSheet } from "./components/TaskDetailSheet";

const COLUMN_NAMES = ["Backlog", "Todo", "In Progress", "Review", "Done"];

export default function SprintThreeBoardPage() {
  const params = useParams();
  const { projects } = useProjects();
  const projectId = params?.projectSlug as string || "";

  const currentProject = projects.find(p => p.id === projectId);
  const themeColor = PROJECT_COLOR_MAP[currentProject?.color || ""] || "#7C5CFC";
  const displayTitle = currentProject?.name || "Project";

  // Zustand Store for project board local UI state
  const { 
    selectedTaskId, 
    setSelectedTaskId, 
    isCreateModalOpen, 
    setIsCreateModalOpen, 
    defaultStatus, 
    setDefaultStatus,
    sortByPriority,
    toggleSortByPriority
  } = useBoardStore();

  const { tasks, refresh } = useTasks(projectId);
  const updateTaskInStore = useTaskStore((state) => state.updateTask);
  const addTaskToStore = useTaskStore((state) => state.addTask);
  const removeTaskFromStore = useTaskStore((state) => state.removeTask);

  const [activeDragColumn, setActiveDragColumn] = useState<string | null>(null);
  const [quickAddColumn, setQuickAddColumn] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [quickAddLoading, setQuickAddLoading] = useState(false);

  // Derive selectedTask directly from store tasks list so it updates reactively
  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null;

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      toast.success("Task deleted successfully");
      removeTaskFromStore(taskId);
      if (selectedTaskId === taskId) {
        setSelectedTaskId(null);
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

  const handleNewTask = (status?: string) => {
    if (status) setDefaultStatus(status);
    setIsCreateModalOpen(true);
  };

  const PRIORITY_ORDER: Record<string, number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  // Group tasks by status
  const columns = COLUMN_NAMES.map(name => {
    let filteredTasks = tasks.filter(t => statusMatchesColumn(String(t.status), name));
    if (sortByPriority) {
      filteredTasks = [...filteredTasks].sort((a, b) => {
        const orderA = PRIORITY_ORDER[a.priority.toLowerCase()] || 0;
        const orderB = PRIORITY_ORDER[b.priority.toLowerCase()] || 0;
        return orderB - orderA;
      });
    }
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
            {["MV", "RK", "PL", "RS"].map((initials) => {
              const details = {
                "MV": { name: "Max Valenzuela", email: "max@hivespace.io" },
                "RK": { name: "Rajesh Kumar", email: "rajesh@hivespace.io" },
                "PL": { name: "Pierre Laurent", email: "pierre@hivespace.io" },
                "RS": { name: "Reid Smith", email: "reid@hivespace.io" },
              }[initials] || { name: initials, email: `${initials.toLowerCase()}@hivespace.io` };
              return (
                <Avatar key={initials} className={`h-6 w-6 ring-2 ring-background -ml-1.5 first:ml-0 border border-border/50`} username={details.name} email={details.email}>
                  <AvatarFallback className={cn("text-[9px] font-semibold", getAvatarColorClass(initials))}>{initials}</AvatarFallback>
                </Avatar>
              );
            })}
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
        {/* Sprint Progress Bar Container */}
        <div className="flex items-center justify-between px-8 py-5 shrink-0">
          <div className="flex flex-col gap-2.5 flex-1">
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

          {/* Sort Toggle Button */}
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <Button 
              onClick={toggleSortByPriority}
              className={cn(
                "h-8 text-xs gap-1.5 px-3 rounded-md border transition-all font-medium select-none cursor-pointer",
                sortByPriority 
                  ? "bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/15" 
                  : "bg-[#1C1B1F] text-muted-foreground border-zinc-800 hover:text-foreground hover:bg-muted"
              )}
            >
              <SlidersHorizontal strokeWidth={1.5} className="h-3.5 w-3.5" />
              {sortByPriority ? "High Priority First" : "Sort by Priority"}
            </Button>
          </div>
        </div>

        {/* --- KANBAN BOARD --- */}
        <ScrollArea className="flex-1 w-full whitespace-nowrap px-8 pb-8">
          <div className="flex gap-4 h-[calc(100vh-220px)]" style={{ width: 'max-content' }}>
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
                            onClick={() => setSelectedTaskId(task.id)} 
                            onDelete={() => handleDeleteTask(task.id)}
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
      <TaskDetailSheet 
        selectedTask={selectedTask}
        onClose={() => setSelectedTaskId(null)}
        projectId={projectId}
        themeColor={themeColor}
        displayTitle={displayTitle}
        onUpdateTask={updateTaskInStore}
        onDeleteTask={handleDeleteTask}
      />

      {/* --- CREATE TASK MODAL --- */}
      <CreateTaskModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        projectId={projectId} 
        onSuccess={refresh}
        defaultStatus={defaultStatus}
      />
    </div>
  );
}
