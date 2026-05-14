"use client";

import { Crown, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function TeamHeader({ teamName }: { teamName: string }) {
  return (
    <div className="flex w-full flex-col bg-[#201F21] p-6">
      <div className="flex items-start justify-between">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/20">
            <Users className="h-6 w-6 text-blue-400" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold text-[#E5E1E4]">{teamName}</h1>
            <p className="mt-1 text-xs text-zinc-500 uppercase tracking-wider">Engineering workspace</p>
            <p className="mt-2 max-w-xl text-sm text-zinc-400 leading-relaxed">
              Responsible for all server-side infrastructure, APIs, WebSocket, and GitHub integrations.
            </p>
          </div>
        </div>

        <div className="flex gap-8 px-2">
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-semibold text-[#E5E1E4]">6</span>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Members</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-semibold text-[#E5E1E4]">14</span>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Open Tasks</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-semibold text-[#E5E1E4]">3</span>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Active Projects</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-semibold text-[#E5E1E4]">2</span>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">PRs in Review</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">Team Lead</span>
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7 border border-zinc-700/50">
            <AvatarImage src="https://github.com/nutlope.png" />
            <AvatarFallback className="bg-amber-500/20 text-amber-500 text-[10px]">MV</AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-zinc-300 font-medium">Meera V.</span>
            <Crown className="h-3 w-3 text-amber-400 fill-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
