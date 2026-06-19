"use client";

import { motion } from "framer-motion";

import { hudFadeUp, hudTransition, staggerDelay } from "@/lib/motion";

interface StaggerRevealProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
}

export function StaggerReveal({ children, index = 0, className = "" }: StaggerRevealProps) {
  return (
    <motion.div
      className={className}
      initial={hudFadeUp.initial}
      animate={hudFadeUp.animate}
      exit={hudFadeUp.exit}
      transition={hudTransition(0.55, staggerDelay(index))}
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}

interface StaggerListProps {
  children: React.ReactNode[];
  className?: string;
}

export function StaggerList({ children, className = "" }: StaggerListProps) {
  return (
    <div className={className}>
      {children.map((child, i) => (
        <StaggerReveal key={i} index={i}>
          {child}
        </StaggerReveal>
      ))}
    </div>
  );
}
