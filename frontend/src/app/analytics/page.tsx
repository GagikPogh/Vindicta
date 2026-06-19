"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { AssetSearchDashboard } from "@/components/analytics/AssetSearchDashboard";
import { StaggerReveal } from "@/components/hud/stagger-reveal";
import { GlassCard } from "@/components/ui/glass-card";
import { Globe, Radar, Server, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

import { hudTransition } from "@/lib/motion";

export default function AnalyticsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          title="Threat Intelligence"
          description="Domain / IP / URL indicator lookup — WHOIS, BGP routing, DNS chains, SSL certificates, and reputation scoring"
        />

        <StaggerReveal index={0}>
          <GlassCard strong glow className="v-hud-corners p-4 sm:p-6">
            <AssetSearchDashboard />
          </GlassCard>
        </StaggerReveal>

        <StaggerReveal index={1}>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Globe, label: "WHOIS & BGP", desc: "Global routing path resolution" },
              { icon: Server, label: "DNS & SSL", desc: "Certificate chain verification" },
              { icon: ShieldAlert, label: "Reputation", desc: "Blocklist cross-reference" },
            ].map((item) => (
              <GlassCard key={item.label} className="p-4">
                <item.icon className="mb-2 h-4 w-4 text-vindicta-red" />
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyber-white">
                  {item.label}
                </p>
                <p className="mt-1 text-xs text-cyber-mute">{item.desc}</p>
              </GlassCard>
            ))}
          </div>
        </StaggerReveal>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={hudTransition(0.5, 0.2)}
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-cyber-mute"
        >
          <Radar className="h-3.5 w-3.5 text-vindicta-red" />
          Lawful OSINT only — enterprise network asset analysis
        </motion.div>
      </div>
    </AppShell>
  );
}
