"use client";

import { DocSidebar } from "@/components/layout/DocSidebar";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full h-full relative">
      <DocSidebar />
      <div className="flex-1 ml-[260px] h-full"> 
        {/* ml-260 because it's inside the main container which already has ml-56 */}
        {children}
      </div>
    </div>
  );
}
