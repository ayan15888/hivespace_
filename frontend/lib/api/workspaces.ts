import { apiFetch } from "./client";
import { WorkspaceRole } from "@/types/roles";

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

export interface WorkspaceMemberResponse {
  id: string;
  workspaceId: string;
  userId: string;
  username: string;
  email: string | null; // Nullable if viewer is not admin/owner
  fullName: string;
  avatarUrl: string;
  role: WorkspaceRole; // ADMIN, MEMBER, VIEWER
  joinedAt: string;
}

export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberResponse[]> {
  return apiFetch(`/api/workspaces/${workspaceId}/members`);
}
