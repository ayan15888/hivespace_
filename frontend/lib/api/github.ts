import { apiFetch } from "./client";

export interface GithubConnectionResponse {
  id: string;
  tenantId: string;
  githubOrgName: string;
  connectedByUsername: string;
  connectedAt: string;
}

export interface GithubRepoLinkResponse {
  id: string;
  projectId: string;
  githubRepoFullName: string;
  linkedByUsername: string;
  linkedAt: string;
}

export async function getConnectedOrgs(tenantId: string): Promise<GithubConnectionResponse[]> {
  return apiFetch(`/api/github/connections?tenantId=${tenantId}`);
}

export async function connectOrg(code: string, githubOrgName: string, tenantId: string): Promise<GithubConnectionResponse> {
  return apiFetch(`/api/github/connections`, {
    method: "POST",
    body: JSON.stringify({ code, githubOrgName, tenantId }),
  });
}

export async function disconnectOrg(connectionId: string, tenantId: string): Promise<void> {
  return apiFetch(`/api/github/connections/${connectionId}?tenantId=${tenantId}`, {
    method: "DELETE",
  });
}

export async function getLinkedRepos(projectId: string): Promise<GithubRepoLinkResponse[]> {
  return apiFetch(`/api/github/repo-links?projectId=${projectId}`);
}

export async function linkRepository(projectId: string, githubRepoFullName: string): Promise<GithubRepoLinkResponse> {
  return apiFetch(`/api/github/repo-links`, {
    method: "POST",
    body: JSON.stringify({ projectId, githubRepoFullName }),
  });
}

export async function unlinkRepository(linkId: string, projectId: string): Promise<void> {
  return apiFetch(`/api/github/repo-links/${linkId}?projectId=${projectId}`, {
    method: "DELETE",
  });
}

export async function getRepoPRs(projectId: string, repoFullName: string): Promise<any[]> {
  return apiFetch(`/api/github/proxy/prs?projectId=${projectId}&repoFullName=${encodeURIComponent(repoFullName)}`);
}

export async function getRepoCommits(projectId: string, repoFullName: string): Promise<any[]> {
  return apiFetch(`/api/github/proxy/commits?projectId=${projectId}&repoFullName=${encodeURIComponent(repoFullName)}`);
}

export async function getRepoIssues(projectId: string, repoFullName: string): Promise<any[]> {
  return apiFetch(`/api/github/proxy/issues?projectId=${projectId}&repoFullName=${encodeURIComponent(repoFullName)}`);
}
