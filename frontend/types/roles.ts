/** Matches HIveSpaceSchema.sql tenant_members.role CHECK constraint */
export const TENANT_ROLES = ["OWNER", "ADMIN", "BILLING_ADMIN", "MEMBER"] as const;
export type TenantRole = (typeof TENANT_ROLES)[number];

export const WORKSPACE_ROLES = ["ADMIN", "MEMBER", "VIEWER"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const PROJECT_ROLES = ["LEAD", "MEMBER", "VIEWER"] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];

export const TEAM_ROLES = ["LEAD", "MEMBER"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const TASK_ASSIGNEE_ROLES = ["OWNER", "COLLABORATOR", "REVIEWER"] as const;
export type TaskAssigneeRole = (typeof TASK_ASSIGNEE_ROLES)[number];

export type BackendRole = TenantRole | WorkspaceRole | ProjectRole | TeamRole | TaskAssigneeRole;

export function isBackendRole(value: string): value is BackendRole {
  return (
    (TENANT_ROLES as readonly string[]).includes(value) ||
    (WORKSPACE_ROLES as readonly string[]).includes(value) ||
    (PROJECT_ROLES as readonly string[]).includes(value) ||
    (TEAM_ROLES as readonly string[]).includes(value) ||
    (TASK_ASSIGNEE_ROLES as readonly string[]).includes(value)
  );
}

export function roleLabel(role: string) {
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// Rank helpers — scope isolated, no cross-scope comparisons
export const tenantRank = (role: TenantRole): number =>
  ({ OWNER: 4, ADMIN: 3, BILLING_ADMIN: 2, MEMBER: 1 })[role] ?? 0;

export const workspaceRank = (role: WorkspaceRole): number =>
  ({ ADMIN: 3, MEMBER: 2, VIEWER: 1 })[role] ?? 0;

export const projectRank = (role: ProjectRole): number =>
  ({ LEAD: 3, MEMBER: 2, VIEWER: 1 })[role] ?? 0;

export const teamRank = (role: TeamRole): number =>
  ({ LEAD: 2, MEMBER: 1 })[role] ?? 0;
