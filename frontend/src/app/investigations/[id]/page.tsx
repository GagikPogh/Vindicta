"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  GitBranch,
  Plus,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import type { Entity, Investigation, TimelineEvent } from "@/lib/types";

export default function InvestigationDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityDialogOpen, setEntityDialogOpen] = useState(false);
  const [entityName, setEntityName] = useState("");
  const [entityType, setEntityType] = useState("person");
  const [riskScore, setRiskScore] = useState("0");

  useEffect(() => {
    const load = async () => {
      try {
        const [inv, ents, evts] = await Promise.all([
          api.investigations.get(id),
          api.investigations.listEntities(id),
          api.timeline.list(id),
        ]);
        setInvestigation(inv);
        setEntities(ents);
        setEvents(evts);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load investigation");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleAddEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const entity = await api.investigations.createEntity(id, {
        name: entityName,
        entity_type: entityType,
        risk_score: parseFloat(riskScore),
      });
      setEntities((prev) => [...prev, entity]);
      setEntityDialogOpen(false);
      setEntityName("");
      toast.success("Entity added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add entity");
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  if (!investigation) {
    return (
      <AppShell>
        <GlassCard className="p-8 text-center max-w-md mx-auto">
          <p className="text-muted-foreground">Investigation not found</p>
          <Button className="mt-4" render={<Link href="/investigations" />}>
            Back to investigations
          </Button>
        </GlassCard>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" render={<Link href="/investigations" />}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
                {investigation.title}
              </h1>
              <Badge variant="secondary">{investigation.status}</Badge>
            </div>
            {investigation.description && (
              <p className="text-sm text-muted-foreground mt-1">{investigation.description}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Entities", value: entities.length, icon: Users },
            { label: "Events", value: events.length, icon: Clock },
            { label: "Priority", value: investigation.priority, icon: GitBranch },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <GlassCard className="p-4 text-center">
                  <Icon className="h-4 w-4 text-primary mx-auto mb-2" />
                  <p className="text-lg font-bold capitalize">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>

        <Tabs defaultValue="entities">
          <TabsList className="glass w-full sm:w-auto">
            <TabsTrigger value="entities">Entities</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="graph">Graph</TabsTrigger>
          </TabsList>

          <TabsContent value="entities" className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Dialog open={entityDialogOpen} onOpenChange={setEntityDialogOpen}>
                <DialogTrigger
                  render={
                    <Button size="sm">
                      <Plus className="h-4 w-4" />
                      Add Entity
                    </Button>
                  }
                />
                <DialogContent className="glass-strong border-glass-border">
                  <DialogHeader>
                    <DialogTitle>Add Entity</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddEntity} className="space-y-4 mt-2">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input value={entityName} onChange={(e) => setEntityName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={entityType} onValueChange={(v) => v && setEntityType(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="person">Person</SelectItem>
                          <SelectItem value="organization">Organization</SelectItem>
                          <SelectItem value="financial">Financial</SelectItem>
                          <SelectItem value="device">Device</SelectItem>
                          <SelectItem value="location">Location</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Risk Score (0-100)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={riskScore}
                        onChange={(e) => setRiskScore(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full">Add Entity</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {entities.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <p className="text-sm text-muted-foreground">No entities linked to this investigation.</p>
              </GlassCard>
            ) : (
              entities.map((entity) => (
                <GlassCard key={entity.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{entity.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{entity.entity_type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {entity.risk_score > 0 && (
                      <Badge variant="destructive">Risk {entity.risk_score}</Badge>
                    )}
                    {entity.neo4j_id && (
                      <Button variant="outline" size="sm" render={<Link href={`/graph?entity=${entity.neo4j_id}`} />}>
                        Graph
                      </Button>
                    )}
                  </div>
                </GlassCard>
              ))
            )}
          </TabsContent>

          <TabsContent value="timeline" className="mt-4 space-y-3">
            {events.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <p className="text-sm text-muted-foreground mb-3">No timeline events yet.</p>
                <Button size="sm" render={<Link href={`/timeline?investigation=${id}`} />}>
                  Add Events
                </Button>
              </GlassCard>
            ) : (
              events.map((event) => (
                <GlassCard key={event.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">{event.event_type}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(event.occurred_at), { addSuffix: true })}
                    </span>
                  </div>
                </GlassCard>
              ))
            )}
          </TabsContent>

          <TabsContent value="graph" className="mt-4">
            <GlassCard className="p-8 text-center">
              <GitBranch className="h-10 w-10 text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Visualize relationships for entities in this investigation.
              </p>
              <Button render={<Link href="/graph" />}>
                Open Relationship Graph
              </Button>
            </GlassCard>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
