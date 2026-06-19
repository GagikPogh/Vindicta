"use client";

import { create } from "zustand";

import { api } from "@/lib/api";
import {
  NODE_COLORS,
  NODE_EMOJI,
  WEB_NODE_TYPES,
  type WebNodeType,
} from "@/lib/i18n/web";
import type { InvestigationWeb, WebEdge, WebNode } from "@/lib/types";

export { NODE_EMOJI, NODE_COLORS, WEB_NODE_TYPES, type WebNodeType };

export const NODE_TYPE_CONFIG: Record<
  string,
  { color: string; emoji: string }
> = Object.fromEntries(
  WEB_NODE_TYPES.map((type) => [
    type,
    { color: NODE_COLORS[type], emoji: NODE_EMOJI[type] },
  ])
);

// Legacy DB node types still render on the graph
NODE_TYPE_CONFIG.friend = { color: NODE_COLORS.person, emoji: NODE_EMOJI.person };
NODE_TYPE_CONFIG.suspect = { color: NODE_COLORS.person, emoji: NODE_EMOJI.person };

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
  loadError: string | null;
  dirty: boolean;
  isDragging: boolean;
  pullPaused: boolean;

  loadWeb: () => Promise<void>;
  pullSync: () => Promise<void>;
  pushSync: () => Promise<void>;
  setSelectedNode: (id: string | null) => void;
  setLinkSource: (id: string | null) => void;
  setDragging: (dragging: boolean) => void;
  addNode: (type: string, label: string, x?: number, y?: number) => void;
  updateNode: (id: string, updates: Partial<WebNode>) => void;
  deleteNode: (id: string) => void;
  addEdge: (sourceId: string, targetId: string, label?: string, edgeType?: string) => void;
  updateEdge: (id: string, updates: Partial<WebEdge>) => void;
  deleteEdge: (id: string) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;
  updateNodePositionLive: (id: string, x: number, y: number) => void;
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
  loadError: null,
  dirty: false,
  isDragging: false,
  pullPaused: false,

  loadWeb: async () => {
    set({ isLoading: true, loadError: null });
    try {
      const web = await api.web.getDefault();
      set({
        web,
        nodes: web.nodes,
        edges: web.edges,
        revision: web.revision,
        isLoading: false,
        loadError: null,
        dirty: false,
        deletedNodeIds: [],
        deletedEdgeIds: [],
        syncStatus: "saved",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Load failed";
      set({ isLoading: false, loadError: message, syncStatus: "error" });
    }
  },

  pullSync: async () => {
    const { web, revision, dirty, isDragging, pullPaused } = get();
    if (!web || isDragging || pullPaused) return;
    if (dirty) return;

    set({ syncStatus: "syncing" });
    try {
      const updated = await api.web.get(web.id, revision);
      if (updated.revision > revision) {
        set({
          nodes: updated.nodes,
          edges: updated.edges,
          revision: updated.revision,
          web: updated,
          syncStatus: "saved",
        });
      } else {
        set({ syncStatus: "saved" });
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("304")) {
        set({ syncStatus: "saved" });
        return;
      }
      set({ syncStatus: "idle" });
    }
  },

  pushSync: async () => {
    const state = get();
    if (!state.web || !state.dirty) return;

    const snapshotRevision = state.revision;
    set({ syncStatus: "saving" });

    try {
      const result = await api.web.sync(state.web.id, {
        revision: snapshotRevision,
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

  setDragging: (dragging) =>
    set({ isDragging: dragging, pullPaused: dragging ? true : get().pullPaused }),

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
    set((s) => ({
      nodes: [...s.nodes, node],
      dirty: true,
      selectedNodeId: node.id,
      syncStatus: "idle",
    }));
  },

  updateNode: (id, updates) => {
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      dirty: true,
      syncStatus: "idle",
    }));
  },

  deleteNode: (id) => {
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source_id !== id && e.target_id !== id),
      deletedNodeIds: [...s.deletedNodeIds, id],
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
      dirty: true,
      syncStatus: "idle",
    }));
  },

  addEdge: (sourceId, targetId, label = "related to", edgeType = "related_to") => {
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
    set((s) => ({
      edges: [...s.edges, edge],
      dirty: true,
      linkSourceId: null,
      syncStatus: "idle",
    }));
  },

  updateEdge: (id, updates) => {
    set((s) => ({
      edges: s.edges.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      dirty: true,
      syncStatus: "idle",
    }));
  },

  deleteEdge: (id) => {
    set((s) => ({
      edges: s.edges.filter((e) => e.id !== id),
      deletedEdgeIds: [...s.deletedEdgeIds, id],
      dirty: true,
      syncStatus: "idle",
    }));
  },

  updateNodePosition: (id, x, y) => {
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, x, y, is_pinned: true } : n)),
      dirty: true,
      syncStatus: "idle",
    }));
  },

  updateNodePositionLive: (id, x, y) => {
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
      dirty: true,
      syncStatus: "idle",
    }));
  },

  markDirty: () => set({ dirty: true, syncStatus: "idle" }),
}));
