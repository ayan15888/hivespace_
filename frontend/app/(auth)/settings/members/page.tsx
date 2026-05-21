"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  UserPlus, 
  MoreHorizontal, 
  Mail, 
  Link as LinkIcon, 
  ExternalLink, 
  RefreshCw, 
  Plus 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CTAButton } from "@/components/common/CTAButton";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useMembers } from "@/hooks/useMembers";
import { useAuth } from "@/hooks/useAuth";
import { useOrgStore } from "@/store/orgStore";
import { getTenantInvitations, generateInvite } from "@/lib/api/invites";
import { InviteResponse } from "@/types/invite";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import { InviteModal } from "@/components/common/InviteModal";

const pendingInvites: Array<{ email: string; role: string; expires: string }> = [];

const roleColors: Record<string, string> = {
  "Org Owner": "text-[#7C5CFC] bg-[#7C5CFC]/10 border-[#7C5CFC]/20",
  "Org Admin": "text-blue-400 bg-blue-400/10 border-blue-400/20",
  "Workspace Admin": "text-teal-400 bg-teal-400/10 border-teal-400/20",
  "Team Lead": "text-amber-400 bg-amber-400/10 border-amber-400/20",
  "Member": "text-zinc-400 bg-zinc-800 border-zinc-700",
  "Viewer": "text-zinc-500 bg-zinc-800 border-zinc-700",
  "Billing Admin": "text-green-400 bg-green-400/10 border-green-400/20",
};

export default function MembersSettings() {
  const { members, loading } = useMembers();
  const { user } = useAuth();
  const { activeOrg } = useOrgStore();

  // Dynamic Invite Links
  const [inviteLinks, setInviteLinks] = useState<InviteResponse[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);

  // Popover States
  const [popoverRole, setPopoverRole] = useState("Member");
  const [popoverLimitUses, setPopoverLimitUses] = useState(false);
  const [popoverMaxUses, setPopoverMaxUses] = useState(10);
  const [popoverGenerating, setPopoverGenerating] = useState(false);

  const fetchInvitations = async () => {
    if (!activeOrg?.id) return;
    setInvitesLoading(true);
    try {
      const data = await getTenantInvitations(activeOrg.id);
      setInviteLinks(data);
    } catch (err) {
      console.error("Failed to load invitations", err);
    } finally {
      setInvitesLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, [activeOrg?.id]);

  const handleCreateInviteLink = async () => {
    if (!activeOrg?.id) return;
    setPopoverGenerating(true);
    try {
      const response = await generateInvite({
        tenantId: activeOrg.id,
        role: popoverRole.toUpperCase(),
        maxUses: popoverLimitUses ? popoverMaxUses : 999999,
      });
      setInviteLinks((prev) => [response, ...prev]);
      toast.success("Successfully generated invite link and PIN copied!");
      
      const copyUrl = `${window.location.origin}/invite/${activeOrg.slug}/${response.token}`;
      navigator.clipboard.writeText(`Invite Link: ${copyUrl}\nSecurity PIN: ${response.pin}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate link");
    } finally {
      setPopoverGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl px-8 py-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-[#E5E1E4]">Members</h1>
        <p className="text-sm text-zinc-400 mt-1">
          {members.length} members in {activeOrg?.name || "Organization"}{" "}
          {activeOrg?.ownerEmail && `· Owner: ${activeOrg.ownerEmail}`}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search members..."
            className="pl-9 bg-zinc-800 border-zinc-700 h-9 text-sm focus-visible:ring-hs-accent/50"
          />
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="w-[140px] bg-zinc-800 border-zinc-700 h-9 text-sm text-zinc-300">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="owner">Org Owner</SelectItem>
            <SelectItem value="admin">Org Admin</SelectItem>
            <SelectItem value="lead">Team Lead</SelectItem>
            <SelectItem value="member">Member</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <InviteModal
            trigger={
              <CTAButton className="flex items-center gap-2">
                <UserPlus className="h-3.5 w-3.5" />
                Invite Member
              </CTAButton>
            }
          />
        </div>
      </div>

      <div className="space-y-1">
        {loading ? (
          <div className="py-4 text-center text-zinc-500 text-sm">
            Loading members...
          </div>
        ) : members.length === 0 ? (
          <div className="py-4 text-center text-zinc-500 text-sm">
            No members found.
          </div>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              className="h-14 flex items-center gap-3 px-4 rounded-md transition-colors hover:bg-zinc-800/30 group"
            >
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-zinc-800 text-xs text-zinc-400 font-medium">
                    {member.fullName?.substring(0, 2).toUpperCase() ||
                      member.username?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#201F21] bg-green-500"
                  )}
                />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#E5E1E4] truncate">
                    {member.fullName}
                  </span>
                  {user?.id === member.id && (
                    <span className="text-[10px] text-zinc-500 font-medium">
                      (you)
                    </span>
                  )}
                </div>
                <span className="text-xs text-zinc-400 truncate">
                  {member.email}
                </span>
              </div>

              <div className="ml-6">
                <Select
                  defaultValue={member.role === "ADMIN" ? "Org Owner" : "Member"}
                >
                  <SelectTrigger
                    className={cn(
                      "h-7 text-[10px] px-2 py-0 min-w-[110px] border font-medium rounded-sm bg-transparent",
                      roleColors[member.role === "ADMIN" ? "Org Owner" : "Member"]
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
                    <SelectItem value="Org Owner">Org Owner</SelectItem>
                    <SelectItem value="Team Lead">Team Lead</SelectItem>
                    <SelectItem value="Member">Member</SelectItem>
                    <SelectItem value="Billing Admin">Billing Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="ml-auto text-xs text-zinc-500">Just now</div>

              <button className="p-2 text-zinc-500 hover:text-zinc-200 transition-opacity opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-10">
        <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-4 px-4">
          PENDING INVITES
        </h3>
        <div className="space-y-1">
          {pendingInvites.length === 0 ? (
            <div className="text-xs text-zinc-500 px-4 py-3 font-normal border border-dashed border-zinc-800/50 rounded-lg text-center">
              No pending invitations.
            </div>
          ) : (
            pendingInvites.map((invite) => (
              <div
                key={invite.email}
                className="h-12 flex items-center gap-3 px-4 rounded-md hover:bg-zinc-800/20 group"
              >
                <div className="h-8 w-8 rounded-md bg-zinc-800 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-zinc-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-zinc-300">{invite.email}</span>
                  <span className="text-[10px] text-zinc-500 mt-0.5">
                    {invite.role}
                  </span>
                </div>
                <div className="ml-auto flex items-center gap-4">
                  <span className="text-[10px] text-zinc-600">
                    Expires in {invite.expires}
                  </span>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="text-[10px] text-zinc-400 hover:text-zinc-200 uppercase font-bold tracking-widest px-2 py-1">
                      Resend
                    </button>
                    <button className="text-[10px] text-red-400/70 hover:text-red-400 uppercase font-bold tracking-widest px-2 py-1">
                      Revoke
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-10">
        <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-4">
          INVITE LINKS
        </h3>
        <p className="text-xs text-zinc-400 mb-6 px-4">
          Share these links to let people join without sending individual emails. Anyone
          with the link can join with the assigned role.
        </p>

        <div className="space-y-3">
          {invitesLoading ? (
            <div className="text-xs text-zinc-500 px-4 py-8 border border-dashed border-zinc-800/50 rounded-lg text-center animate-pulse">
              Loading invite link history...
            </div>
          ) : inviteLinks.length === 0 ? (
            <div className="text-xs text-[#E5E1E4]/60 px-4 py-8 border border-dashed border-zinc-800/60 rounded-lg text-center bg-zinc-950/20">
              No active invite links. Create one below to share!
            </div>
          ) : (
            inviteLinks.map((link) => {
              const isActive = link.status === "ACTIVE";
              const inviteUrl =
                typeof window !== "undefined"
                  ? `${window.location.origin}/invite/${activeOrg?.slug}/${link.token}`
                  : `hivespace.app/invite/${activeOrg?.slug || "org"}/${link.token}`;

              const createdDate = new Date(link.createdAt).toLocaleDateString();
              const expiresDate = new Date(link.expiresAt).toLocaleDateString();

              const daysLeft = Math.max(
                0,
                Math.ceil(
                  (new Date(link.expiresAt).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24)
                )
              );

              return (
                <div
                  key={link.id}
                  className={cn(
                    "bg-[#272629] border border-zinc-800/50 rounded-lg p-4 group transition-all duration-300 hover:border-zinc-700/60",
                    !isActive && "opacity-60"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-3.5 w-3.5 text-zinc-400" />
                      <Badge
                        variant="outline"
                        className="bg-zinc-800 border-zinc-700 text-[10px] font-medium px-2 py-0.5 text-zinc-300 rounded-sm"
                      >
                        {link.role}
                      </Badge>
                      <span className="text-[11px] text-zinc-500 ml-3 font-medium">
                        Used {link.currentUses} times
                      </span>
                      <span className="text-[11px] text-zinc-600">
                        by {link.inviterUsername}
                      </span>
                    </div>
                    <Badge
                      className={cn(
                        "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border",
                        isActive
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : "bg-zinc-800 border-zinc-700 text-zinc-600"
                      )}
                    >
                      {link.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <div className="bg-zinc-800/60 rounded px-2.5 py-1.5 flex-1 min-w-0 border border-zinc-800">
                      <p className="text-[10px] font-mono text-zinc-400 truncate">
                        {inviteUrl}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(inviteUrl);
                        toast.success("Invite link copied!");
                      }}
                      className="text-[10px] font-bold text-[#7C5CFC] uppercase tracking-wider hover:opacity-80 transition-opacity ml-2 shrink-0 cursor-pointer"
                    >
                      Copy Link
                    </button>
                    {isActive && link.pin && (
                      <div className="flex items-center gap-1.5 ml-2">
                        <span className="text-[9px] text-zinc-500">PIN:</span>
                        <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[9px] rounded-sm px-1.5 py-0.5 tracking-wider">
                          {link.pin}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-5 text-[10px] font-medium text-zinc-600">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(daysLeft <= 1 && isActive && "text-amber-500")}
                      >
                        Expires: {expiresDate} ·{" "}
                        {daysLeft === 0 ? "Expired" : `${daysLeft} days left`}
                      </span>
                    </div>
                    <span>
                      Max uses:{" "}
                      {link.maxUses >= 999999
                        ? "Unlimited"
                        : `${link.maxUses} (${link.currentUses} used)`}
                    </span>
                    <span>Created: {createdDate}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <Popover>
          {/* <PopoverTrigger asChild>
            <button className="mt-4 w-full h-11 flex items-center justify-center gap-2 border border-dashed border-zinc-700 rounded-lg text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-300 transition-all cursor-pointer">
              <Plus className="h-3.5 w-3.5" />
              Create invite link
            </button>
          </PopoverTrigger> */}
          <PopoverContent className="bg-zinc-900 border border-zinc-700 rounded-lg p-5 w-72 shadow-2xl z-50">
            <h3 className="text-sm font-medium text-[#E5E1E4] mb-4">
              Create Invite Link
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">
                  Invite as
                </label>
                <Select value={popoverRole} onValueChange={setPopoverRole}>
                  <SelectTrigger className="w-full bg-zinc-800 border-zinc-700 h-9 text-xs text-zinc-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-300">
                    <SelectItem value="Member">Member</SelectItem>
                    <SelectItem value="Workspace Admin">Workspace Admin</SelectItem>
                    <SelectItem value="Team Lead">Team Lead</SelectItem>
                    <SelectItem value="Viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between py-1.5 border-t border-b border-zinc-800/60">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                  Limit uses
                </label>
                <Switch
                  checked={popoverLimitUses}
                  onCheckedChange={setPopoverLimitUses}
                  className="data-[state=checked]:bg-[#7C5CFC]"
                />
              </div>

              {popoverLimitUses && (
                <div className="animate-in fade-in slide-in-from-top-1.5 duration-200">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">
                    Max uses
                  </label>
                  <Input
                    type="number"
                    value={popoverMaxUses}
                    onChange={(e) => setPopoverMaxUses(Number(e.target.value))}
                    className="bg-zinc-800 border-zinc-700 h-9 text-xs w-24 focus-visible:ring-[#7C5CFC]/30 text-zinc-300"
                  />
                </div>
              )}

              <CTAButton
                onClick={handleCreateInviteLink}
                disabled={popoverGenerating}
                className="w-full h-10 mt-2 flex items-center justify-center shrink-0"
              >
                {popoverGenerating ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin mr-1.5" />
                    Generating...
                  </>
                ) : (
                  "Generate Link"
                )}
              </CTAButton>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
