"use client";

import { motion } from "framer-motion";
import { Network } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { LinkAnalysisGrid } from "@/components/web/LinkAnalysisGrid";
import { StaggerReveal } from "@/components/hud/stagger-reveal";
import { hudTransition } from "@/lib/motion";

export default function WebPage() {
  return (
    <AppShell>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={hudTransition(0.45)}
        className="max-w-[100vw] -mx-4 sm:-mx-6 lg:-mx-8"
        style={{ willChange: "opacity" }}
      >
        <StaggerReveal index={0} className="mb-3 flex items-center gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-vindicta-red/15">
            <Network className="h-5 w-5 text-vindicta-red" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight sm:text-xl">Link Analysis</h1>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Entity relationship mapping — multi-device sync
            </p>
          </div>
        </StaggerReveal>
        <StaggerReveal index={1} className="px-2 sm:px-4 lg:px-6">
          <LinkAnalysisGrid />
        </StaggerReveal>
      </motion.div>
    </AppShell>
  );
}
