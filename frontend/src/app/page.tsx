"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  GitBranch,
  Radar,
  Search,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { hudFadeUp, hudTransition, staggerDelay } from "@/lib/motion";

const features = [
  {
    icon: Search,
    title: "Intelligent Search",
    description:
      "Query across entities, documents, and graph data with AI-powered relevance ranking and sub-second response times.",
  },
  {
    icon: Radar,
    title: "Threat Intelligence",
    description:
      "Domain, IP, and URL indicator lookup with WHOIS, BGP routing, DNS chains, and reputation scoring.",
  },
  {
    icon: GitBranch,
    title: "Relationship Mapping",
    description:
      "Visualize complex networks of people, organizations, and assets with interactive force-directed graphs.",
  },
  {
    icon: Brain,
    title: "AI Analysis",
    description:
      "Automated pattern detection, risk scoring, and investigative insights powered by machine learning.",
  },
  {
    icon: Zap,
    title: "Real-time Intelligence",
    description:
      "Live timeline reconstruction, event correlation, and instant alerts on entity activity changes.",
  },
];

const stats = [
  { value: "10M+", label: "Entities Indexed" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "<200ms", label: "Search Latency" },
  { value: "256-bit", label: "Encryption" },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh">
      <header className="fixed top-0 inset-x-0 z-50 safe-top">
        <div className="glass-strong border-b border-glass-border">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <span className="font-semibold tracking-tight">Vindicta AI</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#stats" className="hover:text-foreground transition-colors">Platform</a>
            </nav>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/login" />}>
                Sign in
              </Button>
              <Button size="sm" nativeButton={false} render={<Link href="/register" />}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      <section className="relative pt-28 pb-20 sm:pt-36 sm:pb-28 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />
        </div>

        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={hudFadeUp.initial}
            animate={hudFadeUp.animate}
            transition={hudTransition(0.6)}
            style={{ willChange: "transform, opacity" }}
          >
            <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium text-primary mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              Next-generation investigative intelligence
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
              <span className="text-gradient">Uncover truth</span>
              <br />
              with precision
            </h1>

            <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Vindicta AI transforms complex investigations into actionable intelligence.
              Search entities, map relationships, and reconstruct timelines — all in one
              premium platform built for investigators.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base glow" nativeButton={false} render={<Link href="/register" />}>
                Start investigating
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 text-base" nativeButton={false} render={<Link href="/login" />}>
                View demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="stats" className="px-4 sm:px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={hudFadeUp.initial}
                animate={hudFadeUp.animate}
                viewport={{ once: true }}
                transition={hudTransition(0.55, staggerDelay(i))}
                style={{ willChange: "transform, opacity" }}
              >
                <GlassCard className="p-6 text-center">
                  <p className="text-2xl sm:text-3xl font-bold text-gradient">{stat.value}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="px-4 sm:px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Built for serious investigations
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Enterprise-grade tools with consumer-grade design. Every feature engineered
              for speed, clarity, and precision.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={hudFadeUp.initial}
                  whileInView={hudFadeUp.animate}
                  viewport={{ once: true }}
                  transition={hudTransition(0.55, staggerDelay(i))}
                  style={{ willChange: "transform, opacity" }}
                >
                  <GlassCard className="p-6 sm:p-8 h-full hover:border-primary/30 transition-colors duration-300">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 mb-4">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 py-16 sm:py-24">
        <GlassCard strong glow className="mx-auto max-w-4xl p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Ready to transform your investigations?
          </h2>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
            Join leading teams using Vindicta AI to uncover connections others miss.
          </p>
          <Button size="lg" className="mt-8 h-12 px-8" nativeButton={false} render={<Link href="/register" />}>
            Create free account
            <ArrowRight className="h-4 w-4" />
          </Button>
        </GlassCard>
      </section>

      <footer className="border-t border-glass-border py-8 px-4 safe-bottom">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span>Vindicta AI © 2026</span>
          </div>
          <p>Enterprise investigative intelligence platform</p>
        </div>
      </footer>
    </div>
  );
}
