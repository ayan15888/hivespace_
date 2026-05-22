"use client";

import { useState } from "react";
import { 
  ChevronDown, 
  ChevronRight,
  SlidersHorizontal, 
  LayoutList, 
  ArrowUpDown,
  Plus,
  AlertCircle,
  CheckCircle,
  UserPlus,
  Flag,
  FolderInput,
  Trash2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { cn, getAvatarColorClass } from "@/lib/utils";

// --- TYPES & MOCK DATA ---

interface Task {
  id: string;
  title: string;
  priority: "urgent" | "high" | "normal";
  project: string;
  workspace: string;
  sprint?: string;
  dueDate: string;
  assignee: { name: string; initials: string };
  completed?: boolean;
}

const INITIAL_TASKS: Task[] = [
  // GROUP: Frontend Redesign
  { id: "HS-044", title: "Implement new NavRail component", priority: "urgent", project: "Frontend Redesign", workspace: "Engineering", sprint: "Sprint 3", dueDate: "Today", assignee: { name: "Rahul", initials: "RH" } },
  { id: "HS-052", title: "Fix layout shift on Workspace switcher", priority: "high", project: "Frontend Redesign", workspace: "Engineering", sprint: "Sprint 3", dueDate: "Tomorrow", assignee: { name: "Rahul", initials: "RH" } },
  { id: "HS-058", title: "Add keyboard shortcut ⌘K for command palette", priority: "normal", project: "Frontend Redesign", workspace: "Engineering", sprint: "Sprint 3", dueDate: "Apr 18", assignee: { name: "Rahul", initials: "RH" } },
  
  // GROUP: Sprint 3
  { id: "HS-041", title: "Invite token expiry edge cases", priority: "high", project: "Sprint 3", workspace: "Engineering", sprint: "Sprint 3", dueDate: "Apr 12", assignee: { name: "Rahul", initials: "RH" } },
  { id: "HS-039", title: "GitHub webhook HMAC validation", priority: "normal", project: "Sprint 3", workspace: "Engineering", sprint: "Sprint 3", dueDate: "Apr 14", assignee: { name: "Rahul", initials: "RH" } },
  
  // GROUP: Planning
  { id: "HS-061", title: "Draft Q3 analytics report", priority: "normal", project: "Planning", workspace: "Product", dueDate: "Oct 24", assignee: { name: "Rahul", initials: "RH" } },
  { id: "HS-065", title: "Review copy for landing page", priority: "normal", project: "Marketing", workspace: "Marketing", dueDate: "Oct 26", assignee: { name: "Rahul", initials: "RH" } },
];

const PROJECTS = [
  { name: "Frontend Redesign", workspace: "Engineering", color: "bg-blue-500" },
  { name: "Sprint 3", workspace: "Engineering", color: "bg-violet-500" },
  { name: "Planning", workspace: "Product", color: "bg-emerald-500" },
  { name: "Marketing", workspace: "Marketing", color: "bg-amber-500" },
];

const TABS = ["All", "Today", "This Week", "Overdue", "Completed"];

const PRIORITIES = {
  urgent: "#E24B4A",
  high: "#EF9F27",
  normal: "#71717A", // zinc-500
};

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [activeTab, setActiveTab] = useState("All");
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(PROJECTS.map(p => p.name));
  const [quickAddGroup, setQuickAddGroup] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");

  const toggleGroup = (projectName: string) => {
    setExpandedGroups(prev => 
      prev.includes(projectName) ? prev.filter(p => p !== projectName) : [...prev, projectName]
    );
  };

  const handleSelectTask = (id: string, checked: boolean) => {
    setSelectedTaskIds(prev => checked ? [...prev, id] : prev.filter(t => t !== id));
  };

  const clearSelection = () => setSelectedTaskIds([]);

  const todayTasks = tasks.filter(t => t.dueDate === "Today");

  const groupedTasks = PROJECTS.reduce((acc, project) => {
    const projectTasks = tasks.filter(t => t.project === project.name);
    if (projectTasks.length > 0) {
      acc[project.name] = projectTasks;
    }
    return acc;
  }, {} as Record<string, Task[]>);

  const handleQuickAdd = (projectName: string) => {
    if (!quickAddTitle.trim()) {
      setQuickAddGroup(null);
      return;
    }
    const newTask: Task = {
      id: `HS-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      title: quickAddTitle,
      priority: "normal",
      project: projectName,
      workspace: PROJECTS.find(p => p.name === projectName)?.workspace || "General",
      dueDate: "Later",
      assignee: { name: "Rahul", initials: "RH" }
    };
    setTasks(prev => [...prev, newTask]);
    setQuickAddTitle("");
    setQuickAddGroup(null);
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
      
      {/* --- TOP BAR --- */}
      <header className="sticky top-0 z-10 flex h-auto min-h-[44px] shrink-0 flex-col bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="flex h-11 items-center justify-between px-6">
          <div className="flex flex-col">
            <h1 className="text-lg font-medium text-foreground">My Tasks</h1>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">32 tasks across 4 projects</span>
          </div>

          <nav className="flex items-center gap-6">
            {TABS.map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative py-3.5 text-sm font-medium transition-colors",
                  activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
                {activeTab === tab && <div className="absolute bottom-0 left-0 h-[2px] w-full bg-primary" />}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-md">
              <SlidersHorizontal strokeWidth={1.5} className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Select defaultValue="project">
                <SelectTrigger className="h-8 bg-muted/50 border-none text-xs text-muted-foreground w-auto gap-2 px-3 rounded-md">
                   <LayoutList className="h-3.5 w-3.5" />
                   <span className="text-muted-foreground/60">Group by:</span>
                   <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-hs-card border-border text-foreground/80">
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="dueDate">Due Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-md">
              <ArrowUpDown strokeWidth={1.5} className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* --- CONTENT --- */}
      <main className="flex-1 overflow-y-auto bg-hs-main p-6 pt-4 pb-20">
        
        {activeTab === "Overdue" && tasks.every(t => t.dueDate !== "Overdue") ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <CheckCircle className="h-12 w-12 text-zinc-700" strokeWidth={1.5} />
            <div className="text-center">
              <h3 className="text-sm font-medium text-muted-foreground">No overdue tasks</h3>
              <p className="text-xs text-muted-foreground/60 mt-1">You&apos;re all caught up!</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            
            {/* PINNED: DUE TODAY */}
            <section className="flex flex-col border-l-2 border-amber-500/80 pl-4 py-1">
              <h2 className="text-[10px] font-bold text-amber-500/80 tracking-widest uppercase mb-3 px-2">Due Today</h2>
              <div className="flex flex-col">
                {todayTasks.map(task => (
                  <TaskRow 
                    key={`pinned-${task.id}`} 
                    task={task} 
                    selected={selectedTaskIds.includes(task.id)}
                    onSelect={(checked) => handleSelectTask(task.id, checked)}
                  />
                ))}
              </div>
            </section>

            {/* PROJECT GROUPS */}
            {PROJECTS.map(project => {
              const groupTasks = groupedTasks[project.name] || [];
              const isExpanded = expandedGroups.includes(project.name);
              
              return (
                <section key={project.name} className="flex flex-col">
                  {/* Group Header */}
                  <div 
                    onClick={() => toggleGroup(project.name)}
                    className="flex items-center gap-2 py-2 cursor-pointer group/header px-2"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <div className={cn("h-2 w-2 rounded-full shrink-0", project.color)} />
                    <span className="text-sm font-semibold text-foreground">{project.name}</span>
                    <span className="text-xs text-muted-foreground ml-1">· {project.workspace}</span>
                    <Badge className="bg-muted text-muted-foreground border-none font-medium ml-2 px-1.5 h-4.5 rounded-full text-[10px]">
                      {groupTasks.length}
                    </Badge>
                  </div>

                  {/* Group Content */}
                  {isExpanded && (
                    <div className="flex flex-col gap-0">
                      {groupTasks.map(task => (
                        <TaskRow 
                          key={task.id} 
                          task={task} 
                          selected={selectedTaskIds.includes(task.id)}
                          onSelect={(checked) => handleSelectTask(task.id, checked)}
                        />
                      ))}
                      
                      {/* Quick Add */}
                      {quickAddGroup === project.name ? (
                        <div className="flex items-center h-11 px-2 gap-3 bg-zinc-800/20 rounded-md py-2">
                          <Checkbox disabled className="opacity-30 border-zinc-600" />
                          <div className="h-1 w-1 rounded-full bg-zinc-500 shrink-0" />
                          <span className=" text-xs text-zinc-600 w-16 shrink-0 underline decoration-dotted">NEW</span>
                          <input 
                            autoFocus
                            placeholder="Task title..."
                            className="flex-1 bg-transparent border-none text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                            value={quickAddTitle}
                            onChange={e => setQuickAddTitle(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") handleQuickAdd(project.name);
                              if (e.key === "Escape") setQuickAddGroup(null);
                            }}
                          />
                        </div>
                      ) : (
                        <button 
                          onClick={() => setQuickAddGroup(project.name)}
                          className="flex items-center h-9 px-10 gap-2 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors group/add"
                        >
                          <Plus className="h-3 w-3 opacity-40 group-hover/add:opacity-100" />
                          Add task
                        </button>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>

      {/* --- BULK ACTION BAR --- */}
      {selectedTaskIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-4 bg-hs-card border border-border rounded-lg px-4 py-2 shadow-2xl shadow-black/20">
            <span className="text-sm font-medium text-foreground pr-4 border-r border-border">
              {selectedTaskIds.length} tasks selected
            </span>
            <div className="flex items-center gap-1">
              <ActionButton icon={UserPlus} label="Assign" />
              <ActionButton icon={Flag} label="Priority" />
              <ActionButton icon={FolderInput} label="Move" />
              <ActionButton icon={Trash2} label="Delete" className="text-red-400 hover:text-red-300" />
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={clearSelection}
              className="h-7 w-7 text-zinc-500 hover:text-white ml-2 rounded-md"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}

// --- HELPERS ---

function TaskRow({ task, selected, onSelect }: { task: Task; selected: boolean; onSelect: (checked: boolean) => void }) {
  const isOverdue = task.dueDate === "Overdue" || (task.dueDate.includes("Apr") && parseInt(task.dueDate.split(" ")[1]) < 10);
  const isToday = task.dueDate === "Today";

  return (
    <div className={cn(
      "flex items-center h-11 px-2 gap-3 transition-colors rounded-md group py-2",
      selected ? "bg-[#7C5CFC]/5" : "hover:bg-zinc-800/40"
    )}>
      {/* Checkbox at the very left */}
      <Checkbox 
        checked={selected} 
        onCheckedChange={(checked) => onSelect(!!checked)} 
        className={cn(
          "border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"
        )}
      />
      
      {/* Priority Dot actual 4px circle */}
      <div 
        className="h-1 w-1 rounded-full shrink-0" 
        style={{ backgroundColor: PRIORITIES[task.priority] }} 
      />

      <span className=" text-xs text-zinc-500 w-16 shrink-0">{task.id}</span>
      
      <span className={cn(
        "text-sm flex-1 truncate",
        task.completed ? "line-through text-muted-foreground/60" : "text-foreground font-medium"
      )}>
        {task.title}
      </span>

      <Badge className="bg-muted text-muted-foreground border border-border/50 font-normal h-5 px-1.5 rounded-sm text-[10px] hidden sm:flex hover:bg-muted">
        {task.sprint || task.project} · Engineering
      </Badge>

      <div className={cn(
        "flex items-center gap-1 text-[11px] w-20 justify-end transition-colors",
        isToday ? "text-amber-400 font-medium" : isOverdue ? "text-red-500" : "text-zinc-500"
      )}>
        {isOverdue && <AlertCircle className="h-3 w-3" />}
        {task.dueDate}
      </div>

      {/* Assignee Avatar at far right */}
      <Avatar className="h-6 w-6 border border-border/50 shrink-0">
        <AvatarFallback className={cn("text-[9px] font-semibold", getAvatarColorClass(task.assignee.initials || task.assignee.name))}>
          {task.assignee.initials}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}

function ActionButton({ icon: Icon, label, className }: { icon: React.ElementType; label: string; className?: string }) {
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className={cn("h-8 gap-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 px-3 rounded-md", className)}
    >
      <Icon strokeWidth={1.5} className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
