import { apiFetch } from "./client";

export async function loginWithGithub(code: string) {
  return apiFetch("/api/auth/github", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function getCurrentUser() {
  return apiFetch("/api/auth/me");
}

export async function updateProfile(data: {
  fullName: string;
  jobTitle: string;
  bio: string;
  avatarUrl?: string;
}) {
  return apiFetch("/api/auth/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
