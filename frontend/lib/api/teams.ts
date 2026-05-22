import { apiFetch } from "./client";

export interface TeamRequest {
  name: string;
  description?: string;
  workspaceId: string;
  projectId?: string;
}

export interface TeamResponse {
  id: string;
  name: string;
  description: string;
  membersCount: number;
  workspaceId: string;
  projectId?: string;
  createdAt: string;
}

export async function createTeam(workspaceId: string, data: Partial<TeamRequest>): Promise<TeamResponse> {
  return apiFetch(`/api/workspaces/${workspaceId}/teams`, {
    method: "POST",
    body: JSON.stringify({ ...data, workspaceId }),
  });
}

export async function getTeamsByWorkspace(workspaceId: string): Promise<TeamResponse[]> {
  return apiFetch(`/api/workspaces/${workspaceId}/teams`);
}

export async function deleteTeam(workspaceId: string, teamId: string): Promise<void> {
  return apiFetch(`/api/workspaces/${workspaceId}/teams/${teamId}`, {
    method: "DELETE",
  });
}

export async function updateTeam(workspaceId: string, teamId: string, data: Partial<TeamRequest>): Promise<TeamResponse> {
  return apiFetch(`/api/workspaces/${workspaceId}/teams/${teamId}`, {
    method: "PUT",
    body: JSON.stringify({ ...data, workspaceId }),
  });
}

export interface TeamMemberResponse {
  id: string;
  teamId: string;
  userId: string;
  username: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  role: string;
  joinedAt: string;
}

export async function getTeamMembers(teamId: string): Promise<TeamMemberResponse[]> {
  return apiFetch(`/api/teams/${teamId}/members`);
}

export async function addTeamMember(teamId: string, userId: string, role?: string): Promise<TeamMemberResponse> {
  return apiFetch(`/api/teams/${teamId}/members`, {
    method: "POST",
    body: JSON.stringify({ userId, role }),
  });
}

export async function updateTeamMemberRole(teamId: string, userId: string, role: string): Promise<TeamMemberResponse> {
  return apiFetch(`/api/teams/${teamId}/members/${userId}/role?role=${encodeURIComponent(role)}`, {
    method: "PUT",
  });
}

export async function removeTeamMember(teamId: string, userId: string): Promise<void> {
  return apiFetch(`/api/teams/${teamId}/members/${userId}`, {
    method: "DELETE",
  });
}

