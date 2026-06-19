"use client";

import { create } from "zustand";

import { api } from "@/lib/api";
import type { InvestigationWeb, WebEdge, WebNode } from "@/lib/types";

export const NODE_TYPE_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  person: { label: "Человек", color: "#8b7cf6", emoji: "👤" },
  friend: { label: "Друг", color: "#a78bfa", emoji: "🤝" },
  event: { label: "Событие", color: "#f472b6", emoji: "📅" },
  phone: { label: "Телефон", color: "#34d399", emoji: "📱" },
  location: { label: "Локация", color: "#38bdf8", emoji: "📍" },
  organization: { label: "Организация", color: "#fbbf24", emoji: "🏢" },
  evidence: { label: "Улика", color: "#fb923c", emoji: "🔍" },
  document: { label: "Документ", color: "#94a3b8", emoji: "📄" },
  suspect: { label: "Подозреваемый", color: "#ef4444", emoji: "🎯" },
  note: { label: "Заметка", color: "#c084fc", emoji: "📝" },
};

export const EDGE_TYPE_LABELS: Record<string, string> = {
  knows: "знает",
  friend_of: "друг",
  related_to: "связан с",
  attended: "присутствовал",
  called: "звонил",
  located_at: "находится в",
  works_at: "работает в",
  owns: "владеет",
  suspected: "подозревает",
  witnessed: "свидетель",
  custom: "связь",
};

type SyncStatus = "idle" | "saving" | "saved" | "syncing" | "conflict" | "error";

interface WebState {
  web: InvestigationWeb | null;
  nodes: WebNode[];
  edges: WebEdge[];
  revision: number;
  selectedNodeId: string | null;
  linkSourceId: string | null;
  deletedNodeIds: string[];
  deletedEdgeIds: string[];
  syncStatus: SyncStatus;
  isLoading: boolean;
  dirty: boolean;

  loadWeb: () => Promise<void>;
  pullSync: () => Promise<void>;
  pushSync: () => Promise<void>;
  setSelectedNode: (id: string | null) => void;
  setLinkSource: (id: string | null) => void;
  addNode: (type: string, label: string, x?: number, y?: number) => void;
  updateNode: (id: string, updates: Partial<WebNode>) => void;
  deleteNode: (id: string) => void;
  addEdge: (sourceId: string, targetId: string, label?: string, edgeType?: string) => void;
  updateEdge: (id: string, updates: Partial<WebEdge>) => void;
  deleteEdge: (id: string) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;
  applyServerWeb: (web: InvestigationWeb) => void;
  markDirty: () => void;
}

function generateId(): string {
  return crypto.randomUUID();
}

export const useWebStore = create<WebState>((set, get) => ({
  web: null,
  nodes: [],
  edges: [],
  revision: 0,
  selectedNodeId: null,
  linkSourceId: null,
  deletedNodeIds: [],
  deletedEdgeIds: [],
  syncStatus: "idle",
  isLoading: true,
  dirty: false,

  loadWeb: async () => {
    set({ isLoading: true });
    try {
      const web = await api.web.getDefault();
      set({
        web,
        nodes: web.nodes,
        edges: web.edges,
        revision: web.revision,
        isLoading: false,
        dirty: false,
        deletedNodeIds: [],
        deletedEdgeIds: [],
      });
    } catch {
      set({ isLoading: false, syncStatus: "error" });
    }
  },

  pullSync: async () => {
    const { web, revision } = get();
    if (!web) return;
    set({ syncStatus: "syncing" });
    try {
      const updated = await api.web.get(web.id);
      if (updated.revision > revision) {
        set({
          nodes: updated.nodes,
          edges: updated.edges,
          revision: updated.revision,
          web: updated,
          syncStatus: "saved",
          dirty: false,
        });
      } else {
        set({ syncStatus: "saved" });
      }
    } catch {
      set({ syncStatus: "idle" });
    }
  },

  pushSync: async () => {
    const state = get();
    if (!state.web || !state.dirty) return;

    set({ syncStatus: "saving" });
    try {
      const result = await api.web.sync(state.web.id, {
        revision: state.revision,
        nodes: state.nodes,
        edges: state.edges,
        deleted_node_ids: state.deletedNodeIds,
        deleted_edge_ids: state.deletedEdgeIds,
      });

      if (result.conflict && result.web) {
        set({
          web: result.web,
          nodes: result.web.nodes,
          edges: result.web.edges,
          revision: result.web.revision,
          syncStatus: "conflict",
          dirty: false,
          deletedNodeIds: [],
          deletedEdgeIds: [],
        });
        return;
      }

      if (result.web) {
        set({
          web: result.web,
          nodes: result.web.nodes,
          edges: result.web.edges,
          revision: result.web.revision,
          syncStatus: "saved",
          dirty: false,
          deletedNodeIds: [],
          deletedEdgeIds: [],
        });
      }
    } catch {
      set({ syncStatus: "error" });
    }
  },

  applyServerWeb: (web) => {
    set({
      web,
      nodes: web.nodes,
      edges: web.edges,
      revision: web.revision,
      dirty: false,
      deletedNodeIds: [],
      deletedEdgeIds: [],
    });
  },

  setSelectedNode: (id) => set({ selectedNodeId: id }),
  setLinkSource: (id) => set({ linkSourceId: id }),

  addNode: (type, label, x = 0, y = 0) => {
    const config = NODE_TYPE_CONFIG[type] || NODE_TYPE_CONFIG.person;
    const node: WebNode = {
      id: generateId(),
      node_type: type,
      label,
      x: x + (Math.random() - 0.5) * 80,
      y: y + (Math.random() - 0.5) * 80,
      color: config.color,
      properties: {},
      is_pinned: false,
    };
    set((s) => ({ nodes: [...s.nodes, node], dirty: true, selectedNodeId: node.id }));
    setTimeout(() => get().pushSync(), 100);
  },

  updateNode: (id, updates) => {
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      dirty: true,
    }));
  },

  deleteNode: (id) => {
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source_id !== id && e.target_id !== id),
      deletedNodeIds: [...s.deletedNodeIds, id],
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
      dirty: true,
    }));
    setTimeout(() => get().pushSync(), 100);
  },

  addEdge: (sourceId, targetId, label = "связан с", edgeType = "custom") => {
    if (sourceId === targetId) return;
    const exists = get().edges.some(
      (e) => e.source_id === sourceId && e.target_id === targetId && e.label === label
    );
    if (exists) return;

    const edge: WebEdge = {
      id: generateId(),
      source_id: sourceId,
      target_id: targetId,
      label,
      edge_type: edgeType,
      properties: {},
      strength: 1,
    };
    set((s) => ({ edges: [...s.edges, edge], dirty: true, linkSourceId: null }));
    setTimeout(() => get().pushSync(), 100);
  },

  updateEdge: (id, updates) => {
    set((s) => ({
      edges: s.edges.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      dirty: true,
    }));
  },

  deleteEdge: (id) => {
    set((s) => ({
      edges: s.edges.filter((e) => e.id !== id),
      deletedEdgeIds: [...s.deletedEdgeIds, id],
      dirty: true,
    }));
    setTimeout(() => get().pushSync(), 100);
  },

  updateNodePosition: (id, x, y) => {
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, x, y, is_pinned: true } : n)),
      dirty: true,
    }));
  },

  markDirty: () => set({ dirty: true }),
}));
