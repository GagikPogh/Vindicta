"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

interface GlitchButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  className?: string;
}

export function GlitchButton({ children, className = "", ...props }: GlitchButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={[
        "group relative isolate overflow-hidden px-8 py-3",
        "font-display text-sm font-semibold tracking-[0.18em] uppercase text-cyber-white",
        "bg-gradient-to-r from-crimson-deep via-crimson to-crimson-deep bg-[length:200%_100%]",
        "transition-[background-position,box-shadow] duration-500",
        "hover:bg-[position:100%_0] hover:shadow-glow-md",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson",
        "disabled:opacity-50 disabled:pointer-events-none",
        className,
      ].join(" ")}
      {...props}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 translate-x-[-100%] bg-white/10 skew-x-12 transition-transform duration-700 group-hover:translate-x-[100%]"
      />
      <span aria-hidden className="pointer-events-none absolute top-1 left-1 h-2 w-2 border-t border-l border-crimson/60 opacity-0 transition-opacity group-hover:opacity-100" />
      <span aria-hidden className="pointer-events-none absolute top-1 right-1 h-2 w-2 border-t border-r border-crimson/60 opacity-0 transition-opacity group-hover:opacity-100" />
      <span aria-hidden className="pointer-events-none absolute bottom-1 left-1 h-2 w-2 border-b border-l border-crimson/60 opacity-0 transition-opacity group-hover:opacity-100" />
      <span aria-hidden className="pointer-events-none absolute bottom-1 right-1 h-2 w-2 border-b border-r border-crimson/60 opacity-0 transition-opacity group-hover:opacity-100" />
      {children}
    </motion.button>
  );
}
