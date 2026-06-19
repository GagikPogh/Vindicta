"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Shield } from "lucide-react";
import { toast } from "sonner";

import {
  ScanField,
  ScanningIris,
  ShutterCard,
  StaggerReveal,
  TerminalLog,
} from "@/components/hud";
import { GlitchButton } from "@/components/ui/glitch-button";
import { ScrambleText } from "@/components/ui/scramble-text";
import {
  DEMO_TARGETS,
  lookupInfrastructure,
  parseTarget,
  type AssetScanPhase,
  type InfrastructureReport,
} from "@/lib/analytics/infrastructure-lookup";
import { hudFadeUp, hudTransition } from "@/lib/motion";

function GeoAnchorGrid({ lat, lng, city, country }: InfrastructureReport["geo"]) {
  return (
    <div className="relative mt-3 h-36 overflow-hidden rounded-sm border border-white/10 bg-graphite-950">
      <svg className="absolute inset-0 h-full w-full opacity-40" aria-hidden>
        {Array.from({ length: 8 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1="0"
            y1={`${(i + 1) * 12.5}%`}
            x2="100%"
            y2={`${(i + 1) * 12.5}%`}
            stroke="rgba(255,0,51,0.15)"
            strokeWidth="1"
          />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={`${(i + 1) * 12.5}%`}
            y1="0"
            x2={`${(i + 1) * 12.5}%`}
            y2="100%"
            stroke="rgba(255,0,51,0.15)"
            strokeWidth="1"
          />
        ))}
        <circle cx="50%" cy="50%" r="28" fill="none" stroke="rgba(255,0,51,0.35)" strokeWidth="1" />
        <circle cx="50%" cy="50%" r="4" fill="#FF0033" opacity="0.9" />
        <line x1="50%" y1="10%" x2="50%" y2="90%" stroke="rgba(255,0,51,0.25)" />
        <line x1="10%" y1="50%" x2="90%" y2="50%" stroke="rgba(255,0,51,0.25)" />
      </svg>
      <div className="absolute bottom-2 left-2 font-mono text-[9px] uppercase tracking-wider text-cyber-mute">
        <ScrambleText text={`${city}, ${country}`} className="text-cyber-white" revealDelay={0.1} />
        <div className="mt-1 tabular-nums opacity-70">
          <ScrambleText text={`${lat.toFixed(4)}°N · ${lng.toFixed(4)}°E`} revealDelay={0.2} />
        </div>
      </div>
    </div>
  );
}

function DataRow({ label, value, delay = 0 }: { label: string; value: string; delay?: number }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 py-2 last:border-0">
      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-cyber-mute">
        {label}
      </span>
      <ScrambleText
        text={value}
        className="text-right text-xs text-cyber-white"
        revealDelay={delay}
      />
    </div>
  );
}

export function AssetSearchDashboard() {
  const [target, setTarget] = useState("");
  const [phase, setPhase] = useState<AssetScanPhase>("idle");
  const [report, setReport] = useState<InfrastructureReport | null>(null);

  const runScan = useCallback(async (query?: string) => {
    const q = (query ?? target).trim();
    if (!q) return;

    if (!parseTarget(q)) {
      toast.error("Enter a valid IPv4 address or domain name");
      return;
    }

    setPhase("scanning");
    setReport(null);
    setTarget(q);

    try {
      const data = await lookupInfrastructure(q);
      setReport(data);
      setPhase("resolved");
    } catch (error) {
      setPhase("idle");
      toast.error(error instanceof Error ? error.message : "Lookup failed");
    }
  }, [target]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <ScanField
            label="INFRASTRUCTURE TARGET"
            value={target}
            onChange={setTarget}
            placeholder="8.8.8.8 or malicious-infrastructure.net"
            onSubmit={() => runScan()}
            clipReveal
          />
        </div>
        <GlitchButton
          type="button"
          className="h-12 shrink-0 px-6 sm:px-10"
          disabled={phase === "scanning"}
          onClick={() => runScan()}
        >
          <Search className="mr-2 inline h-4 w-4" />
          Initiate Scan
        </GlitchButton>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyber-mute">
          Demo targets:
        </span>
        {DEMO_TARGETS.map((demo) => (
          <button
            key={demo}
            type="button"
            onClick={() => runScan(demo)}
            disabled={phase === "scanning"}
            className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[10px] text-cyber-white transition-colors hover:border-vindicta-red/50 hover:bg-vindicta-red/10"
          >
            {demo}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {phase === "scanning" && (
          <motion.div
            key="scanning"
            initial={hudFadeUp.initial}
            animate={hudFadeUp.animate}
            exit={hudFadeUp.exit}
            transition={hudTransition(0.45)}
            className="flex flex-col items-center gap-6 py-8"
            style={{ willChange: "transform, opacity" }}
          >
            <ScanningIris size={128} label="EXTRACTING TARGET TELEMETRY" active />
            <div className="w-full max-w-lg">
              <TerminalLog active intervalMs={380} loop={false} />
            </div>
          </motion.div>
        )}

        {phase === "idle" && !report && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={hudTransition(0.45)}
            className="py-10 text-center"
            style={{ willChange: "transform, opacity" }}
          >
            <Shield className="mx-auto mb-4 h-12 w-12 text-vindicta-red/50" />
            <ScrambleText
              as="h2"
              text="AWAITING TARGET SIGNATURE"
              className="text-sm uppercase tracking-[0.2em] text-cyber-white"
            />
            <p className="mx-auto mt-3 max-w-md text-xs text-cyber-mute">
              Enter an IP address or domain to resolve WHOIS ownership, BGP routing paths,
              DNS resolution chains, SSL certificates, and breach-risk reputation.
            </p>
          </motion.div>
        )}

        {phase === "resolved" && report && (
          <motion.div
            key="resolved"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={hudTransition(0.4)}
            className="space-y-4"
          >
            <ShutterCard
              title={`ASSET DOSSIER: ${report.target.toUpperCase()}`}
              badge={`CONFIDENCE ${report.confidence}%`}
              index={0}
            >
              <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.16em] text-cyber-mute">
                Resolved in {report.tookMs}ms · Type: {report.targetType.toUpperCase()}
              </p>
            </ShutterCard>

            <ShutterCard
              title="CORE INTEL IDENTIFIERS"
              badge={`ASN ${report.asn.replace("AS", "")}`}
              index={1}
            >
              <DataRow label="Primary ASN" value={report.asn} delay={0.05} />
              <DataRow label="Hosting Provider" value={report.hostingProvider} delay={0.1} />
              <DataRow label="Registrar" value={report.registrar} delay={0.15} />
              <DataRow label="Organization" value={report.org} delay={0.2} />
            </ShutterCard>

            <ShutterCard title="CROSS-LINKED ROUTING MATRIX" index={2}>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-vindicta-red">
                DNS History
              </p>
              {report.dnsHistory.map((entry, i) => (
                <StaggerReveal key={entry} index={i}>
                  <p className="mb-1.5 font-mono text-[11px] text-cyber-white">
                    <ScrambleText text={entry} revealDelay={i * 0.05} />
                  </p>
                </StaggerReveal>
              ))}

              <p className="mb-2 mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-vindicta-red">
                SSL Certificate
              </p>
              <DataRow label="Issuer" value={report.sslCert.issuer} delay={0.1} />
              <DataRow label="Valid Until" value={report.sslCert.validUntil} delay={0.15} />
              <DataRow label="Fingerprint" value={report.sslCert.fingerprint} delay={0.2} />

              <p className="mb-2 mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-vindicta-red">
                Open Ports
              </p>
              <div className="flex flex-wrap gap-2">
                {report.openPorts.map((port, i) => (
                  <StaggerReveal key={port} index={i}>
                    <span className="rounded border border-vindicta-red/30 bg-vindicta-red/10 px-2 py-0.5 font-mono text-[10px] text-vindicta-red">
                      <ScrambleText text={String(port)} revealDelay={i * 0.04} />
                    </span>
                  </StaggerReveal>
                ))}
              </div>
            </ShutterCard>

            <ShutterCard
              title="GEOGRAPHIC ANCHOR"
              badge={report.reputation.blocklists.length ? "ELEVATED RISK" : "CLEAR"}
              index={3}
            >
              <DataRow label="City Node" value={`${report.geo.city}, ${report.geo.country}`} />
              <DataRow label="ISP" value={report.geo.isp} delay={0.08} />
              <DataRow
                label="Reputation Score"
                value={`${report.reputation.score}/100`}
                delay={0.12}
              />
              {report.reputation.blocklists.length > 0 && (
                <DataRow
                  label="Blocklists"
                  value={report.reputation.blocklists.join(", ")}
                  delay={0.16}
                />
              )}
              <GeoAnchorGrid {...report.geo} />
            </ShutterCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
