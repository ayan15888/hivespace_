export type TenantRole = 'OWNER' | 'ADMIN' | 'BILLING_ADMIN' | 'MEMBER';
export type WorkspaceRole = 'ADMIN' | 'MEMBER' | 'VIEWER';
export type ProjectRole = 'LEAD' | 'MEMBER' | 'VIEWER';
export type TeamRole = 'LEAD' | 'MEMBER';
export type TaskAssigneeRole = 'OWNER' | 'COLLABORATOR' | 'REVIEWER';

export interface InviteRequest {
  tenantId: string;
  tenantRole?: TenantRole;
  workspaceIds?: string[];
  workspaceId?: string;
  teamIds?: string[];
  teamId?: string;
  projectId?: string;
  maxUses?: number;
  expiresInHours?: number;
  pin?: string;
  email?: string;
  role?: TenantRole; // Backwards compatibility
}

export interface InviteResponse {
  id: string;
  token: string;
  pin?: string; // Only present on creation response, never on list
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  workspaceId?: string;
  workspaceName?: string;
  teamId?: string;
  teamName?: string;
  projectId?: string;
  projectName?: string;
  workspaceIds: string[];
  teamIds: string[];
  inviterUsername: string;
  tenantRole: TenantRole;
  role: string; // Backwards compatibility
  maxUses: number;
  currentUses: number;
  status: 'ACTIVE' | 'EXPIRED' | 'EXHAUSTED' | 'REVOKED';
  expiresAt: string;
  createdAt: string;
}

export interface InviteAcceptRequest {
  token: string;
  pin: string;
}
