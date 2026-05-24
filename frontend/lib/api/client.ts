/** Empty string = same-origin `/api/...` (proxied to Spring in `app/api/[...path]/route.ts`). */
const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

if (typeof window !== "undefined") {
  console.log("🚀 HiveSpace Frontend Initialized");
  console.log(
    "🔗 Backend API:",
    BASE_URL ||
      "(same-origin /api/* → app/api/[...path] proxy; BACKEND_URL defaults to 127.0.0.1:8080)",
  );
  console.log("🟢 Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "Configured" : "MISSING");
}

function normalizeStoredToken(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }
  const t = raw.trim();
  if (!t) {
    return null;
  }
  return t.replace(/^Bearer\s+/i, "").trim() || null;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const rawToken = getCookie("token");
  const token = normalizeStoredToken(rawToken);

  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    let message: string | undefined;
    try {
      const data = JSON.parse(text) as { message?: string; error?: string };
      message = data.message || data.error;
    } catch {
      /* non-JSON body (e.g. HTML error page) */
    }
    // Fallback messages only when the backend didn't send one
    if (!message && response.status === 401) {
      message = "Not authenticated — please sign in again.";
    }
    if (!message && response.status === 403) {
      message =
        "Forbidden — you don't have permission to perform this action.";
    }
    if (!message && response.status >= 500) {
      message =
        "Cannot reach the server (5xx). Make sure Spring Boot is running on BACKEND_URL.";
    }
    throw new Error(message || `Request failed (${response.status})`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
