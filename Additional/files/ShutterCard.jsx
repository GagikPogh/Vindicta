"use client";

import { motion, AnimatePresence } from "framer-motion";

/**
 * ShutterCard
 * -----------------------------------------------------------------------------
 * Results panel for the /phone analysis flow. Opens with a vertical shutter:
 * a clip-path inset animates from fully closed (collapsed to a center line)
 * to fully open, like a camera iris blade snapping open. Pairs well with
 * ScrambleText for headline values that decrypt in right after the shutter
 * settles.
 *
 * Props
 *  open       - controls mount/open state (use with AnimatePresence by the parent if needed)
 *  title      - header label, e.g. "DOSSIER: +1 (555)..."
 *  badge      - small status chip text, e.g. "CONFIDENCE 92%"
 *  children   - card body content
 *  className  - extra wrapper classes
 */
export default function ShutterCard({ open = true, title, badge, children, className = "" }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ clipPath: "inset(50% 0 50% 0)", opacity: 0 }}
          animate={{ clipPath: "inset(0% 0 0% 0)", opacity: 1 }}
          exit={{ clipPath: "inset(50% 0 50% 0)", opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.83, 0, 0.17, 1] }}
          className={`relative overflow-hidden rounded-md border border-zinc-800 bg-[#13131a] shadow-[0_0_40px_-10px_rgba(255,0,51,0.2)] ${className}`}
        >
          {/* horizontal seam lines hint at the shutter mechanism even once open */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-zinc-800/60" />

          {(title || badge) && (
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
              {title && (
                <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-300">
                  {title}
                </h3>
              )}
              {badge && (
                <span className="rounded-sm border border-[#FF0033]/40 bg-[#FF0033]/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#FF0033]">
                  {badge}
                </span>
              )}
            </div>
          )}

          <div className="px-5 py-4">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
