"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { X, Plus, Loader2, Users, Crown, Shield, Trash2, Save, UserPlus, ChevronDown } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import {
  getTeamMembers,
  addTeamMember,
  removeTeamMember,
  updateTeamMemberRole,
  updateTeam,
  deleteTeam,
  TeamMemberResponse
} from "@/lib/api/teams"
import { getWorkspaceMembers, WorkspaceMemberResponse } from "@/lib/api/workspaces"
import { useWorkspaceStore } from "@/store/workspaceStore"
import { gooeyToast as toast } from "@/components/ui/goey-toaster"

interface ManageTeamSheetProps {
  teamId?: string
  projectId?: string
  teamName?: string
  teamDescription?: string
  trigger: React.ReactNode
  refresh?: () => void
}

const ROLE_CONFIG = {
  LEAD: {
    label: "Lead",
    icon: Crown,
    className: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    dotColor: "bg-amber-400",
  },
  MEMBER: {
    label: "Member",
    icon: Shield,
    className: "bg-violet-500/15 text-violet-400 border-violet-500/25",
    dotColor: "bg-violet-400",
  },
}

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG] ?? ROLE_CONFIG.MEMBER
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase", cfg.className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dotColor)} />
      {cfg.label}
    </span>
  )
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
}

const AVATAR_COLORS = [
  "from-violet-500 to-indigo-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-rose-600",
  "from-pink-500 to-purple-600",
]

function getAvatarColor(userId: string) {
  let hash = 0
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function ManageTeamSheet({
  teamId,
  projectId,
  teamName: initialName = "",
  teamDescription: initialDescription = "",
  trigger,
  refresh = () => {}
}: ManageTeamSheetProps) {
  const { activeWorkspace } = useWorkspaceStore()
  const workspaceId = activeWorkspace?.id ?? ""
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [members, setMembers] = useState<TeamMemberResponse[]>([])
  const [allWorkspaceMembers, setAllWorkspaceMembers] = useState<WorkspaceMemberResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addingMemberId, setAddingMemberId] = useState<string | null>(null)
  const [showAddMember, setShowAddMember] = useState(false)

  const loadData = useCallback(async () => {
    if (!open || !teamId) return
    setLoading(true)
    try {
      const teamMembersList = await getTeamMembers(teamId)
      setMembers(teamMembersList)
      if (workspaceId) {
        const workspaceMembersList = await getWorkspaceMembers(workspaceId)
        setAllWorkspaceMembers(workspaceMembersList)
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to load team data")
    } finally {
      setLoading(false)
    }
  }, [open, teamId, workspaceId])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (open) {
      setName(initialName)
      setDescription(initialDescription)
    }
  }, [open, initialName, initialDescription])

  const handleAddMember = async (userId: string) => {
    if (!teamId) return
    setAddingMemberId(userId)
    try {
      const added = await addTeamMember(teamId, userId, "MEMBER")
      setMembers(prev => [...prev, added])
      setShowAddMember(false)
      toast.success("Member added to team")
      refresh()
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to add team member")
    } finally {
      setAddingMemberId(null)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!teamId) return
    try {
      await removeTeamMember(teamId, userId)
      setMembers(prev => prev.filter(m => m.userId !== userId))
      toast.success("Member removed from team")
      refresh()
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to remove member")
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!teamId) return
    try {
      await updateTeamMemberRole(teamId, userId, newRole)
      setMembers(prev => prev.map(m => m.userId === userId ? { ...m, role: newRole } : m))
      toast.success(`Role updated to ${newRole}`)
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to update role")
    }
  }

  const handleSaveChanges = async () => {
    if (!teamId || !projectId) return
    if (!name.trim()) { toast.error("Team name cannot be empty"); return }
    setSaving(true)
    try {
      await updateTeam(workspaceId, teamId, { name: name.trim(), description: description.trim(), workspaceId })
      toast.success("Team settings saved successfully")
      refresh()
      setOpen(false)
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to update team settings")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTeam = async () => {
    if (!teamId || !projectId) return
    if (!confirm(`Are you sure you want to delete the team "${name}"?`)) return
    try {
      await deleteTeam(workspaceId, teamId)
      toast.success("Team deleted successfully")
      refresh()
      setOpen(false)
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to delete team")
    }
  }

  const availableWorkspaceMembers = allWorkspaceMembers.filter(
    workspaceM => !members.some(teamM => teamM.userId === workspaceM.userId)
  )
  const currentLead = members.find(m => m.role === "LEAD")

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        className="flex w-[440px] flex-col border-0 bg-[#111113] p-0 text-[#E5E1E4] shadow-2xl"
        style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* ── Header ── */}
        <SheetHeader className="relative overflow-hidden border-b border-white/5 px-6 pb-5 pt-6">
          {/* gradient glow backdrop */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-transparent" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-500/30">
              <Users className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <SheetTitle className="text-base font-semibold text-white">
                {name || "Manage Team"}
              </SheetTitle>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                {members.length} member{members.length !== 1 ? "s" : ""}
                {currentLead ? ` · Lead: ${currentLead.fullName || currentLead.username}` : ""}
              </p>
            </div>
          </div>
        </SheetHeader>

        {/* ── Body ── */}
        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-full border border-violet-500/20 bg-violet-500/5" />
              <Loader2 className="absolute inset-0 m-auto h-5 w-5 animate-spin text-violet-400" />
            </div>
            <p className="text-xs text-zinc-600">Loading team data…</p>
          </div>
        ) : (
          <div className="flex-1 space-y-1 overflow-y-auto px-3 py-3 pb-24 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-800">

            {/* ── Section: Team Details ── */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <p className="mb-3 text-[10px] font-bold tracking-widest text-zinc-600 uppercase">Team Details</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-zinc-500">Name</label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Team name"
                    className="h-9 border-white/8 bg-[#0C0C0E] text-sm text-white placeholder:text-zinc-700 focus-visible:ring-1 focus-visible:ring-violet-500/50 focus-visible:ring-offset-0"
                    style={{ borderColor: "rgba(255,255,255,0.07)" }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-zinc-500">Description</label>
                  <Textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="What does this team do?"
                    className="min-h-[80px] resize-none border-white/8 bg-[#0C0C0E] text-sm text-white placeholder:text-zinc-700 focus-visible:ring-1 focus-visible:ring-violet-500/50 focus-visible:ring-offset-0"
                    style={{ borderColor: "rgba(255,255,255,0.07)" }}
                  />
                </div>
              </div>
            </div>

            {/* ── Section: Members ── */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] font-bold tracking-widest text-zinc-600 uppercase">
                  Members <span className="ml-1 rounded-full bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-400">{members.length}</span>
                </p>
                {availableWorkspaceMembers.length > 0 && (
                  <button
                    onClick={() => setShowAddMember(v => !v)}
                    className="flex items-center gap-1 rounded-lg border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold text-violet-400 transition-all hover:bg-violet-500/20"
                  >
                    <UserPlus className="h-3 w-3" />
                    Add
                    <ChevronDown className={cn("h-2.5 w-2.5 transition-transform", showAddMember && "rotate-180")} />
                  </button>
                )}
              </div>

              {/* Add member dropdown */}
              {showAddMember && availableWorkspaceMembers.length > 0 && (
                <div className="mb-3 rounded-lg border border-white/5 bg-[#0C0C0E] p-1">
                  {availableWorkspaceMembers.map(user => (
                    <button
                      key={user.userId}
                      disabled={addingMemberId === user.userId}
                      onClick={() => handleAddMember(user.userId)}
                      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-white/5 disabled:opacity-50"
                    >
                      <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[9px] font-bold text-white", getAvatarColor(user.userId))}>
                        {getInitials(user.fullName || user.username || "?")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-zinc-200">{user.fullName || user.username}</p>
                        <p className="truncate text-[10px] text-zinc-600">{user.email}</p>
                      </div>
                      {addingMemberId === user.userId ? (
                        <Loader2 className="h-3 w-3 animate-spin text-violet-400" />
                      ) : (
                        <Plus className="h-3 w-3 text-zinc-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Member list */}
              <div className="space-y-1">
                {members.length > 0 ? members.map(member => (
                  <div
                    key={member.userId}
                    className="group flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-white/[0.03]"
                  >
                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-bold text-white ring-2 ring-black", getAvatarColor(member.userId))}>
                      {getInitials(member.fullName || member.username || "?")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-zinc-200">{member.fullName || member.username}</p>
                      <p className="truncate text-[10px] text-zinc-600">{member.email}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Select
                        value={member.role}
                        onValueChange={val => handleRoleChange(member.userId, val)}
                      >
                        <SelectTrigger className="h-6 w-auto gap-1 border-0 bg-transparent p-0 text-[10px] shadow-none focus:ring-0">
                          <RoleBadge role={member.role} />
                        </SelectTrigger>
                        <SelectContent className="border-zinc-800 bg-[#1A1A1C] text-[#E5E1E4]">
                          <SelectItem value="LEAD">
                            <span className="flex items-center gap-1.5">
                              <Crown className="h-3 w-3 text-amber-400" /> Lead
                            </span>
                          </SelectItem>
                          <SelectItem value="MEMBER">
                            <span className="flex items-center gap-1.5">
                              <Shield className="h-3 w-3 text-violet-400" /> Member
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <button
                        onClick={() => handleRemoveMember(member.userId)}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-700 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-800/60 py-8">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900">
                      <Users className="h-4 w-4 text-zinc-700" />
                    </div>
                    <p className="text-xs text-zinc-600">No members yet</p>
                    <p className="text-[10px] text-zinc-700">Add someone using the button above</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Section: Danger Zone ── */}
            <div className="rounded-xl border border-red-500/10 bg-red-500/[0.03] p-4">
              <div className="mb-3 flex items-start gap-2">
                <Trash2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500/60" />
                <div>
                  <p className="text-xs font-semibold text-red-400">Delete Team</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-600">
                    This will permanently remove the team. Members will remain in the organization.
                  </p>
                </div>
              </div>
              <button
                onClick={handleDeleteTeam}
                className="w-full rounded-lg border border-red-500/15 bg-red-500/5 py-2 text-xs font-semibold text-red-500/80 transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
              >
                Delete this team
              </button>
            </div>

          </div>
        )}

        {/* ── Footer: Save Button ── */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/5 bg-[#111113]/90 p-4 backdrop-blur-sm">
          <Button
            onClick={handleSaveChanges}
            disabled={saving || loading}
            className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 py-5 text-xs font-bold tracking-widest text-white uppercase shadow-lg shadow-violet-500/20 transition-all hover:from-violet-500 hover:to-violet-400 hover:shadow-violet-500/30 disabled:opacity-50"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="h-3.5 w-3.5" />
                Save Changes
              </span>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
