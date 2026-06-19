"use client";

import { motion } from "framer-motion";

/**
 * ScanningIris
 * -----------------------------------------------------------------------------
 * Replaces a generic spinner during async lookups. The outer ring rotates
 * continuously (CSS keyframe `irisSpin`, defined in tailwind.config.js so it
 * keeps running smoothly even if this component re-renders). The inner pupil
 * contracts and dilates via Framer Motion to sell the "scanning eye" motif
 * from the Vindicta logo.
 *
 * Props
 *  size    - overall diameter in px (default 120)
 *  label   - optional caption rendered beneath the iris
 *  active  - if false, freezes the animation in a neutral resting state
 */
export default function ScanningIris({ size = 120, label, active = true }) {
  const stroke = Math.max(2, size * 0.025);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        {/* faint static rear ring for depth */}
        <div className="absolute inset-0 rounded-full border border-zinc-800" />

        {/* outer rotating diaphragm ring, segmented like a camera iris housing */}
        <div
          className={`absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#FF0033] border-r-[#FF0033]/40 ${
            active ? "animate-irisSpin" : ""
          }`}
          style={{ borderWidth: stroke }}
        />

        {/* secondary ring, counter-rotating for a mechanical, multi-blade feel */}
        <div
          className={`absolute inset-[14%] rounded-full border border-dashed border-zinc-700 ${
            active ? "animate-irisSpinReverse" : ""
          }`}
        />

        {/* pupil — contracts/dilates via Framer Motion */}
        <motion.div
          className="absolute inset-0 m-auto rounded-full bg-[#FF0033] shadow-[0_0_25px_4px_rgba(255,0,51,0.55)]"
          style={{ width: "34%", height: "34%" }}
          animate={
            active
              ? { scale: [1, 0.55, 1], opacity: [0.95, 0.6, 0.95] }
              : { scale: 0.8, opacity: 0.5 }
          }
          transition={
            active
              ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.4 }
          }
        />

        {/* glassy specular highlight, anchors the "lens" read */}
        <div className="absolute inset-0 m-auto h-[10%] w-[10%] -translate-x-1/4 -translate-y-1/4 rounded-full bg-white/30 blur-[1px]" />
      </div>

      {label && (
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
          {label}
        </span>
      )}
    </div>
  );
}
