"use client";

import { NavRail } from "@/components/layout/NavRail"
import { SettingsSidebar } from "@/components/layout/SettingsSidebar"
import { PageTransition } from "@/components/common/PageTransition"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <NavRail />
      <SettingsSidebar />
      <main className="flex-1 transition-all duration-300 min-w-0 overflow-hidden pl-[296px] bg-card">
        <div className="h-full overflow-y-auto">
          <PageTransition className="h-full">
            {children}
          </PageTransition>
        </div>
      </main>
    </div>
  )
}
