import { useCallback, useRef } from "react";

const TYPE_COLORS: Record<string, string> = {
  person: "#FF335C",
  event: "#FF8A65",
  location: "#7CFFB2",
  organization: "#FFD166",
  evidence: "#E8E8F0",
  fact: "#E8E8F0",
  document: "#8A8A99",
  phone: "#FF0033",
  note: "#B8B8C8",
  default: "#FF0033",
};

interface Ripple {
  x: number;
  y: number;
  start: number;
}

interface PaintNode {
  id?: string | number;
  x: number;
  y: number;
  label?: string;
  name?: string;
  type?: string;
  weight?: number;
  color?: string;
}

interface PaintLink {
  source: PaintNode;
  target: PaintNode;
}

const RIPPLE_DURATION = 900;

export function useNodeRipples() {
  const ripples = useRef<Ripple[]>([]);

  const addRipple = useCallback((node: PaintNode) => {
    if (node?.x == null) return;
    ripples.current.push({ x: node.x, y: node.y, start: performance.now() });
    if (ripples.current.length > 12) ripples.current.shift();
  }, []);

  return { ripples, addRipple };
}

export function paintNode(
  node: PaintNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  ripplesRef: React.RefObject<Ripple[]>,
  options?: { selected?: boolean; linkSource?: boolean }
) {
  const r = 5 + (node.weight || 0) * 0.6;
  const color = node.color || TYPE_COLORS[node.type || ""] || TYPE_COLORS.default;
  const t = performance.now() / 1000;
  const phase = (node.id ? hashSeed(String(node.id)) : 0) % 1000;
  const pulse = 0.5 + 0.5 * Math.sin(t * 1.6 + phase);

  if (options?.selected || options?.linkSource) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, r + 6, 0, 2 * Math.PI);
    ctx.fillStyle = options.linkSource ? "rgba(255,0,51,0.3)" : "rgba(255,0,51,0.25)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,0,51,0.6)";
    ctx.lineWidth = 2 / globalScale;
    ctx.stroke();
  }

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 6 + pulse * 10;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();

  if (globalScale > 0.8) {
    ctx.font = `${10 / globalScale}px "JetBrains Mono", var(--font-geist-mono), monospace`;
    ctx.fillStyle = "rgba(232,232,240,0.85)";
    ctx.textAlign = "center";
    ctx.fillText(node.label || node.name || "", node.x, node.y + r + 9 / globalScale);
  }

  if (ripplesRef?.current?.length) {
    const now = performance.now();
    ripplesRef.current = ripplesRef.current.filter((rp) => now - rp.start < RIPPLE_DURATION);
    for (const rp of ripplesRef.current) {
      const elapsed = (now - rp.start) / RIPPLE_DURATION;
      const radius = r + elapsed * r * 9;
      const alpha = 1 - elapsed;
      ctx.save();
      ctx.strokeStyle = `rgba(255,0,51,${alpha * 0.7})`;
      ctx.lineWidth = 1.5 / globalScale;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, radius, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();
    }
  }
}

export function paintLink(link: PaintLink, ctx: CanvasRenderingContext2D) {
  const src = link.source;
  const tgt = link.target;
  if (!src || !tgt || src.x == null || tgt.x == null) return;

  ctx.save();
  ctx.strokeStyle = "rgba(255,0,51,0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(src.x, src.y);
  ctx.lineTo(tgt.x, tgt.y);
  ctx.stroke();

  const dx = tgt.x - src.x;
  const dy = tgt.y - src.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) {
    ctx.restore();
    return;
  }

  const speed = 0.00035;
  const now = performance.now();
  const particleCount = 2;

  for (let i = 0; i < particleCount; i++) {
    const offset = i / particleCount;
    const p = ((now * speed + offset) % 1 + 1) % 1;
    const px = src.x + dx * p;
    const py = src.y + dy * p;

    ctx.beginPath();
    ctx.fillStyle = "#FF335C";
    ctx.shadowColor = "#FF0033";
    ctx.shadowBlur = 4;
    ctx.arc(px, py, 1.6, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.restore();
}

function hashSeed(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000;
  return h;
}
