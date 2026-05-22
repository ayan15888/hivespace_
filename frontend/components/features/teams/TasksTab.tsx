"use client";

import { CheckCircle, ChevronDown, MoreVertical } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TASK_GROUPS = [
  {
    name: "Frontend Redesign",
    workspace: "Engineering",
    dot: "bg-blue-500",
    tasks: [
      { id: "HS-044", title: "STOMP WebSocket chat broadcast", status: "In Progress", priority: "bg-red-500", assignee: "Meera V.", initials: "MV", due: "Apr 15" },
      { id: "HS-058", title: "Command palette overhaul", status: "Review", priority: "bg-violet-500", assignee: "Sanjay A.", initials: "SA", due: "Yesterday" }
    ]
  },
  {
    name: "Sprint 3",
    workspace: "Engineering",
    dot: "bg-violet-500",
    tasks: [
      { id: "HS-041", title: "Invite token expiry edge cases", status: "In Progress", priority: "bg-amber-500", assignee: "Rahul K.", initials: "RK", due: "Apr 12" },
      { id: "HS-039", title: "GitHub webhook HMAC validation", status: "Todo", priority: "bg-zinc-400", assignee: "David K.", initials: "DK", due: "Apr 14" },
      { id: "HS-035", title: "Supabase RLS policies", status: "Todo", priority: "bg-blue-500", assignee: "Robert S.", initials: "RS", due: "Apr 18" }
    ]
  }
];

export function TasksTab() {
  if (TASK_GROUPS.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <CheckCircle className="h-12 w-12 text-zinc-600 mb-4" strokeWidth={1.5} />
        <h3 className="text-sm font-medium text-zinc-400">No tasks assigned to this team</h3>
        <p className="text-xs text-zinc-500 mt-1">Create a task and assign it to a team member.</p>
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
              className={cn(
                "px-3 py-1.5 rounded-md text-xs transition-colors",
                p === "All" ? "bg-hs-accent text-white" : "text-zinc-500 hover:text-foreground"
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Group By:</span>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border/50 bg-hs-card text-xs text-foreground">
            Project
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {TASK_GROUPS.map((group) => (
          <div key={group.name} className="space-y-2">
            <div className="flex items-center gap-2 px-2 py-1 select-none cursor-pointer hover:bg-muted/20 rounded transition-colors group">
              <ChevronDown className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400" />
              <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", group.dot)} />
              <span className="text-sm font-medium text-foreground">{group.name}</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-tight ml-2">{group.workspace}</span>
              <Badge variant="outline" className="ml-2 h-4 px-1.5 bg-hs-card border-border/50 text-[10px] text-zinc-500 font-medium">
                {group.tasks.length}
              </Badge>
            </div>

            <div className="flex flex-col">
              {group.tasks.map((task) => (
                <div 
                  key={task.id} 
                  className="flex h-10 items-center gap-4 px-2 hover:bg-muted/30 border-b border-transparent hover:border-border/10 transition-all cursor-pointer group rounded-md"
                >
                  <Checkbox className="h-4 w-4 border-zinc-700 data-[state=checked]:bg-hs-accent data-[state=checked]:border-hs-accent" />
                  <div className={cn("h-2 w-2 rounded-full shrink-0", task.priority)} />
                  <span className="w-16 text-[10px] font-mono text-zinc-600 shrink-0">{task.id}</span>
                  <span className="flex-1 text-sm text-muted-foreground truncate">{task.title}</span>
                  
                  <div className="flex items-center gap-4 shrink-0">
                    <Badge variant="outline" className="bg-zinc-800 border-zinc-700/50 text-[10px] text-zinc-500 font-normal py-0">
                      {task.status}
                    </Badge>
                    <div className="w-24 flex items-center gap-2">
                      <Avatar className="h-5 w-5 border border-zinc-800 shrink-0">
                        <AvatarFallback className="bg-zinc-800 text-zinc-600 text-[8px]">{task.initials}</AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] text-zinc-500 truncate">{task.assignee}</span>
                    </div>
                    <span className="w-16 text-[10px] text-zinc-600 text-right">{task.due}</span>
                    <button className="h-8 w-8 flex items-center justify-center text-zinc-600 hover:text-zinc-300 opacity-0 group-hover:opacity-100">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
