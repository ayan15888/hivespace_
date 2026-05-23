Batch 2 — Implement usePermission Hook and Permission Modules
Create frontend/lib/permissions/ modules. These mirror the backend capability methods:
frontend/lib/permissions/tenant.ts
typescriptimport { TenantRole, tenantRank } from '@/types/roles'

export const canInviteToOrg = (role: TenantRole): boolean =>
  tenantRank(role) >= tenantRank('ADMIN')

export const canCreateWorkspace = (role: TenantRole): boolean =>
  tenantRank(role) >= tenantRank('ADMIN')

export const canManageTenantMembers = (role: TenantRole): boolean =>
  tenantRank(role) >= tenantRank('ADMIN')

export const canViewMemberDirectory = (role: TenantRole): boolean =>
  role !== 'BILLING_ADMIN'

export const canAccessBilling = (role: TenantRole): boolean =>
  role === 'OWNER' || role === 'BILLING_ADMIN'
frontend/lib/permissions/workspace.ts
typescriptimport { TenantRole, WorkspaceRole, tenantRank, workspaceRank } from '@/types/roles'

interface WorkspaceContext {
  tenantRole: TenantRole
  workspaceRole?: WorkspaceRole | null
}

const isTenantAdmin = (ctx: WorkspaceContext): boolean =>
  tenantRank(ctx.tenantRole) >= tenantRank('ADMIN')

export const canAdminWorkspace = (ctx: WorkspaceContext): boolean =>
  ctx.workspaceRole === 'ADMIN' || isTenantAdmin(ctx)

export const canCreateProject = (ctx: WorkspaceContext): boolean =>
  canAdminWorkspace(ctx)

export const canCreateTeam = (ctx: WorkspaceContext): boolean =>
  isTenantAdmin(ctx) ||
  (ctx.workspaceRole != null && workspaceRank(ctx.workspaceRole) >= workspaceRank('MEMBER'))

export const canViewWorkspace = (ctx: WorkspaceContext): boolean =>
  isTenantAdmin(ctx) || ctx.workspaceRole != null

export const canViewMemberEmails = (ctx: WorkspaceContext): boolean =>
  canAdminWorkspace(ctx)
frontend/lib/permissions/project.ts
typescriptimport { TenantRole, WorkspaceRole, ProjectRole, projectRank } from '@/types/roles'
import { canAdminWorkspace } from './workspace'

interface ProjectContext {
  tenantRole: TenantRole
  workspaceRole?: WorkspaceRole | null
  projectRole?: ProjectRole | null
}

export const canManageProjectMembers = (ctx: ProjectContext): boolean =>
  ctx.projectRole === 'LEAD' || canAdminWorkspace(ctx)

export const canCreateTask = (ctx: ProjectContext): boolean =>
  ctx.projectRole != null &&
  projectRank(ctx.projectRole) >= projectRank('MEMBER')

export const canEditTask = (ctx: ProjectContext): boolean =>
  canCreateTask(ctx)

export const canDeleteTask = (ctx: ProjectContext): boolean =>
  ctx.projectRole === 'LEAD' || canAdminWorkspace(ctx)

export const canAssignTeamToProject = (ctx: ProjectContext): boolean =>
  canManageProjectMembers(ctx)

export const canViewProject = (ctx: ProjectContext): boolean =>
  canAdminWorkspace(ctx) || ctx.projectRole != null
frontend/lib/permissions/team.ts
typescriptimport { TenantRole, WorkspaceRole, TeamRole } from '@/types/roles'
import { canAdminWorkspace } from './workspace'

interface TeamContext {
  tenantRole: TenantRole
  workspaceRole?: WorkspaceRole | null
  teamRole?: TeamRole | null
}

export const canManageTeamMembers = (ctx: TeamContext): boolean =>
  ctx.teamRole === 'LEAD' || canAdminWorkspace(ctx)

export const canUpdateTeam = (ctx: TeamContext): boolean =>
  canManageTeamMembers(ctx)

export const canDeleteTeam = (ctx: TeamContext): boolean =>
  canManageTeamMembers(ctx)
frontend/hooks/usePermission.ts — implement it properly:
typescriptimport { useAuthStore } from '@/store/authStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import * as TenantPerms from '@/lib/permissions/tenant'
import * as WorkspacePerms from '@/lib/permissions/workspace'
import * as ProjectPerms from '@/lib/permissions/project'
import * as TeamPerms from '@/lib/permissions/team'

export function usePermission() {
  const { tenantRole } = useAuthStore()
  const { workspaceRole } = useWorkspaceStore()

  const ctx = { tenantRole, workspaceRole }

  return {
    // Tenant
    canInvite: TenantPerms.canInviteToOrg(tenantRole),
    canCreateWorkspace: TenantPerms.canCreateWorkspace(tenantRole),
    canAccessBilling: TenantPerms.canAccessBilling(tenantRole),
    canManageMembers: TenantPerms.canManageTenantMembers(tenantRole),

    // Workspace
    canCreateProject: WorkspacePerms.canCreateProject(ctx),
    canCreateTeam: WorkspacePerms.canCreateTeam(ctx),
    canAdminWorkspace: WorkspacePerms.canAdminWorkspace(ctx),

    // Project (pass projectRole explicitly when needed)
    canCreateTask: (projectRole: string | null) =>
      ProjectPerms.canCreateTask({ ...ctx, projectRole: projectRole as any }),
    canDeleteTask: (projectRole: string | null) =>
      ProjectPerms.canDeleteTask({ ...ctx, projectRole: projectRole as any }),
    canManageProject: (projectRole: string | null) =>
      ProjectPerms.canManageProjectMembers({ ...ctx, projectRole: projectRole as any }),

    // Team
    canManageTeam: (teamRole: string | null) =>
      TeamPerms.canManageTeamMembers({ ...ctx, teamRole: teamRole as any }),
  }
}