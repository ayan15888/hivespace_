"use client";

import { useState, useEffect, useCallback } from "react";
import { getTasksByProject, TaskResponse } from "@/lib/api/tasks";
import { useParams } from "next/navigation";

export function useTasks() {
  const params = useParams();
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectId = params?.projectSlug as string;

  const fetchTasks = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      const data = await getTasksByProject(projectId);
      setTasks(data);
      setError(null);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, error, refresh: fetchTasks };
}
