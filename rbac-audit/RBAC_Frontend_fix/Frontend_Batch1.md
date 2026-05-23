Batch 1 — Fix Types and API Contract First (Foundation)
Do this before touching any UI. Everything else depends on correct types.
frontend/types/invite.ts
typescript// Replace the entire file with this

export type TenantRole = 'OWNER' | 'ADMIN' | 'BILLING_ADMIN' | 'MEMBER'
export type WorkspaceRole = 'ADMIN' | 'MEMBER' | 'VIEWER'
export type ProjectRole = 'LEAD' | 'MEMBER' | 'VIEWER'
export type TeamRole = 'LEAD' | 'MEMBER'
export type TaskAssigneeRole = 'OWNER' | 'COLLABORATOR' | 'REVIEWER'

export interface InviteRequest {
  tenantRole: TenantRole        // renamed from role
  workspaceIds: string[]        // required, at least one
  teamIds?: string[]            // optional
  projectId?: string            // optional
  maxUses?: number              // defaults to 1
  expiresInHours?: number       // defaults to 72
}

export interface InviteResponse {
  id: string
  token: string
  pin?: string                  // ONLY present on creation response, never on list
  tenantRole: TenantRole
  workspaceIds: string[]
  teamIds: string[]
  projectId?: string
  maxUses: number
  currentUses: number
  status: 'ACTIVE' | 'EXPIRED' | 'EXHAUSTED' | 'REVOKED'
  expiresAt: string
  createdAt: string
  inviterName?: string
}

export interface InviteValidationResponse {
  orgName: string
  orgSlug: string
  tenantRole: TenantRole
  workspaceNames: string[]
  teamNames: string[]
  inviterName: string
  expiresAt: string
}

export interface InviteAcceptRequest {
  token: string
  pin: string
}
frontend/types/roles.ts
Add the missing project roles and scoped permission types:
typescriptexport const TENANT_ROLES = ['OWNER', 'ADMIN', 'BILLING_ADMIN', 'MEMBER'] as const
export const WORKSPACE_ROLES = ['ADMIN', 'MEMBER', 'VIEWER'] as const
export const PROJECT_ROLES = ['LEAD', 'MEMBER', 'VIEWER'] as const
export const TEAM_ROLES = ['LEAD', 'MEMBER'] as const
export const TASK_ASSIGNEE_ROLES = ['OWNER', 'COLLABORATOR', 'REVIEWER'] as const

export type TenantRole = typeof TENANT_ROLES[number]
export type WorkspaceRole = typeof WORKSPACE_ROLES[number]
export type ProjectRole = typeof PROJECT_ROLES[number]
export type TeamRole = typeof TEAM_ROLES[number]
export type TaskAssigneeRole = typeof TASK_ASSIGNEE_ROLES[number]

// Rank helpers — scope isolated, no cross-scope comparisons
export const tenantRank = (role: TenantRole): number =>
  ({ OWNER: 4, ADMIN: 3, BILLING_ADMIN: 2, MEMBER: 1 })[role] ?? 0

export const workspaceRank = (role: WorkspaceRole): number =>
  ({ ADMIN: 3, MEMBER: 2, VIEWER: 1 })[role] ?? 0

export const projectRank = (role: ProjectRole): number =>
  ({ LEAD: 3, MEMBER: 2, VIEWER: 1 })[role] ?? 0

export const teamRank = (role: TeamRole): number =>
  ({ LEAD: 2, MEMBER: 1 })[role] ?? 0
frontend/lib/api/invites.ts
typescriptimport { InviteRequest, InviteResponse, InviteValidationResponse, InviteAcceptRequest } from '@/types/invite'
import { apiClient } from './client'

export const invitesApi = {
  generate: (tenantId: string, request: InviteRequest): Promise<InviteResponse> =>
    apiClient.post(`/api/i/generate`, { ...request, tenantId }),

  list: (tenantId: string): Promise<InviteResponse[]> =>
    apiClient.get(`/api/i/t/${tenantId}`),

  validate: (token: string, orgSlug: string): Promise<InviteValidationResponse> =>
    apiClient.get(`/api/i/validate?token=${token}&orgSlug=${orgSlug}`),

  accept: (request: InviteAcceptRequest): Promise<void> =>
    apiClient.post(`/api/i/join`, request),

  revoke: (inviteId: string): Promise<void> =>
    apiClient.delete(`/api/i/${inviteId}`),
}
frontend/lib/api/projects.ts — add leadUserId:
typescriptexport interface ProjectRequest {
  name: string
  description?: string
  color?: string
  startDate?: string
  endDate?: string
  leadUserId?: string           // optional — defaults to creator if not provided
}
frontend/lib/api/teams.ts — add leadUserId:
typescriptexport interface TeamRequest {
  name: string
  description?: string
  leadUserId?: string           // optional — defaults to creator if not provided
}
frontend/lib/api/workspaces.ts — fix email nullability:
typescriptexport interface WorkspaceMemberResponse {
  userId: string
  username: string
  fullName?: string
  avatarUrl?: string
  email: string | null          // null for non-admin viewers
  role: WorkspaceRole
  joinedAt: string
}