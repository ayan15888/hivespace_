"use client"

import * as React from "react"
import { Textarea } from "@/components/ui/textarea"
import { useInviteModalContext } from "@/components/common/invite-modal/InviteModalContext"

export function PersonalMessageSection() {
  const { message, setMessage } = useInviteModalContext()

  return (
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
  )
}

