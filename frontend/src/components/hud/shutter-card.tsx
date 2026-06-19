"use client";

import { AnimatePresence, motion } from "framer-motion";

import { hudShutter, hudTransition } from "@/lib/motion";

interface ShutterCardProps {
  open?: boolean;
  title?: string;
  badge?: string;
  children: React.ReactNode;
  className?: string;
  index?: number;
}

export function ShutterCard({
  open = true,
  title,
  badge,
  children,
  className = "",
  index = 0,
}: ShutterCardProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={hudShutter.initial}
          animate={hudShutter.animate}
          exit={hudShutter.exit}
          transition={hudTransition(0.55, index * 0.06)}
          className={`relative overflow-hidden rounded-md border border-white/10 bg-graphite-900/80 shadow-[0_0_40px_-10px_rgba(255,0,51,0.2)] ${className}`}
          style={{ willChange: "transform, opacity, clip-path" }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/10" />

          {(title || badge) && (
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              {title && (
                <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-cyber-white">
                  {title}
                </h3>
              )}
              {badge && (
                <span className="rounded-sm border border-vindicta-red/40 bg-vindicta-red/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-vindicta-red">
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
