"use client";

import { usePathname } from "next/navigation";
import { NavRail } from "@/components/layout/NavRail";
import { WorkspaceSidebar } from "@/components/layout/WorkspaceSidebar";
import { PageTransition } from "@/components/common/PageTransition";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isMail = pathname?.startsWith("/dashboard/mail");
  const isDocs = pathname?.startsWith("/dashboard/docs");
  const isInbox = pathname?.startsWith("/dashboard/inbox");
  const hideSidebar = isDocs || isInbox || isMail;

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <NavRail />
      {!hideSidebar && <WorkspaceSidebar />}
      <main className={cn(
        "flex-1 transition-all duration-300 min-w-0 overflow-hidden", 
        hideSidebar ? "pl-[56px]" : "pl-[276px]"
      )}>
        <PageTransition className="h-full w-full">
          {children}
        </PageTransition>
      </main>
    </div>
  );
}
