"use client"

import { Building2, Lock, Users, ChevronRight, Upload } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CTAButton } from "@/components/common/CTAButton"
import { cn } from "@/lib/utils"

export default function GeneralSettings() {
  return (
    <div className="max-w-2xl px-8 py-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-[#E5E1E4]">General Settings</h1>
        <p className="text-sm text-zinc-400 mt-1">Manage your Engineering workspace settings</p>
      </header>

      {/* SECTION: WORKSPACE IDENTITY */}
      <div className="mt-8">
        <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-4">
          WORKSPACE
        </h3>
        <div className="bg-[#272629] border border-zinc-800/50 rounded-lg p-5">
          <div className="space-y-4">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 block">
                Workspace Name
              </Label>
              <Input
                defaultValue="Engineering"
                className="bg-zinc-800 border-zinc-700 h-9 text-sm text-[#E5E1E4] focus-visible:ring-1 focus-visible:ring-hs-accent/50 focus-visible:border-hs-accent/50"
              />
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 block">
                Workspace Description
              </Label>
              <Textarea
                defaultValue="Engineering department workspace for backend, frontend, and infrastructure teams."
                className="bg-zinc-800 border-zinc-700 text-sm text-zinc-300 min-h-[80px] focus-visible:ring-1 focus-visible:ring-hs-accent/50 focus-visible:border-hs-accent/50"
              />
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 block">
                Workspace URL
              </Label>
              <div className="flex h-9">
                <div className="flex items-center bg-zinc-700 text-zinc-500 text-sm px-3 border border-zinc-700 rounded-l-md border-r-0">
                  hivespace.io/acme/
                </div>
                <Input
                  defaultValue="engineering"
                  className="bg-zinc-800 border-zinc-700 rounded-l-none text-sm text-[#E5E1E4] h-full focus-visible:ring-1 focus-visible:ring-hs-accent/50 focus-visible:border-hs-accent/50"
                />
              </div>
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 block">
                Workspace Icon
              </Label>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-400" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col gap-1">
                  <button className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5">
                    <Upload className="h-3 w-3" />
                    Change icon
                  </button>
                  <span className="text-[10px] text-zinc-600">Recommended size: 256x256px</span>
                </div>
              </div>
            </div>
          </div>

          <CTAButton className="w-full mt-6">
            Save Changes
          </CTAButton>
        </div>
      </div>

      {/* SECTION: ORGANISATION */}
      <div className="mt-8">
        <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-4">
          ORGANISATION
        </h3>
        <div className="bg-[#272629] border border-zinc-800/50 rounded-lg p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 block">
                Organisation Name
              </Label>
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Building2 className="h-4 w-4" />
                <span>Hivespace</span>
                <Lock className="h-3 w-3 ml-1" />
              </div>
            </div>
            <div className="bg-hs-accent/10 border border-hs-accent/20 text-hs-accent text-[10px] font-bold rounded-sm px-2 py-0.5 tracking-wider">
              PRO PLAN
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 rounded-md">
                <AvatarFallback className="bg-zinc-800 text-[10px] text-zinc-400 rounded-md">
                  JD
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-zinc-300">JD (you)</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Organisation Owner</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Created</p>
              <p className="text-xs text-zinc-400">January 12, 2026</p>
            </div>
          </div>

          <button className="text-xs text-hs-accent hover:underline flex items-center gap-1 group">
            Manage subscription
            <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
