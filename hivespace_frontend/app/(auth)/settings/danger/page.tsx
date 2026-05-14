"use client"

import { useState } from "react"
import { AlertCircle, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export default function DangerSettings() {
  const [confirmText, setConfirmText] = useState("")
  const workspaceName = "ENGINEERING"
  const isConfirmed = confirmText === workspaceName

  return (
    <div className="max-w-2xl px-8 py-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-[#E5E1E4]">Delete Workspace</h1>
        <p className="text-sm text-zinc-400 mt-1">Permanently remove this workspace and all its data</p>
      </header>

      <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-6 max-w-xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-red-400" strokeWidth={1.5} />
          </div>
          <h2 className="text-base font-semibold text-[#E5E1E4]">
            Delete Engineering Workspace
          </h2>
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-sm text-zinc-400 leading-relaxed">
            This action <span className="text-red-400 font-medium underline underline-offset-4">cannot be undone</span>. 
            All projects, tasks, docs, and channels in this workspace will be permanently deleted. 
            Members will remain in the organisation.
          </p>
          
          <div className="pt-4 border-t border-red-500/10">
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2 block">
              Type {workspaceName} to confirm
            </label>
            <Input 
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={workspaceName}
              className="bg-zinc-900 border-red-500/20 focus-visible:ring-red-500/30 focus-visible:border-red-500/40 text-sm text-[#E5E1E4] h-10"
            />
          </div>

          <button 
            disabled={!isConfirmed}
            className={cn(
              "w-full mt-4 h-10 rounded-md text-[10px] font-bold uppercase tracking-[0.2em] transition-all",
              isConfirmed 
                ? "bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 cursor-pointer" 
                : "bg-zinc-800 border border-zinc-700 text-zinc-600 cursor-not-allowed"
            )}
          >
            Delete Workspace
          </button>
        </div>
      </div>

      <div className="mt-10 p-4 rounded-lg bg-zinc-800/20 border border-zinc-800/50 max-w-xl">
        <h4 className="text-xs font-semibold text-zinc-400 mb-2">Alternative Actions</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm text-zinc-300">Archive Workspace</span>
              <span className="text-[10px] text-zinc-500">Make it read-only for all members</span>
            </div>
            <button className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest hover:text-white transition-colors">Archive</button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm text-zinc-300">Transfer Ownership</span>
              <span className="text-[10px] text-zinc-500">Move this workspace to another organisation</span>
            </div>
            <button className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest hover:text-white transition-colors">Transfer</button>
          </div>
        </div>
      </div>
    </div>
  )
}
