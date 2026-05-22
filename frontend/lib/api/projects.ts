import { apiFetch } from "./client";

export interface ProjectRequest {
  name: string;
  description?: string;
  status: string;
  workspaceId: string;
  color?: string; // Optional for frontend internal use
  startDate?: string;
  endDate?: string;
}

export interface ProjectResponse {
  id: string;
  name: string;
  description: string;
  status: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  teamsCount: number;
  membersCount: number;
  color?: string; // Optional for UI use
  startDate?: string;
  endDate?: string;
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

export interface ProjectMemberResponse {
  id: string;
  projectId: string;
  userId: string;
  username: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  role: string; // LEAD, MEMBER, VIEWER
  joinedAt: string;
}

export async function getProjectMembers(projectId: string): Promise<ProjectMemberResponse[]> {
  return apiFetch(`/api/projects/${projectId}/members`);
}

export async function addProjectMember(projectId: string, userId: string, role?: string): Promise<ProjectMemberResponse> {
  const roleParam = role ? `&role=${encodeURIComponent(role)}` : "";
  return apiFetch(`/api/projects/${projectId}/members?userId=${userId}${roleParam}`, {
    method: "POST",
  });
}

export async function updateProjectMemberRole(projectId: string, userId: string, role: string): Promise<ProjectMemberResponse> {
  return apiFetch(`/api/projects/${projectId}/members/${userId}/role?role=${encodeURIComponent(role)}`, {
    method: "PUT",
  });
}

export async function removeProjectMember(projectId: string, userId: string): Promise<void> {
  return apiFetch(`/api/projects/${projectId}/members/${userId}`, {
    method: "DELETE",
  });
}

