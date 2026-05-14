"use client"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { X, Plus } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface ManageTeamSheetProps {
  trigger: React.ReactNode
}

export function ManageTeamSheet({ trigger }: ManageTeamSheetProps) {
  return (
    <Sheet>
      {trigger}
      <SheetContent className="flex w-[420px] flex-col border-zinc-800 bg-[#1B1B1D] p-0 text-[#E5E1E4] shadow-2xl">
        <SheetHeader className="border-b border-zinc-800/50 p-6">
          <SheetTitle className="text-lg font-semibold text-[#E5E1E4]">
            Manage Backend Team
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-8 overflow-y-auto p-6 pb-20">
          {/* TEAM DETAILS */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold tracking-widest text-zinc-600 uppercase">
              Team Details
            </h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500">
                  Team Name
                </label>
                <Input
                  defaultValue="Backend Team"
                  className="h-9 border-zinc-800 bg-[#0E0E10] text-sm focus:border-violet-500/50 focus:ring-0"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500">
                  Description
                </label>
                <Textarea
                  defaultValue="Responsible for all server-side infrastructure, APIs, WebSocket, and GitHub integrations."
                  className="min-h-[100px] resize-none border-zinc-800 bg-[#0E0E10] text-sm focus:border-violet-500/50 focus:ring-0"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500">
                  Team Lead
                </label>
                <Select defaultValue="mv">
                  <SelectTrigger className="h-9 border-zinc-800 bg-[#0E0E10] text-sm">
                    <SelectValue placeholder="Select Team Lead" />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-800 bg-[#1B1B1D] text-[#E5E1E4]">
                    <SelectItem value="mv">Meera V.</SelectItem>
                    <SelectItem value="rk">Rahul K.</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* MEMBERS */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold tracking-widest text-zinc-600 uppercase">
                Members
              </h3>
              <Button
                variant="ghost"
                className="h-6 gap-1 px-0 text-[10px] text-violet-400 hover:text-violet-300"
              >
                <Plus className="h-3 w-3" />
                Add Member
              </Button>
            </div>
            <div className="space-y-3">
              {[
                { name: "Meera V.", role: "Lead", initials: "MV" },
                { name: "Rahul K.", role: "Member", initials: "RK" },
                { name: "Sanjay A.", role: "Member", initials: "SA" },
              ].map((member) => (
                <div
                  key={member.name}
                  className="group flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7 border border-zinc-700/50">
                      <AvatarFallback className="bg-zinc-800 text-[10px] text-zinc-400">
                        {member.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-zinc-300">{member.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      defaultValue={member.role === "Lead" ? "lead" : "member"}
                    >
                      <SelectTrigger className="h-7 w-24 border-zinc-800 bg-transparent text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-zinc-800 bg-[#1B1B1D] text-[#E5E1E4]">
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* PROJECTS */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold tracking-widest text-zinc-600 uppercase">
              Active Projects
            </h3>
            <div className="space-y-2">
              {[
                { name: "Frontend Redesign", color: "bg-blue-500" },
                { name: "Sprint 3", color: "bg-violet-500" },
              ].map((project) => (
                <div
                  key={project.name}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-zinc-800/30"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn("h-1.5 w-1.5 rounded-sm", project.color)}
                    />
                    <span className="text-xs text-zinc-400">
                      {project.name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    className="h-6 px-1 text-[10px] text-zinc-600 hover:text-white"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {/* DANGER ZONE */}
          <section className="space-y-4 rounded-md border border-red-500/10 bg-red-500/5 p-4">
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-red-400">
                Danger Zone
              </h3>
              <p className="text-[11px] text-zinc-500">
                This will not delete tasks or projects. Members will remain in
                the workspace.
              </p>
            </div>
            <Button
              variant="outline"
              className="h-8 w-full border-red-400/30 text-xs text-red-400 transition-colors hover:bg-red-400 hover:text-white"
            >
              Delete Team
            </Button>
          </section>
        </div>

        <div className="mt-auto border-t border-zinc-800/50 bg-[#1B1B1D] p-6">
          <Button className="w-full rounded-md bg-gradient-to-br from-violet-500 to-violet-600 py-5 text-xs font-bold tracking-wider text-white uppercase shadow-lg shadow-violet-500/20 transition-all duration-300 hover:from-violet-600 hover:to-violet-700">
            Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
