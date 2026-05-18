"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginWithGithub } from "@/lib/api/auth";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

export default function GitHubCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const [error, setError] = useState<string | null>(null);

  const handleGitHubLogin = useCallback(async (code: string) => {
    try {
      const response = await loginWithGithub(code);
      
      login(response.token, response);
      
      if (response.hasTenants) {
        router.push("/dashboard");
      } else {
        router.push("/onboarding");
      }
    } catch (err: unknown) {
      const message = (err as Error).message || "Failed to authenticate with GitHub";
      queueMicrotask(() => setError(message));
    }
  }, [router, login]);

  useEffect(() => {
    const code = searchParams.get("code");

    if (code) {
      handleGitHubLogin(code);
    } else {
      queueMicrotask(() => setError("No authorization code found"));
    }
  }, [searchParams, handleGitHubLogin]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0E0E10] text-[#E5E1E4]">
      {error ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-red-500/10 p-3 text-red-500">
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-red-500">Authentication Failed</h1>
          <p className="text-sm text-zinc-500">{error}</p>
          <button
            onClick={() => router.push("/signin")}
            className="mt-4 text-xs font-medium text-zinc-400 underline underline-offset-4 hover:text-white"
          >
            Back to Sign In
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#7C5CFC]" />
          <div className="text-center">
            <h1 className="text-lg font-semibold">Authenticating with GitHub</h1>
            <p className="text-xs text-zinc-500 mt-1">Please wait while we sync your account...</p>
          </div>
        </div>
      )}
    </div>
  );
}
