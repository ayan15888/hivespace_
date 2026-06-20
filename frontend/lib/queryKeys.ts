export const queryKeys = {
  members: (tenantId: string) => ["members", tenantId] as const,
  teams: (workspaceId: string) => ["teams", workspaceId] as const,
  tenantInvitations: (tenantId: string) => ["tenantInvitations", tenantId] as const,
  documents: (projectId: string) => ["documents", projectId] as const,
  documentContent: (documentId: string) => ["documentContent", documentId] as const,
  documentVersions: (documentId: string) => ["documentVersions", documentId] as const,
} as const


