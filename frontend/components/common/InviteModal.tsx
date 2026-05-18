"use client"

import * as React from "react"
import { 
  X, 
  RefreshCw, 
  Mail, 
  CheckCircle,
  Copy,
  Info,
  ChevronDown,
  Lock
} from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose
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
import { useOrgStore } from "@/store/orgStore"
import { useWorkspaceStore } from "@/store/workspaceStore"
import { generateInvite } from "@/lib/api/invites"
import { InviteResponse } from "@/types/invite"
import { gooeyToast as toast } from "@/components/ui/goey-toaster"

interface InviteModalProps {
  trigger: React.ReactNode
}

export function InviteModal({ trigger }: InviteModalProps) {
  const [open, setOpen] = React.useState(false)
  const { activeOrg } = useOrgStore()
  const { activeWorkspace } = useWorkspaceStore()
  
  const [step, setStep] = React.useState<"form" | "success">("form")
  const [emails, setEmails] = React.useState<string[]>([])
  const [emailInput, setEmailInput] = React.useState("")
  const [role, setRole] = React.useState("Member")
  const [message, setMessage] = React.useState("")
  const [workspaces, setWorkspaces] = React.useState(["Engineering"])
  const [teams, setTeams] = React.useState<string[]>([])
  
  const [loading, setLoading] = React.useState(false)
  const [generatedInvite, setGeneratedInvite] = React.useState<InviteResponse | null>(null)
  const [shareableInvite, setShareableInvite] = React.useState<{ token: string, pin: string } | null>(null)

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

  const handleSend = async () => {
    if (!activeOrg) {
      toast.error("No active organization found");
      return;
    }
    
    setLoading(true);
    try {
      const backendRole = role === "Member" ? "MEMBER" :
                          role === "Workspace Admin" ? "ADMIN" :
                          role === "Team Lead" ? "LEAD" :
                          role === "Project Lead" ? "LEAD" :
                          role === "Viewer" ? "VIEWER" :
                          role === "Billing Admin" ? "ADMIN" : "MEMBER";

      const response = await generateInvite({
        tenantId: activeOrg.id,
        workspaceId: activeWorkspace?.id,
        role: backendRole,
        maxUses: Math.max(1, emails.length),
      });

      setGeneratedInvite(response);

      if (emails.length > 0) {
        const inviteUrl = `${window.location.origin}/invite/${response.token}`;
        const subject = `Invitation to join ${activeOrg.name} on HiveSpace`;
        const body = `Hi there,\n\nYou have been invited to join the ${activeOrg.name} organization on HiveSpace as a ${role}.\n\nClick this link to accept the invitation:\n${inviteUrl}\n\nFor security, please use the following PIN to complete the join process:\nPIN: ${response.pin}\n\n${message ? `Personal message from sender:\n"${message}"\n\n` : ""}Looking forward to collaborating with you!\n\nBest regards,\nThe HiveSpace Team`;

        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emails.join(','))}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(gmailUrl, "_blank");
      }

      setStep("success");
    } catch (err: any) {
      toast.error(err.message || "Failed to send invites");
    } finally {
      setLoading(false);
    }
  }

  const handleReset = () => {
    setStep("form")
    setEmails([])
    setEmailInput("")
    setRole("Member")
    setMessage("")
    setWorkspaces(["Engineering"])
    setTeams([])
    setGeneratedInvite(null)
  }
  const handleGenerateShareable = async () => {
    if (!activeOrg) return;
    try {
      const response = await generateInvite({
        tenantId: activeOrg.id,
        workspaceId: activeWorkspace?.id,
        role: "MEMBER",
        maxUses: 100
      });
      setShareableInvite({ token: response.token, pin: response.pin });
      
      const link = `${window.location.origin}/invite/${response.token}`;
      navigator.clipboard.writeText(`Invite Link: ${link}\nSecurity PIN: ${response.pin}`);
      toast.success("Link and PIN copied!");
    } catch (err: any) {
      toast.error("Failed to generate link");
    }
  };

  const handleCopyLink = () => {
    if (shareableInvite) {
      const link = `${window.location.origin}/invite/${shareableInvite.token}`;
      navigator.clipboard.writeText(link);
      toast.success("Link copied!");
    } else {
      handleGenerateShareable();
    }
  }

  const getRoleDescription = (selectedRole: string) => {
    switch (selectedRole) {
      case "Member":
        return "Can be assigned tasks, join channels, edit docs";
      case "Workspace Admin":
        return "Manages workspace settings and members";
      case "Team Lead":
        return "Manages team membership and tasks";
      case "Project Lead":
        return "Manages project board and access";
      case "Viewer":
        return "Read-only access to workspace content";
      case "Billing Admin":
        return "Billing portal access only";
      default:
        return "";
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent 
        showCloseButton={false}
        className="sm:max-w-lg w-full p-0 bg-[#1B1B1D] border border-zinc-800 rounded-xl overflow-hidden shadow-[0_0_64px_rgba(0,0,0,0.4)] backdrop-blur max-h-[85vh] flex flex-col"
      >
        <DialogClose asChild>
          <button className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-200 transition-colors p-1.5 rounded-full hover:bg-zinc-800/30 z-50">
            <X className="h-4 w-4" />
          </button>
        </DialogClose>

        {step === "form" ? (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-zinc-800/60 relative">
              <DialogTitle className="text-xl font-semibold text-[#E5E1E4]">Invite to Engineering</DialogTitle>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                Invited users will join as org members first, then gain access to this workspace.
              </p>
            </div>

            {/* Body */}
            <div className="px-6 py-5 flex flex-col gap-5 overflow-y-auto scrollbar-none flex-1 min-h-0">
              {/* SECTION 1: EMAIL ADDRESSES */}
              <section>
                <label className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-2 block">
                  EMAIL ADDRESSES
                </label>
                <div className="bg-[#272629] border border-zinc-700 rounded-md min-h-12 max-h-32 p-3 flex flex-wrap gap-1.5 overflow-y-auto focus-within:border-violet-500/50 transition-colors">
                  {emails.map(email => (
                    <div key={email} className="bg-zinc-700 rounded-full px-2.5 py-1 text-xs text-zinc-200 flex items-center gap-1.5">
                      <span>{email}</span>
                      <button 
                        type="button"
                        onClick={() => removeEmail(email)} 
                        className="text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <input 
                    type="text"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={addEmail}
                    placeholder={emails.length === 0 ? "Add email addresses and press Enter..." : ""}
                    className="bg-transparent border-none outline-none text-sm text-[#E5E1E4] placeholder:text-zinc-500 flex-1 min-w-[120px]"
                  />
                </div>
              </section>

              {/* SECTION 2: INVITE LINK */}
              <section>
                <label className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-2 block">
                  OR SHARE AN INVITE LINK
                </label>
                <div className="bg-[#272629] border border-zinc-700 rounded-md h-10 px-3 flex items-center gap-2">
                  <span className="font-mono text-xs text-zinc-400 flex-1 truncate min-w-0">
                    {shareableInvite ? `${window.location.origin.replace(/^https?:\/\//, "")}/invite/${shareableInvite.token}` : "hivespace.io/invite/..."}
                  </span>
                  <button 
                    type="button"
                    onClick={handleCopyLink}
                    className="text-zinc-400 hover:text-zinc-200 transition-colors flex-shrink-0"
                    title="Copy link"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                
                <div className="flex items-center mt-1.5">
                  {shareableInvite ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-600">Security PIN:</span>
                      <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-xs rounded-sm px-2 py-0.5 tracking-widest">
                        {shareableInvite.pin}
                      </span>
                      <span className="cursor-help" title="Recipients need this PIN to accept the invite">
                        <Info className="h-3 w-3 text-zinc-600" />
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-600">Security PIN:</span>
                      <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-xs rounded-sm px-2 py-0.5 tracking-widest">
                        ------
                      </span>
                      <span className="cursor-help" title="Recipients need this PIN to accept the invite">
                        <Info className="h-3 w-3 text-zinc-600" />
                      </span>
                    </div>
                  )}
                  
                  <button 
                    type="button"
                    onClick={handleGenerateShareable}
                    className="flex items-center text-xs text-zinc-600 hover:text-zinc-400 cursor-pointer ml-auto mt-1"
                  >
                    <RefreshCw className="h-2.5 w-2.5 mr-1" />
                    {shareableInvite ? "Regenerate" : "Generate Link"}
                  </button>
                </div>
              </section>

              {/* SECTION 3: INVITE AS (ROLE) */}
              <section>
                <label className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-2 block">
                  INVITE AS
                </label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="w-full bg-[#272629] border-zinc-700 hover:border-zinc-600 rounded-md h-10 px-3 text-[#E5E1E4] cursor-pointer focus:ring-0 focus-visible:ring-0 [&_svg]:text-zinc-500 [&_svg]:size-3.5">
                    <span className="text-sm">{role}</span>
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-300 shadow-xl mt-1 overflow-hidden p-1 min-w-[var(--radix-select-trigger-width)]">
                    <SelectItem value="Member" className="px-3 py-2.5 hover:bg-zinc-800 cursor-pointer focus:bg-zinc-800 data-[state=checked]:bg-zinc-800/80 rounded-md">
                      <div className="flex flex-col text-left items-start">
                        <span className="text-sm font-medium text-[#E5E1E4]">Member</span>
                        <span className="text-xs text-zinc-500 mt-0.5">Can be assigned tasks, join channels, edit docs</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Workspace Admin" className="px-3 py-2.5 hover:bg-zinc-800/30 cursor-pointer focus:bg-zinc-800 data-[state=checked]:bg-zinc-800/80 rounded-md">
                      <div className="flex flex-col text-left items-start">
                        <span className="text-sm font-medium text-[#E5E1E4]">Workspace Admin</span>
                        <span className="text-xs text-zinc-500 mt-0.5">Manages workspace settings and members</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Team Lead" className="px-3 py-2.5 hover:bg-zinc-800/30 cursor-pointer focus:bg-zinc-800 data-[state=checked]:bg-zinc-800/80 rounded-md">
                      <div className="flex flex-col text-left items-start">
                        <span className="text-sm font-medium text-[#E5E1E4]">Team Lead</span>
                        <span className="text-xs text-zinc-500 mt-0.5">Manages team membership and tasks</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Project Lead" className="px-3 py-2.5 hover:bg-zinc-800/30 cursor-pointer focus:bg-zinc-800 data-[state=checked]:bg-zinc-800/80 rounded-md">
                      <div className="flex flex-col text-left items-start">
                        <span className="text-sm font-medium text-[#E5E1E4]">Project Lead</span>
                        <span className="text-xs text-zinc-500 mt-0.5">Manages project board and access</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Viewer" className="px-3 py-2.5 hover:bg-zinc-800/30 cursor-pointer focus:bg-zinc-800 data-[state=checked]:bg-zinc-800/80 rounded-md">
                      <div className="flex flex-col text-left items-start">
                        <span className="text-sm font-medium text-[#E5E1E4]">Viewer</span>
                        <span className="text-xs text-zinc-500 mt-0.5">Read-only access to workspace content</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Billing Admin" className="px-3 py-2.5 hover:bg-zinc-800/30 cursor-pointer focus:bg-zinc-800 data-[state=checked]:bg-zinc-800/80 rounded-md">
                      <div className="flex flex-col text-left items-start">
                        <span className="text-sm font-medium text-[#E5E1E4]">Billing Admin</span>
                        <span className="text-xs text-zinc-500 mt-0.5">Billing portal access only</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-zinc-500 mt-1.5">
                  {getRoleDescription(role)}
                </p>
              </section>

              {/* SECTION 4: ADD TO WORKSPACE */}
              <section>
                <label className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-2 block">
                  ADD TO WORKSPACE
                </label>
                <div className="space-y-1">
                  <div className="h-9 flex items-center gap-3 hover:bg-zinc-800/30 rounded-md px-2 cursor-not-allowed">
                    <div className="w-4 h-4 flex items-center justify-center shrink-0">
                      <Lock className="h-2.5 w-2.5 text-zinc-600" />
                    </div>
                    <span className="text-sm text-zinc-300">Engineering</span>
                    <span className="text-xs text-zinc-600">(current)</span>
                  </div>
                  
                  <label htmlFor="ws-design" className="h-9 flex items-center gap-3 hover:bg-zinc-800/30 rounded-md px-2 cursor-pointer w-full">
                    <Checkbox 
                      id="ws-design" 
                      className="border-zinc-600 bg-transparent data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600" 
                    />
                    <span className="text-sm text-zinc-300">Design</span>
                  </label>

                  <label htmlFor="ws-marketing" className="h-9 flex items-center gap-3 hover:bg-zinc-800/30 rounded-md px-2 cursor-pointer w-full">
                    <Checkbox 
                      id="ws-marketing" 
                      className="border-zinc-600 bg-transparent data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600" 
                    />
                    <span className="text-sm text-zinc-300">Marketing</span>
                  </label>
                </div>
              </section>

              {/* SECTION 5: ADD TO TEAM (OPTIONAL) */}
              <section>
                <label className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-2 block">
                  ADD TO TEAM (OPTIONAL)
                </label>
                <div className="space-y-1">
                  <label htmlFor="team-be" className="h-9 flex items-center gap-3 hover:bg-zinc-800/30 rounded-md px-2 cursor-pointer w-full">
                    <Checkbox 
                      id="team-be" 
                      className="border-zinc-600 bg-transparent data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600" 
                    />
                    <span className="text-sm text-zinc-300">Backend Team</span>
                  </label>
                  
                  <label htmlFor="team-fe" className="h-9 flex items-center gap-3 hover:bg-zinc-800/30 rounded-md px-2 cursor-pointer w-full">
                    <Checkbox 
                      id="team-fe" 
                      className="border-zinc-600 bg-transparent data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600" 
                    />
                    <span className="text-sm text-zinc-300">Frontend Team</span>
                  </label>
                </div>
              </section>

              {/* SECTION 6: PERSONAL MESSAGE (OPTIONAL) */}
              <section>
                <label className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-2 block">
                  PERSONAL MESSAGE (OPTIONAL)
                </label>
                <Textarea 
                  placeholder="Add a note to your invite..."
                  className="bg-[#272629] border-zinc-700 text-sm text-[#E5E1E4] min-h-20 focus-visible:border-violet-500/50 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-zinc-500 resize-none rounded-md px-3 py-2.5 text-zinc-300"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </section>
            </div>

            {/* Footer */}
            <footer className="border-t border-zinc-800/60 px-6 py-4 flex items-center justify-between">
              <Button 
                variant="ghost"
                onClick={() => setOpen(false)}
                className="text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30"
              >
                Cancel
              </Button>
              
              <div className="flex items-center gap-3">
                {emails.length > 0 && (
                  <span className="text-xs text-zinc-500">
                    Sending to {emails.length} {emails.length === 1 ? 'person' : 'people'}
                  </span>
                )}
                
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={loading}
                  style={emails.length > 0 ? { background: 'linear-gradient(145deg, #CABEFF, #947DFF)', color: '#1B1B1D' } : undefined}
                  className={cn(
                    "text-xs font-medium uppercase tracking-wider rounded-md px-5 h-9 flex items-center justify-center transition-all",
                    emails.length === 0
                      ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                      : "hover:opacity-90 active:scale-95 shadow-lg shadow-violet-500/10"
                  )}
                >
                  <Mail className="h-3.5 w-3.5 mr-1.5" />
                  {loading ? "Sending..." : emails.length === 0 ? "Send Invite Link" : "Send Invite"}
                </button>
              </div>
            </footer>
          </div>
        ) : (
          <div className="px-6 py-8 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-350">
            {/* Success Icon & Title */}
            <CheckCircle className="h-10 w-10 text-green-400 mx-auto" strokeWidth={1.5} />
            <DialogTitle className="text-lg font-semibold text-[#E5E1E4] mt-3">Invites sent!</DialogTitle>
            <p className="text-sm text-zinc-400 mt-1 text-center">
              {emails.length} invite {emails.length === 1 ? 'email has' : 'emails have'} been sent. They expire in 72 hours.
            </p>

            {/* Pending list */}
            <div className="w-full mt-6 space-y-2 max-h-40 overflow-y-auto scrollbar-none">
              {emails.map(email => (
                <div key={email} className="bg-zinc-900/40 border border-zinc-800/80 rounded-md p-3 flex items-center gap-3">
                  <Mail className="h-4 w-4 text-zinc-500 shrink-0" />
                  <span className="text-xs text-zinc-300 truncate text-left flex-1">{email}</span>
                  <Badge variant="outline" className="bg-[#7C5CFC]/5 border-[#7C5CFC]/20 text-[#7C5CFC] text-[9px] py-0.5 rounded-sm shrink-0">
                    {role}
                  </Badge>
                  <span className="text-xs text-zinc-600 shrink-0 ml-auto">72h</span>
                  <button className="text-xs text-violet-400 hover:text-violet-300 font-medium shrink-0 ml-2">
                    Resend
                  </button>
                </div>
              ))}
            </div>

            {/* Two buttons */}
            <div className="w-full mt-6 flex gap-3">
              <Button
                variant="ghost"
                onClick={handleReset}
                className="flex-1 h-10 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30"
              >
                Invite more people
              </Button>
              
              <button 
                onClick={() => setOpen(false)}
                style={{ background: 'linear-gradient(145deg, #CABEFF, #947DFF)', color: '#1B1B1D' }}
                className="flex-1 h-10 rounded-md text-xs font-semibold uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all flex items-center justify-center"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
