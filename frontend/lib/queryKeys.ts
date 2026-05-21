export const queryKeys = {
  members: (tenantId: string) => ["members", tenantId] as const,
  teams: (workspaceId: string) => ["teams", workspaceId] as const,
  tenantInvitations: (tenantId: string) => ["tenantInvitations", tenantId] as const,
} as const

