"use client"

import * as React from "react"
import { Lock } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { useInviteModalContext } from "@/components/common/invite-modal/InviteModalContext"

export function WorkspaceSelectionSection() {
  const { workspaces, activeWorkspace, selectedWorkspaces, setSelectedWorkspaces } =
    useInviteModalContext()

  return (
    <section>
      <label className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-2 block">
        ADD TO WORKSPACE
      </label>
      <div className="space-y-1">
        <div className="h-9 flex items-center gap-3 hover:bg-zinc-800/30 rounded-md px-2 cursor-not-allowed">
          <div className="w-4 h-4 flex items-center justify-center shrink-0">
            <Lock className="h-2.5 w-2.5 text-zinc-600" />
          </div>
          <span className="text-sm text-zinc-300">{activeWorkspace?.name || "Engineering"}</span>
          <span className="text-xs text-zinc-600">(current)</span>
        </div>

        {workspaces
          .filter((ws) => ws.id !== activeWorkspace?.id)
          .map((ws) => {
            const isChecked = selectedWorkspaces.includes(ws.id)
            return (
              <label
                key={ws.id}
                htmlFor={`ws-${ws.id}`}
                className="h-9 flex items-center gap-3 hover:bg-zinc-800/30 rounded-md px-2 cursor-pointer w-full"
              >
                <Checkbox
                  id={`ws-${ws.id}`}
                  checked={isChecked}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedWorkspaces([...selectedWorkspaces, ws.id])
                    } else {
                      setSelectedWorkspaces(selectedWorkspaces.filter((id) => id !== ws.id))
                    }
                  }}
                  className="border-zinc-600 bg-transparent data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                />
                <span className="text-sm text-zinc-300">{ws.name}</span>
              </label>
            )
          })}
      </div>
    </section>
  )
}

