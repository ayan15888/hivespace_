"use client"

import * as React from "react"
import { 
  X, 
  RefreshCw, 
  Mail, 
  CheckCircle, 
  Plus, 
  Copy,
  ChevronDown
} from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CTAButton } from "@/components/common/CTAButton"
import { cn } from "@/lib/utils"

interface InviteModalProps {
  trigger: React.ReactNode
}

export function InviteModal({ trigger }: InviteModalProps) {
  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState<"form" | "success">("form")
  const [emails, setEmails] = React.useState<string[]>([])
  const [emailInput, setEmailInput] = React.useState("")
  const [role, setRole] = React.useState("Member")
  const [message, setMessage] = React.useState("")
  const [workspaces, setWorkspaces] = React.useState(["Engineering"])
  const [teams, setTeams] = React.useState<string[]>([])

  const addEmail = (e?: React.KeyboardEvent) => {
    if (e && e.key !== 'Enter') return
    if (e) e.preventDefault()
    
    const trimmed = emailInput.trim()
    if (trimmed && !emails.includes(trimmed)) {
      setEmails([...emails, trimmed])
      setEmailInput("")
    }
  }

  const removeEmail = (email: string) => {
    setEmails(emails.filter(e => e !== email))
  }

  const handleSend = () => {
    setStep("success")
  }

  const handleReset = () => {
    setStep("form")
    setEmails([])
    setEmailInput("")
    setRole("Member")
    setMessage("")
    setWorkspaces(["Engineering"])
    setTeams([])
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-lg w-full p-0 bg-[#272629] border border-zinc-700 rounded-xl overflow-hidden shadow-2xl">
        {step === "form" ? (
          <div className="flex flex-col">
            {/* Header */}
            <div className="p-6 pb-0 relative">
              <h2 className="text-lg font-semibold text-[#E5E1E4]">Invite to Engineering</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Invited users will join as org members first, then gain access to this workspace.
              </p>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-none">
              {/* Step 1: Email Input */}
              <section>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">
                  Email addresses
                </label>
                <div className="bg-zinc-800 border border-zinc-700 rounded-md min-h-20 p-3 flex flex-wrap gap-2 focus-within:border-zinc-600 transition-colors">
                  {emails.map(email => (
                    <div key={email} className="bg-zinc-700 rounded-full px-2.5 py-1 flex items-center gap-1.5 shadow-sm">
                      <span className="text-xs text-zinc-300">{email}</span>
                      <button onClick={() => removeEmail(email)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <input 
                    type="text"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={addEmail}
                    placeholder={emails.length === 0 ? "Add email and press Enter..." : ""}
                    className="bg-transparent border-none outline-none text-sm text-[#E5E1E4] placeholder:text-zinc-500 flex-1 min-w-[120px]"
                  />
                </div>

                <div className="mt-4">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">
                    Or share an invite link
                  </label>
                  <div className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 flex items-center gap-2">
                    <span className="font-mono text-[10px] text-zinc-400 flex-1 truncate">
                      hivespace.io/invite/abc123xyz
                    </span>
                    <button className="text-[10px] font-bold text-[#7C5CFC] uppercase tracking-wider hover:opacity-80 transition-opacity">
                      Copy
                    </button>
                    <div className="w-px h-4 bg-zinc-800 mx-1" />
                    <button className="text-zinc-500 hover:text-zinc-300 transition-colors">
                      <RefreshCw className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-2 italic">
                    Link expires in 72 hours · Role: Member
                  </p>
                </div>
              </section>

              {/* Role Selection */}
              <section>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">
                  Invite as
                </label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="w-full bg-zinc-800 border-zinc-700 h-10 text-sm text-[#E5E1E4]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-300">
                    <SelectItem value="Member" className="py-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">Member</span>
                        <span className="text-[10px] text-zinc-500">Can be assigned tasks, join channels, edit docs</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Workspace Admin" className="py-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">Workspace Admin</span>
                        <span className="text-[10px] text-zinc-500">Manages workspace settings and members</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Team Lead" className="py-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">Team Lead</span>
                        <span className="text-[10px] text-zinc-500">Manages team membership and tasks</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Project Lead" className="py-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">Project Lead</span>
                        <span className="text-[10px] text-zinc-500">Manages project board and access</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Viewer" className="py-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">Viewer</span>
                        <span className="text-[10px] text-zinc-500">Read-only access</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Billing Admin" className="py-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">Billing Admin</span>
                        <span className="text-[10px] text-zinc-500">Billing portal access only</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </section>

              {/* Workspace & Team Assignment */}
              <section className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">
                    Add to workspace
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Checkbox id="ws-eng" checked disabled className="data-[state=checked]:bg-[#7C5CFC] data-[state=checked]:border-[#7C5CFC]" />
                      <label htmlFor="ws-eng" className="text-xs text-zinc-400">Engineering</label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox id="ws-design" className="border-zinc-700 data-[state=checked]:bg-[#7C5CFC]" />
                      <label htmlFor="ws-design" className="text-xs text-zinc-400">Design</label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox id="ws-mkt" className="border-zinc-700 data-[state=checked]:bg-[#7C5CFC]" />
                      <label htmlFor="ws-mkt" className="text-xs text-zinc-400">Marketing</label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">
                    Add to team (optional)
                  </label>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-3">
                      <Checkbox id="team-be" className="border-zinc-700 data-[state=checked]:bg-[#7C5CFC]" />
                      <label htmlFor="team-be" className="text-xs text-zinc-400">Backend Team</label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox id="team-fe" className="border-zinc-700 data-[state=checked]:bg-[#7C5CFC]" />
                      <label htmlFor="team-fe" className="text-xs text-zinc-400">Frontend Team</label>
                    </div>
                  </div>
                </div>
              </section>

              {/* Personal Message */}
              <section>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">
                  Personal message (optional)
                </label>
                <Textarea 
                  placeholder="Add a note to your invite..."
                  className="bg-zinc-800 border-zinc-700 text-sm text-[#E5E1E4] min-h-16 focus-visible:ring-[#7C5CFC]/30"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </section>
            </div>

            {/* Footer */}
            <footer className="p-6 pt-4 border-t border-zinc-800 flex justify-between items-center bg-[#201F21]/50">
              <button 
                onClick={() => setOpen(false)}
                className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest hover:text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <div className="flex items-center gap-4">
                {emails.length > 0 && (
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                    Sending to {emails.length} {emails.length === 1 ? 'person' : 'people'}
                  </span>
                )}
                <CTAButton 
                  onClick={handleSend}
                  disabled={emails.length === 0}
                  className={cn(
                    "flex items-center gap-2",
                    emails.length === 0 && "opacity-50 grayscale cursor-not-allowed"
                  )}
                >
                  <Mail className="h-3.5 w-3.5" />
                  {emails.length === 0 ? "Send Invite Link" : "Send Invites"}
                </CTAButton>
              </div>
            </footer>
          </div>
        ) : (
          <div className="p-8 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
              <CheckCircle className="h-10 w-10 text-emerald-500" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-semibold text-[#E5E1E4]">Invites sent!</h2>
            <p className="text-sm text-zinc-400 mt-2 max-w-xs mx-auto">
              {emails.length} invite emails have been sent. They expire in 72 hours.
            </p>

            <div className="w-full mt-8 space-y-2">
               <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest text-left mb-3">PENDING INVITES</h3>
               {emails.map(email => (
                 <div key={email} className="bg-zinc-900/50 border border-zinc-800 rounded-md p-3 flex items-center gap-3">
                   <div className="h-8 w-8 rounded bg-zinc-800 flex items-center justify-center">
                     <Mail className="h-4 w-4 text-zinc-500" />
                   </div>
                   <div className="flex flex-col items-start flex-1 min-w-0">
                     <span className="text-xs text-zinc-300 truncate w-full text-left">{email}</span>
                     <div className="flex items-center gap-2 mt-0.5">
                        <Badge className="bg-zinc-800 text-[9px] text-zinc-500 border-none h-4 px-1.5 rounded-sm">{role}</Badge>
                        <span className="text-[9px] text-zinc-600">Expires in 72h</span>
                     </div>
                   </div>
                   <button className="text-[9px] font-bold text-[#7C5CFC] uppercase tracking-wider hover:underline">
                     Resend
                   </button>
                 </div>
               ))}
            </div>

            <div className="w-full mt-10 flex flex-col gap-3">
              <CTAButton onClick={() => setOpen(false)} className="w-full h-11">
                Done
              </CTAButton>
              <button 
                onClick={handleReset}
                className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest hover:text-zinc-300 transition-colors py-2"
              >
                Invite more people
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
