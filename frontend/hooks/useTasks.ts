"use client";

import { useEffect, useCallback } from "react";
import { useTaskStore } from "@/store/taskStore";
import { useParams } from "next/navigation";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useTasks(projectId?: string) {
  const params = useParams();
  const resolvedProjectId = projectId || (params?.projectSlug as string);
  
  const { tasks, loading, error, fetchTasks } = useTaskStore();

  const refresh = useCallback(() => {
    const isUuid = UUID_REGEX.test(resolvedProjectId || "");
    if (isUuid) {
      return fetchTasks(resolvedProjectId);
    } else if (!resolvedProjectId) {
      return fetchTasks();
    }
  }, [fetchTasks, resolvedProjectId]);

  useEffect(() => {
    const isUuid = UUID_REGEX.test(resolvedProjectId || "");
    if (isUuid || !resolvedProjectId) {
      refresh();
    }
  }, [refresh, resolvedProjectId]);

  return { tasks, loading, error, refresh };
}
