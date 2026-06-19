"use client";

import { motion } from "framer-motion";

import { ScrambleText } from "@/components/ui/scramble-text";

interface GraphHUDProps {
  nodeCount?: number;
  edgeCount?: number;
  label?: string;
}

const CORNER_POSITIONS = [
  "top-4 left-4",
  "top-4 right-4",
  "bottom-4 left-4",
  "bottom-4 right-4",
] as const;

const CORNER_PATHS = [
  "M2 14 V2 H14",
  "M22 2 H34 V14",
  "M2 22 V34 H14",
  "M22 34 H34 V22",
] as const;

export function GraphHUD({
  nodeCount = 0,
  edgeCount = 0,
  label = "LINK ANALYSIS",
}: GraphHUDProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="absolute inset-0 bg-grid-lines bg-grid opacity-40" />

      {CORNER_POSITIONS.map((pos, i) => (
        <div key={pos} className={`absolute ${pos} h-9 w-9 opacity-80`}>
          <svg viewBox="0 0 36 36" className="h-full w-full" aria-hidden>
            <path
              d={CORNER_PATHS[i]}
              fill="none"
              stroke="#FF0033"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      ))}

      <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 opacity-[0.18]">
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-vindicta-red" />
        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-vindicta-red" />
        <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-vindicta-red/60" />
      </div>

      <div className="absolute left-8 top-8 font-mono text-[11px] uppercase tracking-[0.18em] text-cyber-mute">
        <ScrambleText text={label} className="block text-cyber-white" />
        <div className="mt-2 flex items-center gap-2">
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-vindicta-red shadow-[0_0_8px_rgba(255,0,51,0.8)]"
            animate={{ opacity: [1, 0.25, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="text-cyber-white">SYSTEM STATUS: ACTIVE</span>
        </div>
      </div>

      <div className="absolute right-8 top-8 text-right font-mono text-[11px] uppercase tracking-[0.18em] text-cyber-mute">
        <div>
          Active Nodes: <span className="tabular-nums text-cyber-white">{nodeCount}</span>
        </div>
        <div className="mt-0.5">
          Active Edges: <span className="tabular-nums text-cyber-white">{edgeCount}</span>
        </div>
      </div>
    </div>
  );
}
