"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
  NodeProps,
  Node,
} from "reactflow"
import "reactflow/dist/style.css"
import {
  FileText,
  GitFork,
  Clock,
  Share2,
  MoreHorizontal,
  ChevronRight,
  X,
  Trash2,
  Globe,
  GlobeLock,
  Loader2,
  Check,
  AlertCircle,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { HivespaceEditor } from "@/components/features/docs/HivespaceEditor"
import { useDocumentStore } from "@/store/documentStore"
import { useDocSidebarState } from "@/store/docSidebarStore"
import type { DocumentResponse } from "@/lib/api/documents"
import { redesignDocumentWithAi } from "@/lib/api/documents"
import { gooeyToast as toast } from "@/components/ui/goey-toaster"
import { formatTimeAgo, formatDate, getInitials } from "./docHelpers"

const PageNode = ({ data }: NodeProps) => (
  <div className="group relative flex flex-col items-center justify-center">
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full border-2 shadow-lg transition-all",
        data.size === "large" ? "h-9 w-9" : data.size === "medium" ? "h-7 w-7" : "h-5 w-5",
        data.isActive
          ? "border-white bg-white/30 shadow-[0_0_20px_rgba(255,255,255,0.7)] scale-110"
          : data.colorClass || "border-zinc-600 bg-zinc-800 group-hover:border-zinc-400"
      )}
    >
      <Handle type="target" position={Position.Top} className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-1/2 opacity-0" />
      <Handle type="source" position={Position.Bottom} className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-1/2 opacity-0" />
    </div>
    <span
      className={cn(
        "absolute top-full mt-2 rounded-md bg-[#0E0E10]/80 px-2 py-0.5 font-medium whitespace-nowrap backdrop-blur-sm transition-colors",
        data.size === "large"
          ? "text-xs text-zinc-100 font-semibold"
          : "text-[11px] text-zinc-400 group-hover:text-zinc-200"
      )}
    >
      {data.title}
    </span>
  </div>
)

const nodeTypes = { page: PageNode }

interface DocEditorViewProps {
  documentId: string
}

export function DocEditorView({ documentId }: DocEditorViewProps) {
  const router = useRouter()
  const { setActiveDoc, setActiveProject } = useDocSidebarState()
  const {
    documents,
    allDocuments,
    activeDocument,
    activeDocLoading,
    error,
    versions,
    versionsLoading,
    fetchDocumentContent,
    fetchAllDocuments,
    fetchVersions,
    updateDoc,
    deleteDoc,
    publishDoc,
    unpublishDoc,
    saveStatus,
    autosaveContent,
    flushPendingSave,
    saveContent,
  } = useDocumentStore()

  const [view, setView] = useState<"editor" | "graph">("editor")
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)

  const [editorKey, setEditorKey] = useState(0)
  const [isRedesigning, setIsRedesigning] = useState(false)

  const handleRedesignWithAi = useCallback(async () => {
    if (!activeDocument) return
    setIsRedesigning(true)
    try {
      const currentText = activeDocument.textContent || ""
      const title = activeDocument.title || "Untitled"
      
      const res = await redesignDocumentWithAi(title, currentText)
      
      // Compute clean plain text content from the redesigned html for search indexes
      const plainText = res.html
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()

      // Save the redesigned document content directly to the backend database
      await saveContent(documentId, res.html, plainText)
      
      // Force editor remount to consume the new content
      setEditorKey(prev => prev + 1)
      toast.success("Document redesigned successfully!")
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "AI Redesign failed.")
    } finally {
      setIsRedesigning(false)
    }
  }, [activeDocument, saveContent])

  useEffect(() => {
    setActiveDoc(documentId)
  }, [documentId, setActiveDoc])

  useEffect(() => {
    fetchDocumentContent(documentId)
  }, [documentId, fetchDocumentContent])

  useEffect(() => {
    if (view === "graph" && activeDocument?.projectId) {
      fetchAllDocuments(activeDocument.projectId)
    }
  }, [view, activeDocument?.projectId, fetchAllDocuments])

  useEffect(() => {
    if (activeDocument?.projectId) {
      setActiveProject(activeDocument.projectId)
    }
  }, [activeDocument?.projectId, setActiveProject])

  useEffect(() => {
    if (isHistoryOpen) {
      fetchVersions(documentId)
    }
  }, [isHistoryOpen, documentId, fetchVersions])

  useEffect(() => {
    return () => {
      flushPendingSave()
    }
  }, [flushPendingSave])

  const goHome = useCallback(() => {
    setActiveDoc(null)
    router.push("/dashboard/docs")
  }, [setActiveDoc, router])

  const handleContentChange = useCallback(
    ({ content, textContent }: { content: string; textContent: string }) => {
      autosaveContent(documentId, content, textContent)
    },
    [documentId, autosaveContent]
  )

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      if (!newTitle.trim()) return
      updateDoc(documentId, newTitle)
    },
    [documentId, updateDoc]
  )

  const handleDelete = useCallback(async () => {
    await deleteDoc(documentId)
    goHome()
  }, [documentId, deleteDoc, goHome])

  const handlePublishToggle = useCallback(async () => {
    if (!activeDocument) return
    if (activeDocument.isPublished) {
      await unpublishDoc(documentId)
    } else {
      await publishDoc(documentId)
    }
  }, [documentId, activeDocument, publishDoc, unpublishDoc])

  const { graphNodes, graphEdges } = useMemo(() => {
    const docsToUse = allDocuments.length > 0 ? allDocuments : documents;
    if (docsToUse.length === 0) {
      return { graphNodes: [], graphEdges: [] };
    }

    const documentIds = new Set(docsToUse.map((d) => d.id));
    const roots = docsToUse.filter((doc) => !doc.parentId || !documentIds.has(doc.parentId));
    
    const childrenByParent: Record<string, DocumentResponse[]> = {};
    docsToUse.forEach((doc) => {
      if (doc.parentId && documentIds.has(doc.parentId)) {
        if (!childrenByParent[doc.parentId]) {
          childrenByParent[doc.parentId] = [];
        }
        childrenByParent[doc.parentId].push(doc);
      }
    });

    // 1. Group & Color clusters
    const getRootAncestorId = (docId: string): string => {
      let current = docsToUse.find((d) => d.id === docId);
      while (current && current.parentId && documentIds.has(current.parentId)) {
        current = docsToUse.find((d) => d.id === current!.parentId);
      }
      return current ? current.id : docId;
    };

    const rootColors = [
      "border-orange-500 bg-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.4)] text-orange-400",
      "border-rose-500 bg-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.4)] text-rose-400",
      "border-emerald-500 bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.4)] text-emerald-400",
      "border-sky-500 bg-sky-500/20 shadow-[0_0_15px_rgba(14,165,233,0.4)] text-sky-400",
      "border-violet-500 bg-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.4)] text-violet-400",
      "border-amber-500 bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.4)] text-amber-400",
    ];

    const clusterColor: Record<string, string> = {};
    roots.forEach((root, idx) => {
      clusterColor[root.id] = rootColors[idx % rootColors.length];
    });

    docsToUse.forEach((doc) => {
      const rootId = getRootAncestorId(doc.id);
      clusterColor[doc.id] = clusterColor[rootId] || rootColors[0];
    });

    // Build list of all active connections for force physics
    const simEdges: { source: string; target: string }[] = [];
    docsToUse
      .filter((doc) => doc.parentId && documentIds.has(doc.parentId))
      .forEach((doc) => {
        simEdges.push({ source: doc.parentId!, target: doc.id });
      });

    docsToUse.forEach((doc) => {
      if (doc.linkedDocIds) {
        doc.linkedDocIds.forEach((targetId) => {
          if (documentIds.has(targetId)) {
            simEdges.push({ source: doc.id, target: targetId });
          }
        });
      }
    });

    // 2. Deterministic Initial Seed positions
    const nodesList = docsToUse.map((doc, index) => {
      const angle = (index / docsToUse.length) * 2 * Math.PI;
      const initialRadius = 150 + (index % 3) * 50;
      return {
        id: doc.id,
        x: 400 + initialRadius * Math.cos(angle),
        y: 300 + initialRadius * Math.sin(angle),
        vx: 0,
        vy: 0,
        size: !doc.parentId || !documentIds.has(doc.parentId)
          ? "large"
          : (childrenByParent[doc.id]?.length ?? 0) > 0
            ? "medium"
            : "normal",
      };
    });

    const nodesMap = new Map(nodesList.map(n => [n.id, n]));

    // 3. Run Force-Directed layout simulation
    const k = 0.15; // spring strength
    const repulse = 120000; // repulsion strength
    const centerGravity = 0.08; // gravity towards center (400, 300)
    const idealLength = 130; // ideal link length

    for (let step = 0; step < 200; step++) {
      // Repulsion between all node pairs
      for (let i = 0; i < nodesList.length; i++) {
        const n1 = nodesList[i];
        for (let j = i + 1; j < nodesList.length; j++) {
          const n2 = nodesList[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const distSq = dx * dx + dy * dy + 0.1;
          const dist = Math.sqrt(distSq);
          if (dist < 500) {
            const force = repulse / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            n1.vx += fx;
            n1.vy += fy;
            n2.vx -= fx;
            n2.vy -= fy;
          }
        }
      }

      // Attraction along edges (both hierarchy and content links)
      simEdges.forEach((edge) => {
        const n1 = nodesMap.get(edge.source);
        const n2 = nodesMap.get(edge.target);
        if (n1 && n2) {
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
          const force = k * (dist - idealLength);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          n1.vx -= fx;
          n1.vy -= fy;
          n2.vx += fx;
          n2.vy += fy;
        }
      });

      // Gravity and damping
      nodesList.forEach((n) => {
        n.vx -= (n.x - 400) * centerGravity;
        n.vy -= (n.y - 300) * centerGravity;

        n.x += n.vx * 0.4;
        n.y += n.vy * 0.4;
        n.vx *= 0.65;
        n.vy *= 0.65;
      });
    }

    const positions: Record<string, { x: number; y: number }> = {};
    nodesList.forEach((n) => {
      positions[n.id] = { x: n.x, y: n.y };
    });

    // Build ReactFlow Nodes
    const nodes: Node[] = docsToUse.map((doc) => {
      const pos = positions[doc.id] || { x: 400, y: 300 };
      const size = !doc.parentId || !documentIds.has(doc.parentId)
        ? "large"
        : (childrenByParent[doc.id]?.length ?? 0) > 0
          ? "medium"
          : "normal";

      return {
        id: doc.id,
        type: "page",
        position: pos,
        data: {
          title: doc.title,
          isActive: doc.id === documentId,
          size,
          colorClass: clusterColor[doc.id],
        },
      };
    });

    // Helper to get edge stroke color
    const getStrokeColor = (docId: string) => {
      const colorCls = clusterColor[docId] || "";
      if (colorCls.includes("orange")) return "#f97316";
      if (colorCls.includes("rose")) return "#f43f5e";
      if (colorCls.includes("emerald")) return "#10b981";
      if (colorCls.includes("sky")) return "#0ea5e9";
      if (colorCls.includes("violet")) return "#8b5cf6";
      if (colorCls.includes("amber")) return "#f59e0b";
      return "#4b5563";
    };

    // Build ReactFlow Edges
    const edges: any[] = [];

    // 1. Parent-Child hierarchy edges (colored based on branch)
    docsToUse
      .filter((doc) => doc.parentId && documentIds.has(doc.parentId))
      .forEach((doc) => {
        const strokeColor = getStrokeColor(doc.id);
        edges.push({
          id: `edge-hierarchy-${doc.parentId}-${doc.id}`,
          source: doc.parentId!,
          target: doc.id,
          animated: true,
          style: {
            stroke: strokeColor,
            strokeWidth: doc.id === documentId || doc.parentId === documentId ? 2.5 : 1.5,
            opacity: doc.id === documentId || doc.parentId === documentId ? 0.95 : 0.6,
          },
        });
      });

    // 2. Content link edges (dashed sky/blue lines)
    docsToUse.forEach((doc) => {
      if (doc.linkedDocIds) {
        doc.linkedDocIds.forEach((targetId) => {
          if (documentIds.has(targetId)) {
            edges.push({
              id: `edge-link-${doc.id}-${targetId}`,
              source: doc.id,
              target: targetId,
              animated: true,
              style: {
                stroke: "#38bdf8", // Sky blue for connections
                strokeWidth: doc.id === documentId || targetId === documentId ? 2.2 : 1.2,
                strokeDasharray: "5,5",
                opacity: doc.id === documentId || targetId === documentId ? 0.95 : 0.5,
              },
            });
          }
        });
      }
    });

    return { graphNodes: nodes, graphEdges: edges };
  }, [allDocuments, documents, documentId]);

  if (activeDocLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    )
  }

  if (error && !activeDocument) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <div>
          <p className="text-sm font-medium text-foreground">Could not load document</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        </div>
        <Button variant="outline" size="sm" onClick={goHome}>
          Back to Docs Home
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="sticky top-0 z-30 flex h-[44px] shrink-0 items-center justify-between border-b border-border/50 bg-background/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={goHome}
            className="mr-2 h-7 px-2 text-xs text-zinc-500 hover:text-white"
          >
            Home
          </Button>
          <ChevronRight className="mr-2 h-3 w-3 text-zinc-800" />
          <span className="text-[11px] font-medium text-white truncate max-w-[300px]">
            {activeDocument?.title || "Untitled"}
          </span>
          {activeDocument?.isPublished && (
            <div className="ml-2 flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5">
              <Globe className="h-3 w-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-400">Published</span>
            </div>
          )}
          {saveStatus === "saving" && (
            <span className="ml-3 flex items-center gap-1 text-[10px] text-zinc-500 animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="ml-3 flex items-center gap-1 text-[10px] text-emerald-500 animate-in fade-in">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <TooltipProvider>
            <div className="flex rounded-md border border-zinc-700 bg-zinc-800 p-0.5 shadow-inner">
              <ViewToggle active={view === "editor"} icon={FileText} onClick={() => setView("editor")} label="Editor" />
              <ViewToggle active={view === "graph"} icon={GitFork} onClick={() => setView("graph")} label="Graph" />
              <ViewToggle active={isHistoryOpen} icon={Clock} onClick={() => setIsHistoryOpen(true)} label="History" />
            </div>
            <div className="mx-1 h-4 w-px bg-zinc-800" />
            
            {/* REDESIGN WITH AI BUTTON */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRedesignWithAi}
                  disabled={isRedesigning}
                  className="bg-violet-600/15 hover:bg-violet-600/25 border-violet-500/25 hover:border-violet-500/40 text-violet-400 font-medium rounded-md h-8 text-[11px] px-2.5 flex items-center gap-1.5 transition-all shadow-lg shadow-violet-500/5"
                >
                  {isRedesigning ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Redesign with AI
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="border-zinc-700 bg-zinc-900 py-1 text-[10px] text-zinc-300">
                Redesign document layout, tables & diagrams with AI
              </TooltipContent>
            </Tooltip>

            <div className="mx-1 h-4 w-px bg-zinc-800" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePublishToggle}
                  className={cn(
                    "h-8 w-8 rounded-md",
                    activeDocument?.isPublished
                      ? "text-emerald-400 hover:text-emerald-300"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  {activeDocument?.isPublished ? (
                    <GlobeLock className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <Share2 className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="border-zinc-700 bg-zinc-900 py-1 text-[10px] text-zinc-300">
                {activeDocument?.isPublished ? "Unpublish" : "Publish (Admin/Lead only)"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-zinc-400 hover:text-white">
                <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-44 border-zinc-700 bg-zinc-900 p-1 text-zinc-200">
              <PageAction icon={FileText} label="Duplicate" />
              <PageAction icon={MoreHorizontal} label="Move to" />
              <div className="my-1 h-px bg-zinc-800" />
              <PageAction icon={Trash2} label="Delete" className="text-red-400" onClick={handleDelete} />
            </PopoverContent>
          </Popover>
        </div>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        {view === "graph" ? (
          <div className="flex-1 animate-in bg-background duration-500 fade-in">
            <ReactFlow
              nodes={graphNodes}
              edges={graphEdges}
              nodeTypes={nodeTypes}
              onNodeClick={(event, node) => {
                router.push(`/dashboard/docs/${node.id}`);
              }}
              fitView
            >
              <Background color="#18181B" gap={20} />
              <Controls className="border-zinc-700 bg-zinc-800 fill-zinc-400" />
              <div className="absolute top-4 left-4 z-10 flex items-center gap-4 rounded-lg border border-zinc-800/80 bg-zinc-900/50 px-4 py-2 backdrop-blur">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-zinc-200">Knowledge Graph</span>
                  <span className="text-[10px] tracking-widest text-zinc-500 uppercase">
                    {(allDocuments.length > 0 ? allDocuments : documents).length} pages
                  </span>
                </div>
              </div>
            </ReactFlow>
          </div>
        ) : (
          <>             <main className="scrollbar-none relative flex-1 overflow-y-auto scroll-smooth bg-hs-main px-10 py-16">
              {isRedesigning && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/75 backdrop-blur-md gap-4 text-center animate-in fade-in duration-300">
                  {/* Neon Ambient Glowing Background Graphics */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-violet-600/20 rounded-full blur-[80px] pointer-events-none animate-pulse-soft" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none" />
                  
                  <div className="relative flex items-center justify-center">
                    <div className="h-16 w-16 animate-spin rounded-full border-4 border-violet-500/20 border-t-violet-500 shadow-lg shadow-violet-500/30" />
                    <Sparkles className="absolute h-6 w-6 text-violet-400 animate-pulse" />
                  </div>
                  <div className="relative z-10 flex flex-col gap-1.5">
                    <h3 className="text-md font-semibold text-white tracking-tight">AI Redesign in Progress</h3>
                    <p className="text-xs text-zinc-400 max-w-[280px]">
                      Structuring layouts, compiling tables, and designing vector diagrams for your document...
                    </p>
                  </div>
                </div>
              )}
              <div className="mx-auto flex max-w-[700px] flex-col gap-6">
                <div className="flex flex-col gap-4">
                  <div className="w-fit cursor-pointer rounded-lg p-2 text-4xl transition-colors hover:bg-muted/50">
                    {activeDocument?.icon || "📄"}
                  </div>
                  <input
                    key={documentId}
                    defaultValue={activeDocument?.title || ""}
                    placeholder="Untitled"
                    onBlur={(e) => handleTitleChange(e.target.value)}
                    className="w-full border-none bg-transparent text-4xl font-semibold text-foreground outline-none placeholder:text-muted-foreground/30"
                  />
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    {activeDocument?.createdByName && (
                      <span>
                        Created by {activeDocument.createdByName} ·{" "}
                        {formatTimeAgo(activeDocument.updatedAt)}
                      </span>
                    )}
                    {activeDocument?.version && (
                      <span className="text-zinc-600">· v{activeDocument.version}</span>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <HivespaceEditor
                    key={`${documentId}-${editorKey}`}
                    documentId={documentId}
                    initialContent={activeDocument?.content || ""}
                    onUpdate={handleContentChange}
                  />
                </div>
              </div>
            </main>

            <aside className="flex w-[280px] shrink-0 animate-in flex-col overflow-y-auto border-l border-border/50 bg-hs-nav duration-300 slide-in-from-right">
              <div className="flex flex-col gap-8 p-6">
                <section className="flex flex-col gap-4">
                  <h3 className="text-[10px] font-bold tracking-widest text-zinc-600 uppercase">Page Info</h3>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-7 w-7 border border-zinc-700">
                        <AvatarFallback className="bg-zinc-800 text-[10px] text-zinc-400">
                          {getInitials(activeDocument?.createdByName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-zinc-200">
                          {activeDocument?.createdByName || "Unknown"}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {activeDocument?.updatedAt
                            ? `Last edited ${formatTimeAgo(activeDocument.updatedAt)}`
                            : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between rounded-md bg-zinc-800/20 p-2 text-[11px] text-zinc-500">
                      <span>Version</span>
                      <span className="text-zinc-300">v{activeDocument?.version || 1}</span>
                    </div>
                    <div className="flex justify-between rounded-md bg-zinc-800/20 p-2 text-[11px] text-zinc-500">
                      <span>Status</span>
                      <span className={activeDocument?.isPublished ? "text-emerald-400" : "text-zinc-400"}>
                        {activeDocument?.isPublished ? "Published" : "Draft"}
                      </span>
                    </div>
                  </div>
                </section>
              </div>
            </aside>
          </>
        )}

        {isHistoryOpen && (
          <div className="absolute inset-0 z-50 flex justify-end">
            <div
              className="absolute inset-0 animate-in cursor-pointer bg-black/40 backdrop-blur-xs duration-300 fade-in"
              onClick={() => setIsHistoryOpen(false)}
            />
            <aside className="relative flex w-[320px] animate-in flex-col border-l border-zinc-800 bg-zinc-900 shadow-2xl duration-300 slide-in-from-right">
              <header className="flex h-[44px] items-center justify-between border-b border-zinc-800 px-4">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[#E5E1E4]">Version History</span>
                  <span className="text-[10px] text-zinc-500">{activeDocument?.title || "Document"}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsHistoryOpen(false)} className="h-8 w-8 text-zinc-500 hover:text-white">
                  <X className="h-4 w-4" />
                </Button>
              </header>
              <div className="p-3">
                {selectedVersionId && (
                  <div className="mb-4 flex animate-in flex-col gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 slide-in-from-top-2">
                    <p className="text-[11px] font-medium text-amber-300">You are viewing a past version.</p>
                    <Button className="h-7 w-full rounded-sm bg-amber-500 text-[10px] font-bold tracking-wider text-black uppercase shadow-lg shadow-black/20 hover:bg-amber-600">
                      Restore this version
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-2">
                <VersionRow
                  id="current"
                  label="Current version"
                  author={activeDocument?.createdByName || "Unknown"}
                  time={formatTimeAgo(activeDocument?.updatedAt || "")}
                  isCurrent
                  isActive={selectedVersionId === null}
                  onClick={() => setSelectedVersionId(null)}
                />
                <div className="mx-2 my-2 h-px bg-zinc-800 opacity-50" />
                {versionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                  </div>
                ) : versions.length === 0 ? (
                  <p className="py-8 text-center text-[10px] text-zinc-600 italic">No previous versions yet</p>
                ) : (
                  versions.map((v) => (
                    <VersionRow
                      key={v.id}
                      id={v.id}
                      label={formatDate(v.createdAt)}
                      author={v.savedByName || "Unknown"}
                      time={`v${versions.length - versions.indexOf(v)}`}
                      isActive={selectedVersionId === v.id}
                      onClick={() => setSelectedVersionId(v.id)}
                    />
                  ))
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}

function ViewToggle({
  active,
  icon: Icon,
  onClick,
  label,
}: {
  active: boolean
  icon: React.ElementType
  onClick: () => void
  label: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "flex h-8 w-9 items-center justify-center rounded transition-all",
            active ? "bg-violet-600 text-white shadow shadow-black/20" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="border-zinc-700 bg-zinc-900 py-1 text-[10px] text-zinc-300">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function PageAction({
  icon: Icon,
  label,
  className,
  onClick,
}: {
  icon: React.ElementType
  label: string
  className?: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded px-3 py-2 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white",
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
      {label}
    </button>
  )
}

function VersionRow({
  label,
  author,
  time,
  isCurrent,
  isActive,
  onClick,
}: {
  id: string
  label: string
  author: string
  time: string
  isCurrent?: boolean
  isActive: boolean
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex cursor-pointer flex-col rounded-md border-l-2 p-3 transition-all",
        isActive ? "border-violet-500 bg-zinc-800/60 text-white" : "border-transparent text-zinc-400 hover:bg-zinc-800/40"
      )}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className={cn("text-xs font-medium", isCurrent ? "text-violet-400" : "text-zinc-200")}>{label}</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <Avatar className="h-4 w-4">
          <AvatarFallback className="bg-zinc-700 text-[7px]">{getInitials(author)}</AvatarFallback>
        </Avatar>
        <span className="text-[10px] text-zinc-500">{author}</span>
        <span className="ml-auto text-[10px] whitespace-nowrap text-zinc-600">{time}</span>
      </div>
    </div>
  )
}
