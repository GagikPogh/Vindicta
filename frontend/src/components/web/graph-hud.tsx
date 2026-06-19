"use client";

import { motion } from "framer-motion";

import { ScrambleText } from "@/components/ui/scramble-text";

interface GraphHUDProps {
  nodeCount?: number;
  edgeCount?: number;
  label?: string;
}

export function GraphHUD({ nodeCount = 0, edgeCount = 0, label = "LINK ANALYSIS" }: GraphHUDProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="absolute inset-0 bg-grid-lines bg-grid opacity-50" />

      {["top-4 left-4", "top-4 right-4", "bottom-4 left-4", "bottom-4 right-4"].map((pos, i) => (
        <div key={pos} className={`absolute ${pos} h-9 w-9 opacity-70`}>
          <svg viewBox="0 0 36 36" className="h-full w-full">
            <path
              d={
                i === 0
                  ? "M2 14 V2 H14"
                  : i === 1
                    ? "M22 2 H34 V14"
                    : i === 2
                      ? "M2 22 V34 H14"
                      : "M22 34 H34 V22"
              }
              fill="none"
              stroke="#FF0033"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      ))}

      <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 opacity-20">
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-crimson" />
        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-crimson" />
      </div>

      <div className="absolute left-8 top-8 font-mono text-[11px] uppercase tracking-[0.18em] text-cyber-mute">
        <ScrambleText text={label} className="block text-cyber-white" />
        <div className="mt-1 flex items-center gap-1.5">
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-cyber-green"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
          <span>System Status: Active</span>
        </div>
      </div>

      <div className="absolute right-8 top-8 text-right font-mono text-[11px] uppercase tracking-[0.18em] text-cyber-mute">
        <div>Nodes: <span className="text-cyber-white">{nodeCount}</span></div>
        <div>Edges: <span className="text-cyber-white">{edgeCount}</span></div>
      </div>
    </div>
  );
}
