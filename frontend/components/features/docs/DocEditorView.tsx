"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HivespaceEditor } from "@/components/features/docs/HivespaceEditor";
import { useDocumentStore } from "@/store/documentStore";
import { useDocSidebarState } from "@/store/docSidebarStore";
import { useDocumentSocket } from "@/hooks/useDocumentSocket";
import { redesignDocumentWithAi } from "@/lib/api/documents";
import { gooeyToast as toast } from "@/components/ui/goey-toaster";
import { formatTimeAgo } from "./docHelpers";
import { DocEditorHeader } from "./doc-editor-header";
import { DocEditorSidebar } from "./doc-editor-sidebar";
import { DocVersionHistoryDrawer } from "./doc-version-history-drawer";
import { DocumentKnowledgeGraph } from "./doc-knowledge-graph";

interface DocEditorViewProps {
  documentId: string;
}

export function DocEditorView({ documentId }: DocEditorViewProps) {
  const router = useRouter();
  const { setActiveDoc, setActiveProject } = useDocSidebarState();
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
  } = useDocumentStore();

  const [view, setView] = useState<"editor" | "graph">("editor");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [isRedesigning, setIsRedesigning] = useState(false);
  const [editor, setEditor] = useState<any>(null);
  const [ragStatus, setRagStatus] = useState<"SYNCING" | "READY">("READY");

  useDocumentSocket({
    documentId,
    onRagStatus: (status) => setRagStatus(status),
  });

  useEffect(() => {
    setRagStatus("READY");
  }, [documentId]);

  useEffect(() => {
    setActiveDoc(documentId);
  }, [documentId, setActiveDoc]);

  useEffect(() => {
    fetchDocumentContent(documentId);
  }, [documentId, fetchDocumentContent]);

  useEffect(() => {
    if (view === "graph" && activeDocument?.projectId) {
      fetchAllDocuments(activeDocument.projectId);
    }
  }, [view, activeDocument?.projectId, fetchAllDocuments]);

  useEffect(() => {
    if (activeDocument?.projectId) {
      setActiveProject(activeDocument.projectId);
    }
  }, [activeDocument?.projectId, setActiveProject]);

  useEffect(() => {
    if (isHistoryOpen) {
      fetchVersions(documentId);
    }
  }, [isHistoryOpen, documentId, fetchVersions]);

  useEffect(() => {
    return () => {
      flushPendingSave();
    };
  }, [flushPendingSave]);

  const goHome = useCallback(() => {
    setActiveDoc(null);
    router.push("/dashboard/docs");
  }, [setActiveDoc, router]);

  const handleContentChange = useCallback(
    ({ content, textContent }: { content: string; textContent: string }) => {
      autosaveContent(documentId, content, textContent);
    },
    [documentId, autosaveContent],
  );

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      if (!newTitle.trim()) return;
      updateDoc(documentId, newTitle);
    },
    [documentId, updateDoc],
  );

  const handleDelete = useCallback(async () => {
    await deleteDoc(documentId);
    goHome();
  }, [documentId, deleteDoc, goHome]);

  const handlePublishToggle = useCallback(async () => {
    if (!activeDocument) return;
    if (activeDocument.isPublished) {
      await unpublishDoc(documentId);
    } else {
      await publishDoc(documentId);
    }
  }, [documentId, activeDocument, publishDoc, unpublishDoc]);

  const handleRedesignWithAi = useCallback(async () => {
    if (!activeDocument) return;
    setIsRedesigning(true);
    try {
      const currentText = activeDocument.textContent || "";
      const title = activeDocument.title || "Untitled";
      const res = await redesignDocumentWithAi(title, currentText);

      if (editor) {
        // Set HTML into Tiptap to parse it into ProseMirror format, then read it back
        editor.commands.setContent(res.html, { emitUpdate: true });
        const newJson = JSON.stringify(editor.getJSON());
        const plainText = editor.getText();
        await saveContent(documentId, newJson, plainText);
      } else {
        const plainText = res.html
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        const minimalJson = JSON.stringify({
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text: plainText }] }]
        });
        await saveContent(documentId, minimalJson, plainText);
      }

      setEditorKey((prev) => prev + 1);
      toast.success("Document redesigned successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "AI Redesign failed.");
    } finally {
      setIsRedesigning(false);
    }
  }, [activeDocument, saveContent, documentId, editor]);

  const graphDocuments = useMemo(() => {
    return allDocuments.length > 0 ? allDocuments : documents;
  }, [allDocuments, documents]);

  if (activeDocLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
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
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <DocEditorHeader
        activeDocument={activeDocument}
        saveStatus={saveStatus}
        ragStatus={ragStatus}
        view={view}
        isHistoryOpen={isHistoryOpen}
        isRedesigning={isRedesigning}
        onGoHome={goHome}
        onSetView={setView}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onRedesignWithAi={handleRedesignWithAi}
        onTogglePublish={handlePublishToggle}
        onDelete={handleDelete}
      />

      <div className="relative flex flex-1 overflow-hidden">
        {view === "graph" ? (
          <div className="flex-1 animate-in bg-background duration-500 fade-in">
            <DocumentKnowledgeGraph
              documents={graphDocuments}
              activeDocumentId={documentId}
              onOpenDocument={(nextDocumentId) => {
                router.push(`/dashboard/docs/${nextDocumentId}`);
              }}
            />
            <div className="absolute top-4 left-4 z-10 flex items-center gap-4 rounded-lg border border-zinc-800/80 bg-zinc-900/50 px-4 py-2 backdrop-blur">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-zinc-200">Knowledge Graph</span>
                <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                  {graphDocuments.length} pages
                </span>
              </div>
            </div>
          </div>
        ) : (
          <>
            <main className="scrollbar-none relative flex-1 overflow-y-auto scroll-smooth bg-hs-main px-10 py-16">
              {isRedesigning && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/75 text-center backdrop-blur-md animate-in fade-in duration-300">
                  <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/20 blur-[80px] pointer-events-none animate-pulse-soft" />
                  <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[60px] pointer-events-none" />

                  <div className="relative flex items-center justify-center">
                    <div className="h-16 w-16 animate-spin rounded-full border-4 border-violet-500/20 border-t-violet-500 shadow-lg shadow-violet-500/30" />
                    <Sparkles className="absolute h-6 w-6 animate-pulse text-violet-400" />
                  </div>
                  <div className="relative z-10 flex flex-col gap-1.5">
                    <h3 className="text-md font-semibold tracking-tight text-white">
                      AI Redesign in Progress
                    </h3>
                    <p className="max-w-[280px] text-xs text-zinc-400">
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
                    onBlur={(event) => handleTitleChange(event.target.value)}
                    className="w-full border-none bg-transparent text-4xl font-semibold text-foreground outline-none placeholder:text-muted-foreground/30"
                  />
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    {activeDocument?.createdByName && (
                      <span>
                        Created by {activeDocument.createdByName} - {formatTimeAgo(activeDocument.updatedAt)}
                      </span>
                    )}
                    {activeDocument?.version && <span className="text-zinc-600">- v{activeDocument.version}</span>}
                  </div>
                </div>
                <div className="mt-4">
                  <HivespaceEditor
                    key={`${documentId}-${editorKey}`}
                    documentId={documentId}
                    initialContent={activeDocument?.content || ""}
                    onUpdate={handleContentChange}
                    onEditorReady={setEditor}
                  />
                </div>
              </div>
            </main>

            <DocEditorSidebar activeDocument={activeDocument} />
          </>
        )}

        <DocVersionHistoryDrawer
          open={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          title={activeDocument?.title || "Document"}
          versions={versions}
          versionsLoading={versionsLoading}
          selectedVersionId={selectedVersionId}
          onSelectVersion={setSelectedVersionId}
        />
      </div>
    </div>
  );
}
