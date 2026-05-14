"use client"

import { useState } from "react"
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
  NodeProps,
  Edge,
  Node,
  useNodesState,
  useEdgesState,
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
  Plus,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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

// --- MOCK DATA ---

const MOCK_PAGE = {
  title: "Backend Design",
  icon: "📄",
  lastEditedBy: "Rahul S.",
  lastEditedTime: "2 hours ago",
  breadcrumbs: ["Sprint 3", "Architecture", "Backend Design"],
}

const INITIAL_CONTENT = `
  <h1>Backend Design</h1>
  <p>This document covers the core backend architecture decisions for Sprint 3. Last updated after the Apr 8 architecture review.</p>
  <h2>Tech Stack</h2>
  <ul>
    <li>Framework: Spring Boot (Java)</li>
    <li>REST API + WebSocket: Spring MVC + STOMP</li>
    <li>Authentication: JWT via Supabase JWKS endpoint</li>
    <li>Async: Spring @Async thread pool</li>
  </ul>
  <h2>WebSocket Architecture</h2>
  <p>The STOMP protocol is used over WebSockets to provide real-time updates for chat and task status changes. Each sprint has its own topic prefix to manage message propagation.</p>
  <div data-hivespace-task data-task-id="HS-044" data-title="STOMP WebSocket chat broadcast" data-status="In Progress" data-priority="urgent" data-assignee="Meera V."></div>
  <h2>Database Schema</h2>
  <p>Our PostgreSQL schema and migrations are managed via Flyway. Key tables for messaging:</p>
  <pre><code>CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES channels(id),
  sender_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  parent_id UUID REFERENCES messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);</code></pre>
`

// --- REACT FLOW HELPERS ---

const PageNode = ({ data }: NodeProps) => {
  return (
    <div className="group relative flex flex-col items-center justify-center">
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full border-2 shadow-lg transition-all",
          data.size === "large" ? "h-8 w-8" : "h-5 w-5",
          data.isActive
            ? "border-violet-500 bg-violet-500/20 shadow-[0_0_15px_rgba(124,92,252,0.4)]"
            : data.isHub
              ? "border-blue-500/60 bg-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
              : "border-zinc-600 bg-zinc-800 group-hover:border-zinc-400"
        )}
      >
        <Handle
          type="target"
          position={Position.Top}
          className="absolute h-1 w-1 opacity-0"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="absolute h-1 w-1 opacity-0"
        />
      </div>
      <span
        className={cn(
          "absolute top-full mt-2 rounded-md bg-[#0E0E10]/80 px-2 py-0.5 font-medium whitespace-nowrap backdrop-blur-sm transition-colors",
          data.size === "large"
            ? "text-sm text-zinc-200"
            : "text-xs text-zinc-400 group-hover:text-zinc-200"
        )}
      >
        {data.title}
      </span>
    </div>
  )
}

const nodeTypes = { page: PageNode }

const INITIAL_NODES: Node[] = [
  {
    id: "n1",
    type: "page",
    position: { x: 250, y: 150 },
    data: { title: "Architecture", isHub: true, size: "large" },
  },
  {
    id: "n2",
    type: "page",
    position: { x: 450, y: 250 },
    data: { title: "Backend Design", isActive: true, size: "large" },
  },
  {
    id: "n3",
    type: "page",
    position: { x: 250, y: 350 },
    data: { title: "Database Schema", size: "normal" },
  },
  {
    id: "n4",
    type: "page",
    position: { x: 50, y: 250 },
    data: { title: "API Reference", size: "normal" },
  },
  {
    id: "n5",
    type: "page",
    position: { x: 450, y: 50 },
    data: { title: "ADR-001", size: "normal" },
  },
  {
    id: "n6",
    type: "page",
    position: { x: 650, y: 350 },
    data: { title: "Apr 8 Standup", size: "normal" },
  },
]

const INITIAL_EDGES: Edge[] = [
  {
    id: "e1-2",
    source: "n1",
    target: "n2",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#7C5CFC", strokeWidth: 2 },
  },
  {
    id: "e1-3",
    source: "n1",
    target: "n3",
    type: "smoothstep",
    style: { stroke: "#10B981", strokeWidth: 2 },
  },
  {
    id: "e1-4",
    source: "n1",
    target: "n4",
    type: "smoothstep",
    style: { stroke: "#3B82F6", strokeWidth: 2 },
  },
  {
    id: "e1-5",
    source: "n1",
    target: "n5",
    type: "smoothstep",
    style: { stroke: "#F59E0B", strokeWidth: 2 },
  },
  {
    id: "e2-4",
    source: "n2",
    target: "n4",
    type: "smoothstep",
    style: { stroke: "#EC4899", strokeWidth: 2, filter: "opacity(0.6)" },
  },
  {
    id: "e2-6",
    source: "n2",
    target: "n6",
    type: "smoothstep",
    style: { stroke: "#06B6D4", strokeWidth: 2 },
  },
]

// --- DOCS HOME VIEW ---

function DocsHome({
  onSelectProject,
}: {
  onSelectProject: (id: string) => void
}) {
  const projects = [
    {
      id: "sprint3",
      name: "Sprint 3",
      workspace: "Engineering",
      color: "bg-violet-500",
      pages: 12,
      recent: [
        { title: "Backend Design", edited: "2h ago" },
        { title: "Database Schema", edited: "5h ago" },
        { title: "Apr 8 Standup", edited: "Yesterday" },
      ],
    },
    {
      id: "frontend",
      name: "Frontend Redesign",
      workspace: "Engineering",
      color: "bg-blue-500",
      pages: 8,
      recent: [
        { title: "Style Guide", edited: "1d ago" },
        { title: "Component Library", edited: "3d ago" },
      ],
    },
    {
      id: "techdebt",
      name: "Tech Debt",
      workspace: "Engineering",
      color: "bg-emerald-500",
      pages: 4,
      recent: [{ title: "Security Audit", edited: "1w ago" }],
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto bg-[#201F21] p-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-xl font-semibold text-[#E5E1E4]">Docs</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Your knowledge bases across all projects
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className="group cursor-pointer rounded-lg border border-zinc-800/50 bg-[#272629] p-4 transition-all hover:border-zinc-700"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("h-2 w-2 rounded-full", project.color)} />
                  <span className="text-sm font-medium text-[#E5E1E4]">
                    {project.name}
                  </span>
                </div>
                <Badge className="border-none bg-zinc-800 text-[10px] font-normal text-zinc-500">
                  {project.workspace}
                </Badge>
              </div>

              <div className="mb-6 space-y-3">
                {project.recent.map((page, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <FileText className="h-3 w-3 text-zinc-500" />
                    <span className="text-xs text-zinc-400 transition-colors group-hover:text-zinc-300">
                      {page.title}
                    </span>
                    <span className="ml-auto font-mono text-[10px] text-zinc-600">
                      {page.edited}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-zinc-800/50 pt-4">
                <span className="text-xs text-zinc-500">
                  {project.pages} pages
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-400 transition-transform group-hover:translate-x-1">
                  Open docs <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- MAIN PAGE COMPONENT ---

export default function KnowledgeBasePage() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [view, setView] = useState<"editor" | "graph" | "history">("editor")
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null
  )
  const [content, setContent] = useState(INITIAL_CONTENT)

  // Graph State
  const [nodes, , onNodesChange] = useNodesState(INITIAL_NODES)
  const [edges, , onEdgesChange] = useEdgesState(INITIAL_EDGES)

  if (!selectedProject) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-[#0E0E10] text-[#E5E1E4]">
        <header className="flex h-[44px] items-center border-b border-zinc-800/50 bg-[#0E0E10] px-4">
          <span className="text-[11px] font-bold tracking-widest text-zinc-500 uppercase">
            Knowledge Base Home
          </span>
        </header>
        <DocsHome onSelectProject={setSelectedProject} />
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0E0E10] text-[#E5E1E4]">
      {/* --- TOP BAR --- */}
      <header className="sticky top-0 z-30 flex h-[44px] shrink-0 items-center justify-between border-b border-zinc-800/50 bg-[#0E0E10]/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedProject(null)}
            className="mr-2 h-7 px-2 text-xs text-zinc-500 hover:text-white"
          >
            Home
          </Button>
          <ChevronRight className="mr-2 h-3 w-3 text-zinc-800" />
          {MOCK_PAGE.breadcrumbs.map((crumb, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className={cn(
                  "cursor-pointer text-[11px] transition-colors",
                  i === MOCK_PAGE.breadcrumbs.length - 1
                    ? "font-medium text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {crumb}
              </span>
              {i < MOCK_PAGE.breadcrumbs.length - 1 && (
                <ChevronRight className="h-3 w-3 text-zinc-700" />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-md border border-zinc-700 bg-zinc-800 p-0.5 shadow-inner">
            <TooltipProvider>
              <ViewToggle
                active={view === "editor"}
                icon={FileText}
                onClick={() => setView("editor")}
                label="Editor"
              />
              <ViewToggle
                active={view === "graph"}
                icon={GitFork}
                onClick={() => setView("graph")}
                label="Graph"
              />
              <ViewToggle
                active={isHistoryOpen}
                icon={Clock}
                onClick={() => setIsHistoryOpen(true)}
                label="History"
              />
            </TooltipProvider>
          </div>

          <div className="mx-1 h-4 w-px bg-zinc-800" />

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md text-zinc-400 hover:text-white"
          >
            <Share2 className="h-4 w-4" strokeWidth={1.5} />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md text-zinc-400 hover:text-white"
              >
                <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-44 border-zinc-700 bg-zinc-900 p-1 text-zinc-200"
            >
              <PageAction icon={FileText} label="Duplicate" />
              <PageAction icon={MoreHorizontal} label="Move to" />
              <div className="my-1 h-px bg-zinc-800" />
              <PageAction
                icon={Trash2}
                label="Delete"
                className="text-red-400"
              />
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {/* --- CONTENT AREA --- */}
      <div className="relative flex flex-1 overflow-hidden">
        {view === "graph" ? (
          <div className="flex-1 animate-in bg-[#0E0E10] duration-500 fade-in">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              fitView
            >
              <Background color="#18181B" gap={20} />
              <Controls className="border-zinc-700 bg-zinc-800 fill-zinc-400" />
              <div className="absolute top-4 left-4 z-10 flex items-center gap-4 rounded-lg border border-zinc-800/80 bg-zinc-900/50 px-4 py-2 backdrop-blur">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-zinc-200">
                    Knowledge Graph · Sprint 3
                  </span>
                  <span className="text-[10px] tracking-widest text-zinc-500 uppercase">
                    12 pages · 18 connections
                  </span>
                </div>
              </div>
            </ReactFlow>
          </div>
        ) : (
          <>
            <main className="scrollbar-none flex-1 overflow-y-auto scroll-smooth bg-[#201F21] px-10 py-16">
              <div className="mx-auto flex max-w-[700px] flex-col gap-6">
                {/* HEADER */}
                <div className="flex flex-col gap-4">
                  <div className="w-fit cursor-pointer rounded-lg p-2 text-4xl transition-colors hover:bg-zinc-800/50">
                    {MOCK_PAGE.icon}
                  </div>
                  <input
                    defaultValue={MOCK_PAGE.title}
                    placeholder="Untitled"
                    className="w-full border-none bg-transparent text-4xl font-semibold text-[#E5E1E4] outline-none placeholder:text-zinc-700"
                  />
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span>
                      Last edited by {MOCK_PAGE.lastEditedBy} ·{" "}
                      {MOCK_PAGE.lastEditedTime}
                    </span>
                  </div>
                </div>

                {/* TIPTAP EDITOR */}
                <div className="mt-4">
                  <HivespaceEditor
                    initialContent={content}
                    onUpdate={setContent}
                  />
                </div>

                {/* FOOTER BACKLINKS (Dynamic from editor would be better, but mock for now) */}
                <div className="mt-20 flex flex-col gap-4 border-t border-zinc-800 pt-8">
                  <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">
                    Linked From
                  </span>
                  <div className="flex flex-col gap-2">
                    <div className="group flex cursor-pointer items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-zinc-500 group-hover:text-violet-400" />
                      <span className="text-sm text-zinc-400 transition-colors group-hover:text-violet-400">
                        API Reference
                      </span>
                    </div>
                    <div className="group flex cursor-pointer items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-zinc-500 group-hover:text-violet-400" />
                      <span className="text-sm text-zinc-400 transition-colors group-hover:text-violet-400">
                        Apr 8 Standup
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </main>

            {/* RIGHT PANEL */}
            <aside className="flex w-[280px] shrink-0 animate-in flex-col overflow-y-auto border-l border-zinc-800/50 bg-[#1B1B1D] duration-300 slide-in-from-right">
              <div className="flex flex-col gap-8 p-6">
                <section className="flex flex-col gap-4">
                  <h3 className="text-[10px] font-bold tracking-widest text-zinc-600 uppercase">
                    Page Info
                  </h3>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-7 w-7 border border-zinc-700">
                        <AvatarFallback className="bg-zinc-800 text-[10px] text-zinc-400">
                          RS
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-zinc-200">
                          Rahul S.
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          Created Apr 1, 2026
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between rounded-md bg-zinc-800/20 p-2 text-[11px] text-zinc-500">
                      <span>Last edited</span>
                      <span className="text-zinc-300">2 hours ago</span>
                    </div>
                  </div>
                </section>

                <section className="flex flex-col gap-4">
                  <h3 className="text-[10px] font-bold tracking-widest text-zinc-600 uppercase">
                    Table of Contents
                  </h3>
                  <div className="flex flex-col gap-2.5">
                    <a
                      href="#"
                      className="text-xs text-zinc-400 transition-colors hover:text-violet-400"
                    >
                      Tech Stack
                    </a>
                    <a
                      href="#"
                      className="text-xs text-zinc-400 transition-colors hover:text-violet-400"
                    >
                      WebSocket Architecture
                    </a>
                    <a
                      href="#"
                      className="text-xs text-zinc-400 transition-colors hover:text-violet-400"
                    >
                      Database Schema
                    </a>
                  </div>
                </section>
              </div>
            </aside>
          </>
        )}

        {/* --- HISTORY SLIDE-OVER --- */}
        {isHistoryOpen && (
          <div className="absolute inset-0 z-50 flex justify-end">
            <div
              className="absolute inset-0 animate-in cursor-pointer bg-black/40 backdrop-blur-xs duration-300 fade-in"
              onClick={() => setIsHistoryOpen(false)}
            />
            <aside className="relative flex w-[320px] animate-in flex-col border-l border-zinc-800 bg-zinc-900 shadow-2xl duration-300 slide-in-from-right">
              <header className="flex h-[44px] items-center justify-between border-b border-zinc-800 px-4">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[#E5E1E4]">
                    Version History
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    Backend Design
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsHistoryOpen(false)}
                  className="h-8 w-8 text-zinc-500 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </header>

              <div className="p-3">
                {selectedVersionId && (
                  <div className="mb-4 flex animate-in flex-col gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 slide-in-from-top-2">
                    <p className="text-[11px] font-medium text-amber-300">
                      You are viewing a past version.
                    </p>
                    <Button className="h-7 w-full rounded-sm bg-amber-500 text-[10px] font-bold tracking-wider text-black uppercase shadow-lg shadow-black/20 hover:bg-amber-600">
                      Restore this version
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-2">
                <VersionRow
                  id="v-curr"
                  label="Current version"
                  author="Rahul S."
                  time="2 hours ago"
                  isCurrent
                  isActive={selectedVersionId === null}
                  onClick={() => setSelectedVersionId(null)}
                />
                <div className="mx-2 my-2 h-px bg-zinc-800 opacity-50" />
                {[
                  {
                    id: "v1",
                    date: "Apr 9, 3:42 PM",
                    author: "Meera V.",
                    info: "Added DB schema",
                  },
                  { id: "v2", date: "Apr 9, 2:15 PM", author: "Rahul S." },
                  {
                    id: "v3",
                    date: "Apr 8, 5:30 PM",
                    author: "David K.",
                    info: "Initial draft",
                  },
                ].map((v) => (
                  <VersionRow
                    key={v.id}
                    id={v.id}
                    label={v.date}
                    author={v.author}
                    time={v.info || "No changes recorded"}
                    isActive={selectedVersionId === v.id}
                    onClick={() => setSelectedVersionId(v.id)}
                  />
                ))}
                <span className="py-8 text-center text-[10px] text-zinc-600 italic">
                  Showing last 50 versions
                </span>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}

// --- SUB-COMPONENTS ---

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
            active
              ? "bg-violet-600 text-white shadow shadow-black/20"
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="border-zinc-700 bg-zinc-900 py-1 text-[10px] text-zinc-300"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function PageAction({
  icon: Icon,
  label,
  className,
}: {
  icon: React.ElementType
  label: string
  className?: string
}) {
  return (
    <button
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
  id,
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
        isActive
          ? "border-violet-500 bg-zinc-800/60 text-white"
          : "border-transparent text-zinc-400 hover:bg-zinc-800/40"
      )}
    >
      <div className="mb-1 flex items-center justify-between">
        <span
          className={cn(
            "text-xs font-medium",
            isCurrent ? "text-violet-400" : "text-zinc-200"
          )}
        >
          {label}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <Avatar className="h-4 w-4">
          <AvatarFallback className="bg-zinc-700 text-[7px]">
            {author
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <span className="text-[10px] text-zinc-500">{author}</span>
        <span className="ml-auto text-[10px] whitespace-nowrap text-zinc-600">
          {time}
        </span>
      </div>
    </div>
  )
}
