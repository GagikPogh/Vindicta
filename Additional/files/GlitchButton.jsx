"use client";

import { motion } from "framer-motion";

/**
 * GlitchButton
 * -----------------------------------------------------------------------------
 * Primary CTA. Idle state has a slow pulsing gradient glow. On hover, four
 * HUD corner brackets snap into place and a thin glitch-slice overlay sweeps
 * across the label. Disabled state flattens everything to a static gray.
 *
 * Props
 *  children   - button label content
 *  onClick    - click handler
 *  type       - "button" | "submit" (default "button")
 *  disabled   - disables interaction + visual states
 *  loading    - shows a scanning label instead of children
 *  className  - extra tailwind classes
 */
export default function GlitchButton({
  children,
  onClick,
  type = "button",
  disabled = false,
  loading = false,
  className = "",
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      className={`group relative isolate overflow-hidden rounded-sm px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.25em] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {/* animated gradient base, pulses gently when idle/enabled */}
      <span
        className={`absolute inset-0 -z-20 bg-[linear-gradient(110deg,#3a0008,#FF0033,#3a0008)] bg-[length:200%_100%] ${
          disabled ? "" : "animate-glitchPulse"
        }`}
      />

      {/* dark scrim so text stays legible against the gradient */}
      <span className="absolute inset-0 -z-10 bg-[#0D0D11]/55 transition-opacity duration-200 group-hover:bg-[#0D0D11]/30" />

      {/* HUD corner brackets — hidden until hover */}
      <span className="pointer-events-none absolute left-0 top-0 h-3 w-3 -translate-x-1 -translate-y-1 border-l-2 border-t-2 border-[#FF0033] opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
      <span className="pointer-events-none absolute right-0 top-0 h-3 w-3 translate-x-1 -translate-y-1 border-r-2 border-t-2 border-[#FF0033] opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
      <span className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 -translate-x-1 translate-y-1 border-b-2 border-l-2 border-[#FF0033] opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 translate-x-1 translate-y-1 border-b-2 border-r-2 border-[#FF0033] opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />

      {/* glitch slice overlay — two offset slabs of the label that flash on hover */}
      {!disabled && !loading && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden items-center justify-center text-[#FF0033] mix-blend-screen group-hover:flex group-hover:animate-glitchSliceA"
            style={{ clipPath: "inset(20% 0 55% 0)" }}
          >
            {children}
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden items-center justify-center text-cyan-300 mix-blend-screen group-hover:flex group-hover:animate-glitchSliceB"
            style={{ clipPath: "inset(60% 0 10% 0)" }}
          >
            {children}
          </span>
        </>
      )}

      <span className="relative z-10 text-zinc-50">
        {loading ? <ScanningLabel /> : children}
      </span>
    </motion.button>
  );
}

function ScanningLabel() {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-1.5 animate-ping rounded-full bg-current" />
      SCANNING
    </span>
  );
}
