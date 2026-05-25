"use client";

import { useQuery } from "@tanstack/react-query";
import { getTaskActivities, TaskActivityResponse } from "@/lib/api/tasks";
import { cn, getAvatarColorClass } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  PlusCircle, 
  ArrowRightLeft,
  Flag,
  Pencil,
  AlignLeft,
  Tag,
  Star,
  Calendar,
  User,
  UserPlus,
  UserMinus,
  Activity,
  Loader2
} from "lucide-react";

interface TaskActivityFeedProps {
  taskId: string;
  className?: string;
}

const ACTIVITY_META: Record<string, { 
  label: string; 
  Icon: React.ElementType; 
  color: string;
  render?: (a: TaskActivityResponse) => string;
}> = {
  CREATED:              { label: "Created task",         Icon: PlusCircle,    color: "text-emerald-400", render: (a) => `by ${a.username || a.fullName || "someone"}` },
  STATUS_CHANGED:       { label: "Status changed",       Icon: ArrowRightLeft, color: "text-blue-400",    render: (a) => `${a.oldValue} → ${a.newValue}` },
  PRIORITY_CHANGED:     { label: "Priority changed",     Icon: Flag,           color: "text-amber-400",   render: (a) => `${a.oldValue} → ${a.newValue}` },
  TITLE_CHANGED:        { label: "Title updated",        Icon: Pencil,         color: "text-violet-400",  render: (a) => a.newValue || "" },
  DESCRIPTION_CHANGED:  { label: "Description updated",  Icon: AlignLeft,      color: "text-zinc-400",    render: () => "Description was edited" },
  LABELS_CHANGED:       { label: "Labels changed",       Icon: Tag,            color: "text-pink-400",    render: (a) => a.newValue || "Cleared" },
  POINTS_CHANGED:       { label: "Points changed",       Icon: Star,           color: "text-amber-400",   render: (a) => `${a.oldValue ?? "—"} → ${a.newValue ?? "—"} pts` },
  DUE_DATE_CHANGED:     { label: "Due date changed",     Icon: Calendar,       color: "text-rose-400",    render: (a) => `${a.oldValue ? new Date(a.oldValue).toLocaleDateString() : "none"} → ${a.newValue ? new Date(a.newValue).toLocaleDateString() : "none"}` },
  OWNER_CHANGED:        { label: "Owner changed",        Icon: User,           color: "text-violet-400",  render: (a) => `${a.oldValue || "—"} → ${a.newValue || "—"}` },
  ASSIGNEE_ADDED:       { label: "Assignee added",       Icon: UserPlus,       color: "text-emerald-400", render: (a) => a.newValue || "" },
  ASSIGNEE_REMOVED:     { label: "Assignee removed",     Icon: UserMinus,      color: "text-red-400",     render: (a) => a.oldValue || "" },
};

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60)  return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60)  return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)    return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30)    return `${diffD}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TaskActivityFeed({ taskId, className }: TaskActivityFeedProps) {
  const { data: activities, isLoading, isError } = useQuery<TaskActivityResponse[]>({
    queryKey: ["taskActivities", taskId],
    queryFn: () => getTaskActivities(taskId),
    enabled: !!taskId,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3 relative animate-pulse">
            {/* Vertical connector line placeholder */}
            {i < 2 && (
              <div className="absolute left-3.5 top-7 bottom-0 w-px bg-zinc-800/40" />
            )}
            
            {/* Avatar skeleton */}
            <div className="shrink-0 mt-1">
              <div className="h-7 w-7 rounded-full bg-zinc-850 border border-zinc-800" />
            </div>

            {/* Content skeleton */}
            <div className="flex-1 min-w-0 pb-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-3 w-28 bg-zinc-800 rounded-md" />
                <div className="h-2 w-12 bg-zinc-800/50 rounded-md" />
              </div>
              <div className="h-2.5 w-44 bg-zinc-800/60 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError || !activities || activities.length === 0) {
    return (
      <div className={cn("flex flex-col items-center gap-2 py-8 text-zinc-600 text-xs", className)}>
        <Activity className="h-5 w-5 opacity-40" />
        <span>No activity yet</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-0", className)}>
      {activities.map((activity, idx) => {
        const meta = ACTIVITY_META[activity.type] ?? {
          label: activity.type.replace(/_/g, " "),
          Icon: Activity,
          color: "text-zinc-400",
          render: (a: TaskActivityResponse) => a.newValue || "",
        };
        const { label, Icon, color, render } = meta;
        const displayName = activity.fullName || activity.username || "System";
        const initials = displayName.substring(0, 2).toUpperCase();
        const detail = render ? render(activity) : "";
        const isLast = idx === activities.length - 1;

        return (
          <div key={activity.id} className="flex gap-3 relative">
            {/* Vertical connector line */}
            {!isLast && (
              <div className="absolute left-3.5 top-7 bottom-0 w-px bg-zinc-800/60" />
            )}

            {/* Avatar */}
            <div className="shrink-0 mt-1">
              <Avatar className="h-7 w-7">
                <AvatarFallback
                  className={cn(
                    "text-[9px] font-bold text-white",
                    getAvatarColorClass(displayName)
                  )}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pb-4">
              <div className="flex items-start gap-2 flex-wrap">
                <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", color)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-zinc-300 truncate">
                      {displayName}
                    </span>
                    <span className="text-xs text-zinc-500">{label.toLowerCase()}</span>
                  </div>
                  {detail && (
                    <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug truncate">
                      {detail}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-zinc-600 shrink-0 ml-auto">
                  {timeAgo(activity.createdAt)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
