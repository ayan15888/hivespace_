"use client";

import { ChevronRight, Users, Settings, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ManageTeamSheet } from "./ManageTeamSheet";

export function TeamBreadcrumbs({ teamName }: { teamName: string }) {
  return (
    <div className="sticky top-0 z-30 flex h-[44px] w-full items-center justify-between border-b border-zinc-800/50 bg-[#0E0E10]/80 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-400">Hivespace</span>
        <ChevronRight className="h-3 w-3 text-zinc-600" />
        <span className="text-xs text-zinc-400">Engineering</span>
        <ChevronRight className="h-3 w-3 text-zinc-600" />
        <div className="flex items-center gap-1.5 ml-0.5">
          <Users className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-xs font-medium text-white">{teamName}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ManageTeamSheet trigger={(
          <Button variant="ghost" size="sm" className="h-8 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/50 px-2 gap-2">
            <Settings className="h-3.5 w-3.5" />
            Manage Team
          </Button>
        )} />
        
        <Button variant="ghost" size="sm" className="h-8 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/50 px-2 gap-2">
          <UserPlus className="h-3.5 w-3.5" />
          Invite to Team
        </Button>
      </div>
    </div>
  );
}
