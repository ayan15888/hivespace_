"use client";

import { MessageSquare, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { roleLabel } from "@/types/roles";

const MEMBERS = [
  { 
    name: "Meera V.", 
    initials: "MV", 
    role: "LEAD", 
    status: "online", 
    workingOn: { id: "HS-044", title: "STOMP WebSocket chat broadcast", priority: "bg-red-500" },
    stats: { open: 8, completed: 12, prs: 3 }
  },
  { 
    name: "Rahul K.", 
    initials: "RK", 
    role: "Member", 
    status: "online", 
    workingOn: { id: "HS-041", title: "Invite token expiry edge cases", priority: "bg-amber-500" },
    stats: { open: 5, completed: 8, prs: 1 }
  },
  { 
    name: "David K.", 
    initials: "DK", 
    role: "Member", 
    status: "away", 
    workingOn: { id: "HS-039", title: "GitHub webhook HMAC validation", priority: "bg-zinc-400" },
    stats: { open: 3, completed: 15, prs: 5 }
  },
  { 
    name: "Sanjay A.", 
    initials: "SA", 
    role: "Member", 
    status: "online", 
    overloaded: true,
    workingOn: { id: "HS-058", title: "Command palette overhaul", priority: "bg-violet-500" },
    stats: { open: 11, completed: 6, prs: 0 }
  },
  { 
    name: "Priya L.", 
    initials: "PL", 
    role: "Member", 
    status: "offline", 
    workingOn: null,
    stats: { open: 2, completed: 20, prs: 2 }
  },
  { 
    name: "Robert S.", 
    initials: "RS", 
    role: "Member", 
    status: "online", 
    workingOn: { id: "HS-035", title: "Supabase RLS policies", priority: "bg-blue-500" },
    stats: { open: 6, completed: 9, prs: 1 }
  }
];

export function MembersTab() {
  if (MEMBERS.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-16 w-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
          <Users className="h-8 w-8 text-zinc-600" strokeWidth={1.5} />
        </div>
        <h3 className="text-sm font-medium text-zinc-400">No members yet</h3>
        <p className="text-xs text-zinc-500 mt-1 max-w-[200px]">Invite people to join this team and start collaborating.</p>
        <Button className="mt-6 bg-gradient-to-br from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white text-xs uppercase tracking-wider font-bold h-9">
          Invite Members
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
      {MEMBERS.map((member) => (
        <div 
          key={member.name} 
          className={cn(
            "group bg-[#272629] border border-zinc-800/50 rounded-lg p-4 hover:border-zinc-700 transition-all duration-300 flex flex-col",
            member.overloaded && "border-red-500/30"
          )}
        >
          {/* TOP ROW */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10 border border-zinc-800">
                <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs font-medium">{member.initials}</AvatarFallback>
              </Avatar>
              <div className={cn(
                "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#272629]",
                member.status === "online" ? "bg-green-400" : member.status === "away" ? "bg-amber-400" : "bg-zinc-600"
              )} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-[#E5E1E4] leading-none mb-0.5">{member.name}</span>
              <div className={cn(
                "w-fit px-1.5 py-0.5 rounded-sm text-[10px] font-medium tracking-wide uppercase",
                member.role === "LEAD" ? "bg-violet-500/20 text-violet-400" : "bg-zinc-800 text-zinc-500"
              )}>
                {roleLabel(member.role)}
              </div>
            </div>
          </div>

          {/* MIDDLE: CURRENT TASK */}
          <div className="mt-4 mb-4">
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-2">Working On</span>
            {member.workingOn ? (
              <div className="flex items-center gap-2">
                <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", member.workingOn.priority)} />
                <span className="text-[10px] font-mono text-zinc-600 shrink-0">{member.workingOn.id}</span>
                <span className="text-xs text-zinc-400 truncate leading-none">{member.workingOn.title}</span>
              </div>
            ) : (
              <span className="text-xs text-zinc-600 italic">No active task</span>
            )}
          </div>

          {/* STATS ROW */}
          <div className="grid grid-cols-3 border-t border-zinc-800 pt-4 mt-auto">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-[#E5E1E4]">{member.stats.open}</span>
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-medium">Open Tasks</span>
            </div>
            <div className="flex flex-col gap-0.5 border-x border-zinc-800/10 px-2">
              <span className="text-sm font-medium text-[#E5E1E4]">{member.stats.completed}</span>
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-medium">Completed</span>
            </div>
            <div className="flex flex-col gap-0.5 pl-2">
              <span className="text-sm font-medium text-[#E5E1E4]">{member.stats.prs}</span>
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-medium">PRs</span>
            </div>
          </div>

          {/* MESSAGE BUTTON */}
          <Button variant="ghost" className="mt-4 w-full h-8 text-[11px] text-zinc-400 hover:text-white hover:bg-zinc-800/50 gap-2 border border-zinc-700/10 group-hover:border-zinc-700/30">
            <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />
            Message
          </Button>
        </div>
      ))}
    </div>
  );
}
