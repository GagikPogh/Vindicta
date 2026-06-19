"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { hudFadeUp, hudTransition } from "@/lib/motion";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <motion.div
      initial={hudFadeUp.initial}
      animate={hudFadeUp.animate}
      transition={hudTransition(0.55)}
      className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}
      style={{ willChange: "transform, opacity" }}
    >
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description && (
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground sm:text-sm sm:normal-case sm:tracking-normal">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </motion.div>
  );
}
