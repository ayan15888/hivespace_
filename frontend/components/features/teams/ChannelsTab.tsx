"use client";

import { Users, MessageSquare, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const CHANNELS = [
  { name: "backend-ops", members: 24, unread: 4, lastMsg: "Are we deploying today?", time: "10:24 AM" },
  { name: "general", members: 48, unread: 0, lastMsg: "Townhall at 3pm tomorrow.", time: "Monday" },
  { name: "design-sync", members: 12, unread: 0, lastMsg: "Updated the figma components...", time: "2:15 PM" }
];

export function ChannelsTab() {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CHANNELS.map((channel) => (
          <div 
            key={channel.name} 
            className="group relative bg-[#272629] border border-zinc-800/50 rounded-md p-4 hover:border-zinc-700 transition-all duration-300 cursor-pointer flex flex-col h-[140px]"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-600 font-light text-xl leading-none">#</span>
                <span className="text-sm font-medium text-[#E5E1E4]">{channel.name}</span>
              </div>
              {channel.unread > 0 && (
                <div className="bg-[#f95b4e] text-white text-[10px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center">
                  {channel.unread}
                </div>
              )}
            </div>

            <div className="mt-2 flex items-center gap-1.5 text-zinc-500">
              <Users className="h-3.5 w-3.5" />
              <span className="text-[11px] font-medium">{channel.members} members</span>
            </div>

            <div className="mt-auto">
              <p className="text-xs text-zinc-400 line-clamp-1 italic">
                {channel.lastMsg || "No messages yet"}
              </p>
              <span className="text-[10px] text-zinc-600 font-mono mt-1 block">{channel.time}</span>
            </div>
            
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
               <MessageSquare className="h-4 w-4 text-zinc-600" />
            </div>
          </div>
        ))}
      </div>

      <Button variant="ghost" className="w-full flex items-center justify-center gap-2 h-10 border border-zinc-800/50 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30 text-xs">
        <PlusCircle className="h-4 w-4" />
        Create Channel
      </Button>
    </div>
  );
}
