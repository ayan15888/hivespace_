"use client";

import { useState, useEffect } from "react";
import { CheckCircle, ChevronDown, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn, getAvatarColorClass } from "@/lib/utils";
import { useTaskStore } from "@/store/taskStore";
import { updateTaskStatus, changeTaskOwner, updateTask } from "@/lib/api/tasks";
import { getTeamMembers } from "@/lib/api/teams";
import { useAuthStore } from "@/store/authStore";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { TeamTaskDetailSheet } from "./TeamTaskDetailSheet";

interface TasksTabProps {
  teamId?: string;
}

export function TasksTab({ teamId }: TasksTabProps) {
  const { tasks, fetchTasks, loading } = useTaskStore();
  const [filter, setFilter] = useState("All");
  const { user } = useAuthStore();
  
  // Sheet-related state
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["teamMembers", teamId],
    queryFn: () => getTeamMembers(teamId!),
    enabled: !!teamId,
  });

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Filter tasks belonging to this team
  const teamTasks = teamId ? tasks.filter(t => t.teamId === teamId) : [];

  // Filter by status tab
  const filteredTasks = teamTasks.filter(task => {
    if (filter === "All") return true;
    if (filter === "Open") return task.status === "TODO";
    if (filter === "In Progress") return task.status === "IN_PROGRESS";
    if (filter === "Review") return task.status === "IN_REVIEW";
    if (filter === "Done") return task.status === "DONE";
    return true;
  });

  // Toggle task complete (sets status to DONE or TODO)
  const handleToggleComplete = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "DONE" ? "TODO" : "DONE";
    try {
      const updated = await updateTaskStatus(taskId, nextStatus);
      useTaskStore.getState().updateTask(updated);
      // Sync local sheet task if open
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(updated);
      }
      toast.success(`Task status updated to ${nextStatus}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update task status");
    }
  };

  const handleAssignOwner = async (taskId: string, newOwnerId: string) => {
    try {
      await changeTaskOwner(taskId, newOwnerId);
      fetchTasks();
      
      // Update local selectedTask state if open
      if (selectedTask && selectedTask.id === taskId) {
        const ownerMember = teamMembers.find(m => m.userId === newOwnerId);
        setSelectedTask((prev: any) => ({
          ...prev,
          assigneeId: newOwnerId,
          assigneeName: ownerMember ? ownerMember.fullName : undefined
        }));
      }
      
      toast.success("Task assignee updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update assignee");
    }
  };

  const handleUpdateField = async (fields: any) => {
    if (!selectedTask) return;
    try {
      const updated = await updateTask(selectedTask.id, fields);
      useTaskStore.getState().updateTask(updated);
      setSelectedTask(updated);
      toast.success("Task updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update task");
    }
  };

  const isLeadOfTeam = teamMembers.some(m => m.userId === user?.id && m.role === "LEAD");
  const canAssign = isLeadOfTeam || user?.role === "ADMIN" || user?.role === "OWNER";

  // Group filtered tasks by project
  const projectGroupsMap: Record<string, {
    name: string;
    workspace: string;
    color: string;
    tasks: typeof filteredTasks;
  }> = {};

  filteredTasks.forEach(task => {
    const projId = task.projectId || "unassigned";
    if (!projectGroupsMap[projId]) {
      projectGroupsMap[projId] = {
        name: task.projectName || "Unassigned Project",
        workspace: "Engineering",
        color: task.projectColor || "#71717a",
        tasks: []
      };
    }
    projectGroupsMap[projId].tasks.push(task);
  });

  const taskGroups = Object.values(projectGroupsMap);

  if (loading && teamTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="relative">
          <div className="h-10 w-10 rounded-full border border-hs-accent/20 bg-hs-accent/5" />
          <Loader2 className="absolute inset-0 m-auto h-5 w-5 animate-spin text-hs-accent" />
        </div>
        <p className="text-xs text-zinc-500">Loading team tasks...</p>
      </div>
    );
  }

  if (teamTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <CheckCircle className="h-12 w-12 text-zinc-600 mb-4" strokeWidth={1.5} />
        <h3 className="text-sm font-medium text-zinc-400">No tasks assigned to this team</h3>
        <p className="text-xs text-zinc-500 mt-1">Create a task and assign it to this team.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* FILTER ROW */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {["All", "Open", "In Progress", "Review", "Done"].map((p) => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer",
                p === filter ? "bg-hs-accent text-white" : "text-zinc-500 hover:text-foreground"
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Group By:</span>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border/50 bg-hs-card text-xs text-foreground cursor-default">
            Project
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {taskGroups.map((group) => (
          <div key={group.name} className="space-y-2">
            <div className="flex items-center gap-2 px-2 py-1 select-none cursor-pointer hover:bg-muted/20 rounded transition-colors group">
              <ChevronDown className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400" />
              <div 
                className="h-1.5 w-1.5 rounded-full shrink-0" 
                style={{ backgroundColor: group.color }}
              />
              <span className="text-sm font-medium text-foreground">{group.name}</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-tight ml-2">{group.workspace}</span>
              <Badge variant="outline" className="ml-2 h-4 px-1.5 bg-hs-card border-border/50 text-[10px] text-zinc-500 font-medium">
                {group.tasks.length}
              </Badge>
            </div>

            <div className="flex flex-col">
              {group.tasks.map((task) => {
                const priorityColor = task.priority === "URGENT" ? "bg-red-500" : task.priority === "HIGH" ? "bg-amber-500" : "bg-zinc-500";
                const isCompleted = task.status === "DONE";
                const initials = task.assigneeName ? task.assigneeName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "?";

                return (
                  <div 
                    key={task.id} 
                    onClick={() => setSelectedTask(task)}
                    className="flex h-10 items-center gap-4 px-2 hover:bg-muted/30 border-b border-transparent hover:border-border/10 transition-all cursor-pointer group rounded-md justify-between"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        checked={isCompleted}
                        onCheckedChange={() => handleToggleComplete(task.id, task.status)}
                        className="h-4 w-4 border-zinc-700 data-[state=checked]:bg-hs-accent data-[state=checked]:border-hs-accent cursor-pointer" 
                      />
                      <div className={cn("h-2 w-2 rounded-full shrink-0", priorityColor)} />
                      <span className="w-16 text-[10px] font-mono text-zinc-600 shrink-0">
                        {task.taskIdentifier || task.id.slice(0, 8)}
                      </span>
                      <span 
                        onClick={() => setSelectedTask(task)}
                        className={cn("text-sm text-muted-foreground truncate max-w-md cursor-pointer hover:text-foreground transition-colors", isCompleted && "line-through opacity-50")}
                      >
                        {task.title}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Badge variant="outline" className="bg-zinc-800 border-zinc-700/50 text-[10px] text-zinc-500 font-normal py-0">
                        {task.status}
                      </Badge>
                      
                      {canAssign ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <div className="w-28 flex items-center gap-2 cursor-pointer hover:bg-zinc-800/50 p-1.5 rounded-md transition-colors shrink-0">
                              <Avatar className="h-5 w-5 border border-zinc-800 shrink-0">
                                <AvatarFallback className={cn("text-[8px] font-medium", getAvatarColorClass(initials))}>
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-[10px] text-zinc-400 truncate hover:text-foreground">{task.assigneeName || "Unassigned"}</span>
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-hs-main border border-border/50 text-foreground w-48 z-[160]">
                            <DropdownMenuLabel className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Assign Task</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-border/50" />
                            {teamMembers.map((m) => {
                              const memberInitials = m.fullName 
                                ? m.fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) 
                                : "?";
                              return (
                                <DropdownMenuItem 
                                  key={m.id} 
                                  onClick={() => handleAssignOwner(task.id, m.userId)}
                                  className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 text-xs py-1.5"
                                >
                                  <Avatar className="h-5 w-5 shrink-0">
                                    <AvatarFallback className={cn("text-[8px] font-semibold text-white", getAvatarColorClass(memberInitials))}>
                                      {memberInitials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="truncate text-xs text-zinc-300">{m.fullName || m.username}</span>
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <div className="w-28 flex items-center gap-2 shrink-0">
                          <Avatar className="h-5 w-5 border border-zinc-800 shrink-0">
                            <AvatarFallback className={cn("text-[8px] font-medium", getAvatarColorClass(initials))}>
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[10px] text-zinc-500 truncate">{task.assigneeName || "Unassigned"}</span>
                        </div>
                      )}
                      
                      <span className="w-16 text-[10px] text-zinc-600 text-right">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* --- TASK DETAILS DRAWER SHEET --- */}
      <TeamTaskDetailSheet
        selectedTask={selectedTask}
        onClose={() => setSelectedTask(null)}
        teamMembers={teamMembers}
        canAssign={canAssign}
        onAssignOwner={handleAssignOwner}
        onUpdateField={handleUpdateField}
      />
    </div>
  );
}
