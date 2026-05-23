"use client"

import * as React from "react"
import { Mail, X, Layout } from "lucide-react"
import { gooeyToast as toast } from "@/components/ui/goey-toaster"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useInviteModal } from "@/hooks/useInviteModal"
import { InviteModalProvider } from "@/components/common/invite-modal/InviteModalContext"
import { EmailInputSection } from "@/components/common/invite-modal/EmailInputSection"
import { InviteLinkSection } from "@/components/common/invite-modal/InviteLinkSection"
import { PersonalMessageSection } from "@/components/common/invite-modal/PersonalMessageSection"
import { RoleSelectSection } from "@/components/common/invite-modal/RoleSelectSection"
import { TeamSelectionSection } from "@/components/common/invite-modal/TeamSelectionSection"
import { WorkspaceSelectionSection } from "@/components/common/invite-modal/WorkspaceSelectionSection"
import { InviteSuccessSection } from "@/components/common/invite-modal/InviteSuccessSection"

interface InviteModalProps {
  trigger: React.ReactNode
}

export function InviteModal({ trigger }: InviteModalProps) {
  const [open, setOpen] = React.useState(false)
  const inviteModal = useInviteModal({ setOpen })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-xl border border-zinc-800 bg-[#1B1B1D] p-0 shadow-[0_0_64px_rgba(0,0,0,0.4)] backdrop-blur sm:max-w-lg"
      >
        <DialogClose asChild>
          <button className="absolute top-6 right-6 z-50 rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800/30 hover:text-zinc-200">
            <X className="h-4 w-4" />
          </button>
        </DialogClose>
        <InviteModalProvider value={inviteModal}>
          {inviteModal.workspaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center min-h-[350px] animate-in fade-in zoom-in-95 duration-300">
              <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-full mb-4">
                <Layout className="h-10 w-10 text-violet-400" strokeWidth={1.5} />
              </div>
              <DialogTitle className="text-lg font-semibold text-white tracking-tight">Workspace Required</DialogTitle>
              <DialogDescription className="text-sm text-zinc-400 mt-2 max-w-xs leading-relaxed">
                You must create at least one workspace in your organization before you can invite other members to join.
              </DialogDescription>
              <div className="flex flex-col gap-2 w-full max-w-xs mt-6">
                <button
                  onClick={() => {
                    setOpen(false);
                    toast.info("Please create a workspace using the sidebar menu (+ next to Workspace Name).");
                  }}
                  style={{ background: "linear-gradient(145deg, #CABEFF, #947DFF)", color: "#1B1B1D" }}
                  className="w-full h-10 rounded-md text-xs font-semibold uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all flex items-center justify-center cursor-pointer animate-in fade-in duration-200"
                >
                  Got it, Create Workspace
                </button>
                <Button
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  className="text-xs text-zinc-500 hover:text-zinc-350 hover:bg-zinc-800/20"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : inviteModal.step === "form" ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="relative border-b border-zinc-800/60 px-6 pt-6 pb-4">
                <DialogTitle className="text-xl font-semibold text-[#E5E1E4]">
                  Invite to {inviteModal.activeWorkspace?.name || "Workspace"}
                </DialogTitle>
                <DialogDescription className="text-zinc-555 mt-1 text-xs leading-relaxed">
                  Invited users will join as org members first, then gain access
                  to this workspace.
                </DialogDescription>
              </div>

              <div className="scrollbar-none flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
                <EmailInputSection />
                <InviteLinkSection />
                <RoleSelectSection />
                <WorkspaceSelectionSection />
                <TeamSelectionSection />
                <PersonalMessageSection />
              </div>

              <footer className="flex items-center justify-between border-t border-zinc-800/60 px-6 py-4">
                <Button
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  className="text-sm text-zinc-400 hover:bg-zinc-800/30 hover:text-zinc-200"
                >
                  Cancel
                </Button>

                <div className="flex items-center gap-3">
                  {inviteModal.emails.length > 0 && (
                    <span className="text-xs text-zinc-500">
                      Sending to {inviteModal.emails.length}{" "}
                      {inviteModal.emails.length === 1 ? "person" : "people"}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={inviteModal.sendInvites}
                    disabled={inviteModal.sendLoading}
                    style={
                      inviteModal.emails.length > 0
                        ? {
                            background:
                              "linear-gradient(145deg, #CABEFF, #947DFF)",
                            color: "#1B1B1D",
                          }
                        : undefined
                    }
                    className={cn(
                      "flex h-9 items-center justify-center rounded-md px-5 text-xs font-medium tracking-wider uppercase transition-all",
                      inviteModal.emails.length === 0
                        ? "cursor-not-allowed bg-zinc-700 text-zinc-500"
                        : "shadow-lg shadow-violet-500/10 hover:opacity-90 active:scale-95"
                    )}
                  >
                    <Mail className="mr-1.5 h-3.5 w-3.5" />
                    {inviteModal.sendLoading
                      ? "Sending..."
                      : inviteModal.emails.length === 0
                        ? "Send Invite Link"
                        : "Send Invite"}
                  </button>
                </div>
              </footer>
            </div>
          ) : (
            <InviteSuccessSection />
          )}
        </InviteModalProvider>
      </DialogContent>
    </Dialog>
  )
}
