"use client";

import { AlertTriangle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const MEMBERS_WORKLOAD = [
  { name: "Meera V.", initials: "MV", role: "Lead", tasks: 8, status: "away", color: "bg-amber-500" },
  { name: "Rahul K.", initials: "RK", role: "Member", tasks: 5, status: "online", color: "bg-violet-500" },
  { name: "David K.", initials: "DK", role: "Member", tasks: 3, status: "away", color: "bg-green-500" },
  { name: "Sanjay A.", initials: "SA", role: "Member", tasks: 11, status: "online", color: "bg-red-500" },
  { name: "Priya L.", initials: "PL", role: "Member", tasks: 2, status: "offline", color: "bg-green-500" },
  { name: "Robert S.", initials: "RS", role: "Member", tasks: 6, status: "online", color: "bg-violet-500" }
];

const RECENT_ACTIVITY = [
  { user: "MV", name: "Meera V.", action: "opened PR #82 — feat/stomp-broadcast", time: "2h ago" },
  { user: "RK", name: "Rahul K.", action: "moved HS-041 to In Progress", time: "5h ago" },
  { user: "DK", name: "David K.", action: "left a comment on HS-039", time: "Yesterday" },
  { user: "SA", name: "Sanjay A.", action: "was assigned HS-058", time: "Yesterday" },
  { user: "PL", name: "Priya L.", action: "completed HS-033", time: "2 days ago" }
];

const ACTIVE_PROJECTS = [
  { name: "Frontend Redesign", space: "Engineering", tasks: 5, progress: 65, dot: "bg-blue-500" },
  { name: "Sprint 3", space: "Engineering", tasks: 7, progress: 24, dot: "bg-violet-500" },
  { name: "Tech Debt", space: "Engineering", tasks: 2, progress: 45, dot: "bg-emerald-500" }
];

const TEAM_CHANNELS = [
  { name: "backend-ops", lastMsg: "Are we deploying today?", time: "10:24 AM", unread: true },
  { name: "general", lastMsg: "Townhall at 3pm tomorrow.", time: "Monday", unread: false },
  { name: "design-sync", lastMsg: "", time: "", unread: false }
];

const UPCOMING_DEADLINES = [
  { id: "HS-044", title: "STOMP WebSocket chat broadcast", due: "Apr 15", priority: "bg-red-500", assignee: "MV", color: "text-zinc-400" },
  { id: "HS-041", title: "Invite token expiry edge cases", due: "Apr 12", priority: "bg-amber-500", assignee: "RK", color: "text-amber-400" },
  { id: "HS-039", title: "GitHub webhook HMAC validation", due: "Apr 14", priority: "bg-zinc-400", assignee: "SA", color: "text-zinc-400" }
];

export function OverviewTab() {
  return (
    <div className="grid grid-cols-10 gap-6 p-6">
      {/* LEFT COLUMN: 60% */}
      <div className="col-span-6 space-y-8">
        {/* WORKLOAD SECTION */}
        <section>
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Workload</h3>
          <p className="text-xs text-zinc-400 mb-6">Task distribution across Backend Team members</p>
          
          <div className="space-y-4">
            {MEMBERS_WORKLOAD.map((member) => (
              <div key={member.name} className="flex items-center gap-3 group h-10">
                <div className="relative">
                  <Avatar className="h-7 w-7 border border-zinc-800">
                    <AvatarFallback className="bg-zinc-800 text-zinc-400 text-[10px]">{member.initials}</AvatarFallback>
                  </Avatar>
                  <div className={cn(
                    "absolute bottom-0 right-0 h-2 w-2 rounded-full border border-[#201F21]",
                    member.status === "online" ? "bg-green-400" : member.status === "away" ? "bg-amber-400" : "bg-zinc-600"
                  )} />
                </div>
                <div className="w-24 flex-shrink-0">
                  <span className="text-sm text-[#E5E1E4]">{member.name}</span>
                </div>
                <div className="px-1.5 py-0.5 rounded-sm bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-500">
                  {member.role}
                </div>
                <div className="flex-1 px-4">
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-500", member.color)} 
                      style={{ width: `${Math.min((member.tasks / 12) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="w-14 text-right">
                  <span className="text-xs text-zinc-500">{member.tasks} tasks</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 p-2 px-3 bg-amber-500/5 border border-amber-500/10 rounded-md w-fit">
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            <span className="text-[11px] text-amber-500">Sanjay A. is overloaded — consider reassigning tasks</span>
          </div>
        </section>

        {/* RECENT ACTIVITY */}
        <section>
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Recent Activity</h3>
          <div className="relative pl-4 border-l border-zinc-800 ml-3 space-y-6">
            {RECENT_ACTIVITY.map((activity, i) => (
              <div key={i} className="relative flex items-center gap-3">
                <div className="absolute -left-[20px] h-2.5 w-2.5 rounded-full bg-zinc-800 border-2 border-[#201F21]" />
                <Avatar className="h-6 w-6 border border-zinc-800">
                  <AvatarFallback className="bg-zinc-800 text-zinc-500 text-[9px]">{activity.user}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm text-zinc-300">
                    <span className="font-medium text-white">{activity.name}</span> {activity.action}
                  </p>
                </div>
                <span className="text-[10px] text-zinc-600 font-mono italic">{activity.time}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* RIGHT COLUMN: 40% */}
      <div className="col-span-4 space-y-8">
        {/* ACTIVE PROJECTS */}
        <section>
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Active Projects</h3>
          <div className="space-y-2">
            {ACTIVE_PROJECTS.map((project) => (
              <div key={project.name} className="p-3 bg-[#272629] border border-zinc-800/50 rounded-md hover:border-zinc-700 transition-colors cursor-pointer group">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("h-2 w-2 rounded-sm", project.dot)} />
                    <div>
                      <h4 className="text-sm font-medium text-[#E5E1E4] leading-none mb-1">{project.name}</h4>
                      <p className="text-[10px] text-zinc-500 leading-none">{project.space}</p>
                    </div>
                  </div>
                  <div className="bg-zinc-800 px-2 py-0.5 rounded-full text-[10px] text-zinc-500">
                    {project.tasks} tasks
                  </div>
                </div>
                <div className="space-y-1.5 pt-2">
                  <div className="h-1.5 w-full bg-zinc-800/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-violet-500 transition-all duration-500" 
                      style={{ width: `${project.progress}%` }} 
                    />
                  </div>
                  <p className="text-[10px] text-zinc-600 text-right font-mono">{project.progress}% completed</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CHANNELS */}
        <section>
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Channels</h3>
          <div className="space-y-0.5">
            {TEAM_CHANNELS.map((channel) => (
              <div key={channel.name} className="flex h-9 items-center justify-between px-2 rounded-md hover:bg-zinc-800/40 cursor-pointer group">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-zinc-600 font-light text-base leading-none">#</span>
                  <span className="text-sm text-zinc-300 truncate">{channel.name}</span>
                  {channel.unread && <div className="h-1.5 w-1.5 rounded-full bg-[#f95b4e]" />}
                </div>
                {channel.lastMsg && (
                   <div className="flex items-center gap-2 ml-4 min-w-0">
                    <p className="text-xs text-zinc-600 truncate max-w-[100px]">{channel.lastMsg}</p>
                    <span className="text-[10px] text-zinc-700 whitespace-nowrap">{channel.time}</span>
                   </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* UPCOMING DEADLINES */}
        <section>
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Upcoming Deadlines</h3>
          <div className="space-y-1">
            {UPCOMING_DEADLINES.map((task) => (
              <div key={task.id} className="flex h-9 items-center gap-3 px-2 rounded-md hover:bg-zinc-800/40 cursor-pointer group">
                <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", task.priority)} />
                <span className="text-[10px] font-mono text-zinc-600 shrink-0">{task.id}</span>
                <span className="text-sm text-zinc-300 truncate flex-1">{task.title}</span>
                <div className={cn("px-1.5 py-0.5 rounded-sm bg-zinc-800 text-[10px] font-medium shrink-0", task.color)}>
                  {task.due}
                </div>
                <Avatar className="h-5 w-5 border border-zinc-800 shrink-0">
                  <AvatarFallback className="bg-zinc-800 text-zinc-600 text-[8px]">{task.assignee}</AvatarFallback>
                </Avatar>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
