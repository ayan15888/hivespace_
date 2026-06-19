import { apiFetch } from "./client";

// ==================== TYPES ====================

export interface DocumentRequest {
  title: string;
  icon?: string;
  parentId?: string;
}

export interface DocumentResponse {
  id: string;
  title: string;
  icon: string | null;
  projectId: string;
  workspaceId: string;
  parentId: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdByAvatar: string | null;
  createdByAvatarColor: string | null;
  isPublished: boolean;
  childCount: number;
  versionCount: number;
  createdAt: string;
  updatedAt: string;
  linkedDocIds?: string[];
}

export interface DocumentContentRequest {
  content: string;       // ProseMirror JSON from Tiptap
  textContent: string;   // plain text for search
}

export interface DocumentContentResponse {
  documentId: string;
  title: string;
  icon: string | null;
  content: string | null;
  textContent: string | null;
  version: number;
  isPublished: boolean;
  projectId: string;
  createdById: string | null;
  createdByName: string | null;
  updatedAt: string;
  linkedDocIds?: string[];
}

export interface DocumentVersionResponse {
  id: string;
  documentId: string;
  content: string;
  savedById: string | null;
  savedByName: string | null;
  createdAt: string;
}

// ==================== API FUNCTIONS ====================

/** Create a new document in a project */
export async function createDocument(projectId: string, data: DocumentRequest): Promise<DocumentResponse> {
  return apiFetch(`/api/projects/${projectId}/documents`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** List all root-level documents for a project */
export async function getDocumentsByProject(projectId: string): Promise<DocumentResponse[]> {
  return apiFetch(`/api/projects/${projectId}/documents`);
}

/** List all documents (recursive) for a project */
export async function getAllDocumentsByProject(projectId: string): Promise<DocumentResponse[]> {
  return apiFetch(`/api/projects/${projectId}/documents/all`);
}

/** Get a single document with its content */
export async function getDocumentWithContent(documentId: string): Promise<DocumentContentResponse> {
  return apiFetch(`/api/documents/${documentId}`);
}

/** Update document metadata (title, icon, parent) */
export async function updateDocument(documentId: string, data: DocumentRequest): Promise<DocumentResponse> {
  return apiFetch(`/api/documents/${documentId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/** Save document content (auto-creates a version snapshot) */
export async function saveDocumentContent(documentId: string, data: DocumentContentRequest): Promise<DocumentContentResponse> {
  return apiFetch(`/api/documents/${documentId}/content`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/** Delete a document */
export async function deleteDocument(documentId: string): Promise<void> {
  return apiFetch(`/api/documents/${documentId}`, {
    method: "DELETE",
  });
}

/** Publish a document (only workspace admin / project lead) */
export async function publishDocument(documentId: string): Promise<DocumentResponse> {
  return apiFetch(`/api/documents/${documentId}/publish`, {
    method: "PATCH",
  });
}

/** Unpublish a document */
export async function unpublishDocument(documentId: string): Promise<DocumentResponse> {
  return apiFetch(`/api/documents/${documentId}/unpublish`, {
    method: "PATCH",
  });
}

/** Get version history for a document */
export async function getDocumentVersions(documentId: string): Promise<DocumentVersionResponse[]> {
  return apiFetch(`/api/documents/${documentId}/versions`);
}

/** Get a specific version */
export async function getDocumentVersion(documentId: string, versionId: string): Promise<DocumentVersionResponse> {
  return apiFetch(`/api/documents/${documentId}/versions/${versionId}`);
}

/** Get child documents */
export async function getChildDocuments(documentId: string): Promise<DocumentResponse[]> {
  return apiFetch(`/api/documents/${documentId}/children`);
}

/** Redesign document with AI */
export async function redesignDocumentWithAi(title: string, content: string): Promise<{ html: string }> {
  return apiFetch(`/api/documents/redesign`, {
    method: "POST",
    body: JSON.stringify({ title, content }),
  });
}
