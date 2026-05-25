"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Users, Loader2, Crown, Shield, Mail } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn, getAvatarColorClass } from "@/lib/utils";
import { getTeamMembers, TeamMemberResponse } from "@/lib/api/teams";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";

interface MembersTabProps {
  teamId?: string;
}

export function MembersTab({ teamId }: MembersTabProps) {
  const [members, setMembers] = useState<TeamMemberResponse[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const data = await getTeamMembers(teamId);
      setMembers(data);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to fetch team members");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const toInitials = (name: string) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="relative">
          <div className="h-10 w-10 rounded-full border border-hs-accent/20 bg-hs-accent/5" />
          <Loader2 className="absolute inset-0 m-auto h-5 w-5 animate-spin text-hs-accent" />
        </div>
        <p className="text-xs text-zinc-500">Loading team members...</p>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-16 w-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
          <Users className="h-8 w-8 text-zinc-600" strokeWidth={1.5} />
        </div>
        <h3 className="text-sm font-medium text-zinc-400">No members yet</h3>
        <p className="text-xs text-zinc-500 mt-1 max-w-[200px]">Add people to join this team using the Manage Team button above.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
      {members.map((member) => {
        const displayName = member.fullName || member.username;
        const initials = toInitials(displayName);
        const isLead = member.role === "LEAD";
        return (
          <div 
            key={member.userId} 
            className="group bg-hs-card border border-border/50 rounded-lg p-4 hover:border-border transition-all duration-300 flex flex-col justify-between"
          >
            {/* TOP ROW */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border/40">
                  <AvatarFallback className={cn("text-xs font-semibold text-white", getAvatarColorClass(initials || displayName))}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground leading-none mb-1">{displayName}</span>
                  <span className="text-[10px] text-zinc-500 leading-none">@{member.username}</span>
                </div>
              </div>
              
              <div className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-semibold tracking-wider uppercase",
                isLead 
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/25" 
                  : "bg-hs-accent/15 text-hs-accent border-hs-accent/25"
              )}>
                {isLead ? <Crown className="h-2.5 w-2.5" /> : <Shield className="h-2.5 w-2.5" />}
                {isLead ? "Lead" : "Member"}
              </div>
            </div>

            {/* EMAIL SECTION */}
            <div className="mt-4 flex items-center gap-1.5 text-zinc-400">
              <Mail className="h-3.5 w-3.5 text-zinc-600" />
              <span className="text-xs truncate">{member.email}</span>
            </div>

            {/* MESSAGE BUTTON */}
            <Button variant="ghost" className="mt-4 w-full h-8 text-[11px] text-zinc-400 hover:text-foreground hover:bg-muted/50 gap-2 border border-border/10 group-hover:border-border/30">
              <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />
              Message
            </Button>
          </div>
        );
      })}
    </div>
  );
}
