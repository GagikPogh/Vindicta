"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cloud,
  CloudOff,
  Link2,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WebToolbar } from "@/components/web/web-toolbar";
import {
  detectWebLocale,
  getWebMessages,
  nodeTypeLabel,
  WEB_NODE_TYPES,
} from "@/lib/i18n/web";
import { NODE_TYPE_CONFIG, useWebStore } from "@/stores/web-store";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

interface ForceNode {
  id: string;
  name: string;
  type: string;
  color: string;
  val: number;
  fx?: number;
  fy?: number;
  emoji: string;
}

export function DetectiveCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [locale] = useState(detectWebLocale);
  const t = useMemo(() => getWebMessages(locale), [locale]);

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
    deleteEdge,
  } = useWebStore();

  const [search, setSearch] = useState("");

  useEffect(() => {
    loadWeb();
  }, [loadWeb]);

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
    const interval = setInterval(() => pullSync(), 15000);
    const onFocus = () => pullSync();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [pullSync]);

  useEffect(() => {
    if (!dirty || isDragging) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => pushSync(), 2000);
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
        const dimmed = search && !ids.has(n.id);
        return {
          id: n.id,
          name: n.label,
          type: n.node_type,
          color: dimmed ? "#334155" : (n.color || config.color),
          val: n.node_type === "organization" ? 10 : 7,
          fx: n.is_pinned ? n.x : undefined,
          fy: n.is_pinned ? n.y : undefined,
          emoji: config.emoji,
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
    (node: { id: string }) => {
      if (linkSourceId) {
        if (linkSourceId !== node.id) {
          addEdge(linkSourceId, node.id, t.edgeTypes.related_to, "related_to");
          toast.success(t.linkCreated);
        }
        setLinkSource(null);
      } else {
        setSelectedNode(node.id);
      }
    },
    [linkSourceId, addEdge, setLinkSource, setSelectedNode, t]
  );

  const handleDragStart = useCallback(() => {
    if (dragEndTimerRef.current) clearTimeout(dragEndTimerRef.current);
    setDragging(true);
  }, [setDragging]);

  const handleDragEnd = useCallback(
    (node: { id: string; x?: number; y?: number }) => {
      updateNodePosition(node.id, node.x ?? 0, node.y ?? 0);
      setDragging(false);
      dragEndTimerRef.current = setTimeout(() => {
        useWebStore.setState({ pullPaused: false });
      }, 3000);
    },
    [updateNodePosition, setDragging]
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
      case "saving": return t.syncSaving;
      case "syncing": return t.syncSyncing;
      case "saved": return t.syncSaved;
      case "conflict": return t.syncConflict;
      case "error": return t.syncError;
      default: return dirty ? t.syncDirty : t.syncIdle;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-[70vh]">
        <CloudOff className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">{t.loadError}</p>
        <p className="text-xs text-muted-foreground/70 max-w-sm text-center">{loadError}</p>
        <Button onClick={() => loadWeb()}>{t.retry}</Button>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100dvh-8rem)] lg:h-[calc(100dvh-6rem)]">
      <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none opacity-30">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="webGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="oklch(0.72 0.19 265 / 40%)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          <circle cx="50%" cy="50%" r="40%" fill="url(#webGlow)" />
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const x2 = 50 + Math.cos(angle) * 45;
            const y2 = 50 + Math.sin(angle) * 45;
            return (
              <line
                key={`spoke-${i}`}
                x1="50%" y1="50%"
                x2={`${x2}%`} y2={`${y2}%`}
                stroke="oklch(0.72 0.19 265 / 20%)"
                strokeWidth="0.5"
              />
            );
          })}
          {[15, 30, 45].map((r) => (
            <circle
              key={r}
              cx="50%" cy="50%" r={`${r}%`}
              fill="none"
              stroke="oklch(0.72 0.19 265 / 15%)"
              strokeWidth="0.5"
            />
          ))}
        </svg>
      </div>

      <GlassCard className="absolute top-3 left-3 right-3 z-20 p-2 sm:p-3 flex flex-wrap items-center gap-2">
        <WebToolbar locale={locale} />
        <div className="flex-1 min-w-[120px]">
          <Input
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <Badge variant="outline" className="gap-1.5 text-xs shrink-0">
          {syncIcon()}
          {syncLabel()}
        </Badge>
        {linkSourceId && (
          <Badge className="gap-1 bg-primary/20 text-primary animate-pulse">
            <Link2 className="h-3 w-3" />
            {t.linkTarget}
          </Badge>
        )}
      </GlassCard>

      <div ref={containerRef} className="absolute inset-0 rounded-2xl overflow-hidden">
        {dimensions.width > 0 && dimensions.height > 0 && (
          <ForceGraph2D
            width={dimensions.width}
            height={dimensions.height}
            graphData={forceData}
            nodeLabel={(n) => `${(n as ForceNode).emoji} ${(n as ForceNode).name}`}
            linkLabel="label"
            linkColor={() => "oklch(0.72 0.19 265 / 35%)"}
            linkWidth={1.5}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={2}
            linkDirectionalParticleColor={() => "oklch(0.72 0.19 265)"}
            backgroundColor="transparent"
            enableNodeDrag
            onNodeClick={(node) => handleNodeClick(node as { id: string })}
            onNodeDrag={(node) => {
              handleDragStart();
              const n = node as { id: string; fx?: number; fy?: number; x?: number; y?: number };
              n.fx = n.x;
              n.fy = n.y;
            }}
            onNodeDragEnd={(node) => handleDragEnd(node as { id: string; x?: number; y?: number })}
            onBackgroundClick={() => {
              setSelectedNode(null);
              setLinkSource(null);
            }}
            cooldownTicks={80}
            d3AlphaDecay={0.02}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const n = node as ForceNode & { x: number; y: number };
              const isSelected = n.id === selectedNodeId;
              const isLinkSource = n.id === linkSourceId;
              const size = n.val;

              if (isSelected || isLinkSource) {
                ctx.beginPath();
                ctx.arc(n.x, n.y, size + 6, 0, 2 * Math.PI);
                ctx.fillStyle = isLinkSource ? "oklch(0.72 0.19 265 / 30%)" : "oklch(0.72 0.19 265 / 25%)";
                ctx.fill();
                ctx.strokeStyle = "oklch(0.72 0.19 265 / 60%)";
                ctx.lineWidth = 2 / globalScale;
                ctx.stroke();
              }

              ctx.beginPath();
              ctx.arc(n.x, n.y, size, 0, 2 * Math.PI);
              ctx.fillStyle = n.color;
              ctx.shadowColor = n.color;
              ctx.shadowBlur = isSelected ? 20 : 8;
              ctx.fill();
              ctx.shadowBlur = 0;

              if (globalScale > 0.5) {
                ctx.font = `${Math.max(10, 14 / globalScale)}px Sans-Serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "oklch(0.98 0.005 265)";
                ctx.fillText(n.emoji, n.x, n.y);

                ctx.font = `${Math.max(8, 11 / globalScale)}px Sans-Serif`;
                ctx.fillText(n.name, n.x, n.y + size + 12 / globalScale);
              }
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
            className="absolute top-20 right-3 bottom-3 w-72 sm:w-80 z-20 overflow-hidden"
          >
            <GlassCard strong className="h-full flex flex-col p-4 overflow-y-auto">
              <div className="flex items-start justify-between gap-2 mb-4">
                <div>
                  <span className="text-2xl">{NODE_TYPE_CONFIG[selectedNode.node_type]?.emoji}</span>
                  <Badge className="ml-2 text-[10px] capitalize">
                    {nodeTypeLabel(selectedNode.node_type, t)}
                  </Badge>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => deleteNode(selectedNode.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              <div className="space-y-3 flex-1">
                <div className="space-y-1.5">
                  <Label>{t.nameLabel}</Label>
                  <Input
                    value={selectedNode.label}
                    onChange={(e) => updateNode(selectedNode.id, { label: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.description}</Label>
                  <Textarea
                    value={selectedNode.description || ""}
                    onChange={(e) => updateNode(selectedNode.id, { description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.type}</Label>
                  <Select
                    value={WEB_NODE_TYPES.includes(selectedNode.node_type as (typeof WEB_NODE_TYPES)[number])
                      ? selectedNode.node_type
                      : "person"}
                    onValueChange={(v) => v && updateNode(selectedNode.id, {
                      node_type: v,
                      color: NODE_TYPE_CONFIG[v]?.color,
                    })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WEB_NODE_TYPES.map((key) => (
                        <SelectItem key={key} value={key}>
                          {NODE_TYPE_CONFIG[key].emoji} {t.nodeTypes[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full"
                  variant={linkSourceId === selectedNode.id ? "default" : "outline"}
                  onClick={() => setLinkSource(linkSourceId === selectedNode.id ? null : selectedNode.id)}
                >
                  <Link2 className="h-4 w-4" />
                  {linkSourceId === selectedNode.id ? t.cancelLink : t.createLink}
                </Button>

                {connectedEdges.length > 0 && (
                  <div className="pt-3 border-t border-glass-border space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t.connections} ({connectedEdges.length})
                    </p>
                    {connectedEdges.map((edge) => {
                      const otherId = edge.source_id === selectedNode.id ? edge.target_id : edge.source_id;
                      const other = nodes.find((n) => n.id === otherId);
                      return (
                        <div key={edge.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-accent/30 text-xs">
                          <span className="truncate">
                            {edge.label} → {other?.label || "?"}
                          </span>
                          <Button variant="ghost" size="icon-sm" onClick={() => deleteEdge(edge.id)}>
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
        <GlassCard className="px-3 py-2 text-xs text-muted-foreground">
          {t.nodesCount(nodes.length, edges.length)}
          {web && <span className="ml-2 opacity-60">rev.{web.revision}</span>}
        </GlassCard>
      </div>
    </div>
  );
}
