import { apiFetch } from "./client";

export interface WorkspaceRequest {
  name: string;
  tenantId: string;
  description?: string;
}

export interface WorkspaceResponse {
  id: string;
  name: string;
  description: string;
  tenantId: string;
  plan: string;
  createdAt: string;
  updatedAt: string;
}

export async function createWorkspace(data: WorkspaceRequest): Promise<WorkspaceResponse> {
  return apiFetch("/api/workspaces", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getWorkspacesByTenant(tenantId: string): Promise<WorkspaceResponse[]> {
  return apiFetch(`/api/workspaces/t/${tenantId}`);
}
