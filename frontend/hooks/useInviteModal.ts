"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { gooeyToast as toast } from "@/components/ui/goey-toaster"
import { generateInvite } from "@/lib/api/invites"
import type { InviteResponse } from "@/types/invite"
import { queryKeys } from "@/lib/queryKeys"
import { useOrgStore } from "@/store/orgStore"
import { useWorkspaceStore } from "@/store/workspaceStore"
import { useAuth } from "@/hooks/useAuth"
import { useMembers } from "@/hooks/useMembers"
import { useTeams } from "@/hooks/useTeams"
import type { OrgResponse } from "@/lib/api/orgs"
import type { WorkspaceResponse } from "@/lib/api/workspaces"
import type { TeamResponse } from "@/lib/api/teams"
import type { TenantRole } from "@/types/roles"

type Step = "form" | "success"
type ShareableInvite = { token: string; pin: string }
type UiRole = TenantRole

function getRoleDescription(role: TenantRole) {
  switch (role) {
    case "ADMIN":
      return "Full org access, can manage members and settings"
    case "BILLING_ADMIN":
      return "Billing and invoices only, no access to projects or teams"
    case "MEMBER":
      return "Can be assigned tasks, join channels, edit docs"
    case "OWNER":
      return "Organization owner"
    default:
      return ""
  }
}

export interface UseInviteModalReturn {
  // external context
  activeOrg: OrgResponse | null
  workspaces: WorkspaceResponse[]
  activeWorkspace: WorkspaceResponse | null

  // derived permissions (currently unused by UI, but computed exactly as before)
  isOwner: boolean
  isAdmin: boolean

  // teams query (used by TeamSelectionSection)
  teams: TeamResponse[]
  teamsLoading: boolean

  // state
  step: Step
  emails: string[]
  emailInput: string
  role: UiRole
  message: string
  selectedWorkspaces: string[]
  selectedTeams: string[]
  generatedInvite: InviteResponse | null
  shareableInvite: ShareableInvite | null

  // setters/handlers for UI
  setEmailInput: (value: string) => void
  setRole: (value: UiRole) => void
  setMessage: (value: string) => void
  setSelectedWorkspaces: React.Dispatch<React.SetStateAction<string[]>>
  setSelectedTeams: React.Dispatch<React.SetStateAction<string[]>>

  addEmail: (e?: React.KeyboardEvent) => void
  removeEmail: (email: string) => void
  sendInvites: () => void
  sendLoading: boolean

  generateShareableInvite: () => void
  copyInviteLink: () => void

  reset: () => void
  closeModal: () => void

  roleDescription: string
}

export function useInviteModal(params: { setOpen: (open: boolean) => void }): UseInviteModalReturn {
  const queryClient = useQueryClient()

  const { activeOrg } = useOrgStore()
  const { workspaces, activeWorkspace } = useWorkspaceStore()
  const { user } = useAuth()
  const { members } = useMembers()

  const { teams, loading: teamsLoading } = useTeams(activeWorkspace?.id)

  const isOwner = !!user && !!activeOrg && user.email === activeOrg.ownerEmail
  const currentUserMember = members.find((m) => m.email === user?.email)
  const isAdmin = !isOwner && currentUserMember?.role === "ADMIN"

  const [step, setStep] = React.useState<Step>("form")
  const [emails, setEmails] = React.useState<string[]>([])
  const [emailInput, setEmailInput] = React.useState("")
  const [role, setRole] = React.useState<UiRole>("MEMBER")
  const [message, setMessage] = React.useState("")
  const [selectedWorkspaces, setSelectedWorkspaces] = React.useState<string[]>([])
  const [selectedTeams, setSelectedTeams] = React.useState<string[]>([])
  const [generatedInvite, setGeneratedInvite] = React.useState<InviteResponse | null>(null)
  const [shareableInvite, setShareableInvite] = React.useState<ShareableInvite | null>(null)

  const addEmail = React.useCallback(
    (e?: React.KeyboardEvent) => {
      if (e && e.key !== "Enter") return
      if (e) e.preventDefault()

      const trimmed = emailInput.trim()
      if (trimmed && !emails.includes(trimmed)) {
        setEmails([...emails, trimmed])
        setEmailInput("")
      }
    },
    [emailInput, emails],
  )

  const removeEmail = React.useCallback(
    (email: string) => {
      setEmails(emails.filter((e) => e !== email))
    },
    [emails],
  )

  const sendInvitesMutation = useMutation({
    mutationFn: async (args: {
      targetEmails: string[]
      role: TenantRole
      selectedTeams: string[]
      selectedWorkspaces: string[]
    }) => {
      if (!activeOrg) throw new Error("No active organization found")

      const payloads: any[] = []

      args.targetEmails.forEach((email) => {
        if (args.selectedTeams.length > 0) {
          args.selectedTeams.forEach((teamId) => {
            payloads.push({
              tenantId: activeOrg.id,
              workspaceId: activeWorkspace?.id,
              teamId,
              role: args.role,
              maxUses: 1,
              email,
            })
          })
        } else if (args.selectedWorkspaces.length > 0) {
          args.selectedWorkspaces.forEach((workspaceId) => {
            payloads.push({
              tenantId: activeOrg.id,
              workspaceId,
              role: args.role,
              maxUses: 1,
              email,
            })
          })
          if (activeWorkspace && !args.selectedWorkspaces.includes(activeWorkspace.id)) {
            payloads.push({
              tenantId: activeOrg.id,
              workspaceId: activeWorkspace.id,
              role: args.role,
              maxUses: 1,
              email,
            })
          }
        } else {
          payloads.push({
            tenantId: activeOrg.id,
            workspaceId: activeWorkspace?.id,
            role: args.role,
            maxUses: 1,
            email,
          })
        }
      })

      const invitePromises = payloads.map((payload) => generateInvite(payload))
      return Promise.all(invitePromises)
    },
    retry: 0,
    onSuccess: (responses, variables) => {
      if (responses.length > 0) setGeneratedInvite(responses[0])

      if (activeOrg) {
        queryClient.invalidateQueries({ queryKey: queryKeys.members(activeOrg.id) })
        queryClient.invalidateQueries({ queryKey: queryKeys.tenantInvitations(activeOrg.id) })
      }

      toast.success(`Successfully sent ${variables.targetEmails.length} invitation email(s)!`)
      setEmails(variables.targetEmails)
      setEmailInput("")
      setStep("success")
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to send invites")
    },
  })

  const sendInvites = React.useCallback(() => {
    if (!activeOrg) {
      toast.error("No active organization found")
      return
    }

    const targetEmails = [...emails]
    const trimmedInput = emailInput.trim()
    if (trimmedInput && !targetEmails.includes(trimmedInput)) {
      targetEmails.push(trimmedInput)
    }

    if (targetEmails.length === 0) {
      toast.error("Please add at least one email address")
      return
    }

    sendInvitesMutation.mutate({ targetEmails, role, selectedTeams, selectedWorkspaces })
  }, [activeOrg, emailInput, emails, role, selectedTeams, selectedWorkspaces, sendInvitesMutation])

  const generateShareableMutation = useMutation({
    mutationFn: async (args: { selectedTeams: string[]; selectedWorkspaces: string[] }) => {
      if (!activeOrg) throw new Error("No active organization found")
      
      const teamId = args.selectedTeams.length > 0 ? args.selectedTeams[0] : undefined
      const workspaceId = args.selectedWorkspaces.length > 0 ? args.selectedWorkspaces[0] : activeWorkspace?.id

      return generateInvite({
        tenantId: activeOrg.id,
        workspaceId: teamId ? activeWorkspace?.id : workspaceId,
        teamId,
        role,
        maxUses: 100,
      })
    },
    retry: 1,
    onSuccess: (response) => {
      setShareableInvite({ token: response.token, pin: response.pin || "" })

      if (!activeOrg) return
      const link = `${window.location.origin}/invite/${activeOrg.slug}/${response.token}`
      navigator.clipboard.writeText(`Invite Link: ${link}\nSecurity PIN: ${response.pin || ""}`)
      toast.success("Link and PIN copied!")
    },
    onError: () => {
      toast.error("Failed to generate link")
    },
  })

  const generateShareableInvite = React.useCallback(() => {
    if (!activeOrg) return
    generateShareableMutation.mutate({ selectedTeams, selectedWorkspaces })
  }, [activeOrg, selectedTeams, selectedWorkspaces, generateShareableMutation])

  const copyInviteLink = React.useCallback(() => {
    if (shareableInvite) {
      const link = `${window.location.origin}/invite/${activeOrg?.slug}/${shareableInvite.token}`
      navigator.clipboard.writeText(link)
      toast.success("Link copied!")
    } else {
      generateShareableInvite()
    }
  }, [activeOrg?.slug, generateShareableInvite, shareableInvite])

	  const reset = React.useCallback(() => {
	    setStep("form")
	    setEmails([])
	    setEmailInput("")
	    setRole("MEMBER")
	    setMessage("")
	    setSelectedWorkspaces([])
	    setSelectedTeams([])
	    setGeneratedInvite(null)
	  }, [])

  const closeModal = React.useCallback(() => {
    params.setOpen(false)
  }, [params])

  return {
    activeOrg,
    workspaces,
    activeWorkspace,

    isOwner,
    isAdmin,

    teams,
    teamsLoading,

    step,
    emails,
    emailInput,
    role,
    message,
    selectedWorkspaces,
    selectedTeams,
    generatedInvite,
    shareableInvite,

    setEmailInput,
    setRole,
    setMessage,
    setSelectedWorkspaces,
    setSelectedTeams,

    addEmail,
    removeEmail,
    sendInvites,
    sendLoading: sendInvitesMutation.isPending,

    generateShareableInvite,
    copyInviteLink,

    reset,
    closeModal,

    roleDescription: getRoleDescription(role),
  }
}
