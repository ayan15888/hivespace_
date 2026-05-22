"use client";

import { Crown, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { roleLabel } from "@/types/roles";

export function TeamHeader({ teamName }: { teamName: string }) {
  return (
    <div className="flex w-full flex-col bg-hs-main p-6">
      <div className="flex items-start justify-between">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-hs-accent/30 bg-hs-accent/10">
            <Users className="h-6 w-6 text-hs-accent" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold text-foreground">{teamName}</h1>
            <p className="mt-1 text-xs text-zinc-500 uppercase tracking-wider">Engineering workspace</p>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground leading-relaxed">
              Responsible for all server-side infrastructure, APIs, WebSocket, and GitHub integrations.
            </p>
          </div>
        </div>

        <div className="flex gap-8 px-2">
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-semibold text-foreground">6</span>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Members</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-semibold text-foreground">14</span>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Open Tasks</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-semibold text-foreground">3</span>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Active Projects</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-semibold text-foreground">2</span>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">PRs in Review</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-bold">{roleLabel("LEAD")}</span>
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7 border border-border/50">
            <AvatarImage src="https://github.com/nutlope.png" />
            <AvatarFallback className="bg-amber-500/20 text-amber-500 text-[10px]">MV</AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-foreground font-medium">Meera V.</span>
            <Crown className="h-3 w-3 text-amber-400 fill-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
