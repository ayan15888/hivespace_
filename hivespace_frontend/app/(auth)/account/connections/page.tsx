"use client"

import { GitGraph as Github, Mail, ExternalLink } from "lucide-react"
import { CTAButton } from "@/components/common/CTAButton"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const CONNECTIONS = [
  { 
    id: "github", 
    name: "GitHub", 
    icon: Github, 
    status: "connected", 
    details: "Connected as @johndoe", 
    subDetails: "github.com/johndoe",
    iconColor: "text-white"
  },
  { 
    id: "google", 
    name: "Google (Gmail)", 
    icon: Mail, 
    status: "not-connected", 
    details: "Not connected", 
    subDetails: "Required for email client feature",
    iconColor: "text-red-400"
  },
  { 
    id: "microsoft", 
    name: "Microsoft (Outlook)", 
    icon: Mail, 
    status: "not-connected", 
    details: "Not connected", 
    subDetails: "Sync with Outlook calendar and mail",
    iconColor: "text-blue-400"
  },
]

export default function ConnectedAccountsPage() {
  return (
    <div className="max-w-2xl px-8 py-6 flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-[#E5E1E4]">Connected Accounts</h1>
      </div>

      <div className="flex flex-col gap-4">
        {CONNECTIONS.map((conn) => {
          const Icon = conn.icon
          const isConnected = conn.status === "connected"
          
          return (
            <div key={conn.id} className="bg-[#272629] rounded-lg p-5 border border-zinc-800/10 shadow-xl shadow-black/20">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <Icon className={cn("h-5 w-5", conn.iconColor)} strokeWidth={1.5} />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-[#E5E1E4]">{conn.name}</span>
                    <div className="flex items-center gap-2">
                       <div className={cn("h-1.5 w-1.5 rounded-full", isConnected ? "bg-green-400" : "bg-zinc-600")} />
                       <span className={cn("text-xs font-medium", isConnected ? "text-green-400" : "text-zinc-500")}>
                         {conn.details}
                       </span>
                    </div>
                    {conn.subDetails && (
                      <span className="text-[10px] text-zinc-600 font-mono italic mt-1">{conn.subDetails}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center">
                  {isConnected ? (
                    <button className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest bg-red-400/5 px-2 py-1 rounded">
                      Disconnect
                    </button>
                  ) : (
                    <CTAButton className="h-7 px-3 text-[9px]">Connect {conn.name.split(" ")[0]}</CTAButton>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Info Box */}
      <div className="bg-[#1B1B1D] border border-zinc-800 rounded-md p-4 flex gap-4">
        <div className="h-5 w-5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
          <ExternalLink className="h-2.5 w-2.5 text-zinc-500" strokeWidth={2} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-zinc-300">Third-party Access</span>
          <p className="text-[10px] text-zinc-500 leading-relaxed max-w-sm">
            Hivespace only requests the minimum required permissions to sync your data. You can revoke access at any time from this dashboard or from the provider&apos;s platform.
          </p>
        </div>
      </div>
    </div>
  )
}
