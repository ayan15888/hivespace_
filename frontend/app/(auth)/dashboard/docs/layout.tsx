"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DocSidebar } from "@/components/layout/DocSidebar";
import { useDocumentStore } from "@/store/documentStore";
import { useProjects } from "@/hooks/useProjects";
import { useDocSidebarState } from "@/store/docSidebarStore";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { projects } = useProjects();
  const { createDoc } = useDocumentStore();
  const { activeProjectId, activeDocId, setActiveProject, setActiveDoc } = useDocSidebarState();

  // Auto-select first project (in useEffect to avoid setting state during render)
  useEffect(() => {
    if (!activeProjectId && projects.length > 0) {
      setActiveProject(projects[0].id);
    }
  }, [activeProjectId, projects, setActiveProject]);

  const handleSelectDoc = useCallback(
    (docId: string | null) => {
      if (!docId) {
        setActiveDoc(null);
        router.push("/dashboard/docs");
        return;
      }
      setActiveDoc(docId);
      router.push(`/dashboard/docs/${docId}`);
    },
    [setActiveDoc, router]
  );

  const handleNewDoc = useCallback(async () => {
    if (!activeProjectId) return;
    try {
      const doc = await createDoc(activeProjectId, "Untitled");
      handleSelectDoc(doc.id);
    } catch (err: any) {
      console.error("Failed to create document:", err);
      alert("Failed to create document: " + (err.message || "Unknown error"));
    }
  }, [activeProjectId, createDoc, handleSelectDoc]);

  return (
    <div className="flex w-full h-full relative">
      <DocSidebar
        activeProjectId={activeProjectId}
        activeDocId={activeDocId}
        onSelectProject={(id) => {
          setActiveProject(id);
          handleSelectDoc(null);
        }}
        onSelectDoc={handleSelectDoc}
        onNewDoc={handleNewDoc}
      />
      <div className="flex-1 ml-[260px] h-full">
        {children}
      </div>
    </div>
  );
}
