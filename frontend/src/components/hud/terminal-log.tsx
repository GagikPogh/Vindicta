"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { hudTransition } from "@/lib/motion";

export const INFRA_SCAN_LINES = [
  "QUERYING GLOBAL WHOIS DATABASE...",
  "RESOLVING BGP ROUTING PATHS...",
  "FETCHING GEOGRAPHIC NODE METADATA...",
  "COMPUTE PORT EXPOSURE INDEX...",
  "CROSS-REFERENCING REPUTATION BLOCKLISTS...",
  "ANALYSIS COMPLETE — COMPILING RECOVERY DOSSIER",
] as const;

interface TerminalLogProps {
  lines?: readonly string[];
  intervalMs?: number;
  maxVisible?: number;
  loop?: boolean;
  active?: boolean;
  className?: string;
}

export function TerminalLog({
  lines = INFRA_SCAN_LINES,
  intervalMs = 420,
  maxVisible = 8,
  loop = false,
  active = true,
  className = "",
}: TerminalLogProps) {
  const [shown, setShown] = useState<{ id: string; text: string }[]>([]);
  const indexRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;

    indexRef.current = 0;
    setShown([]);

    const id = setInterval(() => {
      const idx = indexRef.current;
      if (!loop && idx >= lines.length) {
        clearInterval(id);
        return;
      }

      setShown((prev) =>
        [
          ...prev,
          { id: `${idx}-${Date.now()}`, text: lines[idx % lines.length] },
        ].slice(-maxVisible)
      );
      indexRef.current += 1;
    }, intervalMs);

    return () => clearInterval(id);
  }, [active, lines, intervalMs, maxVisible, loop]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [shown]);

  return (
    <div
      className={`rounded-sm border border-white/10 bg-black/60 p-3 font-mono text-[11px] leading-relaxed text-[#ff4d6b] ${className}`}
    >
      <div ref={scrollRef} className="h-32 overflow-hidden">
        <AnimatePresence initial={false}>
          {shown.map((line) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={hudTransition(0.25)}
              className="whitespace-nowrap"
              style={{ willChange: "transform, opacity" }}
            >
              <span className="mr-2 text-cyber-mute">&gt;</span>
              {line.text}
            </motion.div>
          ))}
        </AnimatePresence>
        {active && (
          <span className="inline-block h-3 w-1.5 animate-pulse bg-vindicta-red align-middle" />
        )}
      </div>
    </div>
  );
}
