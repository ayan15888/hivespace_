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

export interface AddWorkspaceMemberRequest {
  userId: string;
  role?: "ADMIN" | "MEMBER" | "VIEWER";
}

export async function addWorkspaceMember(
  workspaceId: string,
  data: AddWorkspaceMemberRequest
): Promise<WorkspaceMemberResponse> {
  return apiFetch(`/api/workspaces/${workspaceId}/members`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function removeWorkspaceMember(workspaceId: string, userId: string): Promise<void> {
  return apiFetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
    method: "DELETE",
  });
}

export async function updateWorkspaceMemberRole(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole
): Promise<WorkspaceMemberResponse> {
  return apiFetch(`/api/workspaces/${workspaceId}/members/${userId}/role?role=${role}`, {
    method: "PATCH",
  });
}
