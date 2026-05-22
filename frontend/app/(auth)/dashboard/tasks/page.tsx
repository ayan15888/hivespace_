"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  X,
  Loader2,
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
  SelectValue,
} from "@/components/ui/select";
import { cn, getAvatarColorClass } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { createTask, deleteTask, TaskResponse } from "@/lib/api/tasks";
import { useTaskStore } from "@/store/taskStore";
import { formatTaskDueLabel, isTaskAssignedToUser } from "@/lib/taskUtils";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import { CreateTaskModal } from "@/components/features/tasks/CreateTaskModal";

const TABS = ["All", "Today", "This Week", "Overdue", "Completed"];

const PRIORITIES: Record<string, string> = {
  urgent: "#E24B4A",
  high: "#EF9F27",
  medium: "#71717A",
  normal: "#71717A",
  low: "#71717A",
};

function toDisplayPriority(priority: string): "urgent" | "high" | "normal" {
  const p = priority.toLowerCase();
  if (p === "urgent") return "urgent";
  if (p === "high") return "high";
  return "normal";
}

export default function MyTasksPage() {
  const { user } = useAuth();
  const { projects } = useProjects();
  const { tasks, loading, fetchTasks } = useTaskStore();
  const removeTaskFromStore = useTaskStore((s) => s.removeTask);

  const [activeTab, setActiveTab] = useState("All");
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [quickAddGroup, setQuickAddGroup] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const myTasks = useMemo(() => {
    if (!user?.id) return [];
    return tasks.filter((t) => isTaskAssignedToUser(t, user.id));
  }, [tasks, user?.id]);

  const filteredTasks = useMemo(() => {
    return myTasks.filter((t) => {
      const dueLabel = formatTaskDueLabel(t.dueDate);
      const isDone = String(t.status).toUpperCase() === "DONE";
      if (activeTab === "Completed") return isDone;
      if (activeTab === "Today") return dueLabel === "Today" && !isDone;
      if (activeTab === "Overdue") return dueLabel === "Overdue" && !isDone;
      if (activeTab === "This Week") {
        if (isDone) return false;
        if (dueLabel === "Today" || dueLabel === "Tomorrow") return true;
        return dueLabel.includes(",") || dueLabel.includes(" ");
      }
      return !isDone;
    });
  }, [myTasks, activeTab]);

  const projectGroups = useMemo(() => {
    const names = new Set(filteredTasks.map((t) => t.projectName).filter(Boolean));
    return Array.from(names).sort();
  }, [filteredTasks]);

  useEffect(() => {
    setExpandedGroups(projectGroups);
  }, [projectGroups.join(",")]);

  const groupedTasks = useMemo(() => {
    return projectGroups.reduce(
      (acc, projectName) => {
        acc[projectName] = filteredTasks.filter((t) => t.projectName === projectName);
        return acc;
      },
      {} as Record<string, TaskResponse[]>
    );
  }, [filteredTasks, projectGroups]);

  const todayTasks = filteredTasks.filter(
    (t) => formatTaskDueLabel(t.dueDate) === "Today"
  );

  const toggleGroup = (projectName: string) => {
    setExpandedGroups((prev) =>
      prev.includes(projectName)
        ? prev.filter((p) => p !== projectName)
        : [...prev, projectName]
    );
  };

  const handleSelectTask = (id: string, checked: boolean) => {
    setSelectedTaskIds((prev) =>
      checked ? [...prev, id] : prev.filter((t) => t !== id)
    );
  };

  const clearSelection = () => setSelectedTaskIds([]);

  const handleQuickAdd = useCallback(
    async (projectName: string) => {
      const title = quickAddTitle.trim();
      if (!title) {
        setQuickAddGroup(null);
        return;
      }

      const project = projects.find((p) => p.name === projectName);
      if (!project) {
        toast.error("Project not found");
        setQuickAddGroup(null);
        setQuickAddTitle("");
        return;
      }

      try {
        await createTask(project.id, {
          title,
          status: "TODO",
          priority: "MEDIUM",
        });
        toast.success("Task created");
        await fetchTasks();
        setQuickAddTitle("");
        setQuickAddGroup(null);
      } catch {
        toast.error("Failed to create task");
      }
    },
    [quickAddTitle, projects, fetchTasks]
  );

  const handleBulkDelete = async () => {
    if (selectedTaskIds.length === 0) return;
    try {
      await Promise.all(selectedTaskIds.map((id) => deleteTask(id)));
      selectedTaskIds.forEach((id) => removeTaskFromStore(id));
      toast.success("Tasks deleted");
      clearSelection();
      await fetchTasks();
    } catch {
      toast.error("Failed to delete some tasks");
    }
  };

  const projectColor = (name: string) => {
    const p = projects.find((pr) => pr.name === name);
    return p?.color ? `bg-[${p.color}]` : "bg-violet-500";
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
      <header className="sticky top-0 z-10 flex h-auto min-h-[44px] shrink-0 flex-col bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="flex h-11 items-center justify-between px-6">
          <div className="flex flex-col">
            <h1 className="text-lg font-medium text-foreground">My Tasks</h1>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {loading ? "Loading…" : `${myTasks.length} tasks across ${projectGroups.length} projects`}
            </span>
          </div>

          <nav className="flex items-center gap-6">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative py-3.5 text-sm font-medium transition-colors",
                  activeTab === tab
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 h-[2px] w-full bg-primary" />
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              New Task
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-md"
            >
              <SlidersHorizontal strokeWidth={1.5} className="h-4 w-4" />
            </Button>
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
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-md"
            >
              <ArrowUpDown strokeWidth={1.5} className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-hs-main p-6 pt-4 pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : activeTab === "Overdue" && filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <CheckCircle className="h-12 w-12 text-zinc-700" strokeWidth={1.5} />
            <div className="text-center">
              <h3 className="text-sm font-medium text-muted-foreground">No overdue tasks</h3>
              <p className="text-xs text-muted-foreground/60 mt-1">You&apos;re all caught up!</p>
            </div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-sm text-muted-foreground">No tasks assigned to you yet.</p>
            <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
              Create a task
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {todayTasks.length > 0 && activeTab !== "Completed" && (
              <section className="flex flex-col border-l-2 border-amber-500/80 pl-4 py-1">
                <h2 className="text-[10px] font-bold text-amber-500/80 tracking-widest uppercase mb-3 px-2">
                  Due Today
                </h2>
                <div className="flex flex-col">
                  {todayTasks.map((task) => (
                    <TaskRow
                      key={`pinned-${task.id}`}
                      task={task}
                      selected={selectedTaskIds.includes(task.id)}
                      onSelect={(checked) => handleSelectTask(task.id, checked)}
                    />
                  ))}
                </div>
              </section>
            )}

            {projectGroups.map((projectName) => {
              const groupTasks = groupedTasks[projectName] || [];
              const isExpanded = expandedGroups.includes(projectName);

              return (
                <section key={projectName} className="flex flex-col">
                  <div
                    onClick={() => toggleGroup(projectName)}
                    className="flex items-center gap-2 py-2 cursor-pointer group/header px-2"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        projectColor(projectName)
                      )}
                    />
                    <span className="text-sm font-semibold text-foreground">
                      {projectName}
                    </span>
                    <Badge className="bg-muted text-muted-foreground border-none font-medium ml-2 px-1.5 h-4.5 rounded-full text-[10px]">
                      {groupTasks.length}
                    </Badge>
                  </div>

                  {isExpanded && (
                    <div className="flex flex-col gap-0">
                      {groupTasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          selected={selectedTaskIds.includes(task.id)}
                          onSelect={(checked) => handleSelectTask(task.id, checked)}
                        />
                      ))}

                      {quickAddGroup === projectName ? (
                        <div className="flex items-center h-11 px-2 gap-3 bg-zinc-800/20 rounded-md py-2">
                          <Checkbox disabled className="opacity-30 border-zinc-600" />
                          <div className="h-1 w-1 rounded-full bg-zinc-500 shrink-0" />
                          <span className="text-xs text-zinc-600 w-16 shrink-0 underline decoration-dotted">
                            NEW
                          </span>
                          <input
                            autoFocus
                            placeholder="Task title..."
                            className="flex-1 bg-transparent border-none text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                            value={quickAddTitle}
                            onChange={(e) => setQuickAddTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void handleQuickAdd(projectName);
                              if (e.key === "Escape") setQuickAddGroup(null);
                            }}
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => setQuickAddGroup(projectName)}
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
              <ActionButton
                icon={Trash2}
                label="Delete"
                className="text-red-400 hover:text-red-300"
                onClick={handleBulkDelete}
              />
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

      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchTasks()}
      />
    </div>
  );
}

function TaskRow({
  task,
  selected,
  onSelect,
}: {
  task: TaskResponse;
  selected: boolean;
  onSelect: (checked: boolean) => void;
}) {
  const dueLabel = formatTaskDueLabel(task.dueDate);
  const isOverdue = dueLabel === "Overdue";
  const isToday = dueLabel === "Today";
  const isDone = String(task.status).toUpperCase() === "DONE";
  const displayPriority = toDisplayPriority(String(task.priority));
  const initials =
    task.assigneeInitials ||
    (task.assigneeName
      ? task.assigneeName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "U");

  return (
    <div
      className={cn(
        "flex items-center h-11 px-2 gap-3 transition-colors rounded-md group py-2",
        selected ? "bg-[#7C5CFC]/5" : "hover:bg-zinc-800/40"
      )}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={(checked) => onSelect(!!checked)}
        className={cn(
          "border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"
        )}
      />

      <div
        className="h-1 w-1 rounded-full shrink-0"
        style={{
          backgroundColor: PRIORITIES[displayPriority] || PRIORITIES.normal,
        }}
      />

      <span className="text-xs text-zinc-500 w-16 shrink-0">
        {task.taskIdentifier || task.id.slice(0, 8)}
      </span>

      <span
        className={cn(
          "text-sm flex-1 truncate",
          isDone
            ? "line-through text-muted-foreground/60"
            : "text-foreground font-medium"
        )}
      >
        {task.title}
      </span>

      <Badge className="bg-muted text-muted-foreground border border-border/50 font-normal h-5 px-1.5 rounded-sm text-[10px] hidden sm:flex hover:bg-muted">
        {task.projectName}
      </Badge>

      <div
        className={cn(
          "flex items-center gap-1 text-[11px] w-20 justify-end transition-colors",
          isToday
            ? "text-amber-400 font-medium"
            : isOverdue
              ? "text-red-500"
              : "text-zinc-500"
        )}
      >
        {isOverdue && <AlertCircle className="h-3 w-3" />}
        {dueLabel}
      </div>

      <Avatar className="h-6 w-6 border border-border/50 shrink-0">
        <AvatarFallback
          className={cn(
            "text-[9px] font-semibold",
            getAvatarColorClass(initials)
          )}
        >
          {initials}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  className,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn(
        "h-8 gap-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 px-3 rounded-md",
        className
      )}
    >
      <Icon strokeWidth={1.5} className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
