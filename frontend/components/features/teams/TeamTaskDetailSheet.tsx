"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, getAvatarColorClass } from "@/lib/utils";
import { updateTaskStatus } from "@/lib/api/tasks";
import { useTaskStore } from "@/store/taskStore";
import { TeamMemberResponse } from "@/lib/api/teams";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";

interface TeamTaskDetailSheetProps {
  selectedTask: any | null;
  onClose: () => void;
  teamMembers: TeamMemberResponse[];
  canAssign: boolean;
  onAssignOwner: (taskId: string, newOwnerId: string) => Promise<void>;
  onUpdateField: (fields: any) => Promise<void>;
}

export function TeamTaskDetailSheet({
  selectedTask,
  onClose,
  teamMembers,
  canAssign,
  onAssignOwner,
  onUpdateField,
}: TeamTaskDetailSheetProps) {
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");

  // Sync state values when selectedTask changes
  useEffect(() => {
    if (selectedTask) {
      setEditedTitle(selectedTask.title || "");
      setEditedDescription(selectedTask.description || "");
    }
  }, [selectedTask]);

  return (
    <Sheet open={!!selectedTask} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[380px] p-0 bg-hs-nav border-l border-border/50 shadow-2xl flex flex-col gap-0 outline-none z-[150]">
        <SheetTitle className="sr-only">Task Details</SheetTitle>
        <SheetHeader className="p-6 pb-0 border-b border-border/10">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-zinc-500 uppercase tracking-widest font-semibold">
              {selectedTask?.taskIdentifier || selectedTask?.id?.slice(0, 8)}
            </span>
            <Select 
              value={selectedTask?.status || "TODO"}
              onValueChange={async (val) => {
                if (!selectedTask) return;
                try {
                  const updated = await updateTaskStatus(selectedTask.id, val);
                  useTaskStore.getState().updateTask(updated);
                  onUpdateField(updated);
                  toast.success(`Status updated to ${val}`);
                } catch (err) {
                  toast.error("Failed to update status");
                }
              }}
            >
              <SelectTrigger className="w-auto h-7 text-xs bg-hs-card border border-border/50 text-foreground focus:ring-0 shadow-none px-2 rounded-md hover:bg-muted transition-colors">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-hs-main border-border text-foreground rounded-md">
                <SelectItem value="TODO">Todo</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="IN_REVIEW">Review</SelectItem>
                <SelectItem value="DONE">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title Section */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Title</label>
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={() => onUpdateField({ title: editedTitle })}
              className="w-full text-base font-semibold bg-transparent border-none text-foreground focus:outline-none focus:ring-1 focus:ring-hs-accent/50 rounded px-1 -ml-1 hover:bg-muted/10 transition-colors"
              disabled={!canAssign}
            />
          </div>

          {/* Project / Workspace Label */}
          <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/20">
            <span className="text-zinc-500">Project</span>
            <span className="font-medium text-foreground">{selectedTask?.projectName || "Unassigned"}</span>
          </div>

          {/* Description Section */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Description</label>
            <textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              onBlur={() => onUpdateField({ description: editedDescription })}
              placeholder="Add description..."
              className="w-full min-h-[100px] bg-hs-card border border-border/50 rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-hs-accent/50 resize-none"
              disabled={!canAssign}
            />
          </div>

          {/* Priority Section */}
          <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/20">
            <span className="text-zinc-500">Priority</span>
            <Select
              value={selectedTask?.priority || "NORMAL"}
              onValueChange={(val) => onUpdateField({ priority: val })}
              disabled={!canAssign}
            >
              <SelectTrigger className="h-7 bg-hs-card border border-border/50 text-foreground text-xs rounded-md">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent className="bg-hs-main border-border text-foreground">
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assignee / Owner Picker Section */}
          <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/20">
            <span className="text-zinc-500">Assignee</span>
            {canAssign ? (
              <Select
                value={selectedTask?.assigneeId || "unassigned"}
                onValueChange={(val) => onAssignOwner(selectedTask.id, val === "unassigned" ? "" : val)}
              >
                <SelectTrigger className="h-8 bg-hs-card border border-border/50 text-foreground text-xs rounded-md w-48">
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent className="bg-hs-main border-border text-foreground">
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.userId}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-4.5 w-4.5 shrink-0">
                          <AvatarFallback className={cn("text-[8px] font-semibold text-white", getAvatarColorClass(m.fullName ? m.fullName.split(" ").map(n => n[0]).join("") : "?"))}>
                            {m.fullName ? m.fullName.split(" ").map(n => n[0]).join("") : "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{m.fullName || m.username}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5 border border-border/50 shrink-0">
                  <AvatarFallback className={cn("text-[8px] font-semibold", getAvatarColorClass(selectedTask?.assigneeName?.split(" ").map((n: string) => n[0]).join("") || "?"))}>
                    {selectedTask?.assigneeName?.split(" ").map((n: string) => n[0]).join("") || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-foreground">{selectedTask?.assigneeName || "Unassigned"}</span>
              </div>
            )}
          </div>

          {/* Due Date Picker Section */}
          <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/20">
            <span className="text-zinc-500">Due Date</span>
            <input
              type="date"
              value={selectedTask?.dueDate ? new Date(selectedTask.dueDate).toISOString().split('T')[0] : ""}
              onChange={(e) => onUpdateField({ dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
              disabled={!canAssign}
              className="bg-hs-card border border-border/50 text-foreground text-xs rounded-md px-2 py-1 focus:outline-none [color-scheme:dark]"
            />
          </div>

          {/* Points Section */}
          <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/20">
            <span className="text-zinc-500">Points</span>
            <input
              type="number"
              min={0}
              value={selectedTask?.points || ""}
              onChange={(e) => onUpdateField({ points: e.target.value ? Number(e.target.value) : null })}
              disabled={!canAssign}
              className="w-16 bg-hs-card border border-border/50 text-foreground text-xs rounded-md px-2 py-1 text-right focus:outline-none"
            />
          </div>

          {/* Labels Section */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Labels</label>
            <input
              type="text"
              placeholder="frontend, bug"
              value={selectedTask?.labels || ""}
              onChange={(e) => onUpdateField({ labels: e.target.value })}
              disabled={!canAssign}
              className="w-full bg-hs-card border border-border/50 text-foreground text-xs rounded-xl px-3 py-2 focus:outline-none"
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
