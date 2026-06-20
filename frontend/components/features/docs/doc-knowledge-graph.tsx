"use client";

import { useMemo } from "react";
import ReactFlow, { Background, Controls, Edge, Handle, Node, NodeProps, Position } from "reactflow";
import "reactflow/dist/style.css";
import { cn } from "@/lib/utils";
import type { DocumentResponse } from "@/lib/api/documents";

const PageNode = ({ data }: NodeProps) => (
  <div className="group relative flex flex-col items-center justify-center">
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full border-2 shadow-lg transition-all",
        data.size === "large" ? "h-9 w-9" : data.size === "medium" ? "h-7 w-7" : "h-5 w-5",
        data.isActive
          ? "border-white bg-white/30 shadow-[0_0_20px_rgba(255,255,255,0.7)] scale-110"
          : data.colorClass || "border-zinc-600 bg-zinc-800 group-hover:border-zinc-400",
      )}
    >
      <Handle type="target" position={Position.Top} className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-1/2 opacity-0" />
      <Handle type="source" position={Position.Bottom} className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-1/2 opacity-0" />
    </div>
    <span
      className={cn(
        "absolute top-full mt-2 rounded-md bg-[#0E0E10]/80 px-2 py-0.5 font-medium whitespace-nowrap backdrop-blur-sm transition-colors",
        data.size === "large"
          ? "text-xs text-zinc-100 font-semibold"
          : "text-[11px] text-zinc-400 group-hover:text-zinc-200",
      )}
    >
      {data.title}
    </span>
  </div>
);

const nodeTypes = { page: PageNode };

type KnowledgeGraphProps = {
  documents: DocumentResponse[];
  activeDocumentId: string;
  onOpenDocument: (documentId: string) => void;
};

export function DocumentKnowledgeGraph({
  documents,
  activeDocumentId,
  onOpenDocument,
}: KnowledgeGraphProps) {
  const { graphNodes, graphEdges, totalPages } = useMemo(() => {
    if (documents.length === 0) {
      return { graphNodes: [] as Node[], graphEdges: [] as Edge[], totalPages: 0 };
    }

    const documentIds = new Set(documents.map((doc) => doc.id));
    const roots = documents.filter((doc) => !doc.parentId || !documentIds.has(doc.parentId));
    const childrenByParent: Record<string, DocumentResponse[]> = {};

    documents.forEach((doc) => {
      if (doc.parentId && documentIds.has(doc.parentId)) {
        (childrenByParent[doc.parentId] ||= []).push(doc);
      }
    });

    const rootColors = [
      "border-orange-500 bg-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.4)] text-orange-400",
      "border-rose-500 bg-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.4)] text-rose-400",
      "border-emerald-500 bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.4)] text-emerald-400",
      "border-sky-500 bg-sky-500/20 shadow-[0_0_15px_rgba(14,165,233,0.4)] text-sky-400",
      "border-violet-500 bg-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.4)] text-violet-400",
      "border-amber-500 bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.4)] text-amber-400",
    ];

    const clusterColor: Record<string, string> = {};
    roots.forEach((root, idx) => {
      clusterColor[root.id] = rootColors[idx % rootColors.length];
    });

    const getRootAncestorId = (docId: string): string => {
      let current = documents.find((doc) => doc.id === docId);
      while (current && current.parentId && documentIds.has(current.parentId)) {
        current = documents.find((doc) => doc.id === current?.parentId);
      }
      return current ? current.id : docId;
    };

    documents.forEach((doc) => {
      const rootId = getRootAncestorId(doc.id);
      clusterColor[doc.id] = clusterColor[rootId] || rootColors[0];
    });

    const simEdges: { source: string; target: string }[] = [];
    documents
      .filter((doc) => doc.parentId && documentIds.has(doc.parentId))
      .forEach((doc) => {
        simEdges.push({ source: doc.parentId!, target: doc.id });
      });
    documents.forEach((doc) => {
      doc.linkedDocIds?.forEach((targetId) => {
        if (documentIds.has(targetId)) {
          simEdges.push({ source: doc.id, target: targetId });
        }
      });
    });

    const nodesList = documents.map((doc, index) => {
      const angle = (index / documents.length) * 2 * Math.PI;
      const initialRadius = 150 + (index % 3) * 50;
      return {
        id: doc.id,
        x: 400 + initialRadius * Math.cos(angle),
        y: 300 + initialRadius * Math.sin(angle),
        vx: 0,
        vy: 0,
        size: !doc.parentId || !documentIds.has(doc.parentId)
          ? "large"
          : (childrenByParent[doc.id]?.length ?? 0) > 0
            ? "medium"
            : "normal",
      };
    });

    const nodesMap = new Map(nodesList.map((node) => [node.id, node]));
    const spring = 0.15;
    const repulse = 120000;
    const centerGravity = 0.08;
    const idealLength = 130;

    for (let step = 0; step < 200; step++) {
      for (let i = 0; i < nodesList.length; i++) {
        const n1 = nodesList[i];
        for (let j = i + 1; j < nodesList.length; j++) {
          const n2 = nodesList[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const distSq = dx * dx + dy * dy + 0.1;
          const dist = Math.sqrt(distSq);
          if (dist < 500) {
            const force = repulse / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            n1.vx += fx;
            n1.vy += fy;
            n2.vx -= fx;
            n2.vy -= fy;
          }
        }
      }

      simEdges.forEach((edge) => {
        const n1 = nodesMap.get(edge.source);
        const n2 = nodesMap.get(edge.target);
        if (n1 && n2) {
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
          const force = spring * (dist - idealLength);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          n1.vx -= fx;
          n1.vy -= fy;
          n2.vx += fx;
          n2.vy += fy;
        }
      });

      nodesList.forEach((node) => {
        node.vx -= (node.x - 400) * centerGravity;
        node.vy -= (node.y - 300) * centerGravity;
        node.x += node.vx * 0.4;
        node.y += node.vy * 0.4;
        node.vx *= 0.65;
        node.vy *= 0.65;
      });
    }

    const positions: Record<string, { x: number; y: number }> = {};
    nodesList.forEach((node) => {
      positions[node.id] = { x: node.x, y: node.y };
    });

    const nodes: Node[] = documents.map((doc) => {
      const pos = positions[doc.id] || { x: 400, y: 300 };
      const size = !doc.parentId || !documentIds.has(doc.parentId)
        ? "large"
        : (childrenByParent[doc.id]?.length ?? 0) > 0
          ? "medium"
          : "normal";

      return {
        id: doc.id,
        type: "page",
        position: pos,
        data: {
          title: doc.title,
          isActive: doc.id === activeDocumentId,
          size,
          colorClass: clusterColor[doc.id],
        },
      };
    });

    const getStrokeColor = (docId: string) => {
      const colorCls = clusterColor[docId] || "";
      if (colorCls.includes("orange")) return "#f97316";
      if (colorCls.includes("rose")) return "#f43f5e";
      if (colorCls.includes("emerald")) return "#10b981";
      if (colorCls.includes("sky")) return "#0ea5e9";
      if (colorCls.includes("violet")) return "#8b5cf6";
      if (colorCls.includes("amber")) return "#f59e0b";
      return "#4b5563";
    };

    const edges: Edge[] = [];
    documents
      .filter((doc) => doc.parentId && documentIds.has(doc.parentId))
      .forEach((doc) => {
        edges.push({
          id: `edge-hierarchy-${doc.parentId}-${doc.id}`,
          source: doc.parentId!,
          target: doc.id,
          animated: true,
          style: {
            stroke: getStrokeColor(doc.id),
            strokeWidth: doc.id === activeDocumentId || doc.parentId === activeDocumentId ? 2.5 : 1.5,
            opacity: doc.id === activeDocumentId || doc.parentId === activeDocumentId ? 0.95 : 0.6,
          },
        });
      });

    documents.forEach((doc) => {
      doc.linkedDocIds?.forEach((targetId) => {
        if (documentIds.has(targetId)) {
          edges.push({
            id: `edge-link-${doc.id}-${targetId}`,
            source: doc.id,
            target: targetId,
            animated: true,
            style: {
              stroke: "#38bdf8",
              strokeWidth: doc.id === activeDocumentId || targetId === activeDocumentId ? 2.2 : 1.2,
              strokeDasharray: "5,5",
              opacity: doc.id === activeDocumentId || targetId === activeDocumentId ? 0.95 : 0.5,
            },
          });
        }
      });
    });

    return { graphNodes: nodes, graphEdges: edges, totalPages: documents.length };
  }, [documents, activeDocumentId]);

  if (totalPages === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-zinc-500">
        No linked pages to display yet.
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={graphNodes}
      edges={graphEdges}
      nodeTypes={nodeTypes}
      onNodeClick={(_, node) => onOpenDocument(node.id)}
      fitView
    >
      <Background color="#18181B" gap={20} />
      <Controls className="border-zinc-700 bg-zinc-800 fill-zinc-400" />
    </ReactFlow>
  );
}
