import { create } from "zustand";
import {
  DocumentResponse,
  DocumentContentResponse,
  DocumentVersionResponse,
  getDocumentsByProject,
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
  // Document list for the active project
  documents: DocumentResponse[];
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

  // Actions
  fetchDocuments: (projectId: string) => Promise<void>;
  fetchDocumentContent: (documentId: string) => Promise<void>;
  fetchVersions: (documentId: string) => Promise<void>;
  fetchChildren: (documentId: string) => Promise<void>;

  createDoc: (projectId: string, title: string, parentId?: string) => Promise<DocumentResponse>;
  updateDoc: (documentId: string, title: string, icon?: string) => Promise<void>;
  saveContent: (documentId: string, content: string, textContent: string) => Promise<void>;
  deleteDoc: (documentId: string) => Promise<void>;
  publishDoc: (documentId: string) => Promise<void>;
  unpublishDoc: (documentId: string) => Promise<void>;

  clearActive: () => void;
}

export const useDocumentStore = create<DocumentState>()((set, get) => ({
  documents: [],
  loading: false,
  error: null,
  activeDocument: null,
  activeDocLoading: false,
  versions: [],
  versionsLoading: false,
  childDocs: {},

  fetchDocuments: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await getDocumentsByProject(projectId);
      set({ documents: data, loading: false });
    } catch (err: any) {
      set({ error: err.message || "Failed to fetch documents", loading: false });
    }
  },

  fetchDocumentContent: async (documentId: string) => {
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
        };
      });
    } else {
      set((state) => ({ documents: [doc, ...state.documents] }));
    }
    return doc;
  },

  updateDoc: async (documentId: string, title: string, icon?: string) => {
    const updated = await updateDocument(documentId, { title, icon });
    set((state) => ({
      documents: state.documents.map((d) => (d.id === updated.id ? updated : d)),
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
        d.id === documentId ? { ...d, updatedAt: result.updatedAt } : d
      ),
    }));
  },

  deleteDoc: async (documentId: string) => {
    await deleteDocument(documentId);
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== documentId),
      activeDocument: state.activeDocument?.documentId === documentId ? null : state.activeDocument,
    }));
  },

  publishDoc: async (documentId: string) => {
    const updated = await publishDocument(documentId);
    set((state) => ({
      documents: state.documents.map((d) => (d.id === updated.id ? updated : d)),
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
    }));
    const active = get().activeDocument;
    if (active && active.documentId === documentId) {
      set({ activeDocument: { ...active, isPublished: false } });
    }
  },

  clearActive: () => {
    set({ activeDocument: null, versions: [] });
  },
}));
