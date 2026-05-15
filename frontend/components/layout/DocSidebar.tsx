"use client";

import { useState } from "react";
import { 
  PlusCircle, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  MoreHorizontal, 
  GitFork, 
  Trash2,
  FolderOpen,
  Check,
  Folder
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface PageNode {
  id: string;
  title: string;
  icon?: string;
  children?: PageNode[];
  isExpanded?: boolean;
}

const SPRINT_PAGES: PageNode[] = [
  { id: "p1", title: "Overview", icon: "📋" },
  { 
    id: "p2", title: "Architecture", icon: "🏗", 
    isExpanded: true,
    children: [
      { id: "p2-1", title: "Backend Design", icon: "📄" },
      { id: "p2-2", title: "Database Schema", icon: "🗄" }
    ]
  },
  { id: "p3", title: "API Reference", icon: "📡" },
  { 
    id: "p4", title: "Meeting Notes", icon: "📝",
    children: [
      { id: "p4-1", title: "Apr 8 Standup" },
      { id: "p4-2", title: "Sprint Planning" }
    ]
  },
  { id: "p5", title: "Retrospective", icon: "🔁" },
];

const TEAM_PAGES: PageNode[] = [
  { id: "t1", title: "Team Handbook", icon: "📖" },
  { id: "t2", title: "Onboarding Guide", icon: "🚀" },
  { id: "t3", title: "Coding Standards", icon: "⚙️" },
  { 
    id: "t4", title: "Architecture Decisions", icon: "🏛",
    children: [
      { id: "t4-1", title: "ADR-001 Redis vs Postgres" },
      { id: "t4-2", title: "ADR-002 File Storage Choice" }
    ]
  },
  { id: "t5", title: "Interview Process", icon: "📋" },
];

const PROJECTS = [
  { id: "sprint3", name: "Sprint 3", workspace: "Engineering", color: "#7C5CFC", type: "project" },
  { id: "frontend", name: "Frontend Redesign", workspace: "Engineering", color: "#3B82F6", type: "project" },
  { id: "techdebt", name: "Tech Debt", workspace: "Engineering", color: "#10B981", type: "project" },
];

export function DocSidebar() {
  const [activeProjectId, setActiveProjectId] = useState("sprint3");
  const [activePageId, setActivePageId] = useState("p2-1"); // Backend Design
  const [expandedIds, setExpandedIds] = useState<string[]>(["p2", "p4"]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const activeProject = PROJECTS.find(p => p.id === activeProjectId) || PROJECTS[0];
  const pages = activeProjectId === "team" ? TEAM_PAGES : SPRINT_PAGES;

  return (
    <aside className="fixed top-0 left-[56px] z-40 flex h-full w-[260px] flex-col bg-[#1B1B1D]">
      
|      {/* SCOPE SWITCHER */}
      <div className="p-4 pt-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 transition-all hover:border-zinc-600 outline-none">
              <FolderOpen className="h-[14px] w-[14px] text-zinc-400" />
              <span className="text-sm font-medium text-[#E5E1E4]">{activeProject.name}</span>
              <ChevronDown className="ml-auto h-3 w-3 text-zinc-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[240px] bg-zinc-900 border-zinc-800 text-[#E5E1E4] p-1">
            <DropdownMenuLabel className="px-2 py-1 text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
              Projects
            </DropdownMenuLabel>
            
            {PROJECTS.map((project) => (
              <DropdownMenuItem 
                key={project.id}
                onClick={() => setActiveProjectId(project.id)}
                className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800 rounded-sm"
              >
                <div className="w-4 flex items-center justify-center">
                  {activeProjectId === project.id ? (
                    <Check className="h-3 w-3 text-violet-500" />
                  ) : <div className="w-3" />}
                </div>
                <div 
                  className="h-1.5 w-1.5 rounded-full" 
                  style={{ backgroundColor: project.color }} 
                />
                <span className="text-sm text-zinc-300">{project.name}</span>
                <span className="ml-auto text-xs text-zinc-500">{project.workspace}</span>
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator className="bg-zinc-800 my-1" />
            
            <DropdownMenuLabel className="px-2 py-1 text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
              Workspace Shared
            </DropdownMenuLabel>
            <DropdownMenuItem 
              onClick={() => setActiveProjectId("team")}
              className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800 rounded-sm"
            >
              <div className="w-4 flex items-center justify-center">
                {activeProjectId === "team" ? (
                  <Check className="h-3 w-3 text-violet-500" />
                ) : <div className="w-3" />}
              </div>
              <Folder className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-sm text-zinc-300">Engineering (shared docs)</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="h-px bg-zinc-800/50 mx-4" />

      {/* ACTION BAR */}
      <div className="p-4 pb-2 space-y-3">
        <Button variant="ghost" className="w-full justify-start h-8 px-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-md group">
          <PlusCircle className="mr-2 h-4 w-4 opacity-70 group-hover:opacity-100" />
          New Page
        </Button>
        
        <div className="relative group">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
          <input 
            placeholder="Search docs..."
            className="w-full bg-zinc-800/50 h-8 pl-8 pr-2 text-xs border border-transparent focus:border-zinc-700 focus:bg-zinc-800 text-zinc-200 rounded-md outline-none transition-all placeholder:text-zinc-500"
          />
        </div>
      </div>

      {/* PAGE TREE */}
      <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-0.5">
        {pages.map(page => (
          <TreeNode 
            key={page.id} 
            node={page} 
            level={0} 
            activeId={activePageId}
            expandedIds={expandedIds}
            onToggle={toggleExpand}
            onSelect={setActivePageId}
          />
        ))}
      </div>

      {/* BOTTOM TOOLS */}
      <div className="p-3 border-t border-zinc-800/50 flex flex-col gap-1">
        <button className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/40 rounded-md transition-colors group">
          <GitFork className="h-[14px] w-[14px] opacity-70 group-hover:opacity-100" />
          Knowledge Graph
        </button>
        <button className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/40 rounded-md transition-colors group">
          <Trash2 className="h-[14px] w-[14px] opacity-70 group-hover:opacity-100" />
          Trash
        </button>
      </div>

    </aside>
  );
}

function TreeNode({ 
  node, 
  level, 
  activeId, 
  expandedIds, 
  onToggle, 
  onSelect 
}: { 
  node: PageNode; 
  level: number;
  activeId: string;
  expandedIds: string[];
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const isExpanded = expandedIds.includes(node.id);
  const isActive = activeId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="flex flex-col">
      <div 
        onClick={() => {
          if (hasChildren) onToggle(node.id);
          onSelect(node.id);
        }}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        className={cn(
          "group flex h-8 items-center gap-2 cursor-pointer rounded-md transition-all",
          isActive ? "bg-zinc-800/60 text-white" : "text-zinc-400 hover:bg-zinc-800/30 hover:text-zinc-200"
        )}
      >
        <div className="w-3.5 flex items-center justify-center">
          {hasChildren ? (
            isExpanded ? <ChevronDown className="h-3 w-3 text-zinc-600" /> : <ChevronRight className="h-3 w-3 text-zinc-600" />
          ) : <div className="w-3" />}
        </div>
        
        <span className="text-[14px] shrink-0">{node.icon || <FileText className="h-3.5 w-3.5" />}</span>
        <span className={cn("text-sm truncate pr-2", isActive && "font-medium")}>{node.title}</span>
        
        <MoreHorizontal className="h-3 w-3 ml-auto mr-1 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-white" />
      </div>

      {hasChildren && isExpanded && (
        <div className="flex flex-col">
          {node.children!.map(child => (
            <TreeNode 
              key={child.id} 
              node={child} 
              level={level + 1}
              activeId={activeId}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
