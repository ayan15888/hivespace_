"use client"

import { useState } from "react"
import { Shield, Monitor, Smartphone, Globe, Info } from "lucide-react"
import { Input } from "@/components/ui/input"
import { CTAButton } from "@/components/common/CTAButton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const SESSIONS = [
  { device: "Chrome", os: "Windows", location: "Guwahati, IN", ip: "103.21.158.4", current: true, lastActive: "Now", icon: Monitor },
  { device: "Safari", os: "iPhone", location: "Guwahati, IN", ip: "27.60.15.221", current: false, lastActive: "2 days ago", icon: Smartphone },
  { device: "Firefox", os: "Mac", location: "Mumbai, IN", ip: "182.70.4.12", current: false, lastActive: "5 days ago", icon: Monitor },
]

export default function SecurityPage() {
  const [passwordStrength, setPasswordStrength] = useState(65) // Mock strength

  return (
    <div className="max-w-2xl px-8 py-6 flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-[#E5E1E4]">Security</h1>
      </div>

      {/* PASSWORD SECTION */}
      <section className="bg-[#272629] rounded-lg p-5 border border-zinc-800/10 shadow-xl shadow-black/20 flex flex-col gap-5">
        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">UPDATE PASSWORD</h3>
        
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-400 pl-1">Current password</label>
            <Input 
              type="password"
              className="bg-[#1B1B1D] border-zinc-800/50 text-[#E5E1E4] focus:ring-1 focus:ring-violet-500/50 h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400 pl-1">New password</label>
              <Input 
                type="password"
                className="bg-[#1B1B1D] border-zinc-800/50 text-[#E5E1E4] focus:ring-1 focus:ring-violet-500/50 h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400 pl-1">Confirm new password</label>
              <Input 
                type="password"
                className="bg-[#1B1B1D] border-zinc-800/50 text-[#E5E1E4] focus:ring-1 focus:ring-violet-500/50 h-9"
              />
            </div>
          </div>

          {/* Strength Indicator */}
          <div className="flex flex-col gap-1.5 px-1 mt-1">
             <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Strength</span>
                <span className="text-[10px] text-amber-500 font-bold uppercase tracking-tighter">Fair</span>
             </div>
             <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden flex">
                <div className="h-full bg-red-400" style={{ width: '20%' }} />
                <div className="h-full bg-amber-500" style={{ width: '45%' }} />
                <div className="h-full bg-zinc-800 flex-1" />
             </div>
          </div>
        </div>

        <div className="mt-2">
          <CTAButton className="w-full">Update Password</CTAButton>
        </div>
      </section>

      {/* TWO-FACTOR AUTH SECTION */}
      <section className="bg-[#272629] rounded-lg p-5 border border-zinc-800/10 shadow-xl shadow-black/20 flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="h-9 w-9 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
            <Shield className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[#E5E1E4]">Two-factor authentication</span>
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest bg-red-400/5 px-1.5 py-0.5 rounded ring-1 ring-red-400/10">Not enabled</span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-md">
              Secure your account by requiring a code from your mobile device and a password to log in.
            </p>
          </div>
        </div>
        <div className="mt-1 flex justify-end">
          <Button variant="outline" className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10 hover:text-white transition-all h-8 text-xs font-semibold px-4 rounded-md">
            Enable 2FA
          </Button>
        </div>
      </section>

      {/* ACTIVE SESSIONS SECTION */}
      <section className="bg-[#272629] rounded-lg p-5 border border-zinc-800/10 shadow-xl shadow-black/20 flex flex-col gap-4">
        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">ACTIVE SESSIONS</h3>
        
        <div className="flex flex-col gap-1">
          {SESSIONS.map((session, i) => {
            const Icon = session.icon
            return (
              <div key={session.ip} className={cn(
                "h-14 flex items-center gap-4 px-3 hover:bg-white/5 transition-colors group rounded-md",
                i !== SESSIONS.length - 1 && "border-b border-zinc-800/30"
              )}>
                <div className="h-8 w-8 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-zinc-200 transition-colors shrink-0">
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">{session.device} · {session.os}</span>
                    {session.current && (
                      <Badge className="bg-green-500/10 text-green-400 border-none text-[10px] h-4 px-1 rounded-sm font-bold uppercase tracking-tight">Current session</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 truncate">
                    <Globe className="h-3 w-3" strokeWidth={1.5} />
                    <span>{session.location} · {session.ip}</span>
                    <span className="text-[10px] ml-1 opacity-60">· Last active {session.lastActive}</span>
                  </div>
                </div>
                {!session.current && (
                  <button className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest pl-4">
                    Revoke
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
