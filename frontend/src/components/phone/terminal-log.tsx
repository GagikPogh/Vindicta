"use client";

import { useEffect, useState } from "react";

const LOG_TEMPLATES = [
  "CONNECTING TO NODE [{ip}]...",
  "QUERY OPERATOR DATABASE :: HLR LOOKUP",
  "RESOLVING CARRIER ID 0x{hex}",
  "CROSS-REF SOCIAL GRAPH... {pct}%",
  "DECRYPTING METADATA BLOCK #{n}",
  "SCANNING BREACH ARCHIVES...",
  "NO MATCH IN LOCAL CACHE — FALLBACK",
  "VERIFYING SIGNAL TOWER TRIANGULATION",
  "ASSEMBLING ENTITY PROFILE...",
];

function rnd(max: number) {
  return Math.floor(Math.random() * max);
}

function randomLine() {
  const t = LOG_TEMPLATES[Math.floor(Math.random() * LOG_TEMPLATES.length)];
  return t
    .replace("{ip}", `10.${rnd(255)}.${rnd(255)}.${rnd(255)}`)
    .replace("{hex}", rnd(0xffff).toString(16).padStart(4, "0"))
    .replace("{pct}", String(rnd(100)))
    .replace("{n}", String(rnd(9999)));
}

interface TerminalLogProps {
  active?: boolean;
  lineIntervalMs?: number;
  maxLines?: number;
  className?: string;
}

export function TerminalLog({
  active = true,
  lineIntervalMs = 380,
  maxLines = 9,
  className = "",
}: TerminalLogProps) {
  const [lines, setLines] = useState<string[]>([randomLine()]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setLines((prev) => [...prev.slice(-(maxLines - 1)), randomLine()]);
    }, lineIntervalMs);
    return () => clearInterval(id);
  }, [active, lineIntervalMs, maxLines]);

  return (
    <div
      className={`font-mono text-[10px] leading-relaxed text-cyber-mute space-y-1 overflow-hidden ${className}`}
      aria-live="polite"
      aria-busy={active}
    >
      {lines.map((line, i) => (
        <p key={`${line}-${i}`} className="truncate">
          <span className="text-crimson mr-2">&gt;</span>
          {line}
        </p>
      ))}
    </div>
  );
}
