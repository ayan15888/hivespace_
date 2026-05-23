import { TenantRole, WorkspaceRole, TeamRole } from '@/types/roles';
import { canAdminWorkspace } from './workspace';

interface TeamContext {
  tenantRole: TenantRole;
  workspaceRole?: WorkspaceRole | null;
  teamRole?: TeamRole | null;
}

export const canManageTeamMembers = (ctx: TeamContext): boolean =>
  ctx.teamRole === 'LEAD' || canAdminWorkspace(ctx);

export const canUpdateTeam = (ctx: TeamContext): boolean =>
  canManageTeamMembers(ctx);

export const canDeleteTeam = (ctx: TeamContext): boolean =>
  canManageTeamMembers(ctx);
