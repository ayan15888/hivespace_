import { apiFetch } from "./client";

export interface TeamRequest {
  name: string;
  description?: string;
  projectId: string;
}

export interface TeamResponse {
  id: string;
  name: string;
  description: string;
  membersCount: number;
  projectId: string;
  createdAt: string;
}

export async function createTeam(projectId: string, data: Partial<TeamRequest>): Promise<TeamResponse> {
  return apiFetch(`/api/p/${projectId}/teams`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getTeamsByProject(projectId: string): Promise<TeamResponse[]> {
  return apiFetch(`/api/p/${projectId}/teams`);
}
