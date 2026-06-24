import { useAuthStore } from '@/store/authStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useOrgStore } from '@/store/orgStore';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useActiveMembership } from '@/hooks/useActiveMembership';
import * as TenantPerms from '@/lib/permissions/tenant';
import * as WorkspacePerms from '@/lib/permissions/workspace';
import * as ProjectPerms from '@/lib/permissions/project';
import * as TeamPerms from '@/lib/permissions/team';
import { TenantRole } from '@/types/roles';

export function usePermission() {
  const { user } = useAuthStore();
  const { activeWorkspace } = useWorkspaceStore();
  const { activeOrg } = useOrgStore();

  const { membership: activeOrgMember, loading: orgLoading } = useActiveMembership();
  const { members: workspaceMembers, loading: wsLoading } = useWorkspaceMembers(activeWorkspace?.id);

  // Derive tenantRole from org membership
  const tenantRole: TenantRole = activeOrgMember ? (activeOrgMember.role as TenantRole) : 'MEMBER';

  // Derive workspaceRole from workspace membership
  const currentWorkspaceMember = workspaceMembers.find((m) => m.userId === user?.id);
  const workspaceRole = currentWorkspaceMember ? currentWorkspaceMember.role : null;

  const ctx = { tenantRole, workspaceRole };
  const loading = orgLoading || (activeWorkspace ? wsLoading : false);

  return {
    loading,
    // Tenant
    canInvite: TenantPerms.canInviteToOrg(tenantRole),
    canCreateWorkspace: TenantPerms.canCreateWorkspace(tenantRole),
    canAccessBilling: TenantPerms.canAccessBilling(tenantRole),
    canManageMembers: TenantPerms.canManageTenantMembers(tenantRole),
    canViewMemberDirectory: TenantPerms.canViewMemberDirectory(tenantRole),

    // Workspace
    canCreateProject: WorkspacePerms.canCreateProject(ctx),
    canCreateTeam: WorkspacePerms.canCreateTeam(ctx),
    canAdminWorkspace: WorkspacePerms.canAdminWorkspace(ctx),
    canViewWorkspace: WorkspacePerms.canViewWorkspace(ctx),
    canViewMemberEmails: WorkspacePerms.canViewMemberEmails(ctx),

    // Project (pass projectRole explicitly when needed)
    canCreateTask: (projectRole: string | null) =>
      ProjectPerms.canCreateTask({ ...ctx, projectRole: projectRole as any }),
    canDeleteTask: (projectRole: string | null) =>
      ProjectPerms.canDeleteTask({ ...ctx, projectRole: projectRole as any }),
    canManageProject: (projectRole: string | null) =>
      ProjectPerms.canManageProjectMembers({ ...ctx, projectRole: projectRole as any }),
    canViewProject: (projectRole: string | null) =>
      ProjectPerms.canViewProject({ ...ctx, projectRole: projectRole as any }),

    // Team
    canManageTeam: (teamRole: string | null) =>
      TeamPerms.canManageTeamMembers({ ...ctx, teamRole: teamRole as any }),

    // Document
    canCreateDocument: (projectRole: string | null) =>
      ProjectPerms.canCreateDocument({ ...ctx, projectRole: projectRole as any }),
    canEditDocument: (projectRole: string | null) =>
      ProjectPerms.canEditDocument({ ...ctx, projectRole: projectRole as any }),
    canPublishDocument: (projectRole: string | null) =>
      ProjectPerms.canPublishDocument({ ...ctx, projectRole: projectRole as any }),
    canDeleteDocument: (projectRole: string | null) =>
      ProjectPerms.canDeleteDocument({ ...ctx, projectRole: projectRole as any }),
  };
}
