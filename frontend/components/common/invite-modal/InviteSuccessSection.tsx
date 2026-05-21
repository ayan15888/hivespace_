"use client"

import * as React from "react"
import { CheckCircle, Mail } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { useInviteModalContext } from "@/components/common/invite-modal/InviteModalContext"

export function InviteSuccessSection() {
  const { emails, role, reset, closeModal } = useInviteModalContext()

  return (
    <div className="px-6 py-8 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-350">
      <CheckCircle className="h-10 w-10 text-green-400 mx-auto" strokeWidth={1.5} />
      <DialogTitle className="text-lg font-semibold text-[#E5E1E4] mt-3">Invites sent!</DialogTitle>
      <DialogDescription className="text-sm text-zinc-400 mt-1 text-center">
        {emails.length} invite {emails.length === 1 ? "email has" : "emails have"} been sent. They expire
        in 72 hours.
      </DialogDescription>

      <div className="w-full mt-6 space-y-2 max-h-40 overflow-y-auto scrollbar-none">
        {emails.map((email) => (
          <div
            key={email}
            className="bg-zinc-900/40 border border-zinc-800/80 rounded-md p-3 flex items-center gap-3"
          >
            <Mail className="h-4 w-4 text-zinc-500 shrink-0" />
            <span className="text-xs text-zinc-300 truncate text-left flex-1">{email}</span>
            <Badge
              variant="outline"
              className="bg-[#7C5CFC]/5 border-[#7C5CFC]/20 text-[#7C5CFC] text-[9px] py-0.5 rounded-sm shrink-0"
            >
              {role}
            </Badge>
            <span className="text-xs text-zinc-600 shrink-0 ml-auto">72h</span>
            <button className="text-xs text-violet-400 hover:text-violet-300 font-medium shrink-0 ml-2">
              Resend
            </button>
          </div>
        ))}
      </div>

      <div className="w-full mt-6 flex gap-3">
        <Button
          variant="ghost"
          onClick={reset}
          className="flex-1 h-10 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30"
        >
          Invite more people
        </Button>

        <button
          onClick={closeModal}
          style={{ background: "linear-gradient(145deg, #CABEFF, #947DFF)", color: "#1B1B1D" }}
          className="flex-1 h-10 rounded-md text-xs font-semibold uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all flex items-center justify-center"
        >
          Done
        </button>
      </div>
    </div>
  )
}

