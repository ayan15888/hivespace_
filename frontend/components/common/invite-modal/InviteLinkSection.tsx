"use client"

import * as React from "react"
import { Copy, Info, RefreshCw } from "lucide-react"
import { useInviteModalContext } from "@/components/common/invite-modal/InviteModalContext"

export function InviteLinkSection() {
  const { activeOrg, shareableInvite, copyInviteLink, generateShareableInvite } =
    useInviteModalContext()

  return (
    <section>
      <label className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-2 block">
        OR SHARE AN INVITE LINK
      </label>
      <div className="bg-[#272629] border border-zinc-700 rounded-md h-10 px-3 flex items-center gap-2">
        <span className="font-mono text-xs text-zinc-400 flex-1 truncate min-w-0">
          {shareableInvite && activeOrg
            ? `${window.location.origin.replace(
                /^https?:\/\//,
                "",
              )}/invite/${activeOrg.slug}/${shareableInvite.token}`
            : `${process.env.NEXT_PUBLIC_APP_DOMAIN || "hivespace.app"}/invite/...`}
        </span>
        <button
          type="button"
          onClick={copyInviteLink}
          className="text-zinc-400 hover:text-zinc-200 transition-colors flex-shrink-0"
          title="Copy link"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center mt-1.5">
        {shareableInvite && shareableInvite.pin ? (
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
            <span className="text-zinc-550 text-xs italic">
              Shown at creation time only
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={generateShareableInvite}
          className="flex items-center text-xs text-zinc-600 hover:text-zinc-400 cursor-pointer ml-auto mt-1"
        >
          <RefreshCw className="h-2.5 w-2.5 mr-1" />
          {shareableInvite ? "Regenerate" : "Generate Link"}
        </button>
      </div>
    </section>
  )
}

