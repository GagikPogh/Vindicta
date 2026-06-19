"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { GitBranch, Maximize2, ZoomIn } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import type { GraphResponse } from "@/lib/types";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

const NODE_COLORS: Record<string, string> = {
  person: "#8b7cf6",
  organization: "#38bdf8",
  financial: "#fbbf24",
  device: "#34d399",
  location: "#f472b6",
  unknown: "#94a3b8",
};

export default function GraphPageClient() {
  const searchParams = useSearchParams();
  const entityParam = searchParams.get("entity");

  const [graphData, setGraphData] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [depth, setDepth] = useState("2");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = entityParam
          ? await api.graph.getEntity(entityParam, parseInt(depth))
          : await api.graph.getFull();
        setGraphData(data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load graph");
        setGraphData({ nodes: [], edges: [] });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [entityParam, depth]);

  const forceData = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] };
    return {
      nodes: graphData.nodes.map((n) => ({
        id: n.id,
        name: n.name,
        type: n.type,
        val: n.type === "organization" ? 8 : 5,
      })),
      links: graphData.edges.map((e) => ({
        source: e.source,
        target: e.target,
        type: e.type,
      })),
    };
  }, [graphData]);

  const selectedNodeData = graphData?.nodes.find((n) => n.id === selectedNode);

  return (
    <AppShell>
      <div className="space-y-4 max-w-7xl mx-auto">
        <PageHeader
          title="Relationship Graph"
          description="Interactive network visualization of entity connections"
          action={
            <Select value={depth} onValueChange={(v) => v && setDepth(v)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Depth" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Depth 1</SelectItem>
                <SelectItem value="2">Depth 2</SelectItem>
                <SelectItem value="3">Depth 3</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        <div className="grid lg:grid-cols-4 gap-4">
          <GlassCard className="lg:col-span-3 p-0 overflow-hidden min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : forceData.nodes.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                <GitBranch className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground text-center">
                  No graph data available. Add entities to investigations or use demo data.
                </p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-[400px] sm:h-[500px] lg:h-[600px]"
              >
                <ForceGraph2D
                  graphData={forceData}
                  nodeLabel="name"
                  nodeColor={(node) => NODE_COLORS[(node as { type: string }).type] || NODE_COLORS.unknown}
                  linkLabel="type"
                  linkColor={() => "oklch(1 0 0 / 15%)"}
                  linkDirectionalParticles={2}
                  linkDirectionalParticleWidth={2}
                  backgroundColor="transparent"
                  onNodeClick={(node) => setSelectedNode((node as { id: string }).id)}
                  nodeCanvasObject={(node, ctx, globalScale) => {
                    const label = (node as { name: string }).name;
                    const fontSize = 12 / globalScale;
                    const nodeSize = (node as { val: number }).val;
                    const color = NODE_COLORS[(node as { type: string }).type] || NODE_COLORS.unknown;

                    ctx.beginPath();
                    ctx.arc(node.x!, node.y!, nodeSize, 0, 2 * Math.PI);
                    ctx.fillStyle = color;
                    ctx.fill();

                    if (globalScale > 0.8) {
                      ctx.font = `${fontSize}px Sans-Serif`;
                      ctx.textAlign = "center";
                      ctx.textBaseline = "middle";
                      ctx.fillStyle = "oklch(0.98 0.005 265)";
                      ctx.fillText(label, node.x!, node.y! + nodeSize + fontSize);
                    }
                  }}
                />
              </motion.div>
            )}
          </GlassCard>

          <GlassCard className="p-4 sm:p-5 h-fit">
            <h3 className="text-sm font-semibold mb-3">Node Details</h3>
            {selectedNodeData ? (
              <motion.div
                key={selectedNodeData.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-3"
              >
                <div>
                  <p className="font-medium">{selectedNodeData.name}</p>
                  <Badge className="mt-1 text-[10px] capitalize">{selectedNodeData.type}</Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>ID: {selectedNodeData.id}</p>
                  {Object.entries(selectedNodeData.properties).slice(0, 5).map(([key, value]) => (
                    <p key={key}>{key}: {String(value)}</p>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <ZoomIn className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Maximize2 className="h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Click a node to view details
              </p>
            )}

            <div className="mt-6 pt-4 border-t border-glass-border">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Legend</h4>
              <div className="space-y-1.5">
                {Object.entries(NODE_COLORS).filter(([k]) => k !== "unknown").map(([type, color]) => (
                  <div key={type} className="flex items-center gap-2 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                    <span className="capitalize">{type}</span>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>

        {graphData && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground justify-center">
            <span>{graphData.nodes.length} nodes</span>
            <span>{graphData.edges.length} relationships</span>
          </div>
        )}
      </div>
    </AppShell>
  );
}
