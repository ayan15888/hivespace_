import { apiFetch } from "./client";

export interface ProjectRequest {
  name: string;
  description?: string;
  status: string;
  workspaceId: string;
  slug?: string; // Optional for frontend internal use
  color?: string; // Optional for frontend internal use
}

export interface ProjectResponse {
  id: string;
  name: string;
  description: string;
  status: string;
  workspaceId: string;
  createdAt: string;
  teamsCount: number;
  membersCount: number;
  slug?: string; // Optional for UI use
  color?: string; // Optional for UI use
}

export async function createProject(workspaceId: string, data: ProjectRequest): Promise<ProjectResponse> {
  return apiFetch(`/api/workspaces/${workspaceId}/projects`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getProjectsByWorkspace(workspaceId: string): Promise<ProjectResponse[]> {
  return apiFetch(`/api/workspaces/${workspaceId}/projects`);
}
