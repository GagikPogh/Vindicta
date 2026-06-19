import { useCallback, useRef } from "react";

export const GRAPH_THEME = {
  bg: "#0D0D11",
  bgRing: "#1A1A24",
  accent: "#FF0033",
  accentDim: "#3a0008",
  label: "#E8E8F0",
  labelMute: "#8A8A99",
  linkBase: "rgba(255,0,51,0.14)",
  linkDash: "rgba(255,0,51,0.28)",
  particle: "#FF335C",
} as const;

export const NODE_TYPE_COLORS: Record<string, string> = {
  person: "#FF335C",
  event: "#FF8A65",
  location: "#7CFFB2",
  organization: "#FFD166",
  evidence: "#E8E8F0",
  fact: "#E8E8F0",
  document: "#8A8A99",
  phone: "#FF0033",
  note: "#B8B8C8",
  friend: "#FF335C",
  suspect: "#FF335C",
  default: "#FF0033",
};

export const NODE_TYPE_LABELS: Record<string, string> = {
  person: "Person",
  event: "Event",
  location: "Location",
  organization: "Organization",
  evidence: "Fact/Evidence",
  fact: "Fact/Evidence",
  document: "Document",
  phone: "Phone",
  note: "Note",
};

interface Ripple {
  x: number;
  y: number;
  start: number;
}

export interface PaintNode {
  id?: string | number;
  x: number;
  y: number;
  label?: string;
  name?: string;
  type?: string;
  node_type?: string;
  weight?: number;
  val?: number;
  color?: string;
}

export interface PaintLink {
  source: PaintNode;
  target: PaintNode;
}

const RIPPLE_DURATION = 1100;
const LABEL_ZOOM_THRESHOLD = 1.5;
const FONT_STACK = '"JetBrains Mono", var(--font-jetbrains), ui-monospace, monospace';

export function hashNodeId(id: string | number): number {
  const str = String(id);
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function useNodeRipples() {
  const ripples = useRef<Ripple[]>([]);

  const addRipple = useCallback((node: PaintNode) => {
    if (node?.x == null || node?.y == null) return;
    ripples.current.push({ x: node.x, y: node.y, start: performance.now() });
    if (ripples.current.length > 16) ripples.current.shift();
  }, []);

  return { ripples, addRipple };
}

function nodeRadius(node: PaintNode): number {
  const w = node.weight ?? node.val ?? 7;
  return 4.5 + w * 0.45;
}

function resolveNodeColor(node: PaintNode): string {
  if (node.color && node.color !== "#334155") return node.color;
  const type = node.type ?? node.node_type ?? "";
  return NODE_TYPE_COLORS[type] ?? NODE_TYPE_COLORS.default;
}

function resolveNodeType(node: PaintNode): string {
  const type = node.type ?? node.node_type ?? "person";
  return NODE_TYPE_LABELS[type] ?? type;
}

export function paintRipples(
  ripplesRef: React.RefObject<Ripple[]>,
  ctx: CanvasRenderingContext2D,
  globalScale: number
) {
  if (!ripplesRef.current?.length) return;

  const now = performance.now();
  ripplesRef.current = ripplesRef.current.filter((rp) => now - rp.start < RIPPLE_DURATION);

  for (const rp of ripplesRef.current) {
    const elapsed = (now - rp.start) / RIPPLE_DURATION;
    const radius = 6 + elapsed * 42;
    const alpha = (1 - elapsed) * 0.75;

    ctx.save();
    ctx.strokeStyle = `rgba(255,0,51,${alpha})`;
    ctx.lineWidth = 1.25 / globalScale;
    ctx.beginPath();
    ctx.arc(rp.x, rp.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255,0,51,${alpha * 0.35})`;
    ctx.lineWidth = 0.75 / globalScale;
    ctx.beginPath();
    ctx.arc(rp.x, rp.y, radius * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export function paintNode(
  node: PaintNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  ripplesRef: React.RefObject<Ripple[]>,
  options?: { selected?: boolean; linkSource?: boolean; drawRipples?: boolean }
) {
  const r = nodeRadius(node);
  const color = resolveNodeColor(node);
  const seed = node.id != null ? hashNodeId(node.id) : 0;
  const t = performance.now() / 1000;
  const freq = 1.4 + (seed % 7) * 0.11;
  const phase = (seed % 1000) * 0.00628;
  const pulse = 0.5 + 0.5 * Math.sin(t * freq + phase);

  if (options?.selected || options?.linkSource) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, r + 7, 0, Math.PI * 2);
    ctx.fillStyle = options.linkSource ? "rgba(255,0,51,0.22)" : "rgba(255,0,51,0.18)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,0,51,0.65)";
    ctx.lineWidth = 1.75 / globalScale;
    ctx.stroke();
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(node.x, node.y, r + 2.5, 0, Math.PI * 2);
  ctx.fillStyle = GRAPH_THEME.bgRing;
  ctx.fill();

  ctx.shadowColor = color;
  ctx.shadowBlur = 5 + pulse * 12;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = GRAPH_THEME.accent;
  ctx.lineWidth = 0.85 / globalScale;
  ctx.stroke();

  ctx.fillStyle = GRAPH_THEME.accent;
  ctx.beginPath();
  ctx.arc(node.x, node.y, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (globalScale > LABEL_ZOOM_THRESHOLD) {
    const label = node.label || node.name || "";
    const typeTag = resolveNodeType(node);
    const fontSize = Math.max(8, 10 / globalScale);

    ctx.save();
    ctx.font = `600 ${fontSize}px ${FONT_STACK}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = GRAPH_THEME.label;
    ctx.fillText(label, node.x, node.y + r + 4 / globalScale);

    ctx.font = `500 ${fontSize * 0.72}px ${FONT_STACK}`;
    ctx.fillStyle = GRAPH_THEME.labelMute;
    ctx.fillText(typeTag.toUpperCase(), node.x, node.y + r + 4 / globalScale + fontSize * 1.05);
    ctx.restore();
  }

  if (options?.drawRipples) {
    paintRipples(ripplesRef, ctx, globalScale);
  }
}

export function paintLink(link: PaintLink, ctx: CanvasRenderingContext2D) {
  const src = link.source;
  const tgt = link.target;
  if (!src || !tgt || src.x == null || tgt.x == null || src.y == null || tgt.y == null) return;

  const dx = tgt.x - src.x;
  const dy = tgt.y - src.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return;

  ctx.save();

  ctx.setLineDash([4, 6]);
  ctx.strokeStyle = GRAPH_THEME.linkDash;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(src.x, src.y);
  ctx.lineTo(tgt.x, tgt.y);
  ctx.stroke();
  ctx.setLineDash([]);

  const grad = ctx.createLinearGradient(src.x, src.y, tgt.x, tgt.y);
  grad.addColorStop(0, "rgba(255,0,51,0.05)");
  grad.addColorStop(0.5, "rgba(255,0,51,0.22)");
  grad.addColorStop(1, "rgba(58,0,8,0.35)");
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(src.x, src.y);
  ctx.lineTo(tgt.x, tgt.y);
  ctx.stroke();

  const now = performance.now();
  const particleCount = 3;
  const speed = 0.00028;

  for (let i = 0; i < particleCount; i++) {
    const offset = i / particleCount;
    const p = ((now * speed + offset) % 1 + 1) % 1;
    const px = src.x + dx * p;
    const py = src.y + dy * p;
    const tail = Math.max(0, p - 0.06);
    const tx = src.x + dx * tail;
    const ty = src.y + dy * tail;

    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,51,92,0.45)";
    ctx.lineWidth = 1.2;
    ctx.moveTo(tx, ty);
    ctx.lineTo(px, py);
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = GRAPH_THEME.particle;
    ctx.shadowColor = GRAPH_THEME.accent;
    ctx.shadowBlur = 6;
    ctx.arc(px, py, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}
