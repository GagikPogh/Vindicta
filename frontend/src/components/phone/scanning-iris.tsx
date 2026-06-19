"use client";

import { motion } from "framer-motion";

interface ScanningIrisProps {
  size?: number;
}

export function ScanningIris({ size = 96 }: ScanningIrisProps) {
  const r = size / 2 - 6;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="animate-irisSpin">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#3a0010" strokeWidth="2" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#FF0033"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          className="animate-irisOpen"
          style={{ filter: "drop-shadow(0 0 6px rgba(255,0,51,0.6))" }}
        />
      </svg>

      <motion.div
        className="absolute rounded-full bg-crimson/80"
        style={{ boxShadow: "0 0 14px rgba(255,0,51,0.7)" }}
        animate={{
          width: [size * 0.18, size * 0.34, size * 0.18],
          height: [size * 0.18, size * 0.34, size * 0.18],
        }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />

      {[0, 90, 180, 270].map((deg) => (
        <div
          key={deg}
          className="absolute h-2 w-px bg-crimson/50"
          style={{ transform: `rotate(${deg}deg) translateY(-${size / 2 - 2}px)` }}
        />
      ))}
    </div>
  );
}
