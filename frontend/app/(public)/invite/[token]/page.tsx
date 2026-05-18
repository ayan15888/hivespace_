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
  Hexagon,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  KeyRound,
  LockKeyhole,
  Users2,
  Layers,
  ChevronRight,
  Trash2,
  ArrowUpRight,
  AlertTriangle
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { CTAButton } from "@/components/common/CTAButton"
import { cn } from "@/lib/utils"

type UIState = "PIN_ENTRY" | "VALID_LOGGED_OUT" | "VALID_LOGGED_IN" | "INVALID" | "SUCCESS"

// Static Mock Data mapped to newSchema.sql table properties
const mockInvite = {
  token: "tkn_sec_8f9382b",
  role: "ADMIN", // admin role matches schema roles
  maxUses: 5,
  currentUses: 1,
  status: "ACTIVE",
  expiresAt: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(), // 18 hours from now
  tenant: {
    name: "Acme Corporation",
    slug: "acme-corp",
    plan: "PRO" // FREE, PRO, ULTIMATE, ENTERPRISE
  },
  workspace: {
    name: "Product Design & Engineering"
  },
  team: {
    name: "Frontend Guild Core"
  },
  inviter: {
    fullName: "Sarah Jenkins",
    username: "sjenkins",
    jobTitle: "Principal UI Architect",
    avatarUrl: "",
    initials: "SJ"
  }
}

export default function InviteAcceptancePage() {
  const [uiState, setUiState] = React.useState<UIState>("PIN_ENTRY")
  const [pin, setPin] = React.useState<string[]>(["", "", "", "", "", ""])
  const [pinVerifying, setPinVerifying] = React.useState(false)
  const [verifyStep, setVerifyStep] = React.useState(0)
  const [pinError, setPinError] = React.useState<string | null>(null)
  
  // Custom Registration Fields
  const [fullName, setFullName] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [regError, setRegError] = React.useState<string | null>(null)

  // Listen to physical keyboard events for PIN entry
  React.useEffect(() => {
    if (uiState !== "PIN_ENTRY" || pinVerifying) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        const nextIndex = pin.findIndex(val => val === "")
        if (nextIndex !== -1) {
          const newPin = [...pin]
          newPin[nextIndex] = e.key
          setPin(newPin)
          setPinError(null)
        }
      } else if (e.key === "Backspace") {
        const lastFilledIndex = [...pin].reverse().findIndex(val => val !== "")
        if (lastFilledIndex !== -1) {
          const actualIndex = 5 - lastFilledIndex
          const newPin = [...pin]
          newPin[actualIndex] = ""
          setPin(newPin)
          setPinError(null)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [pin, uiState, pinVerifying])

  // Handle Holographic Keyboard Press
  const handleKeyPress = (val: string) => {
    if (pinVerifying) return
    setPinError(null)

    if (val === "DELETE") {
      const lastFilledIndex = [...pin].reverse().findIndex(x => x !== "")
      if (lastFilledIndex !== -1) {
        const actualIndex = 5 - lastFilledIndex
        const newPin = [...pin]
        newPin[actualIndex] = ""
        setPin(newPin)
      }
    } else if (val === "CLEAR") {
      setPin(["", "", "", "", "", ""])
    } else {
      const nextIdx = pin.findIndex(x => x === "")
      if (nextIdx !== -1) {
        const newPin = [...pin]
        newPin[nextIdx] = val
        setPin(newPin)
      }
    }
  }

  // Simulate PIN Verification
  const handleVerifyPIN = () => {
    const entered = pin.join("")
    if (entered.length < 6) {
      setPinError("Please enter all 6 digits of the secure PIN")
      return
    }

    setPinVerifying(true)
    setVerifyStep(0)

    // Step-by-step cryptographic checks simulation
    setTimeout(() => {
      setVerifyStep(1) // cryptographic checks
      setTimeout(() => {
        setVerifyStep(2) // token hash comparison
        setTimeout(() => {
          setVerifyStep(3) // done
          setTimeout(() => {
            setPinVerifying(false)
            setUiState("VALID_LOGGED_OUT")
          }, 600)
        }, 800)
      }, 700)
    }, 600)
  }

  // Simulate Registration Accept
  const handleRegisterAccept = (e: React.FormEvent) => {
    e.preventDefault()
    setRegError(null)
    if (!fullName.trim()) {
      setRegError("Full name is required")
      return
    }
    if (password.length < 8) {
      setRegError("Password must be at least 8 characters long")
      return
    }
    if (password !== confirmPassword) {
      setRegError("Passwords do not match")
      return
    }

    setUiState("SUCCESS")
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-[#E5E1E4] selection:bg-[#7C5CFC]/30 selection:text-white font-sans relative overflow-x-hidden flex flex-col justify-between pb-12">
      {/* Glow Ambient Lights */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-[#7C5CFC]/10 rounded-full blur-[140px] pointer-events-none animate-pulse duration-[10s]" />
      <div className="absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] bg-[#4F46E5]/10 rounded-full blur-[140px] pointer-events-none animate-pulse duration-[8s]" />

      {/* Top Header */}
      <header className="flex justify-center pt-10 z-10">
        <div className="flex items-center gap-2.5 group cursor-pointer">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#7C5CFC] to-[#4F46E5] p-[1px] shadow-[0_0_20px_-3px_rgba(124,92,252,0.5)] group-hover:scale-105 transition-transform duration-350">
            <div className="h-full w-full bg-[#0E0E10] rounded-[11px] flex items-center justify-center">
              <Hexagon className="h-4.5 w-4.5 text-[#7C5CFC]" fill="currentColor" fillOpacity={0.25} strokeWidth={2.5} />
            </div>
          </div>
          <span className="text-base font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-zinc-500">HiveSpace</span>
        </div>
      </header>

      {/* Core Main Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-10 z-10">
        
        {/* Left Visual Brand Panel (Only displays in valid accept states) */}
        {uiState !== "PIN_ENTRY" && uiState !== "INVALID" && uiState !== "SUCCESS" ? (
          <div className="lg:col-span-5 flex flex-col gap-6 text-left pr-4 hidden lg:flex animate-in fade-in slide-in-from-left-6 duration-600">
            <div>
              <Badge className="bg-[#7C5CFC]/10 border-[#7C5CFC]/25 text-[#7C5CFC] text-[10px] font-bold uppercase tracking-wider mb-3 px-2.5 py-0.5 rounded-full">
                Secure Member Invitation
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-white leading-tight">
                Unlock collaborative power with your team
              </h2>
              <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                Connect documents, sprint backlogs, team conversations, and GitHub pipelines into a single high-performance workspace.
              </p>
            </div>

            {/* Tree Flow Destination Diagram */}
            <div className="bg-[#121114]/40 border border-white/[0.04] rounded-2xl p-5 relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-0 right-0 h-16 w-16 bg-[#7C5CFC]/5 blur-xl rounded-full" />
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Acceptance Destinations</p>
              
              <div className="flex flex-col gap-4 relative pl-3">
                {/* Visual Tree Connector Line */}
                <div className="absolute left-[13px] top-[14px] bottom-[14px] w-[1px] border-l border-dashed border-zinc-800" />
                
                {/* 1. Tenant */}
                <div className="flex items-center gap-3 relative z-10">
                  <div className="h-6 w-6 rounded-md bg-[#7C5CFC]/10 border border-[#7C5CFC]/20 flex items-center justify-center text-[#7C5CFC]">
                    <Building2 className="h-3 w-3" />
                  </div>
                  <div>
                    <p className="text-[9px] text-zinc-500 leading-none">Organization</p>
                    <p className="text-xs font-semibold text-white mt-0.5">{mockInvite.tenant.name}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-bold border-yellow-500/20 bg-yellow-500/5 text-yellow-500 uppercase tracking-wider ml-auto rounded-sm px-1 py-0">
                    {mockInvite.tenant.plan} PLAN
                  </Badge>
                </div>

                {/* 2. Workspace */}
                <div className="flex items-center gap-3 relative z-10">
                  <div className="h-6 w-6 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Briefcase className="h-3 w-3" />
                  </div>
                  <div>
                    <p className="text-[9px] text-zinc-500 leading-none">Workspace</p>
                    <p className="text-xs font-semibold text-white mt-0.5">{mockInvite.workspace.name}</p>
                  </div>
                </div>

                {/* 3. Team */}
                <div className="flex items-center gap-3 relative z-10">
                  <div className="h-6 w-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Layers className="h-3 w-3" />
                  </div>
                  <div>
                    <p className="text-[9px] text-zinc-500 leading-none">Specific Team</p>
                    <p className="text-xs font-semibold text-white mt-0.5">{mockInvite.team.name}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Inviter Info Card */}
            <div className="bg-[#121114]/40 border border-white/[0.04] rounded-2xl p-4 flex items-center gap-4.5 backdrop-blur-md">
              <Avatar className="h-10 w-10 border border-white/[0.06] rounded-xl">
                <AvatarFallback className="bg-gradient-to-tr from-[#7C5CFC] to-[#4F46E5] text-white text-xs font-bold">
                  {mockInvite.inviter.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-[9px] text-zinc-500 leading-none">Invited By</p>
                <h4 className="text-sm font-semibold text-white mt-0.5">{mockInvite.inviter.fullName}</h4>
                <p className="text-xs text-zinc-400 leading-none">{mockInvite.inviter.jobTitle}</p>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                  <Clock className="h-3 w-3" />
                  <span>Expires soon</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Center Card Panel (Width adapts depending on screens) */}
        <div className={cn(
          "w-full flex justify-center transition-all duration-500",
          uiState === "PIN_ENTRY" || uiState === "INVALID" || uiState === "SUCCESS" 
            ? "lg:col-span-12 max-w-lg mx-auto" 
            : "lg:col-span-7"
        )}>
          {uiState === "PIN_ENTRY" ? (
            <PINEntryScreen 
              pin={pin} 
              onKeyPress={handleKeyPress} 
              onVerify={handleVerifyPIN}
              verifying={pinVerifying}
              verifyStep={verifyStep}
              error={pinError}
            />
          ) : uiState === "SUCCESS" ? (
            <SuccessState />
          ) : uiState === "INVALID" ? (
            <InvalidState onBack={() => setUiState("PIN_ENTRY")} />
          ) : uiState === "VALID_LOGGED_IN" ? (
            <LoggedInState onAccept={() => setUiState("SUCCESS")} onBack={() => setUiState("PIN_ENTRY")} />
          ) : (
            <LoggedOutState 
              fullName={fullName}
              setFullName={setFullName}
              password={password}
              setPassword={setPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              error={regError}
              onSubmit={handleRegisterAccept}
              onSignIn={() => setUiState("VALID_LOGGED_IN")} 
              onBack={() => setUiState("PIN_ENTRY")}
            />
          )}
        </div>

      </main>

      {/* Debug Switcher for Testing (Aesthetically designed) */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-[#121114]/90 border border-white/[0.08] backdrop-blur-md px-3 py-1.5 rounded-full shadow-[0_4px_30px_rgba(0,0,0,0.5)] z-50 animate-bounce duration-[3s]">
        <span className="text-[9px] font-bold text-zinc-500 tracking-wider uppercase mr-1">Demo States:</span>
        <button onClick={() => setUiState("PIN_ENTRY")} className={cn("text-[9px] px-2.5 py-1 rounded-full font-semibold transition-all uppercase tracking-wide", uiState === "PIN_ENTRY" ? "bg-[#7C5CFC] text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800")}>PIN</button>
        <button onClick={() => setUiState("VALID_LOGGED_OUT")} className={cn("text-[9px] px-2.5 py-1 rounded-full font-semibold transition-all uppercase tracking-wide", uiState === "VALID_LOGGED_OUT" ? "bg-[#7C5CFC] text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800")}>V_OUT</button>
        <button onClick={() => setUiState("VALID_LOGGED_IN")} className={cn("text-[9px] px-2.5 py-1 rounded-full font-semibold transition-all uppercase tracking-wide", uiState === "VALID_LOGGED_IN" ? "bg-[#7C5CFC] text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800")}>V_IN</button>
        <button onClick={() => setUiState("INVALID")} className={cn("text-[9px] px-2.5 py-1 rounded-full font-semibold transition-all uppercase tracking-wide", uiState === "INVALID" ? "bg-[#7C5CFC] text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800")}>INV</button>
        <button onClick={() => setUiState("SUCCESS")} className={cn("text-[9px] px-2.5 py-1 rounded-full font-semibold transition-all uppercase tracking-wide", uiState === "SUCCESS" ? "bg-[#7C5CFC] text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800")}>SUCC</button>
      </div>

      {/* Footer */}
      <footer className="text-center z-10">
        <p className="text-[11px] text-zinc-600">
          Powered by HiveSpace cryptographically-signed invitation protocol. &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  )
}

// -------------------------------------------------------------------------
// SCREEN COMPONENTS
// -------------------------------------------------------------------------

interface PINEntryProps {
  pin: string[]
  onKeyPress: (val: string) => void
  onVerify: () => void
  verifying: boolean
  verifyStep: number
  error: string | null
}

function PINEntryScreen({ pin, onKeyPress, onVerify, verifying, verifyStep, error }: PINEntryProps) {
  const steps = [
    "Establishing secure network socket...",
    "Decrypting verification payload...",
    "Validating secure pin_hash bcrypt signature...",
    "Handoff authorized! Redirecting..."
  ]

  return (
    <div className="w-full bg-[#121114]/80 border border-white/[0.06] rounded-[28px] p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-400">
      
      {/* Glowing shield accent */}
      <div className="absolute top-[-30px] right-[-30px] w-24 h-24 bg-[#7C5CFC]/10 rounded-full blur-xl pointer-events-none" />

      {verifying ? (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-pulse">
          <div className="relative flex items-center justify-center">
            <div className="h-16 w-16 rounded-full border-2 border-[#7C5CFC]/20 border-t-[#7C5CFC] animate-spin" />
            <LockKeyhole className="absolute h-6 w-6 text-[#7C5CFC] animate-bounce" />
          </div>
          <h3 className="text-lg font-bold text-white mt-8">Decrypting Security Lock</h3>
          <p className="text-xs text-[#7C5CFC] mt-2 font-mono h-4 max-w-xs transition-all duration-300">
            {steps[verifyStep]}
          </p>
          <div className="w-48 bg-zinc-800/80 h-[3px] rounded-full overflow-hidden mt-6">
            <div 
              className="h-full bg-[#7C5CFC] rounded-full transition-all duration-500" 
              style={{ width: `${(verifyStep + 1) * 25}%` }} 
            />
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-2xl bg-[#7C5CFC]/10 border border-[#7C5CFC]/20 flex items-center justify-center text-[#7C5CFC] mb-4 shadow-[0_0_15px_rgba(124,92,252,0.15)]">
              <KeyRound className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-semibold text-white tracking-tight">Security PIN Required</h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-[280px] leading-relaxed">
              This invitation link is cryptographically protected. Please enter your 6-digit access PIN.
            </p>
          </div>

          {/* 6 PIN Blocks */}
          <div className="flex justify-center gap-2 mt-6">
            {pin.map((digit, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "h-12 w-10 rounded-xl bg-zinc-900 border flex items-center justify-center text-lg font-mono font-bold transition-all duration-200",
                  digit !== "" 
                    ? "border-[#7C5CFC] text-white shadow-[0_0_12px_rgba(124,92,252,0.25)] bg-[#7C5CFC]/5" 
                    : "border-white/[0.06] text-zinc-600",
                  pin.findIndex(val => val === "") === idx ? "ring-1 ring-[#7C5CFC]/40 border-[#7C5CFC]/50 animate-pulse" : ""
                )}
              >
                {digit !== "" ? "•" : ""}
              </div>
            ))}
          </div>

          {error && (
            <p className="text-center text-[10px] text-red-400 font-medium mt-3 flex items-center justify-center gap-1 animate-pulse">
              <AlertCircle className="h-3 w-3" />
              {error}
            </p>
          )}

          {/* Holographic Keyboard Pad */}
          <div className="grid grid-cols-3 gap-2 mt-6 max-w-[280px] mx-auto">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((val) => (
              <button 
                key={val} 
                onClick={() => onKeyPress(val)}
                className="h-10 rounded-xl bg-zinc-900/50 hover:bg-[#7C5CFC]/10 border border-white/[0.04] hover:border-[#7C5CFC]/30 text-sm font-semibold hover:text-white transition-all active:scale-95 text-zinc-300 font-mono"
              >
                {val}
              </button>
            ))}
            <button 
              onClick={() => onKeyPress("CLEAR")}
              className="h-10 rounded-xl bg-zinc-900/20 hover:bg-red-500/10 border border-white/[0.04] hover:border-red-500/30 text-[10px] font-bold text-zinc-500 hover:text-red-400 transition-all uppercase tracking-wider"
            >
              Clear
            </button>
            <button 
              onClick={() => onKeyPress("0")}
              className="h-10 rounded-xl bg-zinc-900/50 hover:bg-[#7C5CFC]/10 border border-white/[0.04] hover:border-[#7C5CFC]/30 text-sm font-semibold hover:text-white transition-all text-zinc-300 font-mono"
            >
              0
            </button>
            <button 
              onClick={() => onKeyPress("DELETE")}
              className="h-10 rounded-xl bg-zinc-900/20 hover:bg-orange-500/10 border border-white/[0.04] hover:border-orange-500/30 text-[10px] font-bold text-zinc-500 hover:text-orange-400 transition-all uppercase tracking-wider"
            >
              Del
            </button>
          </div>

          <CTAButton onClick={onVerify} className="w-full h-11 text-xs uppercase tracking-widest mt-6 shadow-[0_0_20px_-3px_rgba(124,92,252,0.3)]">
            Validate Invitation
          </CTAButton>
        </>
      )}
    </div>
  )
}

// Invite Card Header for accept screens
function DynamicInviteHeader() {
  return (
    <div className="flex flex-col items-center">
      <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-[#7C5CFC] to-[#4F46E5] p-[1.5px] shadow-[0_0_20px_rgba(124,92,252,0.2)]">
        <div className="h-full w-full bg-[#121114] rounded-[14px] flex items-center justify-center text-[#7C5CFC]">
          <Building2 className="h-7 w-7" strokeWidth={1.5} />
        </div>
      </div>
      <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mt-4 text-center">You have been invited to</p>
      <h1 className="text-2xl font-bold text-white text-center mt-1 tracking-tight">{mockInvite.tenant.name}</h1>
      
      {/* Mini flow badges for mobile views where left bar is hidden */}
      <div className="flex items-center gap-1.5 mt-2 lg:hidden flex-wrap justify-center">
        <Badge variant="outline" className="bg-[#7C5CFC]/5 border-[#7C5CFC]/20 text-[#7C5CFC] text-[9px] py-0.5 rounded-sm">
          {mockInvite.workspace.name}
        </Badge>
        <ChevronRight className="h-3 w-3 text-zinc-600" />
        <Badge variant="outline" className="bg-emerald-500/5 border-emerald-500/20 text-emerald-400 text-[9px] py-0.5 rounded-sm">
          {mockInvite.team.name}
        </Badge>
      </div>
    </div>
  )
}

// Seat and Expiration mini bar
function InvitationStats() {
  const percentage = (mockInvite.currentUses / mockInvite.maxUses) * 100

  return (
    <div className="bg-zinc-950/50 border border-white/[0.04] rounded-xl p-4 space-y-3">
      {/* 1. Seat progress */}
      <div>
        <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1.5">
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-[#7C5CFC]" /> Link Seat Availability</span>
          <span className="font-mono text-zinc-300 font-bold">{mockInvite.maxUses - mockInvite.currentUses} of {mockInvite.maxUses} seats left</span>
        </div>
        <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
          <div className="h-full bg-[#7C5CFC] rounded-full" style={{ width: `${percentage}%` }} />
        </div>
      </div>

      <div className="h-[1px] bg-white/[0.04]" />

      {/* 2. Inviter + Expiry mini card */}
      <div className="flex justify-between items-center flex-wrap gap-2 text-[10px]">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">Your role:</span>
          <Badge className="bg-[#7C5CFC]/10 border-[#7C5CFC]/20 text-[#7C5CFC] text-[9px] font-bold uppercase rounded-sm px-1.5 py-0.2">
            {mockInvite.role}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 text-orange-400">
          <Clock className="h-3 w-3" />
          <span>Expires: in 18 hours</span>
        </div>
      </div>
    </div>
  )
}

// ACCEPT STATE: LOGGED OUT (SIGNUP FORM)
interface LoggedOutProps {
  fullName: string
  setFullName: (v: string) => void
  password: React.ComponentProps<typeof Input>["value"]
  setPassword: (v: string) => void
  confirmPassword: React.ComponentProps<typeof Input>["value"]
  setConfirmPassword: (v: string) => void
  error: string | null
  onSubmit: (e: React.FormEvent) => void
  onSignIn: () => void
  onBack: () => void
}

function LoggedOutState({ 
  fullName, setFullName, password, setPassword, confirmPassword, setConfirmPassword, error, onSubmit, onSignIn, onBack 
}: LoggedOutProps) {
  return (
    <div className="w-full bg-[#121114]/80 border border-white/[0.06] rounded-[28px] p-8 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-6 duration-500">
      
      {/* Back button */}
      <button onClick={onBack} className="text-[10px] text-zinc-500 hover:text-white uppercase tracking-wider font-bold mb-4 flex items-center gap-1 transition-colors">
        &larr; Back to PIN check
      </button>

      <DynamicInviteHeader />
      <div className="h-px bg-white/[0.04] my-5" />
      <InvitationStats />
      <div className="h-px bg-white/[0.04] my-5" />
      
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest text-center">
          Create account to accept invite
        </p>
        
        <div className="space-y-2.5">
          <Input 
            placeholder="Your Full name" 
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="bg-zinc-900 border-white/[0.06] focus:border-[#7C5CFC]/50 h-11 text-sm text-white focus-visible:ring-0 rounded-xl"
            required
          />
          <div className="relative">
            <Input 
              value="developer@acme.com" 
              readOnly
              className="bg-zinc-900/50 border-white/[0.04] h-11 text-sm text-zinc-500 pr-10 focus-visible:ring-0 rounded-xl cursor-not-allowed select-none"
            />
            <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-700" />
          </div>
          <Input 
            type="password"
            placeholder="Create password (min 8 chars)" 
            value={password as string}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-zinc-900 border-white/[0.06] focus:border-[#7C5CFC]/50 h-11 text-sm text-white focus-visible:ring-0 rounded-xl"
            required
          />
          <Input 
            type="password"
            placeholder="Confirm password" 
            value={confirmPassword as string}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="bg-zinc-900 border-white/[0.06] focus:border-[#7C5CFC]/50 h-11 text-sm text-white focus-visible:ring-0 rounded-xl"
            required
          />
        </div>

        {error && (
          <p className="text-[10px] text-red-400 font-medium flex items-center gap-1 px-1 justify-center animate-pulse">
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}

        <CTAButton type="submit" className="w-full h-11 text-xs uppercase tracking-widest mt-2 shadow-[0_0_20px_-3px_rgba(124,92,252,0.3)]">
          Create Account & Accept
        </CTAButton>

        <div className="flex flex-col items-center gap-3">
          <p className="text-[11px] text-zinc-500">
            Already have a HiveSpace account? <button type="button" onClick={onSignIn} className="text-[#7C5CFC] font-semibold hover:underline">Sign in instead &rarr;</button>
          </p>
          <p className="text-[9px] text-zinc-600 text-center leading-relaxed max-w-[280px]">
            By accepting, you agree to the HiveSpace <span className="underline cursor-pointer hover:text-zinc-400">Terms of Service</span> and <span className="underline cursor-pointer hover:text-zinc-400">Privacy Policy</span>.
          </p>
        </div>
      </form>
    </div>
  )
}

// ACCEPT STATE: LOGGED IN (FAST ACCEPT)
interface LoggedInProps {
  onAccept: () => void
  onBack: () => void
}

function LoggedInState({ onAccept, onBack }: LoggedInProps) {
  return (
    <div className="w-full bg-[#121114]/80 border border-white/[0.06] rounded-[28px] p-8 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-6 duration-500">
      
      {/* Back button */}
      <button onClick={onBack} className="text-[10px] text-zinc-500 hover:text-white uppercase tracking-wider font-bold mb-4 flex items-center gap-1 transition-colors">
        &larr; Back to PIN check
      </button>

      <DynamicInviteHeader />
      <div className="h-px bg-white/[0.04] my-5" />
      <InvitationStats />
      <div className="h-px bg-white/[0.04] my-5" />
      
      <div className="flex flex-col items-center">
        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-4">
          Accept invitation with your profile:
        </p>
        
        <div className="flex flex-col items-center gap-3 mb-6 bg-zinc-950/40 border border-white/[0.04] rounded-2xl p-4 w-full max-w-[280px]">
          <Avatar className="h-12 w-12 rounded-xl border border-white/[0.08] shadow-[0_0_15px_rgba(124,92,252,0.15)]">
            <AvatarFallback className="bg-gradient-to-tr from-[#7C5CFC] to-[#4F46E5] text-white text-sm font-semibold">JD</AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h3 className="text-sm font-bold text-white">John Doe</h3>
            <p className="text-xs text-zinc-500 mt-0.5">developer@acme.com</p>
          </div>
          
          <div className="flex items-center gap-1 bg-emerald-500/5 px-2.5 py-1 rounded-full border border-emerald-500/10 mt-1">
            <CheckCircle className="h-3 w-3 text-emerald-400 animate-pulse" />
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wide">Matches invitation email</span>
          </div>
        </div>

        <CTAButton onClick={onAccept} className="w-full h-11 text-xs uppercase tracking-widest shadow-[0_0_20px_-3px_rgba(124,92,252,0.3)]">
          Accept Workspace Invitation
        </CTAButton>
        <p className="text-[9px] text-zinc-500 text-center mt-3.5 leading-relaxed max-w-[280px]">
          Accepting this will add you as a <span className="text-[#7C5CFC] font-semibold">{mockInvite.role}</span> in the <span className="text-white font-medium">{mockInvite.workspace.name}</span>.
        </p>

        <button className="text-[9px] font-bold text-zinc-600 hover:text-zinc-400 uppercase tracking-widest mt-8 transition-colors">
          Sign in with a different account
        </button>
      </div>
    </div>
  )
}

// STATE: INVALID (EXPIRED / EXHAUSTED / REVOKED)
interface InvalidProps {
  onBack: () => void
}

function InvalidState({ onBack }: InvalidProps) {
  return (
    <div className="w-full bg-[#121114]/80 border border-white/[0.06] rounded-[28px] p-10 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-400">
      <div className="h-16 w-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
        <ShieldAlert className="h-9 w-9 text-red-500" strokeWidth={1.5} />
      </div>
      <h2 className="text-xl font-bold text-white tracking-tight">Secure Invitation Expired</h2>
      <p className="text-xs text-zinc-400 mt-2.5 max-w-[260px] mx-auto leading-relaxed">
        This cryptographically-signed invitation expired on {new Date(mockInvite.expiresAt).toLocaleDateString()} or has reached its capacity limit.
      </p>

      {/* Mini Error Panel */}
      <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3.5 mt-5 text-[10px] text-red-400/80 font-mono flex items-center gap-2 max-w-[280px]">
        <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
        <span className="text-left leading-tight">Error 403: Token signature expired. Max uses ({mockInvite.maxUses}) or lifespan exceeded.</span>
      </div>

      <div className="w-full mt-8 space-y-2.5 max-w-[280px]">
        <CTAButton className="w-full h-11 text-[10px] uppercase tracking-widest bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700/50">
          Request new invitation
        </CTAButton>
        <button 
          onClick={onBack}
          className="w-full h-11 bg-zinc-950/50 border border-white/[0.04] rounded-xl text-[10px] font-bold text-zinc-500 uppercase tracking-widest hover:text-white hover:bg-zinc-900 transition-colors"
        >
          &larr; Return to PIN check
        </button>
      </div>

      <p className="text-[9px] text-zinc-600 mt-8 leading-relaxed">
        If you believe this is in error, contact your system administrator or email <span className="text-[#7C5CFC]/80">support@hivespace.io</span>
      </p>
    </div>
  )
}

// STATE: SUCCESS (CELEBRATORY WELCOME SCREEN)
function SuccessState() {
  return (
    <div className="w-full bg-[#121114]/80 border border-white/[0.06] rounded-[28px] p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
      
      {/* Decorative stars */}
      <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-bounce duration-[2s]">
        <CheckCircle className="h-9 w-9 text-emerald-400 animate-pulse" strokeWidth={1.5} />
      </div>

      <h1 className="text-2xl font-bold text-white text-center tracking-tight">Joined Workspace! 🎉</h1>
      <p className="text-xs text-zinc-400 mt-2 text-center max-w-[280px] leading-relaxed">
        You are officially a member of <span className="text-white font-semibold">{mockInvite.tenant.name}</span> as a <span className="text-[#7C5CFC] font-semibold">{mockInvite.role}</span>.
      </p>

      {/* Step by Step Flow */}
      <div className="w-full mt-8 space-y-2.5">
        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 px-1">Getting Started Checklist</p>
        
        <div className="bg-zinc-950/40 border border-white/[0.04] rounded-xl p-3.5 flex items-center gap-3.5 hover:bg-[#7C5CFC]/5 hover:border-[#7C5CFC]/20 transition-all cursor-pointer group">
          <div className="h-8 w-8 rounded-lg bg-[#7C5CFC]/10 flex items-center justify-center text-[#7C5CFC] group-hover:scale-105 transition-transform shrink-0">
            <KanbanSquare className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-white truncate">Task Manager</h4>
            <p className="text-[10px] text-zinc-500 mt-0.5 truncate">See active issues allocated to you in Sprint 3</p>
          </div>
          <ArrowUpRight className="h-3.5 w-3.5 text-zinc-700 ml-auto group-hover:text-[#7C5CFC] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>

        <div className="bg-zinc-950/40 border border-white/[0.04] rounded-xl p-3.5 flex items-center gap-3.5 hover:bg-[#7C5CFC]/5 hover:border-[#7C5CFC]/20 transition-all cursor-pointer group">
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform shrink-0">
            <MessageSquare className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-white truncate">Chat channels</h4>
            <p className="text-[10px] text-zinc-500 mt-0.5 truncate">Join #general and greet your new engineering team</p>
          </div>
          <ArrowUpRight className="h-3.5 w-3.5 text-zinc-700 ml-auto group-hover:text-[#7C5CFC] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>

        <div className="bg-zinc-950/40 border border-white/[0.04] rounded-xl p-3.5 flex items-center gap-3.5 hover:bg-[#7C5CFC]/5 hover:border-[#7C5CFC]/20 transition-all cursor-pointer group">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
            <BookOpen className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-white truncate">Documentation</h4>
            <p className="text-[10px] text-zinc-500 mt-0.5 truncate">Review the corporate developer stack manual</p>
          </div>
          <ArrowUpRight className="h-3.5 w-3.5 text-zinc-700 ml-auto group-hover:text-[#7C5CFC] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>
      </div>

      <CTAButton onClick={() => window.location.href = "/dashboard"} className="w-full h-12 mt-8 text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_20px_-3px_rgba(16,185,129,0.3)] bg-emerald-600 hover:bg-emerald-500 border-none">
        Open Dashboard
        <ArrowRight className="h-4 w-4" />
      </CTAButton>
    </div>
  )
}
