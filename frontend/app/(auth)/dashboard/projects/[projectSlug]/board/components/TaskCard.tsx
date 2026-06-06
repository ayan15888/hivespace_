"use client";

import { TaskResponse } from "@/lib/api/tasks";
import { cn, getAvatarColorClass } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, GitPullRequest, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const PRIORITY_STYLES: Record<string, { bg: string; border: string }> = {
  urgent: {
    bg: "bg-red-500/10 hover:bg-red-500/15",
    border: "border-red-500/40",
  },
  high: {
    bg: "bg-orange-500/10 hover:bg-orange-500/15",
    border: "border-orange-500/40",
  },
  medium: {
    bg: "bg-yellow-500/5 hover:bg-yellow-500/8",
    border: "border-yellow-500/20",
  },
  low: {
    bg: "bg-green-500/5 hover:bg-green-500/10",
    border: "border-green-500/20",
  },
};

const PRIORITY_DOT_COLORS: Record<string, string> = {
  urgent: "#EF4444",
  high: "#F97316",
  medium: "#EAB308",
  low: "#22C55E",
};

interface TaskCardProps {
  task: TaskResponse;
  isMuted?: boolean;
  onClick: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDelete: () => void;
}

export function TaskCard({
  task,
  isMuted,
  onClick,
  onDragStart,
  onDelete,
}: TaskCardProps) {
  const isDone = isMuted;
  const priority = task.priority.toLowerCase();
  const cardStyle = PRIORITY_STYLES[priority] || {
    bg: "bg-hs-card hover:bg-muted/20",
    border: "border-border/50",
  };

  return (
    <div
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
      className={cn(
        "group relative flex flex-col gap-2.5 p-3 rounded-md border cursor-grab active:cursor-grabbing transition-all hover:scale-[1.01] duration-150",
        cardStyle.bg,
        cardStyle.border,
        isDone && "opacity-50"
      )}
    >
      {/* Row 1: Priority & ID */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="h-1 w-1 rounded-full shrink-0"
            style={{
              backgroundColor: PRIORITY_DOT_COLORS[task.priority.toLowerCase()] || "#71717A",
            }}
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
      <p
        className={cn(
          "text-sm leading-snug font-medium line-clamp-2 overflow-hidden text-ellipsis",
          isDone ? "line-through text-muted-foreground/60" : "text-foreground"
        )}
      >
        {task.title}
      </p>

      {/* Row 3: Labels */}
      {task.labels && (
        <div className="flex flex-wrap gap-1.5">
          {(typeof task.labels === "string" ? task.labels.split(",") : task.labels)
            .map((l) => l.trim())
            .filter(Boolean)
            .slice(0, 2)
            .map((label) => (
              <Badge
                key={label}
                className="bg-muted/50 text-muted-foreground border border-border/50 h-5 px-1.5 py-0.5 font-normal text-xs rounded-sm hover:bg-muted shadow-none"
              >
                {label}
              </Badge>
            ))}
          {(typeof task.labels === "string" ? task.labels.split(",") : task.labels).filter(
            (l) => l.trim()
          ).length > 2 && (
            <Badge className="bg-zinc-800 text-zinc-400 border border-zinc-700 h-5 px-1.5 py-0.5 font-normal text-xs rounded-sm hover:bg-zinc-800 shadow-none">
              +
              {(typeof task.labels === "string" ? task.labels.split(",") : task.labels).filter(
                (l) => l.trim()
              ).length - 2}{" "}
              more
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
              <span className="font-medium">
                {new Date(task.dueDate).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          )}
          {(task as any).pr && (
            <div className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-emerald-500 transition-colors">
              <GitPullRequest strokeWidth={1.5} className="h-3 w-3" />
              <span className="font-mono">{(task as any).pr}</span>
            </div>
          )}
        </div>

        {/* Assignee Avatar */}
        <div className="absolute bottom-3 right-3 shrink-0">
          <Avatar
            className="h-6 w-6 rounded-full border border-border/40 shrink-0"
            username={task.assigneeName || "Unassigned"}
            email={
              task.assigneeName
                ? `${task.assigneeInitials?.toLowerCase() || "user"}@hivespace.io`
                : undefined
            }
          >
            <AvatarFallback
              className={cn(
                "text-xs font-semibold",
                getAvatarColorClass(task.assigneeInitials || "")
              )}
            >
              {task.assigneeInitials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  );
}
