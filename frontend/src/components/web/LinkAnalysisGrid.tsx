"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Cloud,
  CloudOff,
  Link2,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { GraphHUD } from "@/components/web/graph-hud";
import { WebToolbar } from "@/components/web/web-toolbar";
import { paintLink, paintNode, useNodeRipples } from "@/lib/graph-paint";
import { getWebMessages, WEB_NODE_TYPES } from "@/lib/i18n/web";
import { NODE_TYPE_CONFIG, useWebStore } from "@/stores/web-store";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

const EN = getWebMessages("en");

interface ForceNode {
  id: string;
  name: string;
  label: string;
  type: string;
  node_type: string;
  color: string;
  val: number;
  weight: number;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

const SYNC_DEBOUNCE_MS = 2000;
const POLL_INTERVAL_MS = 15000;
const PULL_RESUME_MS = 500;

export function LinkAnalysisGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ripplesDrawnRef = useRef(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [, setAnimTick] = useState(0);

  const {
    web,
    nodes,
    edges,
    isLoading,
    loadError,
    selectedNodeId,
    linkSourceId,
    syncStatus,
    dirty,
    isDragging,
    loadWeb,
    pullSync,
    pushSync,
    setSelectedNode,
    setLinkSource,
    setDragging,
    addEdge,
    updateNode,
    deleteNode,
    updateNodePosition,
    updateNodePositionLive,
    deleteEdge,
  } = useWebStore();

  const [search, setSearch] = useState("");
  const { ripples, addRipple } = useNodeRipples();

  useEffect(() => {
    let frameId = 0;
    const loop = () => {
      ripplesDrawnRef.current = false;
      setAnimTick((n) => n + 1);
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isLoading, loadError]);

  useEffect(() => {
    loadWeb();
  }, [loadWeb]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!useWebStore.getState().isDragging) {
        pullSync();
      }
    }, POLL_INTERVAL_MS);

    const onFocus = () => {
      if (!useWebStore.getState().isDragging) pullSync();
    };

    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [pullSync]);

  useEffect(() => {
    if (!dirty || isDragging) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      pushSync();
    }, SYNC_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [dirty, nodes, edges, pushSync, isDragging]);

  const forceData = useMemo(() => {
    const filtered = search
      ? nodes.filter((n) => n.label.toLowerCase().includes(search.toLowerCase()))
      : nodes;
    const ids = new Set(filtered.map((n) => n.id));

    return {
      nodes: nodes.map((n) => {
        const config = NODE_TYPE_CONFIG[n.node_type] || NODE_TYPE_CONFIG.person;
        const dimmed = Boolean(search && !ids.has(n.id));
        const mass = n.node_type === "organization" ? 10 : 7;

        return {
          id: n.id,
          name: n.label,
          label: n.label,
          type: n.node_type,
          node_type: n.node_type,
          color: dimmed ? "#334155" : (n.color || config.color),
          val: mass,
          weight: mass,
          x: n.x,
          y: n.y,
          fx: n.is_pinned ? n.x : undefined,
          fy: n.is_pinned ? n.y : undefined,
        } satisfies ForceNode;
      }),
      links: edges.map((e) => ({
        id: e.id,
        source: e.source_id,
        target: e.target_id,
        label: e.label,
        type: e.edge_type,
      })),
    };
  }, [nodes, edges, search]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const connectedEdges = edges.filter(
    (e) => e.source_id === selectedNodeId || e.target_id === selectedNodeId
  );

  const handleNodeClick = useCallback(
    (node: { id: string; x?: number; y?: number }) => {
      addRipple(node as ForceNode & { x: number; y: number });

      if (linkSourceId) {
        if (linkSourceId !== node.id) {
          addEdge(linkSourceId, node.id, EN.edgeTypes.related_to, "related_to");
          toast.success(EN.linkCreated);
        }
        setLinkSource(null);
      } else {
        setSelectedNode(node.id);
      }
    },
    [linkSourceId, addEdge, setLinkSource, setSelectedNode, addRipple]
  );

  const handleDragStart = useCallback(() => {
    if (dragEndTimerRef.current) clearTimeout(dragEndTimerRef.current);
    setDragging(true);
  }, [setDragging]);

  const handleNodeDrag = useCallback(
    (node: { id: string; x?: number; y?: number; fx?: number; fy?: number }) => {
      handleDragStart();
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      node.fx = x;
      node.fy = y;
      updateNodePositionLive(node.id, x, y);
    },
    [handleDragStart, updateNodePositionLive]
  );

  const handleDragEnd = useCallback(
    (node: { id: string; x?: number; y?: number }) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      updateNodePosition(node.id, x, y);
      setDragging(false);

      dragEndTimerRef.current = setTimeout(() => {
        useWebStore.setState({ pullPaused: false });
        pullSync();
      }, PULL_RESUME_MS);
    },
    [updateNodePosition, setDragging, pullSync]
  );

  const syncIcon = () => {
    switch (syncStatus) {
      case "saving":
      case "syncing":
        return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
      case "saved":
        return <Cloud className="h-3.5 w-3.5 text-chart-3" />;
      case "error":
      case "conflict":
        return <CloudOff className="h-3.5 w-3.5 text-destructive" />;
      default:
        return <Cloud className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const syncLabel = () => {
    switch (syncStatus) {
      case "saving":
        return EN.syncSaving;
      case "syncing":
        return EN.syncSyncing;
      case "saved":
        return EN.syncSaved;
      case "conflict":
        return EN.syncConflict;
      case "error":
        return EN.syncError;
      default:
        return dirty ? EN.syncDirty : EN.syncIdle;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center bg-graphite-950/40">
        <Loader2 className="h-8 w-8 animate-spin text-vindicta-red" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-4">
        <CloudOff className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">{EN.loadError}</p>
        <p className="max-w-sm text-center text-xs text-muted-foreground/70">{loadError}</p>
        <Button onClick={() => loadWeb()}>{EN.retry}</Button>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100dvh-8rem)] bg-graphite-950 lg:h-[calc(100dvh-6rem)]">
      <GraphHUD
        nodeCount={nodes.length}
        edgeCount={edges.length}
        label="LINK ANALYSIS"
      />

      <GlassCard className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center gap-2 p-2 sm:p-3">
        <WebToolbar locale="en" />
        <div className="min-w-[120px] flex-1">
          <Input
            placeholder={EN.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 font-mono text-sm"
          />
        </div>
        <Badge variant="outline" className="shrink-0 gap-1.5 font-mono text-xs">
          {syncIcon()}
          {syncLabel()}
        </Badge>
        {linkSourceId && (
          <Badge className="animate-pulse gap-1 bg-vindicta-red/20 font-mono text-vindicta-red">
            <Link2 className="h-3 w-3" />
            {EN.linkTarget}
          </Badge>
        )}
      </GlassCard>

      <div
        ref={containerRef}
        className="absolute inset-0 overflow-hidden rounded-2xl border border-white/5 bg-graphite-950"
      >
        {dimensions.width > 0 && dimensions.height > 0 && (
          <ForceGraph2D
            width={dimensions.width}
            height={dimensions.height}
            graphData={forceData}
            nodeLabel={(n) => (n as ForceNode).label}
            linkLabel="label"
            linkColor={() => "transparent"}
            linkWidth={0}
            backgroundColor="transparent"
            enableNodeDrag
            onNodeClick={(node) =>
              handleNodeClick(node as { id: string; x?: number; y?: number })
            }
            onNodeDrag={(node) =>
              handleNodeDrag(
                node as { id: string; x?: number; y?: number; fx?: number; fy?: number }
              )
            }
            onNodeDragEnd={(node) =>
              handleDragEnd(node as { id: string; x?: number; y?: number })
            }
            onBackgroundClick={() => {
              setSelectedNode(null);
              setLinkSource(null);
            }}
            cooldownTicks={80}
            d3AlphaDecay={0.02}
            linkCanvasObjectMode={() => "replace"}
            linkCanvasObject={(link, ctx) =>
              paintLink(
                link as {
                  source: ForceNode & { x: number; y: number };
                  target: ForceNode & { x: number; y: number };
                },
                ctx
              )
            }
            nodeCanvasObjectMode={() => "replace"}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const n = node as ForceNode & { x: number; y: number };
              const drawRipples = !ripplesDrawnRef.current;
              if (drawRipples) ripplesDrawnRef.current = true;

              paintNode(n, ctx, globalScale, ripples, {
                selected: n.id === selectedNodeId,
                linkSource: n.id === linkSourceId,
                drawRipples,
              });
            }}
          />
        )}
      </div>

      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-20 right-3 bottom-3 z-20 w-72 overflow-hidden sm:w-80"
          >
            <GlassCard strong className="flex h-full flex-col overflow-y-auto p-4">
              <div className="mb-4 flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-vindicta-red">
                    {EN.nodeTypes[selectedNode.node_type as keyof typeof EN.nodeTypes] ??
                      selectedNode.node_type}
                  </span>
                  <p className="mt-1 font-mono text-sm text-cyber-white">{selectedNode.label}</p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => deleteNode(selectedNode.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              <div className="flex-1 space-y-3">
                <div className="space-y-1.5">
                  <Label className="font-mono text-[10px] uppercase tracking-wider">
                    {EN.nameLabel}
                  </Label>
                  <Input
                    value={selectedNode.label}
                    onChange={(e) => updateNode(selectedNode.id, { label: e.target.value })}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-mono text-[10px] uppercase tracking-wider">
                    {EN.description}
                  </Label>
                  <Textarea
                    value={selectedNode.description || ""}
                    onChange={(e) =>
                      updateNode(selectedNode.id, { description: e.target.value })
                    }
                    rows={3}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-mono text-[10px] uppercase tracking-wider">
                    {EN.type}
                  </Label>
                  <Select
                    value={
                      WEB_NODE_TYPES.includes(
                        selectedNode.node_type as (typeof WEB_NODE_TYPES)[number]
                      )
                        ? selectedNode.node_type
                        : "person"
                    }
                    onValueChange={(v) =>
                      v &&
                      updateNode(selectedNode.id, {
                        node_type: v,
                        color: NODE_TYPE_CONFIG[v]?.color,
                      })
                    }
                  >
                    <SelectTrigger className="font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEB_NODE_TYPES.map((key) => (
                        <SelectItem key={key} value={key} className="font-mono">
                          {EN.nodeTypes[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full font-mono text-xs uppercase tracking-wider"
                  variant={linkSourceId === selectedNode.id ? "default" : "outline"}
                  onClick={() =>
                    setLinkSource(linkSourceId === selectedNode.id ? null : selectedNode.id)
                  }
                >
                  <Link2 className="h-4 w-4" />
                  {linkSourceId === selectedNode.id ? EN.cancelLink : EN.createLink}
                </Button>

                {connectedEdges.length > 0 && (
                  <div className="space-y-2 border-t border-glass-border pt-3">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {EN.connections} ({connectedEdges.length})
                    </p>
                    {connectedEdges.map((edge) => {
                      const otherId =
                        edge.source_id === selectedNode.id ? edge.target_id : edge.source_id;
                      const other = nodes.find((n) => n.id === otherId);
                      return (
                        <div
                          key={edge.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-accent/30 p-2 font-mono text-xs"
                        >
                          <span className="truncate">
                            {edge.label} → {other?.label || "UNKNOWN"}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => deleteEdge(edge.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-3 left-3 z-20 flex gap-2">
        <GlassCard className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {EN.nodesCount(nodes.length, edges.length)}
          {web && <span className="ml-2 opacity-60">REV.{web.revision}</span>}
        </GlassCard>
      </div>
    </div>
  );
}
