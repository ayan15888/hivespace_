"use client";

import { useState } from "react";
import { Plus, UserPlus, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleCreate = () => {
    setLoading("create");
    router.push("/dashboard?action=create-organization");
  };

  const handleJoin = () => {
    setLoading("join");
    router.push("/dashboard?action=join-organization");
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#0E0E10] text-[#E5E1E4] p-6">
      <div className="flex w-full max-w-[800px] flex-col gap-12">
        <div className="flex flex-col gap-3 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome to HiveSpace, {user?.username || "there"}!
          </h1>
          <p className="text-lg text-zinc-400">
            Let&apos;s get you started. How would you like to begin?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CREATE OPTION */}
          <Card 
            className="group relative overflow-hidden border-zinc-800 bg-[#201F21] transition-all hover:border-[#7C5CFC]/50 hover:bg-[#272629] cursor-pointer"
            onClick={handleCreate}
          >
            <CardContent className="flex flex-col gap-6 p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7C5CFC]/10 text-[#7C5CFC] transition-transform group-hover:scale-110">
                <Plus className="h-8 w-8" />
              </div>
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-semibold">Create an Organization</h2>
                <p className="text-zinc-400 leading-relaxed">
                  Start fresh with a new organization for your team and projects. You&apos;ll be the owner.
                </p>
              </div>
              <div className="mt-4 flex items-center text-sm font-semibold text-[#7C5CFC]">
                Get started <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </CardContent>
            {loading === "create" && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0E0E10]/50 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-[#7C5CFC]" />
              </div>
            )}
          </Card>

          {/* JOIN OPTION */}
          <Card 
            className="group relative overflow-hidden border-zinc-800 bg-[#201F21] transition-all hover:border-[#7C5CFC]/50 hover:bg-[#272629] cursor-pointer"
            onClick={handleJoin}
          >
            <CardContent className="flex flex-col gap-6 p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400 transition-transform group-hover:scale-110 group-hover:bg-[#7C5CFC]/10 group-hover:text-[#7C5CFC]">
                <UserPlus className="h-8 w-8" />
              </div>
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-semibold">Join an Organization</h2>
                <p className="text-zinc-400 leading-relaxed">
                  Have an invitation code? Join an existing organization and start collaborating immediately.
                </p>
              </div>
              <div className="mt-4 flex items-center text-sm font-semibold text-zinc-400 group-hover:text-[#7C5CFC]">
                Enter code <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </CardContent>
            {loading === "join" && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0E0E10]/50 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-[#7C5CFC]" />
              </div>
            )}
          </Card>
        </div>

        <div className="text-center">
          <Button 
            variant="ghost" 
            className="text-zinc-500 hover:text-white"
            onClick={() => logout()}
          >
            Sign out and try another account
          </Button>
        </div>
      </div>
    </div>
  );
}
