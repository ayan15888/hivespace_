"use client"

import * as React from "react"
import { 
  Users, 
  Building2, 
  Briefcase, 
  UserCheck, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  KanbanSquare, 
  MessageSquare, 
  BookOpen,
  Lock,
  ArrowRight,
  Hexagon
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { CTAButton } from "@/components/common/CTAButton"
import { cn } from "@/lib/utils"

type UIState = "VALID_LOGGED_OUT" | "VALID_LOGGED_IN" | "INVALID" | "SUCCESS"

export default function InviteAcceptancePage() {
  const [uiState, setUiState] = React.useState<UIState>("VALID_LOGGED_OUT")

  // Mock toggle for testing different states
  // In a real app, this would be determined by checking the token and auth session
  React.useEffect(() => {
    // You can manually change this to test different views
    setUiState("VALID_LOGGED_OUT")
  }, [])

  return (
    <div className="min-h-screen bg-[#0E0E10] text-[#E5E1E4] selection:bg-[#7C5CFC]/30 selection:text-white font-sans overflow-y-auto pb-12">
      {/* Top Bar */}
      <header className="flex justify-center pt-8">
        <div className="flex items-center gap-2">
          <Hexagon className="h-5 w-5 text-[#7C5CFC]" fill="currentColor" fillOpacity={0.2} strokeWidth={2} />
          <span className="text-sm font-semibold tracking-tight">Hivespace</span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6">
        {uiState === "SUCCESS" ? (
          <SuccessState />
        ) : uiState === "INVALID" ? (
          <InvalidState />
        ) : uiState === "VALID_LOGGED_IN" ? (
          <LoggedInState onAccept={() => setUiState("SUCCESS")} />
        ) : (
          <LoggedOutState onAccept={() => setUiState("SUCCESS")} onSignIn={() => setUiState("VALID_LOGGED_IN")} />
        )}
      </main>

      {/* Debug Switcher (Remove in production) */}
      <div className="fixed bottom-4 right-4 flex gap-2 opacity-20 hover:opacity-100 transition-opacity">
        <button onClick={() => setUiState("VALID_LOGGED_OUT")} className="text-[10px] bg-zinc-800 p-1 rounded">V1</button>
        <button onClick={() => setUiState("VALID_LOGGED_IN")} className="text-[10px] bg-zinc-800 p-1 rounded">V2</button>
        <button onClick={() => setUiState("INVALID")} className="text-[10px] bg-zinc-800 p-1 rounded">INV</button>
        <button onClick={() => setUiState("SUCCESS")} className="text-[10px] bg-zinc-800 p-1 rounded">SUCC</button>
      </div>
    </div>
  )
}

function InviteHeader() {
  return (
    <div className="flex flex-col items-center">
      <div className="h-14 w-14 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
        <span className="text-2xl font-bold text-violet-400">H</span>
      </div>
      <p className="text-sm text-zinc-400 mt-4 text-center">You&apos;ve been invited to join</p>
      <h1 className="text-2xl font-semibold text-[#E5E1E4] text-center mt-1">Hivespace</h1>
      <p className="text-sm text-zinc-400 text-center mt-1">Engineering workspace</p>
    </div>
  )
}

function InviteDetails() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Users className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
        <span className="text-xs text-zinc-500">Joining as:</span>
        <Badge className="bg-violet-500/10 border-violet-500/20 text-violet-400 text-[11px] font-semibold h-6 rounded-md px-2.5 ml-auto">
          Member
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        <Building2 className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
        <span className="text-xs text-zinc-500">Organisation:</span>
        <span className="text-xs font-medium text-[#E5E1E4] ml-auto">Acme Corp</span>
      </div>
      <div className="flex items-center gap-3">
        <Briefcase className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
        <span className="text-xs text-zinc-500">Workspace:</span>
        <span className="text-xs font-medium text-[#E5E1E4] ml-auto">Engineering</span>
      </div>
      <div className="flex items-center gap-3">
        <UserCheck className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
        <span className="text-xs text-zinc-500">Invited by:</span>
        <div className="flex items-center gap-1.5 ml-auto">
          <Avatar className="h-5 w-5">
            <AvatarFallback className="bg-zinc-800 text-[8px] text-zinc-500">JD</AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-[#E5E1E4]">John Doe</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Clock className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
        <span className="text-xs text-zinc-500">Expires:</span>
        <span className="text-xs font-medium text-[#E5E1E4] ml-auto">Apr 22, 2026 (3 days)</span>
      </div>
    </div>
  )
}

function LoggedOutState({ onAccept, onSignIn }: { onAccept: () => void, onSignIn: () => void }) {
  return (
    <div className="mt-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#1B1B1D] border border-zinc-800 rounded-2xl p-8 shadow-2xl">
        <InviteHeader />
        <div className="h-px bg-zinc-800 my-6" />
        <InviteDetails />
        <div className="h-px bg-zinc-800 my-6" />
        
        <div className="space-y-4">
          <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest text-center">
            Create your account to accept
          </p>
          
          <div className="space-y-2">
            <Input 
              placeholder="Full name" 
              className="bg-zinc-800 border-zinc-700 h-11 text-sm focus-visible:ring-[#7C5CFC]/30"
            />
            <div className="relative">
              <Input 
                value="dev@acme.com" 
                readOnly
                className="bg-zinc-800/50 border-zinc-700 h-11 text-sm text-zinc-400 pr-10"
              />
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
            </div>
            <Input 
              type="password"
              placeholder="Password" 
              className="bg-zinc-800 border-zinc-700 h-11 text-sm focus-visible:ring-[#7C5CFC]/30"
            />
            <Input 
              type="password"
              placeholder="Confirm password" 
              className="bg-zinc-800 border-zinc-700 h-11 text-sm focus-visible:ring-[#7C5CFC]/30"
            />
          </div>

          <CTAButton onClick={onAccept} className="w-full h-11 text-xs uppercase tracking-widest mt-2">
            Create Account & Accept Invite
          </CTAButton>

          <div className="flex flex-col items-center gap-3">
            <p className="text-[11px] text-zinc-500">
              Already have an account? <button onClick={onSignIn} className="text-violet-400 font-semibold hover:underline">Sign in →</button>
            </p>
            <p className="text-[10px] text-zinc-600 text-center leading-relaxed">
              By accepting, you agree to Hivespace&apos;s <br/>
              <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function LoggedInState({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="mt-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#1B1B1D] border border-zinc-800 rounded-2xl p-8 shadow-2xl">
        <InviteHeader />
        <div className="h-px bg-zinc-800 my-6" />
        <InviteDetails />
        <div className="h-px bg-zinc-800 my-6" />
        
        <div className="flex flex-col items-center">
          <p className="text-[11px] text-zinc-500 uppercase font-bold tracking-widest mb-4">
            You&apos;re signed in as:
          </p>
          
          <div className="flex flex-col items-center gap-3 mb-6">
            <Avatar className="h-12 w-12 rounded-xl border border-zinc-800">
              <AvatarFallback className="bg-zinc-800 text-sm font-semibold text-zinc-400">JD</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h3 className="text-sm font-semibold text-[#E5E1E4]">John Doe</h3>
              <p className="text-xs text-zinc-500 mt-0.5">john@acme.com</p>
            </div>
            <div className="flex items-center gap-1.5 bg-green-500/5 px-2 py-1 rounded-full border border-green-500/10">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span className="text-[10px] font-bold text-green-500/80 uppercase">Email matches invite</span>
            </div>
          </div>

          <CTAButton onClick={onAccept} className="w-full h-11 text-xs uppercase tracking-widest">
            Accept Invite
          </CTAButton>
          <p className="text-[10px] text-zinc-500 text-center mt-3 leading-relaxed">
            This will add you to <span className="text-[#E5E1E4] font-medium">Engineering</span> workspace as a <span className="text-violet-400 font-medium">Member</span>
          </p>

          <button className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-widest mt-8 transition-colors">
            Sign in with a different account
          </button>
        </div>
      </div>
    </div>
  )
}

function InvalidState() {
  return (
    <div className="mt-16 animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-[#1B1B1D] border border-zinc-800 rounded-2xl p-10 shadow-2xl flex flex-col items-center text-center">
        <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <AlertCircle className="h-10 w-10 text-red-500" strokeWidth={1.5} />
        </div>
        <h2 className="text-xl font-semibold text-[#E5E1E4]">This invite has expired</h2>
        <p className="text-sm text-zinc-400 mt-2 max-w-[240px] mx-auto leading-relaxed">
          This invite link expired on Apr 8, 2026. Please ask the inviter for a new link.
        </p>

        <div className="w-full mt-10 space-y-3">
          <CTAButton className="w-full h-11 text-[10px] uppercase tracking-widest">
            Request a new invite
          </CTAButton>
          <button className="w-full h-11 bg-zinc-800/50 border border-zinc-700/30 rounded-md text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:bg-zinc-800 transition-colors">
            Already a member? Sign in
          </button>
        </div>

        <p className="text-[10px] text-zinc-600 mt-10 leading-relaxed italic">
          Need help? Contact your workspace admin <br/> or reach out to <span className="text-violet-400/70">support@hivespace.io</span>
        </p>
      </div>
    </div>
  )
}

function SuccessState() {
  return (
    <div className="mt-16 animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-[#1B1B1D] border border-zinc-800 rounded-2xl p-8 shadow-2xl flex flex-col items-center">
        <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
          <CheckCircle className="h-10 w-10 text-emerald-500" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-bold text-[#E5E1E4] text-center">Welcome to Hivespace! 🎉</h1>
        <p className="text-sm text-zinc-400 mt-2 text-center max-w-[280px]">
          You&apos;ve successfully joined the Engineering workspace as a Member.
        </p>

        <div className="w-full mt-10 space-y-3">
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2 px-1">WHAT&apos;S NEXT</p>
          
          <div className="bg-zinc-800/40 border border-zinc-700/30 rounded-xl p-4 flex items-center gap-4 hover:bg-zinc-800 transition-colors cursor-pointer group">
            <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
              <KanbanSquare className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#E5E1E4]">Explore your tasks</h4>
              <p className="text-[11px] text-zinc-500 mt-0.5">See what&apos;s assigned to you in Sprint 3</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-zinc-700 ml-auto group-hover:text-zinc-500 group-hover:translate-x-1 transition-all" />
          </div>

          <div className="bg-zinc-800/40 border border-zinc-700/30 rounded-xl p-4 flex items-center gap-4 hover:bg-zinc-800 transition-colors cursor-pointer group">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#E5E1E4]">Join the conversation</h4>
              <p className="text-[11px] text-zinc-500 mt-0.5">Say hi to the team in #general channel</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-zinc-700 ml-auto group-hover:text-zinc-500 group-hover:translate-x-1 transition-all" />
          </div>

          <div className="bg-zinc-800/40 border border-zinc-700/30 rounded-xl p-4 flex items-center gap-4 hover:bg-zinc-800 transition-colors cursor-pointer group">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#E5E1E4]">Read the docs</h4>
              <p className="text-[11px] text-zinc-500 mt-0.5">Get up to speed on the Engineering stack</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-zinc-700 ml-auto group-hover:text-zinc-500 group-hover:translate-x-1 transition-all" />
          </div>
        </div>

        <CTAButton className="w-full h-12 mt-10 text-xs uppercase tracking-widest flex items-center justify-center gap-3">
          Go to Dashboard
          <ArrowRight className="h-4 w-4" />
        </CTAButton>
      </div>
    </div>
  )
}
