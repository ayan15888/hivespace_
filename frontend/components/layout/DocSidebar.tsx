"use client";

import { useState, useEffect, useCallback } from "react";
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
  Loader2,
  Plus,
  Pencil,
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
import { useProjects } from "@/hooks/useProjects";
import { useDocumentStore } from "@/store/documentStore";
import type { DocumentResponse } from "@/lib/api/documents";

interface DocSidebarProps {
  activeProjectId: string | null;
  activeDocId: string | null;
  onSelectProject: (projectId: string) => void;
  onSelectDoc: (docId: string | null) => void;
  onNewDoc: () => void;
}

export function DocSidebar({
  activeProjectId,
  activeDocId,
  onSelectProject,
  onSelectDoc,
  onNewDoc,
}: DocSidebarProps) {
  const { projects } = useProjects();
  const { documents, loading, fetchDocuments, fetchChildren, childDocs, createDoc, deleteDoc } = useDocumentStore();
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch documents when activeProjectId changes
  useEffect(() => {
    if (activeProjectId) {
      fetchDocuments(activeProjectId);
    }
  }, [activeProjectId, fetchDocuments]);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const toggleExpand = useCallback((docId: string) => {
    setExpandedIds((prev) => {
      if (prev.includes(docId)) {
        return prev.filter((id) => id !== docId);
      } else {
        fetchChildren(docId);
        return [...prev, docId];
      }
    });
  }, [fetchChildren]);

  const handleCreateSubPage = useCallback(async (parentId: string) => {
    if (!activeProjectId) return;
    try {
      const newDoc = await createDoc(activeProjectId, "Untitled", parentId);
      // Expand parent, refresh children, and select new doc
      if (!expandedIds.includes(parentId)) {
        setExpandedIds((prev) => [...prev, parentId]);
      }
      fetchChildren(parentId);
      onSelectDoc(newDoc.id);
    } catch (err: any) {
      console.error("Failed to create sub-page:", err);
      alert("Failed to create sub-page: " + (err.message || "Unknown error"));
    }
  }, [activeProjectId, createDoc, expandedIds, fetchChildren, onSelectDoc]);

  const handleDeleteDoc = useCallback(async (docId: string) => {
    try {
      await deleteDoc(docId);
      if (activeDocId === docId) {
        onSelectDoc(null);
      }
    } catch (err) {
      console.error("Failed to delete document:", err);
    }
  }, [deleteDoc, activeDocId, onSelectDoc]);

  // Filter documents by search
  const filteredDocs = searchQuery.trim()
    ? documents.filter((d) =>
        d.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : documents;

  return (
    <aside className="fixed top-0 left-[56px] z-40 flex h-full w-[260px] flex-col bg-sidebar">
      
      {/* SCOPE SWITCHER */}
      <div className="p-4 pt-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 transition-all hover:border-zinc-600 outline-none">
              <FolderOpen className="h-[14px] w-[14px] text-zinc-400" />
              <span className="text-sm font-medium text-[#E5E1E4] truncate">
                {activeProject?.name || "Select project"}
              </span>
              <ChevronDown className="ml-auto h-3 w-3 text-zinc-500 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[240px] bg-zinc-900 border-zinc-800 text-[#E5E1E4] p-1">
            <DropdownMenuLabel className="px-2 py-1 text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
              Projects
            </DropdownMenuLabel>
            
            {projects.map((project) => (
              <DropdownMenuItem 
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800 rounded-sm"
              >
                <div className="w-4 flex items-center justify-center">
                  {activeProjectId === project.id ? (
                    <Check className="h-3 w-3 text-violet-500" />
                  ) : <div className="w-3" />}
                </div>
                <div 
                  className="h-1.5 w-1.5 rounded-full shrink-0" 
                  style={{ backgroundColor: project.color || "#7C5CFC" }} 
                />
                <span className="text-sm text-zinc-300 truncate">{project.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="h-px bg-zinc-800/50 mx-4" />

      {/* ACTION BAR */}
      <div className="p-4 pb-2 space-y-3">
        <Button 
          variant="ghost" 
          onClick={onNewDoc}
          disabled={!activeProjectId}
          className="w-full justify-start h-8 px-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-md group"
        >
          <PlusCircle className="mr-2 h-4 w-4 opacity-70 group-hover:opacity-100" />
          New Page
        </Button>
        
        <div className="relative group">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
          <input 
            placeholder="Search docs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-800/50 h-8 pl-8 pr-2 text-xs border border-transparent focus:border-zinc-700 focus:bg-zinc-800 text-zinc-200 rounded-md outline-none transition-all placeholder:text-zinc-500"
          />
        </div>
      </div>

      {/* PAGE TREE */}
      <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-0.5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-6 w-6 text-zinc-700 mb-2" />
            <p className="text-xs text-zinc-500">
              {activeProjectId
                ? searchQuery ? "No matching docs" : "No documents yet"
                : "Select a project"}
            </p>
            {activeProjectId && !searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onNewDoc}
                className="mt-2 h-7 text-[11px] text-violet-400 hover:text-violet-300"
              >
                <PlusCircle className="mr-1.5 h-3 w-3" />
                Create first page
              </Button>
            )}
          </div>
        ) : (
          filteredDocs.map((doc) => (
            <TreeNode 
              key={doc.id} 
              doc={doc} 
              level={0} 
              activeId={activeDocId}
              expandedIds={expandedIds}
              childDocs={childDocs}
              onToggle={toggleExpand}
              onSelect={onSelectDoc}
              onCreateSubPage={handleCreateSubPage}
              onDelete={handleDeleteDoc}
            />
          ))
        )}
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
  doc, 
  level, 
  activeId, 
  expandedIds, 
  childDocs,
  onToggle, 
  onSelect,
  onCreateSubPage,
  onDelete,
}: { 
  doc: DocumentResponse; 
  level: number;
  activeId: string | null;
  expandedIds: string[];
  childDocs: Record<string, DocumentResponse[]>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onCreateSubPage: (parentId: string) => void;
  onDelete: (docId: string) => void;
}) {
  const isExpanded = expandedIds.includes(doc.id);
  const isActive = activeId === doc.id;
  const hasChildren = doc.childCount > 0;
  const children = childDocs[doc.id] || [];

  return (
    <div className="flex flex-col">
      <div 
        onClick={() => {
          if (hasChildren) onToggle(doc.id);
          onSelect(doc.id);
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
        
        <span className="text-[14px] shrink-0">
          {doc.icon || <FileText className="h-3.5 w-3.5" />}
        </span>
        <span className={cn("text-sm truncate pr-2 flex-1", isActive && "font-medium")}>
          {doc.title}
        </span>
        
        {doc.isPublished && (
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" title="Published" />
        )}

        {/* Context menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className="h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-white shrink-0 rounded hover:bg-zinc-700/50 transition-all">
              <MoreHorizontal className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-40 bg-zinc-900 border-zinc-800 text-zinc-200 p-1"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem 
              onClick={() => onCreateSubPage(doc.id)}
              className="flex items-center gap-2 px-2 py-1.5 text-xs cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800 rounded-sm"
            >
              <Plus className="h-3 w-3" />
              New sub-page
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800 my-1" />
            <DropdownMenuItem 
              onClick={() => onDelete(doc.id)}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-red-400 cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800 rounded-sm"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {hasChildren && isExpanded && (
        <div className="flex flex-col">
          {children.map((child) => (
            <TreeNode 
              key={child.id} 
              doc={child} 
              level={level + 1}
              activeId={activeId}
              expandedIds={expandedIds}
              childDocs={childDocs}
              onToggle={onToggle}
              onSelect={onSelect}
              onCreateSubPage={onCreateSubPage}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
