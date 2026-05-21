"use client"

import * as React from "react"
import { Send, X } from "lucide-react"
import { useInviteModalContext } from "@/components/common/invite-modal/InviteModalContext"

export function EmailInputSection() {
  const { emails, emailInput, setEmailInput, addEmail, removeEmail, sendInvites, sendLoading } =
    useInviteModalContext()

  return (
    <section>
      <label className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-2 block">
        EMAIL ADDRESSES
      </label>
      <div className="flex items-center gap-2">
        <div className="bg-[#272629] border border-zinc-700 rounded-md min-h-12 max-h-32 p-3 flex flex-wrap gap-1.5 overflow-y-auto focus-within:border-violet-500/50 transition-colors flex-1">
          {emails.map((email) => (
            <div
              key={email}
              className="bg-zinc-700 rounded-full px-2.5 py-1 text-xs text-zinc-200 flex items-center gap-1.5"
            >
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
        {(emailInput.trim() || emails.length > 0) && (
          <button
            type="button"
            onClick={sendInvites}
            disabled={sendLoading}
            title="Send Invitation"
            className="h-12 w-12 rounded-md bg-[#272629] border border-zinc-700 hover:border-violet-500/50 hover:bg-zinc-800 text-zinc-400 hover:text-violet-400 flex items-center justify-center transition-all shrink-0 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </button>
        )}
      </div>
    </section>
  )
}

