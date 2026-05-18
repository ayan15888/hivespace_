export interface InviteRequest {
    tenantId: string;
    workspaceId?: string;
    teamId?: string;
    role?: string;
    maxUses?: number;
    pin?: string;
}

export interface InviteResponse {
    id: string;
    token: string;
    pin: string; // The backend returns the plain-text PIN only upon creation
    tenantId: string;
    tenantName: string;
    workspaceId?: string;
    workspaceName?: string;
    teamId?: string;
    teamName?: string;
    inviterUsername: string;
    role: string;
    maxUses: number;
    currentUses: number;
    status: 'ACTIVE' | 'EXPIRED' | 'EXHAUSTED' | 'REVOKED';
    expiresAt: string;
    createdAt: string;
}

export interface JoinRequest {
    token: string;
    pin: string;
}
