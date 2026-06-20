"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FileText, ChevronRight } from "lucide-react"
import { useProjects } from "@/hooks/useProjects"
import { useDocSidebarState } from "@/store/docSidebarStore"
import { formatTimeAgo } from "./docHelpers"
import type { DocumentResponse } from "@/lib/api/documents"
import type { ProjectResponse } from "@/lib/api/projects"

export function DocsHomeView() {
  const { projects } = useProjects()
  const { setActiveProject } = useDocSidebarState()

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-[44px] items-center border-b border-border/50 bg-background px-4">
        <span className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
          Knowledge Base Home
        </span>
      </header>
      <div className="flex-1 overflow-y-auto bg-hs-main p-10">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-xl font-semibold text-foreground">Docs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your knowledge bases across all projects
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <ProjectDocCard
                key={project.id}
                project={project}
                onOpen={() => setActiveProject(project.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProjectDocCard({
  project,
  onOpen,
}: {
  project: ProjectResponse
  onOpen: () => void
}) {
  const router = useRouter()
  const { setActiveProject } = useDocSidebarState()
  const [recentDocs, setRecentDocs] = useState<DocumentResponse[]>([])

  useEffect(() => {
    const loadDocs = async () => {
      try {
        const { getDocumentsByProject } = await import("@/lib/api/documents")
        const docs = await getDocumentsByProject(project.id)
        setRecentDocs(docs.slice(0, 3))
      } catch {
        setRecentDocs([])
      }
    }
    loadDocs()
  }, [project.id])

  const openDoc = (docId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setActiveProject(project.id)
    router.push(`/dashboard/docs/${docId}`)
  }

  return (
    <div
      onClick={onOpen}
      className="group cursor-pointer rounded-lg border border-border/50 bg-hs-card p-4 transition-all hover:border-border/80"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: project.color || "#7C5CFC" }}
          />
          <span className="text-sm font-medium text-foreground">
            {project.name}
          </span>
        </div>
      </div>

      <div className="mb-6 space-y-3">
        {recentDocs.length > 0 ? (
          recentDocs.map((doc) => (
            <div
              key={doc.id}
              onClick={(e) => openDoc(doc.id, e)}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-muted/30"
            >
              <FileText className="h-3 w-3 text-zinc-500" />
              <span className="text-xs text-zinc-400 transition-colors group-hover:text-zinc-300">
                {doc.title}
              </span>
              <span className="ml-auto text-[10px] text-zinc-600">
                {formatTimeAgo(doc.updatedAt)}
              </span>
            </div>
          ))
        ) : (
          <p className="text-xs text-zinc-600 italic">No documents yet</p>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-4">
        <span className="text-xs text-muted-foreground">
          {recentDocs.length} pages
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-transform group-hover:translate-x-1">
          Open docs <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  )
}
