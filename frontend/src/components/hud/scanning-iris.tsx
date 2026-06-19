"use client";

import { motion } from "framer-motion";

import { HUD_EASE, hudTransition } from "@/lib/motion";

interface ScanningIrisProps {
  size?: number;
  label?: string;
  active?: boolean;
}

export function ScanningIris({ size = 120, label, active = true }: ScanningIrisProps) {
  const stroke = Math.max(2, size * 0.025);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size, willChange: "transform" }}>
        <div className="absolute inset-0 rounded-full border border-white/10" />

        <div
          className={`absolute inset-0 rounded-full border-[3px] border-transparent border-t-vindicta-red border-r-vindicta-red/40 ${
            active ? "animate-irisSpin" : ""
          }`}
          style={{ borderWidth: stroke }}
        />

        <div
          className={`absolute inset-[14%] rounded-full border border-dashed border-white/15 ${
            active ? "animate-irisSpinReverse" : ""
          }`}
        />

        <motion.div
          className="absolute inset-0 m-auto rounded-full bg-vindicta-red shadow-[0_0_25px_4px_rgba(255,0,51,0.55)]"
          style={{ width: "34%", height: "34%", willChange: "transform, opacity" }}
          animate={
            active
              ? { scale: [1, 0.55, 1], opacity: [0.95, 0.6, 0.95] }
              : { scale: 0.8, opacity: 0.5 }
          }
          transition={
            active
              ? { duration: 2.2, repeat: Infinity, ease: HUD_EASE }
              : hudTransition(0.4)
          }
        />

        <div className="absolute inset-0 m-auto h-[10%] w-[10%] -translate-x-1/4 -translate-y-1/4 rounded-full bg-white/30 blur-[1px]" />
      </div>

      {label && (
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-cyber-mute">
          {label}
        </span>
      )}
    </div>
  );
}
