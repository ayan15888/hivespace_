import { TenantRole, WorkspaceRole, ProjectRole, projectRank } from '@/types/roles';
import { canAdminWorkspace } from './workspace';

interface ProjectContext {
  tenantRole: TenantRole;
  workspaceRole?: WorkspaceRole | null;
  projectRole?: ProjectRole | null;
}

export const canManageProjectMembers = (ctx: ProjectContext): boolean =>
  ctx.projectRole === 'LEAD' || canAdminWorkspace(ctx);

export const canCreateTask = (ctx: ProjectContext): boolean =>
  ctx.projectRole != null &&
  projectRank(ctx.projectRole) >= projectRank('MEMBER');

export const canEditTask = (ctx: ProjectContext): boolean =>
  canCreateTask(ctx);

export const canDeleteTask = (ctx: ProjectContext): boolean =>
  ctx.projectRole === 'LEAD' || canAdminWorkspace(ctx);

export const canAssignTeamToProject = (ctx: ProjectContext): boolean =>
  canManageProjectMembers(ctx);

export const canViewProject = (ctx: ProjectContext): boolean =>
  canAdminWorkspace(ctx) || ctx.projectRole != null;
