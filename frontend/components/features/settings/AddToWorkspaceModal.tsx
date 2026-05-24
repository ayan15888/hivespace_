"use client";

import { useState, useEffect } from "react";
import { Loader2, Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, getAvatarColorClass } from "@/lib/utils";
import {
  addWorkspaceMember,
  getWorkspaceMembers,
  WorkspaceResponse,
} from "@/lib/api/workspaces";
import { getOrganizationMembers, MemberResponse } from "@/lib/api/orgs";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import { useQueryClient } from "@tanstack/react-query";

interface AddToWorkspaceModalProps {
  open: boolean;
  onClose: () => void;
  /** The org member to add */
  member: { id: string; fullName: string; username: string; email?: string | null } | null;
  /** All workspaces the org has — caller provides this */
  workspaces: WorkspaceResponse[];
  /** The org/tenant id — used to compute who is already in a workspace */
  orgId: string;
}

export function AddToWorkspaceModal({
  open,
  onClose,
  member,
  workspaces,
  orgId,
}: AddToWorkspaceModalProps) {
  const queryClient = useQueryClient();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER" | "VIEWER">("MEMBER");
  const [adding, setAdding] = useState(false);
  const [alreadyInWorkspaces, setAlreadyInWorkspaces] = useState<Set<string>>(new Set());
  const [loadingMemberships, setLoadingMemberships] = useState(false);

  // When modal opens for a member, check which workspaces they already belong to
  useEffect(() => {
    if (!open || !member || workspaces.length === 0) return;

    const check = async () => {
      setLoadingMemberships(true);
      const inSet = new Set<string>();
      await Promise.all(
        workspaces.map(async (ws) => {
          try {
            const wsMembers = await getWorkspaceMembers(ws.id);
            if (wsMembers.some((m) => m.userId === member.id)) {
              inSet.add(ws.id);
            }
          } catch {
            // ignore per-workspace errors silently
          }
        })
      );
      setAlreadyInWorkspaces(inSet);
      setLoadingMemberships(false);
      // Auto-select first available workspace
      const first = workspaces.find((ws) => !inSet.has(ws.id));
      setSelectedWorkspaceId(first?.id ?? "");
    };

    check();
  }, [open, member, workspaces]);

  const availableWorkspaces = workspaces.filter((ws) => !alreadyInWorkspaces.has(ws.id));

  const handleAdd = async () => {
    if (!member || !selectedWorkspaceId) return;
    setAdding(true);
    try {
      await addWorkspaceMember(selectedWorkspaceId, { userId: member.id, role });
      toast.success(
        `${member.fullName || member.username} added to workspace`
      );
      queryClient.invalidateQueries({ queryKey: ["workspaceMembers", selectedWorkspaceId] });
      onClose();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to add member to workspace");
    } finally {
      setAdding(false);
    }
  };

  const displayName = member?.fullName || member?.username || "";
  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px] bg-zinc-900 border-zinc-800 text-zinc-100 rounded-2xl p-0 overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#7C5CFC] to-violet-400" />
        <div className="p-6">
          <DialogHeader className="mb-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-full bg-[#7C5CFC]/10 border border-[#7C5CFC]/20 flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4 text-[#7C5CFC]" />
              </div>
              <DialogTitle className="text-base font-semibold text-zinc-100">
                Add to workspace
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-zinc-400 leading-relaxed">
              Assign{" "}
              <span className="font-semibold text-zinc-200">{displayName}</span> to a workspace
              with a specific access role.
            </DialogDescription>
          </DialogHeader>

          {/* Member preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/40 mb-5">
            <Avatar className="h-8 w-8">
              <AvatarFallback
                className={cn("text-xs font-semibold text-white", getAvatarColorClass(displayName))}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-zinc-200 truncate">{displayName}</span>
              {member?.email && (
                <span className="text-xs text-zinc-500 truncate">{member.email}</span>
              )}
            </div>
          </div>

          {loadingMemberships ? (
            <div className="flex items-center justify-center py-6 text-zinc-500 gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking memberships...
            </div>
          ) : availableWorkspaces.length === 0 ? (
            <div className="rounded-xl bg-zinc-800/40 border border-zinc-700/30 p-4 text-center text-sm text-zinc-500">
              This member is already part of all available workspaces.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  Workspace
                </Label>
                <Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
                  <SelectTrigger className="w-full h-10 bg-zinc-800 border-zinc-700 text-zinc-200 rounded-xl text-sm">
                    <SelectValue placeholder="Select a workspace..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
                    {availableWorkspaces.map((ws) => (
                      <SelectItem key={ws.id} value={ws.id}>
                        {ws.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  Role in workspace
                </Label>
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as "ADMIN" | "MEMBER" | "VIEWER")}
                >
                  <SelectTrigger className="w-full h-10 bg-zinc-800 border-zinc-700 text-zinc-200 rounded-xl text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
                    <SelectItem value="ADMIN">Admin — full workspace management</SelectItem>
                    <SelectItem value="MEMBER">Member — standard access</SelectItem>
                    <SelectItem value="VIEWER">Viewer — read-only access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="border-0 bg-transparent p-0 -mx-0 -mb-0 mt-6">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={adding}
              className="text-zinc-400 hover:text-zinc-200 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={adding || !selectedWorkspaceId || availableWorkspaces.length === 0}
              className="bg-[#7C5CFC] hover:bg-[#6D4EE0] text-white rounded-xl font-semibold px-6"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add to Workspace"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
