import { apiFetch } from "./client";

export interface WorkspaceRequest {
  name: string;
  tenantId: string;
  plan: string;
  description?: string;
  slug?: string; // Optional for frontend internal use
}

export interface WorkspaceResponse {
  id: string;
  name: string;
  slug: string;
  description: string;
  tenantId: string;
  plan: string;
  createdAt: string;
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
