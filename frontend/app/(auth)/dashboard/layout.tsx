"use client";

import { usePathname } from "next/navigation";
import { NavRail } from "@/components/layout/NavRail";
import { WorkspaceSidebar } from "@/components/layout/WorkspaceSidebar";
import { AiSidebarChat } from "@/components/layout/AiSidebarChat";
import { PageTransition } from "@/components/common/PageTransition";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/uiStore";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isAiSidebarOpen } = useUiStore();

  const isMail = pathname?.startsWith("/dashboard/mail");
  const isDocs = pathname?.startsWith("/dashboard/docs");
  const isInbox = pathname?.startsWith("/dashboard/inbox");
  const hideSidebar = isDocs || isInbox || isMail;

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <NavRail />
      {!hideSidebar && <WorkspaceSidebar />}

      {/* Main content shifts left when AI sidebar opens */}
      <main
        className={cn(
          "flex-1 transition-all duration-300 min-w-0 overflow-hidden",
          hideSidebar ? "pl-[56px]" : "pl-[276px]",
          // Shrink content area when AI panel is open on large screens
          isAiSidebarOpen && "pr-[380px]"
        )}
      >
        <PageTransition className="h-full w-full">
          {children}
        </PageTransition>
      </main>

      {/* Hex AI Sliding Sidebar Chat */}
      <AiSidebarChat />
    </div>
  );
}
