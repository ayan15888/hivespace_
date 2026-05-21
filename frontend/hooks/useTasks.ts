"use client";

import { useEffect, useCallback } from "react";
import { useTaskStore } from "@/store/taskStore";
import { useParams } from "next/navigation";

export function useTasks(projectId?: string) {
  const params = useParams();
  const resolvedProjectId = projectId || (params?.projectSlug as string);
  
  const { tasks, loading, error, fetchTasks } = useTaskStore();

  const refresh = useCallback(() => {
    return fetchTasks(resolvedProjectId);
  }, [fetchTasks, resolvedProjectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { tasks, loading, error, refresh };
}
