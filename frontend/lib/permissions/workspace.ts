import { TenantRole, WorkspaceRole, tenantRank, workspaceRank } from '@/types/roles';

interface WorkspaceContext {
  tenantRole: TenantRole;
  workspaceRole?: WorkspaceRole | null;
}

const isTenantAdmin = (ctx: WorkspaceContext): boolean =>
  tenantRank(ctx.tenantRole) >= tenantRank('ADMIN');

export const canAdminWorkspace = (ctx: WorkspaceContext): boolean =>
  ctx.workspaceRole === 'ADMIN' || isTenantAdmin(ctx);

export const canCreateProject = (ctx: WorkspaceContext): boolean =>
  canAdminWorkspace(ctx);

export const canCreateTeam = (ctx: WorkspaceContext): boolean =>
  isTenantAdmin(ctx) ||
  (ctx.workspaceRole != null && workspaceRank(ctx.workspaceRole) >= workspaceRank('MEMBER'));

export const canViewWorkspace = (ctx: WorkspaceContext): boolean =>
  isTenantAdmin(ctx) || ctx.workspaceRole != null;

export const canViewMemberEmails = (ctx: WorkspaceContext): boolean =>
  canAdminWorkspace(ctx);
