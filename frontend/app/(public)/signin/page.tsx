"use client";

import { useState } from "react";
import { GitGraph as Github, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/client";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const githubClientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
  const githubRedirectUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&scope=user:email`;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem("token", response.token);
      document.cookie = `token=${response.token}; path=/; max-age=86400; SameSite=Lax`;

      if (response.hasTenants) {
        router.push("/dashboard");
      } else {
        router.push("/onboarding");
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0E0E10] text-[#E5E1E4]">
      <div className="flex w-full max-w-[400px] flex-col gap-8 px-6 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-zinc-500">
            Sign in to your HiveSpace account to continue
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            asChild
            className="h-12 w-full gap-3 bg-white text-black hover:bg-zinc-200 transition-all font-semibold"
          >
            <Link href={githubRedirectUrl}>
              <Github className="h-5 w-5" />
              Continue with GitHub
            </Link>
          </Button>
          
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0E0E10] px-2 text-zinc-500">Or continue with</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm outline-none focus:ring-2 focus:ring-[#7C5CFC]/50 transition-all"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm outline-none focus:ring-2 focus:ring-[#7C5CFC]/50 transition-all"
            />
            {error && <p className="text-xs text-red-500 text-left">{error}</p>}
            <Button 
              type="submit" 
              disabled={loading}
              className="h-11 bg-[#7C5CFC] hover:bg-[#6D4EE0] text-white"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
            </Button>
          </form>
        </div>

        <p className="text-sm text-zinc-500">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-[#7C5CFC] hover:underline">
            Sign Up
          </Link>
        </p>

        <p className="text-xs text-zinc-500 px-8">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-4 hover:text-white">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-white">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
