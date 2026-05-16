"use client"

import { useState, useEffect } from "react"
import { Lock, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { CTAButton } from "@/components/common/CTAButton"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import { updateProfile } from "@/lib/api/auth"
import { gooeyToast as toast } from "@/components/ui/goey-toaster"

const WORKSPACES = [
  { name: "Engineering", org: "Hivespace", role: "Team Lead", color: "bg-blue-500", canLeave: false },
  { name: "Design", org: "Hivespace", role: "Member", color: "bg-violet-500", canLeave: true },
]

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const [fullName, setFullName] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [bio, setBio] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "")
      setJobTitle(user.jobTitle || "")
      setBio(user.bio || "")
    }
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProfile({
        fullName,
        jobTitle,
        bio,
      })
      toast.success("Profile updated successfully")
    } catch (error) {
      console.error("Failed to update profile:", error)
      toast.error("Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
      </div>
    )
  }

  const displayName = user?.fullName && user.fullName.trim() !== ""
    ? user.fullName.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase()
    : user?.username?.substring(0, 2).toUpperCase() || "JD"

  return (
    <div className="max-w-2xl px-8 py-6 flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-[#E5E1E4]">Your Profile</h1>
      </div>

      {/* AVATAR SECTION */}
      <div className="flex items-center">
        <Avatar className="h-20 w-20 rounded-full bg-zinc-700">
          <AvatarImage src={user?.avatarUrl} />
          <AvatarFallback className="text-2xl font-medium text-[#E5E1E4] bg-zinc-700">
            {displayName}
          </AvatarFallback>
        </Avatar>
        <div className="ml-6 flex items-center">
          <button className="text-xs font-medium text-zinc-400 hover:text-white transition-colors">
            Change photo
          </button>
          <button className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors ml-4">
            Remove
          </button>
        </div>
      </div>

      {/* PERSONAL INFO CARD */}
      <section className="bg-[#272629] rounded-lg p-5 flex flex-col gap-6 border border-zinc-800/10 shadow-xl shadow-black/20">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Full Name</label>
            <Input 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              className="bg-[#1B1B1D] border-zinc-800/50 text-[#E5E1E4] focus:ring-1 focus:ring-violet-500/50 h-9"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Username</label>
            <Input 
              value={user?.username || ""}
              readOnly
              className="bg-[#1B1B1D]/50 border-zinc-800/50 text-zinc-500 h-9 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Email</label>
          <div className="relative">
            <Input 
              value={user?.email || ""}
              readOnly
              className="bg-[#1B1B1D]/50 border-zinc-800/50 text-zinc-500 h-9 pr-24 cursor-not-allowed"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <Lock className="h-3 w-3 text-zinc-700" />
              <button className="text-[10px] font-bold text-violet-400 hover:text-violet-300 transition-colors">
                Change email →
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Job Title</label>
          <Input 
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g. Senior Software Engineer"
            className="bg-[#1B1B1D] border-zinc-800/50 text-[#E5E1E4] focus:ring-1 focus:ring-violet-500/50 h-9"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Timezone</label>
          <Select defaultValue="asia-kolkata">
            <SelectTrigger className="bg-[#1B1B1D] border-zinc-800/50 text-[#E5E1E4] h-9 focus:ring-1 focus:ring-violet-500/50">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent className="bg-[#201F21] border-zinc-800 text-[#E5E1E4] rounded-md">
              <SelectItem value="asia-kolkata">Asia/Kolkata (IST, UTC+5:30)</SelectItem>
              <SelectItem value="utc">UTC (Universal Time Coordinated)</SelectItem>
              <SelectItem value="us-pacific">US Pacific (PT, UTC-8:00)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Bio</label>
          <div className="relative">
            <Textarea 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short bio about yourself..."
              className="bg-[#1B1B1D] border-zinc-800/50 text-[#E5E1E4] focus:ring-1 focus:ring-violet-500/50 min-h-[80px]"
              maxLength={160}
            />
            <div className="absolute bottom-2 right-2">
              <span className="text-[10px] text-zinc-600">{bio.length}/160</span>
            </div>
          </div>
        </div>

        <div className="mt-2">
          <CTAButton 
            className="w-full" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </div>
            ) : "Save Profile"}
          </CTAButton>
        </div>
      </section>

      {/* WORKSPACE MEMBERSHIPS */}
      <section className="flex flex-col">
        <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3 pl-1">YOUR WORKSPACES</h3>
        <div className="flex flex-col gap-2">
          {WORKSPACES.map((workspace) => (
            <div key={workspace.name} className="h-12 bg-[#272629] rounded-md px-4 flex items-center border border-zinc-800/10 shadow-lg shadow-black/5 group">
              <div className={cn("h-6 w-6 rounded-sm shrink-0", workspace.color)} />
              <div className="ml-4 flex flex-col items-start">
                <span className="text-sm font-medium text-[#E5E1E4]">{workspace.name}</span>
                <span className="text-[10px] text-zinc-500  tracking-tight">{workspace.org}</span>
              </div>
              <Badge className="ml-4 bg-zinc-800 border-zinc-700 text-zinc-400 text-[10px] px-1.5 h-5 rounded-sm font-normal">
                {workspace.role}
              </Badge>
              <button 
                disabled={!workspace.canLeave}
                className={cn(
                  "ml-auto text-xs font-semibold px-2 py-1 rounded transition-colors",
                  workspace.canLeave 
                    ? "text-red-400 hover:bg-red-400/10" 
                    : "text-zinc-600 cursor-not-allowed"
                )}
              >
                Leave
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
