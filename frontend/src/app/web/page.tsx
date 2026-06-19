"use client";

import { motion } from "framer-motion";
import { Network } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { DetectiveCanvas } from "@/components/web/detective-canvas";

export default function WebPage() {
  return (
    <AppShell>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-[100vw] -mx-4 sm:-mx-6 lg:-mx-8"
      >
        <div className="px-4 sm:px-6 lg:px-8 mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20">
            <Network className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">Паутина детектива</h1>
            <p className="text-xs text-muted-foreground">
              Связывайте людей, события, улики — синхронизация на всех устройствах
            </p>
          </div>
        </div>
        <div className="px-2 sm:px-4 lg:px-6">
          <DetectiveCanvas />
        </div>
      </motion.div>
    </AppShell>
  );
}
