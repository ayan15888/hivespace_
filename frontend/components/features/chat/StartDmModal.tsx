"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Loader2, MessageSquare, User } from "lucide-react";
import { openDm } from "@/lib/api/channels";
import { getWorkspaceMembers } from "@/lib/api/workspaces";
import type { WorkspaceMemberResponse } from "@/lib/api/workspaces";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import { cn } from "@/lib/utils";

interface StartDmModalProps {
  isOpen: boolean;
  workspaceId: string;
  themeColor?: string;
  onClose: () => void;
}

export function StartDmModal({ 
  isOpen, 
  workspaceId, 
  themeColor = "var(--hs-accent)", 
  onClose 
}: StartDmModalProps) {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const upsertChannel = useChatStore((state) => state.upsertChannel);

  const [members, setMembers] = useState<WorkspaceMemberResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load workspace members when modal opens
  useEffect(() => {
    if (!isOpen || !workspaceId) return;

    setLoading(true);
    getWorkspaceMembers(workspaceId)
      .then((data) => {
        // Filter out ourselves
        const others = data.filter((m) => m.userId !== currentUser?.id);
        setMembers(others);
      })
      .catch((err) => {
        console.error("Failed to load workspace members", err);
        toast.error("Failed to load workspace members");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, workspaceId, currentUser?.id]);

  const handleStartDm = async (targetUserId: string, targetName: string) => {
    setActionLoading(targetUserId);
    try {
      const channel = await openDm(workspaceId, targetUserId);
      upsertChannel(channel);
      toast.success(`Chat started with ${targetName}`);
      onClose();
      router.push(`/dashboard/chat/${channel.id}`);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to start direct message");
    } finally {
      setActionLoading(null);
    }
  };

  const getInitials = (fullName: string) => {
    if (!fullName) return "?";
    return fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getAvatarColorClass = (userId: string, avatarColor?: string) => {
    if (avatarColor) return avatarColor;
    const colors = ["bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-orange-500", "bg-pink-500"];
    const idx = Math.abs(userId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)) % colors.length;
    return colors[idx];
  };

  // Filter members based on search
  const filteredMembers = members.filter((m) => {
    const q = searchQuery.toLowerCase();
    const nameMatch = m.fullName?.toLowerCase().includes(q);
    const usernameMatch = m.username?.toLowerCase().includes(q);
    const emailMatch = m.email?.toLowerCase().includes(q);
    return nameMatch || usernameMatch || emailMatch;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] bg-hs-card border-border/50 text-foreground overflow-hidden p-0 rounded-[28px] shadow-2xl flex flex-col max-h-[85vh]">
        <div 
          className="h-2 w-full shrink-0 transition-colors duration-500" 
          style={{ backgroundColor: themeColor }} 
        />
        
        <div className="p-6 flex flex-col flex-1 overflow-hidden">
          <DialogHeader className="mb-4 shrink-0">
            <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">Direct Messages</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs">
              Start a private conversation with another member in this workspace.
            </DialogDescription>
          </DialogHeader>

          {/* Search bar */}
          <div className="relative flex items-center shrink-0 mb-4">
            <Search className="absolute left-3 h-4 w-4 text-zinc-500" />
            <Input 
              placeholder="Search by name, username, or email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-hs-main border-border/50 focus:border-hs-accent/50 focus:ring-0 rounded-xl text-foreground placeholder-zinc-700 pl-10"
            />
          </div>

          {/* Member List */}
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1 min-h-[250px] scrollbar-thin">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-zinc-500">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                <span className="text-xs">Loading workspace members...</span>
              </div>
            ) : filteredMembers.length > 0 ? (
              filteredMembers.map((member) => (
                <div 
                  key={member.id}
                  onClick={() => handleStartDm(member.userId, member.fullName || member.username)}
                  className="group flex items-center justify-between p-2.5 rounded-xl border border-transparent hover:border-border/30 hover:bg-muted/15 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 shadow-md">
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt="" className="object-cover h-full w-full" />
                      ) : (
                        <AvatarFallback className={cn("text-xs font-bold text-white", getAvatarColorClass(member.userId, member.avatarUrl))}>
                          {getInitials(member.fullName || member.username)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground group-hover:underline">
                        {member.fullName || member.username}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-medium">
                        @{member.username} {member.email && `• ${member.email}`}
                      </span>
                    </div>
                  </div>

                  <Button 
                    size="sm" 
                    variant="ghost"
                    disabled={actionLoading !== null}
                    className="h-8 px-3 rounded-lg text-xs bg-zinc-800/40 text-muted-foreground group-hover:bg-hs-accent group-hover:text-white transition-all flex items-center gap-1.5"
                    style={{
                      "--hs-accent": themeColor
                    } as React.CSSProperties}
                  >
                    {actionLoading === member.userId ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Message</span>
                      </>
                    )}
                  </Button>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-zinc-500">
                <User className="h-6 w-6 text-zinc-600" />
                <span className="text-xs italic">No other members found</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
