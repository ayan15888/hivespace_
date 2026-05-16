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

import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { PROJECT_COLOR_MAP } from "@/lib/constants/colors";
import { motion, AnimatePresence } from "framer-motion";
import { TaskResponse } from "@/lib/api/tasks";
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
  const projectSlug = params?.projectSlug as string || "";
  

  const currentProject = projects.find(p => p.slug === projectSlug || p.id === projectSlug);
  const themeColor = PROJECT_COLOR_MAP[currentProject?.color || ""] || "#7C5CFC";

  const displayTitle = currentProject?.name || projectSlug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const [selectedTask, setSelectedTask] = useState<TaskResponse | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState("Todo");

  const { tasks, refresh } = useTasks();

  const handleTaskClick = (task: TaskResponse) => {
    setSelectedTask(task);
    setEditedTitle(task.title);
  };

  const handleNewTask = (status?: string) => {
    if (status) setDefaultStatus(status);
    setIsCreateModalOpen(true);
  };

  // Group tasks by status
  const columns = COLUMN_NAMES.map(name => {
    const normalizedName = name.toLowerCase().replace(/\s+/g, '_');
    const filteredTasks = tasks.filter(t => {
      const taskStatus = t.status.toLowerCase();
      return taskStatus === normalizedName || taskStatus === name.toLowerCase();
    });
    
    return {
      name,
      tasks: filteredTasks,
      count: filteredTasks.length,
      accent: name === "In Progress",
      muted: name === "Done"
    };
  });

  return (
    <div className="flex h-screen flex-col bg-[#000000] text-[#E5E1E4] overflow-hidden font-sans">
      
      {/* --- TOP BREADCRUMB BAR --- */}
      <header className="sticky top-0 z-30 flex h-[44px] shrink-0 items-center justify-between border-b border-zinc-800/50 bg-[#000000]/80 px-6 backdrop-blur-sm">
        
        {/* Left: Breadcrumbs */}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs text-zinc-400">Hivespace</span>
          <span className="text-zinc-600">/</span>
          <span className="text-xs text-zinc-400">Engineering</span>
          <span className="text-zinc-600">/</span>
          <span className="text-xs font-medium text-white">{displayTitle}</span>
          
          <div className="ml-3 flex items-center rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400 font-medium">
            {displayTitle} · Apr 1–15
          </div>
        </div>

        {/* Center: Tabs */}
        <nav className="flex h-full items-center gap-6">
          <button className="flex h-full items-center px-1 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors">
            Overview
          </button>
          <button className="relative flex h-full items-center px-1 text-sm font-medium text-white">
            Board
            <div className="absolute bottom-0 left-0 h-[2px] w-full" style={{ backgroundColor: themeColor }} />
          </button>
          <button className="flex h-full items-center px-1 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors">
            List
          </button>
          <button className="flex h-full items-center px-1 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors">
            Timeline
          </button>
          <button className="flex h-full items-center px-1 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors">
            Backlog
          </button>
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center justify-end gap-2 flex-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-[#E5E1E4] hover:bg-zinc-800 rounded-md">
            <SlidersHorizontal strokeWidth={1.5} className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-[#E5E1E4] hover:bg-zinc-800 rounded-md">
            <LayoutList strokeWidth={1.5} className="h-3.5 w-3.5" />
          </Button>
          
          <div className="flex items-center ml-2 mr-2">
            {["MV", "RK", "PL", "RS"].map((initials, i) => (
              <Avatar key={initials} className={`h-6 w-6 ring-2 ring-[#000000] -ml-1.5 first:ml-0 bg-zinc-800 border border-zinc-700/50`}>
                <AvatarFallback className="bg-zinc-800 text-[9px] text-zinc-300 font-medium">{initials}</AvatarFallback>
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
      <div className="flex-1 flex flex-col min-h-0 bg-[#201F21]">
        
        {/* Sprint Progress Bar */}
        <div className="flex flex-col px-8 py-5 shrink-0 gap-2.5">
          <div className="flex items-baseline gap-3">
            <h1 className="text-sm font-medium text-[#E5E1E4]">{displayTitle}</h1>
            <span className="text-xs text-zinc-400">Apr 1 – Apr 15, 2026</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative h-1.5 flex-1 max-w-[400px] bg-zinc-700 rounded-full overflow-hidden">
              <div className="absolute top-0 left-0 h-full rounded-full transition-all" style={{ width: '68%', backgroundColor: themeColor }} />
            </div>
            <span className="text-[10px] font-medium text-zinc-400">17/25 tasks complete</span>
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
                  className="flex flex-col w-[280px] shrink-0 bg-[#1B1B1D] rounded-lg h-full overflow-hidden"
                >
                  
                  {/* Column Header */}
                  <div className="flex items-center justify-between p-3 shrink-0">
                    <div className="flex items-center">
                      <span className="text-sm font-medium" style={{ color: col.name === 'In Progress' ? themeColor : col.accent ? themeColor : '#E5E1E4' }}>
                        {col.name}
                      </span>
                      <span className="text-xs text-zinc-500 ml-2">{col.count}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-md"
                        onClick={() => handleNewTask(col.name)}
                      >
                        <Plus strokeWidth={1.5} className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-md">
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
                            themeColor={themeColor}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Add Column Button */}
            <button className="flex h-10 w-48 shrink-0 items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 text-xs text-zinc-500 hover:border-zinc-600 hover:text-zinc-400 transition-all mt-2.5">
              <Plus className="h-3.5 w-3.5" />
              <span>Add column</span>
            </button>
          </div>
          <ScrollBar orientation="horizontal" className="bg-zinc-900/50" />
        </ScrollArea>
      </div>

      {/* --- TASK DETAIL SHEET --- */}
      <Sheet open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <SheetContent side="right" className="w-[380px] p-0 bg-[#1B1B1D] border-l border-zinc-800/50 shadow-2xl flex flex-col gap-0 outline-none">
          <ScrollArea className="flex-1">
            <div className="p-6 flex flex-col gap-6">
              
              {/* Header Info */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-zinc-500 tracking-tight">{selectedTask?.id}</span>
                <Select defaultValue="in-progress">
                  <SelectTrigger className="w-auto h-7 text-xs bg-zinc-800/50 border-none text-[#E5E1E4] focus:ring-0 shadow-none px-2 rounded-md hover:bg-zinc-800 transition-colors">
                    <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: themeColor }} />
                      <SelectValue placeholder="Status" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-[#201F21] border-zinc-800 text-[#E5E1E4] rounded-md">
                    <SelectItem value="todo">Todo</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Editable Title */}
              <input 
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="text-lg font-medium bg-transparent border-none text-[#E5E1E4] focus:outline-none focus:ring-1 focus:ring-zinc-800 rounded px-1 -ml-1 hover:bg-zinc-800/20 transition-colors w-full cursor-text"
              />

              {/* Metadata Table */}
              <div className="flex flex-col text-[13px]">
                <MetadataRow label="Owner">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5 bg-zinc-800 border border-zinc-700/50">
                      <AvatarFallback className="text-[9px] uppercase">{selectedTask?.assigneeInitials}</AvatarFallback>
                    </Avatar>
                    <span className="text-[#E5E1E4]">{selectedTask?.assigneeName || "Unassigned"}</span>
                  </div>
                </MetadataRow>
                
                <MetadataRow label="Collaborators">
                  <div className="flex items-center">
                    {["RK", "PL"].map((initials, i) => (
                      <Avatar key={initials} className="h-5 w-5 ring-2 ring-[#1B1B1D] -ml-1.5 first:ml-0 bg-zinc-800 border border-zinc-700/50">
                        <AvatarFallback className="text-[8px] font-medium">{initials}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                </MetadataRow>

                <MetadataRow label="Priority">
                  <div className="flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${selectedTask?.priority === 'urgent' ? 'bg-[#E24B4A]' : 'bg-zinc-500'}`} />
                    <span className="text-[#E5E1E4] capitalize">{selectedTask?.priority}</span>
                  </div>
                </MetadataRow>

                <MetadataRow label="Due date">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Calendar className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
                    <span>{selectedTask?.dueDate || "None"}</span>
                  </div>
                </MetadataRow>

                <MetadataRow label="Sprint">
                  <span className="font-medium cursor-pointer hover:underline underline-offset-2 transition-all" style={{ color: themeColor }}>{displayTitle}</span>
                </MetadataRow>

                <MetadataRow label="Labels">
                  <div className="flex flex-wrap gap-1.5">
                    {(typeof selectedTask?.labels === 'string' ? selectedTask.labels.split(',') : selectedTask?.labels)?.map(label => label.trim()).filter(Boolean).map(label => (
                      <Badge key={label} className="bg-zinc-800 text-zinc-400 border-zinc-700/50 h-5 px-1.5 font-normal text-[10px] rounded-sm hover:bg-zinc-800">
                        {label}
                      </Badge>
                    ))}
                  </div>
                </MetadataRow>

                <MetadataRow label="Estimate">
                  <span className="text-[#E5E1E4]">{selectedTask?.points ? `${selectedTask.points} points` : "Unestimated"}</span>
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
                          <span className="font-mono text-xs text-[#E5E1E4]">PR #82</span>
                          <span className="bg-emerald-500/10 text-emerald-500 text-[10px] px-1 rounded-sm border-none font-medium h-4 flex items-center">OPEN</span>
                        </div>
                        <span className="text-xs text-zinc-400">feat/stomp-broadcast</span>
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
                      <AvatarFallback className="bg-zinc-800 text-[9px]">DK</AvatarFallback>
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
                      <AvatarFallback className="bg-zinc-800 text-[9px]">SM</AvatarFallback>
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
          <div className="p-4 bg-[#1B1B1D] border-t border-zinc-800/50 shrink-0">
            <div className="relative flex items-center">
              <input 
                type="text" 
                placeholder="Type a comment..." 
                className="w-full bg-[#272629] border border-zinc-800/50 rounded-md px-3 py-2 text-sm text-[#E5E1E4] placeholder:text-zinc-500 focus:outline-none focus:ring-1 transition-all pr-10"
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

function TaskCard({ task, isMuted, onClick, themeColor }: { task: TaskResponse; isMuted?: boolean; onClick: () => void; themeColor: string }) {
  const isDone = isMuted;

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group relative flex flex-col gap-2.5 bg-[#272629] p-3 rounded-md border border-zinc-800/50 hover:bg-zinc-700/20 cursor-pointer transition-all",
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
          <span className="font-mono text-[10px] text-zinc-500 tracking-tight">{task.id.slice(0, 8)}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center text-zinc-600 hover:text-zinc-400 transition-all rounded">
              <MoreHorizontal strokeWidth={1.5} className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#201F21] border-zinc-800 text-zinc-300">
            <DropdownMenuItem className="focus:bg-zinc-800 focus:text-white">Edit Task</DropdownMenuItem>
            <DropdownMenuItem className="focus:bg-zinc-800 focus:text-white text-red-400">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Row 2: Title */}
      <p className={`text-sm leading-snug font-medium line-clamp-2 overflow-hidden text-ellipsis ${isDone ? 'line-through text-zinc-500' : 'text-[#E5E1E4]'}`}>
        {task.title}
      </p>

      {/* Row 3: Labels */}
      {task.labels && (
        <div className="flex flex-wrap gap-1.5">
          {(typeof task.labels === 'string' ? task.labels.split(',') : task.labels).map(l => l.trim()).filter(Boolean).slice(0, 2).map(label => (
            <Badge key={label} className="bg-zinc-800 text-zinc-400 border border-zinc-700 h-5 px-1.5 py-0.5 font-normal text-xs rounded-sm hover:bg-zinc-800 shadow-none">
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
                <Avatar className={`h-6 w-6 rounded-full border-none ${ASSIGNEE_COLORS[task.assigneeInitials || ''] || 'bg-zinc-800'}`}>
                  <AvatarFallback className="bg-transparent text-white text-xs font-bold">{task.assigneeInitials}</AvatarFallback>
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
