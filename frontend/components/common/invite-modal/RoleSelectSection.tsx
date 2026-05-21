"use client"

import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useInviteModalContext } from "@/components/common/invite-modal/InviteModalContext"

export function RoleSelectSection() {
  const { role, setRole, roleDescription, isOwner, isAdmin } = useInviteModalContext()

  // Dynamically filter the available roles based on the inviter's permissions
  const roles = React.useMemo(() => {
    const list = []

    // Member is always available
    list.push({
      value: "Member" as const,
      title: "Member",
      description: "Can be assigned tasks, join channels, edit docs"
    })

    // Billing Admin is available for Owner and Admin
    if (isOwner || isAdmin) {
      list.push({
        value: "Billing Admin" as const,
        title: "Billing Admin",
        description: "Billing and invoices only, no access to projects or teams"
      })
    }

    // Admin is only available for Owner
    if (isOwner) {
      list.push({
        value: "Admin" as const,
        title: "Admin",
        description: "Full org access, can manage members and settings"
      })
    }

    return list
  }, [isOwner, isAdmin])

  // Fallback to "Member" if the current role is not in the filtered roles list
  React.useEffect(() => {
    if (role && !roles.some((r) => r.value === role)) {
      setRole("Member")
    }
  }, [roles, role, setRole])

  return (
    <section>
      <label className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-2 block">
        INVITE AS
      </label>
      <Select value={role} onValueChange={setRole}>
        <SelectTrigger className="w-full bg-[#272629] border-zinc-700 hover:border-zinc-600 rounded-md h-10 px-3 text-[#E5E1E4] cursor-pointer focus:ring-0 focus-visible:ring-0 [&_svg]:text-zinc-500 [&_svg]:size-3.5">
          <SelectValue>{role}</SelectValue>
        </SelectTrigger>
        <SelectContent className="relative z-[150] bg-zinc-900 border-zinc-700 text-zinc-300 shadow-xl mt-1 overflow-hidden p-1 min-w-[var(--radix-select-trigger-width)]">
          {roles.map((r) => (
            <SelectItem
              key={r.value}
              value={r.value}
              className="px-3 py-2.5 hover:bg-zinc-800 cursor-pointer focus:bg-zinc-800 data-[state=checked]:bg-zinc-800/80 rounded-md"
            >
              <div className="flex flex-col text-left items-start">
                <span className="text-sm font-medium text-[#E5E1E4]">{r.title}</span>
                <span className="text-xs text-zinc-500 mt-0.5">{r.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {roleDescription && (
        <p className="text-xs text-zinc-500 mt-1.5">{roleDescription}</p>
      )}
    </section>
  )
}
