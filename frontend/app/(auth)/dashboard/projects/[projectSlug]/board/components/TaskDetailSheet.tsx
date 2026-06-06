"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  TaskResponse, 
  updateTaskStatus, 
  updateTask, 
  changeTaskOwner, 
  getTaskAssignees,
  TaskAssigneeResponse
} from "@/lib/api/tasks";
import { getProjectMembers, getProjectTeams } from "@/lib/api/projects";
import { getTeamMembers } from "@/lib/api/teams";
import { useAuthStore } from "@/store/authStore";
import { cn, getAvatarColorClass } from "@/lib/utils";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskActivityFeed } from "@/components/features/tasks/TaskActivityFeed";
import { GitPullRequest, GitCommit, ArrowRight } from "lucide-react";

const PRIORITIES = {
  urgent: "#E24B4A",
  high: "#EF9F27",
  normal: "#71717A",
};

type Priority = keyof typeof PRIORITIES;

interface TaskDetailSheetProps {
  selectedTask: TaskResponse | null;
  onClose: () => void;
  projectId: string;
  themeColor: string;
  displayTitle: string;
  onUpdateTask: (task: TaskResponse) => void;
  onDeleteTask: (taskId: string) => void;
}

function toInitials(fullName?: string) {
  if (!fullName) return "U";
  return fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export function TaskDetailSheet({
  selectedTask,
  onClose,
  projectId,
  themeColor,
  displayTitle,
  onUpdateTask,
  onDeleteTask,
}: TaskDetailSheetProps) {
  const { user } = useAuthStore();
  const [editedTitle, setEditedTitle] = useState("");

  // Sync edited title when task changes
  useEffect(() => {
    if (selectedTask) {
      setEditedTitle(selectedTask.title);
    }
  }, [selectedTask]);

  // TanStack Query for caching and automatic management
  const { data: projectMembers = [] } = useQuery({
    queryKey: ["projectMembers", projectId],
    queryFn: () => getProjectMembers(projectId),
    enabled: !!projectId,
  });

  const { data: projectTeams = [] } = useQuery({
    queryKey: ["projectTeams", projectId],
    queryFn: () => getProjectTeams(projectId),
    enabled: !!projectId,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["teamMembers", selectedTask?.teamId],
    queryFn: () => getTeamMembers(selectedTask!.teamId!),
    enabled: !!selectedTask?.teamId,
  });

  const isProjectLead = projectMembers.some(pm => pm.userId === user?.id && pm.role === "LEAD");
  const isTeamLead = teamMembers.some(tm => tm.userId === user?.id && tm.role === "LEAD");
  const isSystemAdmin = user?.role === "ADMIN" || user?.role === "OWNER";

  const handleTeamChange = async (teamId: string) => {
    if (!selectedTask) return;
    try {
      const updated = await updateTask(selectedTask.id, { teamId });
      onUpdateTask(updated);
      toast.success("Task team updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update task team");
    }
  };

  const handleOwnerChange = async (newOwnerId: string) => {
    if (!selectedTask) return;
    try {
      await changeTaskOwner(selectedTask.id, newOwnerId);
      toast.success("Owner changed successfully");
      
      const ownerMember = teamMembers.find(m => m.userId === newOwnerId);
      const updatedTask = {
        ...selectedTask,
        assigneeId: newOwnerId,
        assigneeName: ownerMember ? ownerMember.fullName : "Unassigned",
        assigneeInitials: ownerMember ? toInitials(ownerMember.fullName) : "U"
      };
      onUpdateTask(updatedTask);
    } catch (err: any) {
      toast.error(err.message || "Failed to change owner");
    }
  };

  return (
    <Sheet open={!!selectedTask} onOpenChange={(open) => !open && onClose()}>
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
                    onUpdateTask(updated);
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
                    onUpdateTask(updated);
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
                  onUpdateTask({ ...selectedTask, description: e.target.value });
                }}
                onBlur={async (e) => {
                  if (!selectedTask || e.target.value === selectedTask.description) return;
                  try {
                    const updated = await updateTask(selectedTask.id, { description: e.target.value });
                    onUpdateTask(updated);
                    toast.success("Description updated");
                  } catch (err) {
                    toast.error("Failed to update description");
                  }
                }}
                placeholder="Add a detailed description..."
                className="w-full min-h-[80px] bg-hs-card border border-border/50 rounded-md p-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 resize-none"
              />
            </div>

            <div className="flex flex-col text-[13px]">
              <MetadataRow label="Team & Assignee">
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={selectedTask?.teamId || ""}
                    onChange={(e) => handleTeamChange(e.target.value)}
                    disabled={!(isProjectLead || isSystemAdmin)}
                    className="bg-transparent border-none text-foreground outline-none text-xs cursor-pointer font-medium hover:underline bg-[#1B1B1D] disabled:opacity-50 disabled:cursor-not-allowed max-w-[120px] truncate"
                  >
                    <option value="" disabled className="bg-[#1B1B1D]">Select Team</option>
                    {projectTeams.map((team) => (
                      <option key={team.id} value={team.id} className="bg-[#1B1B1D]">
                        {team.name}
                      </option>
                    ))}
                  </select>

                  <span className="text-zinc-600 text-xs">·</span>

                  <div className="flex items-center gap-1.5">
                    {selectedTask?.teamId && (
                      <Avatar 
                        className="h-4 w-4 border border-border/50"
                        username={selectedTask?.assigneeName || "Unassigned"}
                        email={selectedTask?.assigneeName ? `${selectedTask?.assigneeInitials?.toLowerCase() || "user"}@hivespace.io` : undefined}
                      >
                        <AvatarFallback className={cn("text-[8px] font-semibold uppercase", getAvatarColorClass(selectedTask?.assigneeInitials || ""))}>
                          {selectedTask?.assigneeInitials || "U"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <select
                      value={selectedTask?.assigneeId || ""}
                      onChange={(e) => handleOwnerChange(e.target.value)}
                      disabled={!selectedTask?.teamId || !(isProjectLead || isSystemAdmin || isTeamLead)}
                      className="bg-transparent border-none text-foreground outline-none text-xs cursor-pointer font-medium hover:underline bg-[#1B1B1D] disabled:opacity-50 disabled:cursor-not-allowed max-w-[120px] truncate"
                    >
                      <option value="" disabled={!!selectedTask?.teamId} className="bg-[#1B1B1D]">
                        {selectedTask?.teamId ? "Select Assignee" : "Select Team First"}
                      </option>
                      {teamMembers.map((m) => (
                        <option key={m.id} value={m.userId} className="bg-[#1B1B1D]">
                          {m.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </MetadataRow>

              <MetadataRow label="Priority">
                <Select 
                  value={selectedTask?.priority?.toLowerCase() || "medium"}
                  onValueChange={async (val) => {
                    if (!selectedTask) return;
                    try {
                      const updated = await updateTask(selectedTask.id, { priority: val.toUpperCase() });
                      onUpdateTask(updated);
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
                      onUpdateTask(updated);
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

              <MetadataRow label="Created by">
                <span className="text-muted-foreground">
                  {selectedTask?.createdByName || "System"}
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
                      onUpdateTask(updated);
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
                      onUpdateTask(updated);
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

            {/* Activity Section — live from backend */}
            <div className="mt-2 flex flex-col gap-3">
              <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Activity</span>
              {selectedTask && (
                <TaskActivityFeed taskId={selectedTask.id} />
              )}
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
