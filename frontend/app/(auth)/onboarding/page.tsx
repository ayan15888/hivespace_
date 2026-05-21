"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Plus, 
  UserPlus, 
  ArrowRight, 
  Loader2, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  KeyRound 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { getInviteDetails, joinInvite } from "@/lib/api/invites";
import { InviteResponse } from "@/types/invite";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";

function parseInviteInput(input: string): { token: string; orgSlug?: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  
  // Try parsing as a full URL first
  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split("/").filter(Boolean);
    
    // Pattern: /invite/acmecorp/token
    if (segments[0] === "invite" && segments.length === 3) {
      return { token: segments[2], orgSlug: segments[1] };
    }
    // Pattern: /invite/token (fallback for legacy paths)
    if (segments[0] === "invite" && segments.length === 2) {
      return { token: segments[1] };
    }
  } catch {
    // Not a URL — treat as raw token if it looks like a hash or long identifier
    if (trimmed.length >= 8) {
      return { token: trimmed };
    }
  }
  
  return null;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  
  // Navigation states
  const [mode, setMode] = useState<"choice" | "join">("choice");
  const [loading, setLoading] = useState<string | null>(null);

  // Join Flow form states
  const [inviteInput, setInviteInput] = useState("");
  const [token, setToken] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  
  // PIN states
  const [pin, setPin] = useState<string[]>(["", "", "", "", "", ""]);
  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Validation States
  const [validationLoading, setValidationLoading] = useState(false);
  const [inviteDetails, setInviteDetails] = useState<InviteResponse | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Check for session storage bridge on mount
  useEffect(() => {
    const pendingToken = sessionStorage.getItem("pendingInviteToken");
    const pendingSlug = sessionStorage.getItem("pendingInviteOrgSlug");

    if (pendingToken) {
      sessionStorage.removeItem("pendingInviteToken");
      sessionStorage.removeItem("pendingInviteOrgSlug");

      setMode("join");
      const derivedUrl = `${window.location.origin}/invite/${pendingSlug || "org"}/${pendingToken}`;
      setInviteInput(derivedUrl);
      setToken(pendingToken);
      if (pendingSlug) setOrgSlug(pendingSlug);
      
      handleValidate(pendingToken, pendingSlug || undefined);
    }
  }, []);

  const handleCreate = () => {
    setLoading("create");
    router.push("/dashboard?action=create-organization");
  };

  const handleValidate = async (validatedToken: string, slugToCheck?: string) => {
    setValidationLoading(true);
    setValidationError(null);
    setInviteDetails(null);

    try {
      const details = await getInviteDetails(validatedToken);
      
      // If a slug was present in the link, verify it aligns with invitation details
      if (slugToCheck && details.tenantSlug && details.tenantSlug.toLowerCase() !== slugToCheck.toLowerCase()) {
        throw new Error(`Invitation organization mismatch (expected ${details.tenantName})`);
      }

      setInviteDetails(details);
    } catch (err: any) {
      setValidationError(err.message || "Invalid or expired invitation token");
    } finally {
      setValidationLoading(false);
    }
  };

  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInviteInput(val);

    const parsed = parseInviteInput(val);
    if (parsed) {
      setToken(parsed.token);
      setOrgSlug(parsed.orgSlug || "");
      handleValidate(parsed.token, parsed.orgSlug);
    } else {
      setToken("");
      setOrgSlug("");
      setInviteDetails(null);
      setValidationError(null);
    }
  };

  const handlePinChange = (val: string, index: number) => {
    const char = val.slice(-1);
    if (char && !/^\d$/.test(char)) return; // Only allow numerical digits

    const newPin = [...pin];
    newPin[index] = char;
    setPin(newPin);

    // Auto-focus next input
    if (char && index < 5) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handlePinKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      if (!pin[index] && index > 0) {
        const newPin = [...pin];
        newPin[index - 1] = "";
        setPin(newPin);
        pinRefs[index - 1].current?.focus();
      } else {
        const newPin = [...pin];
        newPin[index] = "";
        setPin(newPin);
      }
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const joinedPin = pin.join("");

    if (!token) {
      toast.error("Please enter a valid invitation link or token");
      return;
    }
    if (joinedPin.length < 6) {
      toast.error("Please enter the complete 6-digit security PIN");
      return;
    }

    setLoading("joinSubmit");
    try {
      await joinInvite({ token, pin: joinedPin });
      
      // Update local hasTenants state to true so Next doesn't bounce to onboarding
      const setUser = useAuthStore.getState().setUser;
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        setUser({ ...currentUser, hasTenants: true });
      }

      toast.success("Successfully joined the organization!");
      window.location.href = "/dashboard";
    } catch (err: any) {
      toast.error(err.message || "Failed to accept invitation");
      setLoading(null);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#0E0E10] text-[#E5E1E4] p-6 relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-[-10%] left-[20%] w-[450px] h-[450px] bg-[#7C5CFC]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[20%] w-[450px] h-[450px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex w-full max-w-[800px] flex-col gap-10 z-10 transition-all duration-500">
        <div className="flex flex-col gap-3 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-[#E5E1E4] to-zinc-400">
            Welcome to HiveSpace, {user?.username || "there"}!
          </h1>
          <p className="text-sm text-zinc-400 max-w-[500px] mx-auto leading-relaxed">
            Let&apos;s get you started. Choose whether you want to spin up a new space or join your existing crew immediately.
          </p>
        </div>

        {mode === "choice" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-350">
            {/* CREATE OPTION */}
            <Card 
              className="group relative overflow-hidden border-zinc-800 bg-[#161517]/90 transition-all hover:border-[#7C5CFC]/40 hover:bg-[#201F21] cursor-pointer shadow-[0_4px_32px_rgba(0,0,0,0.4)]"
              onClick={handleCreate}
            >
              <CardContent className="flex flex-col gap-5 p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#7C5CFC]/10 text-[#7C5CFC] transition-transform group-hover:scale-105">
                  <Plus className="h-6 w-6" />
                </div>
                <div className="flex flex-col gap-2">
                  <h2 className="text-xl font-bold">Create an Organization</h2>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Start fresh with a brand new organization for your developers, pipelines, and tasks. You&apos;ll be the organization administrator.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-semibold text-[#7C5CFC]">
                  Get started <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </CardContent>
              {loading === "create" && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0E0E10]/60 backdrop-blur-xs">
                  <Loader2 className="h-7 w-7 animate-spin text-[#7C5CFC]" />
                </div>
              )}
            </Card>

            {/* JOIN OPTION */}
            <Card 
              className="group relative overflow-hidden border-zinc-800 bg-[#161517]/90 transition-all hover:border-[#7C5CFC]/40 hover:bg-[#201F21] cursor-pointer shadow-[0_4px_32px_rgba(0,0,0,0.4)]"
              onClick={() => setMode("join")}
            >
              <CardContent className="flex flex-col gap-5 p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 transition-transform group-hover:scale-105 group-hover:bg-[#7C5CFC]/10 group-hover:text-[#7C5CFC]">
                  <UserPlus className="h-6 w-6" />
                </div>
                <div className="flex flex-col gap-2">
                  <h2 className="text-xl font-bold">Join an Organization</h2>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Pasted a shared invitation link or enter an invite code to securely hook into an ongoing workspace team instantly.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-semibold text-zinc-400 group-hover:text-[#7C5CFC]">
                  Enter invite <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* JOIN FORM INLINE EXPANSION PANEL */
          <div className="w-full max-w-[520px] mx-auto bg-[#161517]/90 border border-zinc-800/80 rounded-2xl p-8 shadow-[0_8px_48px_rgba(0,0,0,0.5)] backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-400">
            <header className="flex items-center gap-3.5 mb-6 pb-4 border-b border-zinc-800/60">
              <button 
                onClick={() => {
                  setMode("choice");
                  setInviteInput("");
                  setToken("");
                  setInviteDetails(null);
                  setValidationError(null);
                  setPin(["", "", "", "", "", ""]);
                }}
                className="p-1.5 rounded-lg bg-zinc-900/60 text-zinc-400 hover:text-white transition-colors"
                title="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <KeyRound className="h-4.5 w-4.5 text-[#7C5CFC]" />
                  Enter Invitation Credentials
                </h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">Secure validation is required to join</p>
              </div>
            </header>

            <form onSubmit={handleJoinSubmit} className="space-y-5">
              {/* FIELD 1: INVITE LINK */}
              <div className="space-y-2">
                <Label htmlFor="inviteInput" className="text-xs font-semibold text-zinc-400">
                  Invite Link / Token
                </Label>
                <div className="relative">
                  <Input 
                    id="inviteInput"
                    placeholder="Pasted invite link (e.g. hivespace.app/invite/slug/token) or raw token"
                    value={inviteInput}
                    onChange={handleLinkChange}
                    required
                    className="bg-[#0E0E10] border-zinc-800 text-sm focus-visible:ring-[#7C5CFC]/40 rounded-xl pr-9 text-zinc-300"
                  />
                  {validationLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7C5CFC] animate-spin" />
                  )}
                </div>
              </div>

              {/* SILENT VALIDATION RESULT AREA */}
              {inviteDetails && (
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3.5 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed">
                    <span className="text-emerald-400 font-semibold uppercase tracking-wider block text-[9px] mb-0.5">VALID LINK DETECTED</span>
                    You are joining <strong className="text-white">{inviteDetails.tenantName}</strong> as a <span className="text-[#7C5CFC] font-semibold">{inviteDetails.role}</span>.
                  </div>
                </div>
              )}

              {validationError && (
                <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3.5 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="h-4.5 w-4.5 text-red-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed text-red-400/80">
                    <span className="text-red-400 font-semibold uppercase tracking-wider block text-[9px] mb-0.5">VERIFICATION ERROR</span>
                    {validationError}
                  </div>
                </div>
              )}

              {/* FIELD 2: 6-DIGIT PASSCODE PIN INPUT */}
              <div className="space-y-2.5 pt-1">
                <Label className="text-xs font-semibold text-zinc-400 flex justify-between items-center">
                  <span>6-Digit Security PIN</span>
                  <span className="text-[9px] font-mono text-zinc-600">REQUIRED</span>
                </Label>
                
                {/* Clean OTP digit boxes wrapper */}
                <div className="flex gap-2 justify-between">
                  {pin.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={pinRefs[idx]}
                      id={`pin-${idx}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePinChange(e.target.value, idx)}
                      onKeyDown={(e) => handlePinKeyDown(e, idx)}
                      className="w-12 h-12 rounded-xl bg-[#0E0E10] border border-zinc-800 focus:border-[#7C5CFC]/50 text-center font-mono text-lg font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]/40 transition-all select-all shadow-inner"
                    />
                  ))}
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <div className="pt-4">
                <Button 
                  type="submit" 
                  disabled={loading === "joinSubmit" || !token || pin.join("").length < 6}
                  style={token && pin.join("").length === 6 ? { background: 'linear-gradient(135deg, #CABEFF, #7C5CFC)', color: '#09090B' } : undefined}
                  className="w-full h-11 text-xs font-bold uppercase tracking-wider rounded-xl hover:opacity-90 active:scale-98 transition-all flex items-center justify-center shrink-0"
                >
                  {loading === "joinSubmit" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Accepting Invitation...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      Join Organization
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        <div className="text-center">
          <Button 
            variant="ghost" 
            className="text-zinc-500 hover:text-white text-xs hover:bg-zinc-800/10"
            onClick={() => logout()}
          >
            Sign out and try another account
          </Button>
        </div>
      </div>
    </div>
  );
}
