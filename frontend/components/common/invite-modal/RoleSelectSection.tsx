"use client"

import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { useInviteModalContext } from "@/components/common/invite-modal/InviteModalContext"

export function RoleSelectSection() {
  const { role, setRole, roleDescription } = useInviteModalContext()

  return (
    <section>
      <label className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-2 block">
        INVITE AS
      </label>
      <Select value={role} onValueChange={setRole}>
        <SelectTrigger className="w-full bg-[#272629] border-zinc-700 hover:border-zinc-600 rounded-md h-10 px-3 text-[#E5E1E4] cursor-pointer focus:ring-0 focus-visible:ring-0 [&_svg]:text-zinc-500 [&_svg]:size-3.5">
          <span className="text-sm">{role}</span>
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-300 shadow-xl mt-1 overflow-hidden p-1 min-w-[var(--radix-select-trigger-width)]">
          <SelectItem
            value="Member"
            className="px-3 py-2.5 hover:bg-zinc-800 cursor-pointer focus:bg-zinc-800 data-[state=checked]:bg-zinc-800/80 rounded-md"
          >
            <div className="flex flex-col text-left items-start">
              <span className="text-sm font-medium text-[#E5E1E4]">Member</span>
              <span className="text-xs text-zinc-500 mt-0.5">
                Can be assigned tasks, join channels, edit docs
              </span>
            </div>
          </SelectItem>
          <SelectItem
            value="Admin"
            className="px-3 py-2.5 hover:bg-zinc-800/30 cursor-pointer focus:bg-zinc-800 data-[state=checked]:bg-zinc-800/80 rounded-md"
          >
            <div className="flex flex-col text-left items-start">
              <span className="text-sm font-medium text-[#E5E1E4]">Admin</span>
              <span className="text-xs text-zinc-500 mt-0.5">
                Full org access, can manage members and settings
              </span>
            </div>
          </SelectItem>
          <SelectItem
            value="Billing Admin"
            className="px-3 py-2.5 hover:bg-zinc-800/30 cursor-pointer focus:bg-zinc-800 data-[state=checked]:bg-zinc-800/80 rounded-md"
          >
            <div className="flex flex-col text-left items-start">
              <span className="text-sm font-medium text-[#E5E1E4]">Billing Admin</span>
              <span className="text-xs text-zinc-500 mt-0.5">
                Billing and invoices only, no access to projects or teams
              </span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-zinc-500 mt-1.5">{roleDescription}</p>
    </section>
  )
}
