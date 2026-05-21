"use client"

import * as React from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { useInviteModalContext } from "@/components/common/invite-modal/InviteModalContext"

export function TeamSelectionSection() {
  const { teams, teamsLoading, selectedTeams, setSelectedTeams } = useInviteModalContext()

  return (
    <section>
      <label className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-2 block">
        ADD TO TEAM (OPTIONAL)
      </label>
      <div className="space-y-1">
        {teamsLoading ? (
          <div className="text-xs text-zinc-550 py-2">Loading teams...</div>
        ) : teams.length === 0 ? (
          <div className="text-xs text-zinc-600 py-2 italic">No teams found in this workspace</div>
        ) : (
          teams.map((team) => {
            const isChecked = selectedTeams.includes(team.id)
            return (
              <label
                key={team.id}
                htmlFor={`team-${team.id}`}
                className="h-9 flex items-center gap-3 hover:bg-zinc-800/30 rounded-md px-2 cursor-pointer w-full"
              >
                <Checkbox
                  id={`team-${team.id}`}
                  checked={isChecked}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedTeams([...selectedTeams, team.id])
                    } else {
                      setSelectedTeams(selectedTeams.filter((id) => id !== team.id))
                    }
                  }}
                  className="border-zinc-600 bg-transparent data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                />
                <span className="text-sm text-zinc-300">{team.name}</span>
              </label>
            )
          })
        )}
      </div>
    </section>
  )
}

