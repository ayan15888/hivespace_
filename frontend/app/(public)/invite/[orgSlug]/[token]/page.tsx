"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  Users, 
  Building2, 
  Clock, 
  Lock, 
  AlertCircle, 
  CheckCircle, 
  ShieldAlert, 
  AlertTriangle, 
  KanbanSquare, 
  MessageSquare, 
  BookOpen, 
  ArrowUpRight, 
  ArrowRight, 
  Hexagon, 
  ChevronRight, 
  Loader2, 
  UserCheck, 
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { CTAButton } from "@/components/common/CTAButton"
import { cn } from "@/lib/utils"
import { getInviteDetails, joinInvite } from "@/lib/api/invites"
import { useAuthStore } from "@/store/authStore"
import { useAuth } from "@/hooks/useAuth"
import { apiFetch } from "@/lib/api/client"
import { gooeyToast as toast } from "@/components/ui/goey-toaster"
import { InviteResponse } from "@/types/invite"

type UIState = "LOADING" | "PIN_ENTRY" | "VALID_LOGGED_OUT" | "SUCCESS" | "INVALID"

export default function InviteAcceptancePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const { isAuthenticated, user: authUser } = useAuth()
  const login = useAuthStore((state) => state.login)
  const fetchUser = useAuthStore((state) => state.fetchUser)

  const [uiState, setUiState] = React.useState<UIState>("LOADING")
  const [inviteDetails, setInviteDetails] = React.useState<InviteResponse | null>(null)
  
  // PIN states
  const [pin, setPin] = React.useState<string[]>(["", "", "", "", "", ""])
  const [pinVerifying, setPinVerifying] = React.useState(false)
  const [pinError, setPinError] = React.useState<string | null>(null)
  const [storedPin, setStoredPin] = React.useState<string>("")

  // Authentication Choice: signup vs signin for logged-out users
  const [authMode, setAuthMode] = React.useState<"signup" | "signin">("signup")
  const [authLoading, setAuthLoading] = React.useState(false)
  const [authError, setAuthError] = React.useState<string | null>(null)

  // Sign Up Fields
  const [username, setUsername] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")

  // Sign In Fields
  const [loginEmail, setLoginEmail] = React.useState("")
  const [loginPassword, setLoginPassword] = React.useState("")

  // Fetch invitation details on mount
  React.useEffect(() => {
    if (!token) return
    
    getInviteDetails(token)
      .then((details) => {
        setInviteDetails(details)
        if (details.status !== "ACTIVE") {
          setUiState("INVALID")
        } else {
          setUiState("PIN_ENTRY")
        }
      })
      .catch((err: any) => {
        setPinError(err.message || "Failed to load invitation details. It may be invalid or expired.")
        setUiState("INVALID")
      })
  }, [token])

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

  // Handle PIN entry verification
  const handleVerifyPIN = async () => {
    const entered = pin.join("")
    if (entered.length < 6) {
      setPinError("Please enter all 6 digits of the secure PIN")
      return
    }

    setPinVerifying(true)
    setPinError(null)

    try {
      if (isAuthenticated) {
        // Logged-in user: directly attempt to join!
        await joinInvite({ token, pin: entered })
        await fetchUser(true) // Refresh user data to update hasTenants
        toast.success("Successfully joined the workspace!")
        setUiState("SUCCESS")
      } else {
        // Logged-out user: hold PIN in memory and prompt credentials input
        setStoredPin(entered)
        setUiState("VALID_LOGGED_OUT")
      }
    } catch (err: any) {
      const msg = err.message || "Invalid security PIN"
      setPinError(msg)
      toast.error(msg)
    } finally {
      setPinVerifying(false)
    }
  }

  // Handle Registration & Chained Accept
  const handleRegisterAccept = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    setAuthLoading(true)

    if (!username.trim() || !email.trim() || !password.trim()) {
      setAuthError("All fields are required")
      setAuthLoading(false)
      return
    }
    if (password.length < 6) {
      setAuthError("Password must be at least 6 characters long")
      setAuthLoading(false)
      return
    }
    if (password !== confirmPassword) {
      setAuthError("Passwords do not match")
      setAuthLoading(false)
      return
    }

    try {
      // 1. Create account
      const registerRes = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, email, password }),
      })

      // 2. Initialize auth session store
      login(registerRes.token, registerRes)

      // 3. Immediately claim invite workspace membership
      await joinInvite({ token, pin: storedPin })
      await fetchUser(true) // Refresh user data to update hasTenants
      
      toast.success("Account created and successfully joined workspace!")
      setUiState("SUCCESS")
    } catch (err: any) {
      const msg = err.message || "Failed to complete workspace registration"
      setAuthError(msg)
      toast.error(msg)
    } finally {
      setAuthLoading(false)
    }
  }

  // Handle Sign In & Chained Accept
  const handleLoginAccept = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    setAuthLoading(true)

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setAuthError("Email and password are required")
      setAuthLoading(false)
      return
    }

    try {
      // 1. Sign In
      const loginRes = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })

      // 2. Initialize session store
      login(loginRes.token, loginRes)

      // 3. Immediately claim invite workspace membership
      await joinInvite({ token, pin: storedPin })
      await fetchUser(true) // Refresh user data to update hasTenants

      toast.success("Successfully logged in and joined workspace!")
      setUiState("SUCCESS")
    } catch (err: any) {
      const msg = err.message || "Invalid credentials or join rejected"
      setAuthError(msg)
      toast.error(msg)
    } finally {
      setAuthLoading(false)
    }
  }

  // Calculate percentage of seats taken
  const getSeatPercentage = () => {
    if (!inviteDetails) return 0
    const max = inviteDetails.maxUses || 1
    const current = inviteDetails.currentUses || 0
    return Math.min(100, (current / max) * 100)
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-[#E5E1E4] selection:bg-[#7C5CFC]/30 selection:text-white font-sans relative overflow-x-hidden flex flex-col justify-between pb-12">
      {/* Glow Ambient Lights */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-[#7C5CFC]/10 rounded-full blur-[140px] pointer-events-none animate-pulse duration-[10s]" />
      <div className="absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] bg-[#4F46E5]/10 rounded-full blur-[140px] pointer-events-none animate-pulse duration-[8s]" />

      {/* Top Header */}
      <header className="flex justify-center pt-10 z-10">
        <div className="flex items-center gap-2.5 group cursor-pointer" onClick={() => router.push("/")}>
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
        
        {/* LEFT COLUMN: Decorative details (Hidden when SUCCESS/INVALID) */}
        {uiState !== "SUCCESS" && uiState !== "INVALID" && (
          <div className="lg:col-span-6 flex flex-col gap-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] w-fit mx-auto lg:mx-0 shadow-inner">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7C5CFC] animate-ping" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#7C5CFC] font-mono">Secure Node Invitation</span>
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Claim your workspace seat on <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#7C5CFC] to-purple-400">HiveSpace</span>
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-[420px] mx-auto lg:mx-0">
                You have been invited to join a collaborative environment with secure end-to-end access. Verify your credential PIN code to enroll.
              </p>
            </div>

            {/* Steps Guide UI */}
            <div className="hidden lg:flex flex-col gap-4 mt-4">
              <div className="flex items-center gap-4 bg-zinc-950/20 border border-white/[0.03] rounded-2xl p-3.5 hover:border-white/[0.06] transition-colors">
                <div className="h-8 w-8 rounded-lg bg-[#7C5CFC]/10 flex items-center justify-center text-[#7C5CFC] border border-[#7C5CFC]/20 shrink-0 font-bold text-xs">1</div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Submit Security PIN</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Enter the 6-digit invitation access key provided by your inviter</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-zinc-950/20 border border-white/[0.03] rounded-2xl p-3.5 hover:border-white/[0.06] transition-colors">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shrink-0 font-bold text-xs">2</div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Authenticate Account</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Log in to your profile or create a fresh secure identity instantly</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-zinc-950/20 border border-white/[0.03] rounded-2xl p-3.5 hover:border-white/[0.06] transition-colors">
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 shrink-0 font-bold text-xs">3</div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Synchronize Memberships</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Automatically enroll inside workspace channels, chats, and task boards</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RIGHT COLUMN: Interactive states */}
        <div className={cn(
          "flex justify-center items-center",
          uiState === "SUCCESS" || uiState === "INVALID" ? "lg:col-span-12 max-w-md mx-auto w-full" : "lg:col-span-6"
        )}>

          {/* 1. LOADING DYNAMIC DETAILS */}
          {uiState === "LOADING" && (
            <div className="w-full bg-[#121114]/80 border border-white/[0.06] rounded-[28px] p-10 shadow-2xl backdrop-blur-xl flex flex-col items-center justify-center min-h-[350px]">
              <Loader2 className="h-10 w-10 text-[#7C5CFC] animate-spin mb-4" />
              <p className="text-xs font-medium text-zinc-400 text-center animate-pulse">
                Decrypting secure invitation token signature...
              </p>
            </div>
          )}

          {/* 2. PIN ACCESS ENTRY */}
          {uiState === "PIN_ENTRY" && inviteDetails && (
            <div className="w-full bg-[#121114]/80 border border-white/[0.06] rounded-[28px] p-8 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-6 duration-500">
              
              <div className="flex flex-col items-center">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-[#7C5CFC] to-[#4F46E5] p-[1.5px] shadow-[0_0_20px_rgba(124,92,252,0.2)]">
                  <div className="h-full w-full bg-[#121114] rounded-[14px] flex items-center justify-center text-[#7C5CFC]">
                    <Building2 className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                </div>
                <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mt-4 text-center">Invited to join</p>
                <h1 className="text-xl font-bold text-white text-center mt-0.5 tracking-tight">{inviteDetails.tenantName}</h1>
                
                {/* Path Badges */}
                <div className="flex items-center gap-1.5 mt-2.5 flex-wrap justify-center">
                  <Badge variant="outline" className="bg-[#7C5CFC]/5 border-[#7C5CFC]/20 text-[#7C5CFC] text-[9px] py-0.5 rounded-sm">
                    {inviteDetails.workspaceName || "Default Workspace"}
                  </Badge>
                  {inviteDetails.teamName && (
                    <>
                      <ChevronRight className="h-3 w-3 text-zinc-600" />
                      <Badge variant="outline" className="bg-emerald-500/5 border-emerald-500/20 text-emerald-400 text-[9px] py-0.5 rounded-sm">
                        {inviteDetails.teamName}
                      </Badge>
                    </>
                  )}
                </div>
              </div>

              <div className="h-px bg-white/[0.04] my-5" />

              {/* Secure PIN code visual inputs */}
              <div className="space-y-4">
                <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest text-center">
                  Enter 6-Digit security access PIN
                </p>

                <div className="flex gap-2 justify-center">
                  {pin.map((digit, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "h-12 w-10 lg:w-11 bg-zinc-900 rounded-xl border flex items-center justify-center text-lg font-bold transition-all",
                        digit ? "border-[#7C5CFC] text-[#7C5CFC] shadow-[0_0_15px_-4px_rgba(124,92,252,0.4)]" : "border-white/[0.06] text-white",
                        pinError && "border-red-500/50 text-red-400 animate-shake"
                      )}
                    >
                      {digit ? "●" : ""}
                    </div>
                  ))}
                </div>

                {pinError && (
                  <p className="text-[10px] text-red-400 font-medium flex items-center gap-1 px-1 justify-center animate-pulse">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {pinError}
                  </p>
                )}

                {/* Logged in fast details */}
                {isAuthenticated && authUser && (
                  <div className="flex items-center justify-between bg-zinc-950/40 border border-white/[0.04] rounded-xl p-3 text-[10px] mt-1">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-zinc-800 text-[9px] text-[#7C5CFC] font-bold">
                          {authUser.username?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <p className="font-semibold text-zinc-200">{authUser.fullName || authUser.username}</p>
                        <p className="text-[8px] text-zinc-500 mt-0.2">{authUser.email}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/10 text-emerald-400 text-[8px] rounded-sm py-0 bg-emerald-500/5">
                      Logged In
                    </Badge>
                  </div>
                )}

                <CTAButton 
                  onClick={handleVerifyPIN} 
                  disabled={pinVerifying}
                  className="w-full h-11 text-xs uppercase tracking-widest mt-1 shadow-[0_0_20px_-3px_rgba(124,92,252,0.3)] flex items-center justify-center gap-2"
                >
                  {pinVerifying ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Authenticating Access...
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-3.5 w-3.5" />
                      {isAuthenticated ? "Verify & Join Workspace" : "Verify Invitation PIN"}
                    </>
                  )}
                </CTAButton>
              </div>

              {/* Physical Holographic Grid Keyboard */}
              <div className="grid grid-cols-3 gap-2.5 mt-6 border-t border-white/[0.04] pt-5">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "CLEAR", "0", "DELETE"].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleKeyPress(val)}
                    className={cn(
                      "h-10 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.06] hover:border-white/[0.08] transition-all text-xs font-bold font-mono tracking-tight",
                      val === "CLEAR" && "text-red-400/70 hover:text-red-400 text-[10px]",
                      val === "DELETE" && "text-amber-400/70 hover:text-amber-400 text-[10px]"
                    )}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. ACCEPT CREDENTIAL FORM (VALID PIN LOGGED OUT) */}
          {uiState === "VALID_LOGGED_OUT" && inviteDetails && (
            <div className="w-full bg-[#121114]/80 border border-white/[0.06] rounded-[28px] p-8 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-6 duration-500">
              
              {/* Back button */}
              <button 
                onClick={() => setUiState("PIN_ENTRY")} 
                className="text-[10px] text-zinc-500 hover:text-white uppercase tracking-wider font-bold mb-4 flex items-center gap-1 transition-colors"
              >
                &larr; Back to PIN entry
              </button>

              <div className="flex flex-col items-center">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#7C5CFC] to-[#4F46E5] p-[1px] shadow-[0_0_15px_rgba(124,92,252,0.2)]">
                  <div className="h-full w-full bg-[#121114] rounded-[9px] flex items-center justify-center text-[#7C5CFC]">
                    <Building2 className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                </div>
                <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mt-3 text-center">Invited to join</p>
                <h1 className="text-lg font-bold text-white text-center mt-0.5 tracking-tight">{inviteDetails.tenantName}</h1>
              </div>

              <div className="h-px bg-white/[0.04] my-4" />

              {/* Progress seat summary info */}
              <div className="bg-zinc-950/50 border border-white/[0.04] rounded-xl p-3.5 space-y-2">
                <div>
                  <div className="flex items-center justify-between text-[9px] text-zinc-500 mb-1">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3 text-[#7C5CFC]" /> Workspace Role</span>
                    <Badge className="bg-[#7C5CFC]/10 border-[#7C5CFC]/20 text-[#7C5CFC] text-[8px] font-bold uppercase rounded-sm px-1.5 py-0.2">
                      {inviteDetails.role}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-zinc-500">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-orange-400" /> Seats Claimed</span>
                    <span className="font-mono text-zinc-300 font-bold">{inviteDetails.currentUses} / {inviteDetails.maxUses} claimed</span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-white/[0.04] my-4" />
              
              {/* AUTH CONTROLLER */}
              {authMode === "signup" ? (
                <form onSubmit={handleRegisterAccept} className="space-y-3.5">
                  <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest text-center">
                    Create secure profile to claim seat
                  </p>
                  
                  <div className="space-y-2.5">
                    <Input 
                      placeholder="Username" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-zinc-900 border-white/[0.06] focus:border-[#7C5CFC]/50 h-10 text-xs text-white focus-visible:ring-0 rounded-xl"
                      required
                    />
                    <Input 
                      type="email"
                      placeholder="Email address" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-zinc-900 border-white/[0.06] focus:border-[#7C5CFC]/50 h-10 text-xs text-white focus-visible:ring-0 rounded-xl"
                      required
                    />
                    <Input 
                      type="password"
                      placeholder="Password (min 6 characters)" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-zinc-900 border-white/[0.06] focus:border-[#7C5CFC]/50 h-10 text-xs text-white focus-visible:ring-0 rounded-xl"
                      required
                    />
                    <Input 
                      type="password"
                      placeholder="Confirm password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-zinc-900 border-white/[0.06] focus:border-[#7C5CFC]/50 h-10 text-xs text-white focus-visible:ring-0 rounded-xl"
                      required
                    />
                  </div>

                  {authError && (
                    <p className="text-[10px] text-red-400 font-medium flex items-center gap-1 px-1 justify-center animate-pulse">
                      <AlertCircle className="h-3 w-3" />
                      {authError}
                    </p>
                  )}

                  <CTAButton 
                    type="submit" 
                    disabled={authLoading}
                    className="w-full h-11 text-xs uppercase tracking-widest mt-2 shadow-[0_0_20px_-3px_rgba(124,92,252,0.3)] flex items-center justify-center gap-2"
                  >
                    {authLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Generating profile & joining...
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-3.5 w-3.5" />
                        Create Account & Join
                      </>
                    )}
                  </CTAButton>

                  <div className="flex flex-col items-center gap-2 mt-1">
                    <p className="text-[10px] text-zinc-500">
                      Already have an account?{" "}
                      <button 
                        type="button" 
                        onClick={() => {
                          setAuthMode("signin")
                          setAuthError(null)
                        }} 
                        className="text-[#7C5CFC] font-semibold hover:underline bg-transparent border-none p-0"
                      >
                        Sign in instead &rarr;
                      </button>
                    </p>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleLoginAccept} className="space-y-3.5">
                  <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest text-center">
                    Sign in to claim seat
                  </p>
                  
                  <div className="space-y-2.5">
                    <Input 
                      type="email"
                      placeholder="Email address" 
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="bg-zinc-900 border-white/[0.06] focus:border-[#7C5CFC]/50 h-10 text-xs text-white focus-visible:ring-0 rounded-xl"
                      required
                    />
                    <Input 
                      type="password"
                      placeholder="Password" 
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="bg-zinc-900 border-white/[0.06] focus:border-[#7C5CFC]/50 h-10 text-xs text-white focus-visible:ring-0 rounded-xl"
                      required
                    />
                  </div>

                  {authError && (
                    <p className="text-[10px] text-red-400 font-medium flex items-center gap-1 px-1 justify-center animate-pulse">
                      <AlertCircle className="h-3 w-3" />
                      {authError}
                    </p>
                  )}

                  <CTAButton 
                    type="submit" 
                    disabled={authLoading}
                    className="w-full h-11 text-xs uppercase tracking-widest mt-2 shadow-[0_0_20px_-3px_rgba(124,92,252,0.3)] flex items-center justify-center gap-2"
                  >
                    {authLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Verifying details & joining...
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-3.5 w-3.5" />
                        Sign In & Join
                      </>
                    )}
                  </CTAButton>

                  <div className="flex flex-col items-center gap-2 mt-1">
                    <p className="text-[10px] text-zinc-500">
                      New to HiveSpace?{" "}
                      <button 
                        type="button" 
                        onClick={() => {
                          setAuthMode("signup")
                          setAuthError(null)
                        }} 
                        className="text-[#7C5CFC] font-semibold hover:underline bg-transparent border-none p-0"
                      >
                        Register instead &rarr;
                      </button>
                    </p>
                  </div>
                </form>
              )}

              <p className="text-[8px] text-zinc-600 text-center leading-relaxed max-w-[280px] mx-auto mt-4">
                By accepting, you agree to the HiveSpace <span className="underline cursor-pointer hover:text-zinc-400">Terms of Service</span> and <span className="underline cursor-pointer hover:text-zinc-400">Privacy Policy</span>.
              </p>
            </div>
          )}

          {/* 4. STATE: INVALID / EXPIRED */}
          {uiState === "INVALID" && (
            <div className="w-full bg-[#121114]/80 border border-white/[0.06] rounded-[28px] p-10 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-400 max-w-sm">
              <div className="h-14 w-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                <ShieldAlert className="h-8 w-8 text-red-500" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Secure Invitation Expired</h2>
              <p className="text-xs text-zinc-400 mt-2.5 max-w-[260px] mx-auto leading-relaxed">
                This cryptographically-signed invitation expired or reached its maximum capacity.
              </p>

              <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3.5 mt-5 text-[9px] text-red-400/80 font-mono flex items-center gap-2 max-w-[280px]">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                <span className="text-left leading-tight">Error 403: Invitation token signature invalid, locked, or capacity cap exceeded.</span>
              </div>

              <div className="w-full mt-8 space-y-2.5 max-w-[280px]">
                <CTAButton onClick={() => router.push("/")} className="w-full h-11 text-[10px] uppercase tracking-widest bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700/50">
                  Request New Invitation
                </CTAButton>
              </div>

              <p className="text-[8px] text-zinc-600 mt-8 leading-relaxed">
                If you believe this is in error, contact your organization admin or email <span className="text-[#7C5CFC]/80">support@{process.env.NEXT_PUBLIC_APP_DOMAIN || "hivespace.app"}</span>
              </p>
            </div>
          )}

          {/* 5. STATE: SUCCESS CELEBRATION */}
          {uiState === "SUCCESS" && inviteDetails && (
            <div className="w-full bg-[#121114]/80 border border-white/[0.06] rounded-[28px] p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-500 max-w-md">
              
              <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-bounce duration-[2s]">
                <CheckCircle className="h-7 w-7 text-emerald-400" strokeWidth={1.5} />
              </div>

              <h1 className="text-xl font-bold text-white text-center tracking-tight">Joined Workspace! 🎉</h1>
              <p className="text-xs text-zinc-400 mt-1.5 text-center max-w-[280px] leading-relaxed">
                You are now a registered member of <span className="text-white font-semibold">{inviteDetails.tenantName}</span> with the role of <span className="text-[#7C5CFC] font-semibold">{inviteDetails.role}</span>.
              </p>

              <div className="w-full mt-6 space-y-2.5">
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 px-1 text-left">Getting Started Checklist</p>
                
                <div 
                  onClick={() => router.push("/dashboard")} 
                  className="bg-zinc-950/40 border border-white/[0.04] rounded-xl p-3.5 flex items-center gap-3.5 hover:bg-[#7C5CFC]/5 hover:border-[#7C5CFC]/20 transition-all cursor-pointer group"
                >
                  <div className="h-8 w-8 rounded-lg bg-[#7C5CFC]/10 flex items-center justify-center text-[#7C5CFC] group-hover:scale-105 transition-transform shrink-0">
                    <KanbanSquare className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 text-left">
                    <h4 className="text-xs font-semibold text-white truncate">Task Manager</h4>
                    <p className="text-[9px] text-zinc-500 mt-0.5 truncate">See active issues and track task progress in Sprint 3</p>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-zinc-700 ml-auto group-hover:text-[#7C5CFC] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>

                <div 
                  onClick={() => router.push("/dashboard")} 
                  className="bg-zinc-950/40 border border-white/[0.04] rounded-xl p-3.5 flex items-center gap-3.5 hover:bg-[#7C5CFC]/5 hover:border-[#7C5CFC]/20 transition-all cursor-pointer group"
                >
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform shrink-0">
                    <MessageSquare className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 text-left">
                    <h4 className="text-xs font-semibold text-white truncate">Chat channels</h4>
                    <p className="text-[9px] text-zinc-500 mt-0.5 truncate">Greet your new team colleagues in workspace channels</p>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-zinc-700 ml-auto group-hover:text-[#7C5CFC] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>

                <div 
                  onClick={() => router.push("/dashboard")} 
                  className="bg-zinc-950/40 border border-white/[0.04] rounded-xl p-3.5 flex items-center gap-3.5 hover:bg-[#7C5CFC]/5 hover:border-[#7C5CFC]/20 transition-all cursor-pointer group"
                >
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                    <BookOpen className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 text-left">
                    <h4 className="text-xs font-semibold text-white truncate">Documentation</h4>
                    <p className="text-[9px] text-zinc-500 mt-0.5 truncate">Access corporate wiki stacks and knowledge handbooks</p>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-zinc-700 ml-auto group-hover:text-[#7C5CFC] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
              </div>

              <CTAButton 
                onClick={() => router.push("/dashboard")} 
                className="w-full h-12 mt-8 text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_20px_-3px_rgba(16,185,129,0.3)] bg-emerald-600 hover:bg-emerald-500 border-none"
              >
                Open Dashboard
                <ArrowRight className="h-4 w-4" />
              </CTAButton>
            </div>
          )}

        </div>
      </main>

      {/* Floating security banner (Footer) */}
      <footer className="w-full flex justify-center mt-12 z-10 px-6">
        <div className="flex items-center gap-2 bg-[#121114]/40 border border-white/[0.03] rounded-full px-4 py-2 text-[9px] text-zinc-500 font-mono shadow-md backdrop-blur-md">
          <Lock className="h-3.5 w-3.5 text-[#7C5CFC]" />
          <span>Session securely encrypted with AES-GCM-256 standard protocols.</span>
        </div>
      </footer>
    </div>
  )
}
