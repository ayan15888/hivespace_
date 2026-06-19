import { create } from "zustand";
import {
  DocumentResponse,
  DocumentContentResponse,
  DocumentVersionResponse,
  getDocumentsByProject,
  getAllDocumentsByProject,
  getDocumentWithContent,
  getDocumentVersions,
  createDocument,
  updateDocument,
  saveDocumentContent,
  deleteDocument,
  publishDocument,
  unpublishDocument,
  getChildDocuments,
} from "@/lib/api/documents";

interface DocumentState {
  documents: DocumentResponse[];
  allDocuments: DocumentResponse[];
  loading: boolean;
  error: string | null;

  // Active document content
  activeDocument: DocumentContentResponse | null;
  activeDocLoading: boolean;

  // Version history
  versions: DocumentVersionResponse[];
  versionsLoading: boolean;

  // Child documents cache
  childDocs: Record<string, DocumentResponse[]>;

  // Autosave status
  saveStatus: "idle" | "saving" | "saved";
  saveTimeout: any;
  saveIndicatorTimeout: any;
  pendingSave: {
    documentId: string;
    content: string;
    textContent: string;
  } | null;

  // Actions
  fetchDocuments: (projectId: string) => Promise<void>;
  fetchAllDocuments: (projectId: string) => Promise<void>;
  fetchDocumentContent: (documentId: string) => Promise<void>;
  fetchVersions: (documentId: string) => Promise<void>;
  fetchChildren: (documentId: string) => Promise<void>;

  createDoc: (projectId: string, title: string, parentId?: string) => Promise<DocumentResponse>;
  updateDoc: (documentId: string, title: string, icon?: string) => Promise<void>;
  saveContent: (documentId: string, content: string, textContent: string) => Promise<void>;
  autosaveContent: (documentId: string, content: string, textContent: string) => void;
  flushPendingSave: () => Promise<void>;
  deleteDoc: (documentId: string) => Promise<void>;
  publishDoc: (documentId: string) => Promise<void>;
  unpublishDoc: (documentId: string) => Promise<void>;

  clearActive: () => void;
}

export const useDocumentStore = create<DocumentState>()((set, get) => ({
  documents: [],
  allDocuments: [],
  loading: false,
  error: null,
  activeDocument: null,
  activeDocLoading: false,
  versions: [],
  versionsLoading: false,
  childDocs: {},

  saveStatus: "idle",
  saveTimeout: null,
  saveIndicatorTimeout: null,
  pendingSave: null,

  fetchDocuments: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await getDocumentsByProject(projectId);
      set({ documents: data, loading: false });
    } catch (err: any) {
      set({ error: err.message || "Failed to fetch documents", loading: false });
    }
  },

  fetchAllDocuments: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await getAllDocumentsByProject(projectId);
      set({ allDocuments: data, loading: false });
    } catch (err: any) {
      set({ error: err.message || "Failed to fetch all documents", loading: false });
    }
  },

  fetchDocumentContent: async (documentId: string) => {
    // Flush any pending save before loading a new document
    await get().flushPendingSave();

    set({ activeDocLoading: true, activeDocument: null, error: null });
    try {
      const data = await getDocumentWithContent(documentId);
      set({ activeDocument: data, activeDocLoading: false });
    } catch (err: any) {
      set({
        activeDocument: null,
        activeDocLoading: false,
        error: err.message || "Failed to load document",
      });
    }
  },

  fetchVersions: async (documentId: string) => {
    set({ versionsLoading: true });
    try {
      const data = await getDocumentVersions(documentId);
      set({ versions: data, versionsLoading: false });
    } catch (err: any) {
      set({ versionsLoading: false });
    }
  },

  fetchChildren: async (documentId: string) => {
    try {
      const data = await getChildDocuments(documentId);
      set((state) => ({
        childDocs: { ...state.childDocs, [documentId]: data },
      }));
    } catch {
      // Silently fail — children are optional
    }
  },

  createDoc: async (projectId: string, title: string, parentId?: string) => {
    const doc = await createDocument(projectId, { title, parentId });
    if (parentId) {
      set((state) => {
        const existingChildren = state.childDocs[parentId] || [];
        return {
          childDocs: {
            ...state.childDocs,
            [parentId]: [doc, ...existingChildren],
          },
          documents: state.documents.map((d) =>
            d.id === parentId ? { ...d, childCount: d.childCount + 1 } : d
          ),
          allDocuments: [doc, ...state.allDocuments].map((d) =>
            d.id === parentId ? { ...d, childCount: d.childCount + 1 } : d
          ),
        };
      });
    } else {
      set((state) => ({
        documents: [doc, ...state.documents],
        allDocuments: [doc, ...state.allDocuments],
      }));
    }
    return doc;
  },

  updateDoc: async (documentId: string, title: string, icon?: string) => {
    const updated = await updateDocument(documentId, { title, icon });
    set((state) => ({
      documents: state.documents.map((d) => (d.id === updated.id ? updated : d)),
      allDocuments: state.allDocuments.map((d) => (d.id === updated.id ? updated : d)),
    }));
    // Also update active document title if it matches
    const active = get().activeDocument;
    if (active && active.documentId === documentId) {
      set({ activeDocument: { ...active, title: updated.title, icon: updated.icon } });
    }
  },

  saveContent: async (documentId: string, content: string, textContent: string) => {
    const result = await saveDocumentContent(documentId, { content, textContent });
    set({ activeDocument: result });
    // Update the document in the list (updatedAt changed)
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === documentId ? { ...d, updatedAt: result.updatedAt, linkedDocIds: result.linkedDocIds } : d
      ),
      allDocuments: state.allDocuments.map((d) =>
        d.id === documentId ? { ...d, updatedAt: result.updatedAt, linkedDocIds: result.linkedDocIds } : d
      ),
    }));
  },

  autosaveContent: (documentId: string, content: string, textContent: string) => {
    const { saveTimeout, saveIndicatorTimeout } = get();

    if (saveTimeout) clearTimeout(saveTimeout);
    if (saveIndicatorTimeout) clearTimeout(saveIndicatorTimeout);

    set({
      pendingSave: { documentId, content, textContent },
      saveStatus: "saving",
    });

    const timeout = setTimeout(async () => {
      const pending = get().pendingSave;
      if (!pending) return;

      try {
        await get().saveContent(pending.documentId, pending.content, pending.textContent);
        set({ saveStatus: "saved", pendingSave: null });

        const indicator = setTimeout(() => {
          set({ saveStatus: "idle" });
        }, 2000);
        set({ saveIndicatorTimeout: indicator });
      } catch {
        set({ saveStatus: "idle" });
      }
    }, 1500);

    set({ saveTimeout: timeout });
  },

  flushPendingSave: async () => {
    const { saveTimeout, saveIndicatorTimeout, pendingSave } = get();

    if (saveTimeout) clearTimeout(saveTimeout);
    if (saveIndicatorTimeout) clearTimeout(saveIndicatorTimeout);
    set({ saveTimeout: null, saveIndicatorTimeout: null });

    if (pendingSave) {
      try {
        await get().saveContent(pendingSave.documentId, pendingSave.content, pendingSave.textContent);
        set({ saveStatus: "saved", pendingSave: null });
        
        const indicator = setTimeout(() => {
          set({ saveStatus: "idle" });
        }, 2000);
        set({ saveIndicatorTimeout: indicator });
      } catch {
        set({ saveStatus: "idle", pendingSave: null });
      }
    }
  },

  deleteDoc: async (documentId: string) => {
    await deleteDocument(documentId);
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== documentId),
      allDocuments: state.allDocuments.filter((d) => d.id !== documentId),
      activeDocument: state.activeDocument?.documentId === documentId ? null : state.activeDocument,
    }));
  },

  publishDoc: async (documentId: string) => {
    const updated = await publishDocument(documentId);
    set((state) => ({
      documents: state.documents.map((d) => (d.id === updated.id ? updated : d)),
      allDocuments: state.allDocuments.map((d) => (d.id === updated.id ? updated : d)),
    }));
    const active = get().activeDocument;
    if (active && active.documentId === documentId) {
      set({ activeDocument: { ...active, isPublished: true } });
    }
  },

  unpublishDoc: async (documentId: string) => {
    const updated = await unpublishDocument(documentId);
    set((state) => ({
      documents: state.documents.map((d) => (d.id === updated.id ? updated : d)),
      allDocuments: state.allDocuments.map((d) => (d.id === updated.id ? updated : d)),
    }));
    const active = get().activeDocument;
    if (active && active.documentId === documentId) {
      set({ activeDocument: { ...active, isPublished: false } });
    }
  },

  clearActive: () => {
    const { saveTimeout, saveIndicatorTimeout } = get();
    if (saveTimeout) clearTimeout(saveTimeout);
    if (saveIndicatorTimeout) clearTimeout(saveIndicatorTimeout);
    set({
      activeDocument: null,
      versions: [],
      saveStatus: "idle",
      saveTimeout: null,
      saveIndicatorTimeout: null,
      pendingSave: null,
    });
  },
}));
