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
import { X, Plus, Loader2 } from "lucide-react"
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
import { getOrganizationMembers, MemberResponse } from "@/lib/api/orgs"
import { useWorkspaceStore } from "@/store/workspaceStore"
import { gooeyToast as toast } from "@/components/ui/goey-toaster"

interface ManageTeamSheetProps {
  teamId: string
  workspaceId: string
  teamName: string
  teamDescription: string
  trigger: React.ReactNode
  refresh: () => void
}

export function ManageTeamSheet({ 
  teamId, 
  workspaceId, 
  teamName: initialName, 
  teamDescription: initialDescription, 
  trigger, 
  refresh 
}: ManageTeamSheetProps) {
  const { activeWorkspace } = useWorkspaceStore()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [members, setMembers] = useState<TeamMemberResponse[]>([])
  const [allOrgMembers, setAllOrgMembers] = useState<MemberResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addingMemberId, setAddingMemberId] = useState<string | null>(null)

  // Fetch live team members and org members when the sheet opens
  const loadData = useCallback(async () => {
    if (!open) return
    setLoading(true)
    try {
      const teamMembersList = await getTeamMembers(teamId)
      setMembers(teamMembersList)

      if (activeWorkspace?.tenantId) {
        const orgMembersList = await getOrganizationMembers(activeWorkspace.tenantId)
        setAllOrgMembers(orgMembersList)
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to load team data")
    } finally {
      setLoading(false)
    }
  }, [open, teamId, activeWorkspace?.tenantId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Initialize input fields when team settings open
  useEffect(() => {
    if (open) {
      setName(initialName)
      setDescription(initialDescription)
    }
  }, [open, initialName, initialDescription])

  // Add a user to the team
  const handleAddMember = async (userId: string) => {
    setAddingMemberId(userId)
    try {
      const added = await addTeamMember(teamId, userId, "MEMBER")
      setMembers((prev) => [...prev, added])
      toast.success("Member added to team")
      refresh()
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to add team member")
    } finally {
      setAddingMemberId(null)
    }
  }

  // Remove a user from the team
  const handleRemoveMember = async (userId: string) => {
    try {
      await removeTeamMember(teamId, userId)
      setMembers((prev) => prev.filter((m) => m.userId !== userId))
      toast.success("Member removed from team")
      refresh()
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to remove member")
    }
  }

  // Update a team member's role (Lead vs Member)
  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateTeamMemberRole(teamId, userId, newRole)
      setMembers((prev) =>
        prev.map((m) => (m.userId === userId ? { ...m, role: newRole } : m))
      )
      toast.success(`Role updated to ${newRole}`)
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to update role")
    }
  }

  // Save changes (Team details: name & description)
  const handleSaveChanges = async () => {
    if (!name.trim()) {
      toast.error("Team name cannot be empty")
      return
    }
    setSaving(true)
    try {
      await updateTeam(workspaceId, teamId, {
        name: name.trim(),
        description: description.trim(),
        workspaceId
      })
      toast.success("Team settings saved successfully")
      refresh()
      setOpen(false)
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to update team settings")
    } finally {
      setSaving(false)
    }
  }

  // Delete the team cleanly
  const handleDeleteTeam = async () => {
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

  // Find candidate users in organization who are not already in this team
  const availableOrgMembers = allOrgMembers.filter(
    (orgM) => !members.some((teamM) => teamM.userId === orgM.id)
  )

  const currentLead = members.find((m) => m.role === "LEAD")

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger}
      </SheetTrigger>
      <SheetContent className="flex w-[420px] flex-col border-zinc-800 bg-[#1B1B1D] p-0 text-[#E5E1E4] shadow-2xl">
        <SheetHeader className="border-b border-zinc-800/50 p-6">
          <SheetTitle className="text-lg font-semibold text-[#E5E1E4]">
            Manage Team: {name}
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          </div>
        ) : (
          <div className="flex-1 space-y-8 overflow-y-auto p-6 pb-20">
            {/* TEAM DETAILS */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold tracking-widest text-zinc-600 uppercase">
                Team Details
              </h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-500">
                    Team Name
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-9 border-zinc-800 bg-[#0E0E10] text-sm focus:border-violet-500/50 focus:ring-0 text-[#E5E1E4]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-500">
                    Description
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[100px] resize-none border-zinc-800 bg-[#0E0E10] text-sm focus:border-violet-500/50 focus:ring-0 text-[#E5E1E4]"
                  />
                </div>
                {members.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-500">
                      Team Lead
                    </label>
                    <Select 
                      value={currentLead?.userId || "none"}
                      onValueChange={(userId) => {
                        if (userId !== "none") {
                          handleRoleChange(userId, "LEAD")
                          // Demote other leads
                          members.forEach((m) => {
                            if (m.role === "LEAD" && m.userId !== userId) {
                              handleRoleChange(m.userId, "MEMBER")
                            }
                          })
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 border-zinc-800 bg-[#0E0E10] text-sm text-[#E5E1E4]">
                        <SelectValue placeholder="Select Team Lead" />
                      </SelectTrigger>
                      <SelectContent className="border-zinc-800 bg-[#1B1B1D] text-[#E5E1E4]">
                        <SelectItem value="none">No Team Lead Assigned</SelectItem>
                        {members.map((m) => (
                          <SelectItem key={m.userId} value={m.userId}>
                            {m.fullName || m.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </section>

            {/* MEMBERS */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold tracking-widest text-zinc-600 uppercase">
                  Members ({members.length})
                </h3>
                {availableOrgMembers.length > 0 && (
                  <Select onValueChange={(userId) => handleAddMember(userId)}>
                    <SelectTrigger className="h-7 w-32 border-zinc-800 bg-transparent text-[10px] text-violet-400 hover:text-violet-300">
                      <SelectValue placeholder="+ Add Member" />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-800 bg-[#1B1B1D] text-[#E5E1E4]">
                      {availableOrgMembers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.fullName || user.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-3">
                {members.length > 0 ? members.map((member) => (
                  <div
                    key={member.userId}
                    className="group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7 border border-zinc-700/50">
                        <AvatarFallback className="bg-zinc-800 text-[10px] text-zinc-400 font-bold">
                          {(member.fullName || member.username || "M").substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm text-zinc-300">{member.fullName || member.username}</span>
                        <span className="text-[9px] text-zinc-600 font-mono">{member.email}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={member.role}
                        onValueChange={(val) => handleRoleChange(member.userId, val)}
                      >
                        <SelectTrigger className="h-7 w-24 border-zinc-800 bg-transparent text-[10px] text-[#E5E1E4]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-zinc-800 bg-[#1B1B1D] text-[#E5E1E4]">
                          <SelectItem value="LEAD">Lead</SelectItem>
                          <SelectItem value="MEMBER">Member</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMember(member.userId)}
                        className="h-7 w-7 text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )) : (
                  <p className="text-xs text-zinc-600 text-center py-4 border border-dashed border-zinc-800/80 rounded-xl">
                    No members on this team yet. Add one from above!
                  </p>
                )}
              </div>
            </section>

            {/* DANGER ZONE */}
            <section className="space-y-4 rounded-[20px] border border-red-500/10 bg-red-500/5 p-4">
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-red-400">
                  Danger Zone
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Deleting this team will completely remove it from the project workspace. Members will still belong to the organization.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleDeleteTeam}
                className="h-8 w-full border-red-400/30 text-xs text-red-400 transition-colors hover:bg-red-400 hover:text-white"
              >
                Delete Team
              </Button>
            </section>
          </div>
        )}

        <div className="mt-auto border-t border-zinc-800/50 bg-[#1B1B1D] p-6">
          <Button 
            onClick={handleSaveChanges}
            disabled={saving || loading}
            className="w-full rounded-md bg-gradient-to-br from-violet-500 to-violet-600 py-5 text-xs font-bold tracking-wider text-white uppercase shadow-lg shadow-violet-500/20 transition-all duration-300 hover:from-violet-600 hover:to-violet-700 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : "Save Changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
