"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  FileText,
  FolderSearch,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDistanceToNow } from "date-fns";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { DashboardStats } from "@/lib/types";

const chartData = [
  { day: "Mon", investigations: 4, entities: 12 },
  { day: "Tue", investigations: 7, entities: 18 },
  { day: "Wed", investigations: 5, entities: 15 },
  { day: "Thu", investigations: 9, entities: 24 },
  { day: "Fri", investigations: 11, entities: 31 },
  { day: "Sat", investigations: 6, entities: 19 },
  { day: "Sun", investigations: 8, entities: 22 },
];

const statConfig = [
  { key: "total_investigations" as const, label: "Investigations", icon: FolderSearch, color: "text-primary" },
  { key: "active_investigations" as const, label: "Active Cases", icon: Activity, color: "text-chart-2" },
  { key: "total_entities" as const, label: "Entities", icon: Users, color: "text-chart-3" },
  { key: "high_risk_entities" as const, label: "High Risk", icon: AlertTriangle, color: "text-destructive" },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard.getStats()
      .then(setStats)
      .catch(() => setStats({
        total_investigations: 0,
        active_investigations: 0,
        total_entities: 0,
        total_events: 0,
        total_reports: 0,
        high_risk_entities: 0,
        recent_activity: [],
      }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="Dashboard"
          description="Overview of your investigative operations"
          action={
            <Button render={<Link href="/investigations" />}>
              New Investigation
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statConfig.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <GlassCard className="p-4 sm:p-5">
                  {loading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <Icon className={`h-4 w-4 ${stat.color}`} />
                      </div>
                      <p className="text-2xl sm:text-3xl font-bold tracking-tight">
                        {stats?.[stat.key] ?? 0}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        {stat.label}
                      </p>
                    </>
                  )}
                </GlassCard>
              </motion.div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          <GlassCard className="lg:col-span-2 p-4 sm:p-6">
            <h3 className="text-sm font-semibold mb-4">Activity Overview</h3>
            <div className="h-[240px] sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorInv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.72 0.19 265)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.72 0.19 265)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="oklch(0.65 0.02 265)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.65 0.02 265)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.14 0.025 265 / 90%)",
                      border: "1px solid oklch(1 0 0 / 12%)",
                      borderRadius: "12px",
                      backdropFilter: "blur(12px)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="entities"
                    stroke="oklch(0.72 0.19 265)"
                    fill="url(#colorInv)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <GlassCard className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Recent Activity</h3>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))
              ) : stats?.recent_activity.length ? (
                stats.recent_activity.map((activity) => (
                  <Link
                    key={activity.id}
                    href={`/investigations/${activity.id}`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-accent/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 ml-2 text-[10px]">
                      {activity.status}
                    </Badge>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No recent activity. Create your first investigation.
                </p>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </AppShell>
  );
}
