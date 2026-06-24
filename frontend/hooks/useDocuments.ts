"use client";

import { useEffect, useCallback } from "react";
import { useDocumentStore } from "@/store/documentStore";

/**
 * Hook to fetch and manage documents for a given project.
 * Automatically re-fetches when projectId changes.
 */
export function useDocuments(projectId: string | null) {
  const {
    documents,
    loading,
    error,
    activeDocument,
    activeDocLoading,
    versions,
    versionsLoading,
    fetchDocuments,
    fetchDocumentContent,
    fetchVersions,
    createDoc,
    updateDoc,
    saveContent,
    deleteDoc,
    publishDoc,
    unpublishDoc,
    clearActive,
  } = useDocumentStore();

  const refreshDocuments = useCallback(async () => {
    if (!projectId) return;
    await fetchDocuments(projectId);
  }, [projectId, fetchDocuments]);

  useEffect(() => {
    refreshDocuments();
  }, [refreshDocuments]);

  return {
    documents,
    loading,
    error,
    activeDocument,
    activeDocLoading,
    versions,
    versionsLoading,
    refreshDocuments,
    fetchDocumentContent,
    fetchVersions,
    createDoc,
    updateDoc,
    saveContent,
    deleteDoc,
    publishDoc,
    unpublishDoc,
    clearActive,
  };
}
