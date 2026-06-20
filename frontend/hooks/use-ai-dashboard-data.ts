"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProjects } from "@/hooks/useProjects";
import { getAllTasks, TaskResponse } from "@/lib/api/tasks";
import {
  getDocumentsByProject,
  DocumentResponse,
} from "@/lib/api/documents";
import { getWorkspaceChannels } from "@/lib/api/channels";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { ChannelResponse } from "@/types/messaging";

function sortByUpdatedAt<T extends { updatedAt: string }>(items: T[]) {
  return [...items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function useAiDashboardData() {
  const { projects, loading: projectsLoading } = useProjects();
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);
  const workspaceId = activeWorkspace?.id ?? "";
  const projectMap = useMemo(
    () => new Map(projects.map((project) => [project.id, project] as const)),
    [projects],
  );
  const projectIds = useMemo(() => projects.map((project) => project.id), [projects]);

  const tasksQuery = useQuery<TaskResponse[]>({
    queryKey: ["ai-dashboard", "tasks"],
    queryFn: getAllTasks,
    staleTime: 20_000,
  });

  const docsQuery = useQuery<DocumentResponse[]>({
    queryKey: ["ai-dashboard", "documents", workspaceId, projectIds.join(",")],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      const docs = await Promise.all(
        projectIds.slice(0, 4).map((projectId) =>
          getDocumentsByProject(projectId).catch(() => [] as DocumentResponse[]),
        ),
      );
      return docs.flat();
    },
    enabled: projectIds.length > 0,
    staleTime: 20_000,
  });

  const channelsQuery = useQuery<ChannelResponse[]>({
    queryKey: ["ai-dashboard", "channels", workspaceId],
    queryFn: () => getWorkspaceChannels(workspaceId),
    enabled: !!workspaceId,
    staleTime: 20_000,
  });

  const recentTasks = useMemo(() => {
    const projectTaskIds = new Set(projectIds);
    const scopedTasks = (tasksQuery.data ?? []).filter((task) =>
      projectTaskIds.has(task.projectId),
    );
    return sortByUpdatedAt(scopedTasks).slice(0, 4);
  }, [projectIds, tasksQuery.data]);

  const recentDocuments = useMemo(() => {
    const scopedDocs = (docsQuery.data ?? []).map((doc) => ({
      ...doc,
      projectName: projectMap.get(doc.projectId)?.name ?? "Project",
    }));
    return sortByUpdatedAt(scopedDocs).slice(0, 4);
  }, [docsQuery.data, projectMap]);

  const channels = channelsQuery.data ?? [];
  const primaryChannel = channels.find((channel) => channel.name) ?? channels[0] ?? null;

  return {
    workspaceName: activeWorkspace?.name ?? "Workspace",
    workspaceId,
    projectCount: projects.length,
    projectsLoading,
    tasksLoading: tasksQuery.isLoading,
    documentsLoading: docsQuery.isLoading,
    channelsLoading: channelsQuery.isLoading,
    recentTasks,
    recentDocuments,
    channels,
    primaryChannel,
  };
}
