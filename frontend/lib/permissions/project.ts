import { TenantRole, WorkspaceRole, ProjectRole, projectRank } from '@/types/roles';
import { canAdminWorkspace } from './workspace';

interface ProjectContext {
  tenantRole: TenantRole;
  workspaceRole?: WorkspaceRole | null;
  projectRole?: ProjectRole | null;
}

export const canManageProjectMembers = (ctx: ProjectContext): boolean =>
  ctx.projectRole === 'LEAD' || canAdminWorkspace(ctx);

export const canCreateTask = (ctx: ProjectContext): boolean => {
  if (ctx.projectRole == null) return false;

  let allowedRoles = ["MEMBER", "LEAD"];
  if (typeof window !== "undefined") {
    try {
      const saved = window.localStorage.getItem("hivespace_roles_permissions");
      if (saved) {
        const parsed = JSON.parse(saved);
        const projectMatrix = parsed?.project?.matrix;
        if (projectMatrix) {
          const createRow = projectMatrix.find((row: any) => row.action === "Create & Dispatch Tasks");
          if (createRow) {
            allowedRoles = createRow.rolesGranted;
          }
        }
      }
    } catch (e) {
      console.error("Failed to parse roles permissions in canCreateTask", e);
    }
  }

  return allowedRoles.includes(ctx.projectRole);
};

export const canEditTask = (ctx: ProjectContext): boolean =>
  canCreateTask(ctx);

export const canDeleteTask = (ctx: ProjectContext): boolean =>
  ctx.projectRole === 'LEAD' || canAdminWorkspace(ctx);

export const canAssignTeamToProject = (ctx: ProjectContext): boolean =>
  canManageProjectMembers(ctx);

export const canViewProject = (ctx: ProjectContext): boolean =>
  canAdminWorkspace(ctx) || ctx.projectRole != null;
