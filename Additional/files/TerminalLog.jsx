"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_LINES = [
  "INITIALIZING SECURE SOCKET...",
  "CONNECTING TO NODE [RELAY-07]...",
  "HANDSHAKE OK — TLS 1.3",
  "RESOLVING CARRIER ID...",
  "CARRIER ID MATCHED — QUERYING HLR...",
  "CROSS-REFERENCING BREACH INDEX...",
  "PARSING METADATA FRAGMENTS...",
  "RECONSTRUCTING CALL GRAPH...",
  "SCORING CONFIDENCE INTERVALS...",
  "COMPILING DOSSIER...",
];

/**
 * TerminalLog
 * -----------------------------------------------------------------------------
 * Auto-typing, auto-scrolling pseudo-log meant to run alongside ScanningIris
 * during a search. Lines append on an interval; once `lines` is exhausted it
 * either stops or loops, depending on `loop`.
 *
 * Props
 *  lines        - array of strings to play out (defaults to OSINT flavor text)
 *  intervalMs   - delay between appended lines (default 650)
 *  maxVisible   - how many lines stay mounted/visible at once (default 8)
 *  loop         - replay from the start when finished (default true)
 *  active       - pauses playback when false
 *  className    - extra wrapper classes
 */
export default function TerminalLog({
  lines = DEFAULT_LINES,
  intervalMs = 650,
  maxVisible = 8,
  loop = true,
  active = true,
  className = "",
}) {
  const [shown, setShown] = useState([]);
  const indexRef = useRef(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setShown((prev) => {
        const next = [
          ...prev,
          { id: `${indexRef.current}-${Date.now()}`, text: lines[indexRef.current % lines.length] },
        ].slice(-maxVisible);
        return next;
      });
      indexRef.current += 1;
      if (!loop && indexRef.current >= lines.length) {
        clearInterval(id);
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [active, lines, intervalMs, maxVisible, loop]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [shown]);

  return (
    <div
      className={`rounded-sm border border-zinc-800 bg-black/60 p-3 font-mono text-[11px] leading-relaxed text-[#ff4d6b] ${className}`}
    >
      <div ref={scrollRef} className="h-32 overflow-hidden">
        <AnimatePresence initial={false}>
          {shown.map((line) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="whitespace-nowrap"
            >
              <span className="mr-2 text-zinc-600">&gt;</span>
              {line.text}
            </motion.div>
          ))}
        </AnimatePresence>
        {active && (
          <span className="inline-block h-3 w-1.5 animate-pulse bg-[#FF0033] align-middle" />
        )}
      </div>
    </div>
  );
}
