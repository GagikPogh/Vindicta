"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Clock, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import type { Investigation, TimelineEvent } from "@/lib/types";

const eventTypeColors: Record<string, string> = {
  communication: "bg-chart-1/20 text-chart-1",
  transaction: "bg-chart-4/20 text-chart-4",
  location: "bg-primary/20 text-primary",
  document: "bg-chart-2/20 text-chart-2",
  system: "bg-muted text-muted-foreground",
  custom: "bg-chart-3/20 text-chart-3",
};

function TimelineContent() {
  const searchParams = useSearchParams();
  const investigationParam = searchParams.get("investigation");

  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [selectedId, setSelectedId] = useState<string>(investigationParam || "");
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("custom");
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 16));

  useEffect(() => {
    api.investigations.list()
      .then((data) => {
        setInvestigations(data);
        if (!selectedId && data.length > 0) {
          setSelectedId(data[0].id);
        }
      })
      .catch(() => toast.error("Failed to load investigations"))
      .finally(() => setLoading(false));
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    api.timeline.list(selectedId)
      .then(setEvents)
      .catch(() => toast.error("Failed to load timeline"));
  }, [selectedId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    try {
      const event = await api.timeline.create({
        title,
        description,
        event_type: eventType,
        occurred_at: new Date(occurredAt).toISOString(),
        investigation_id: selectedId,
      });
      setEvents((prev) => [event, ...prev].sort(
        (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
      ));
      setDialogOpen(false);
      setTitle("");
      setDescription("");
      toast.success("Event added to timeline");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create event");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.timeline.delete(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      toast.success("Event removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Timeline"
        description="Chronological reconstruction of investigative events"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger
              render={
                <Button disabled={!selectedId}>
                  <Plus className="h-4 w-4" />
                  Add Event
                </Button>
              }
            />
            <DialogContent className="glass-strong border-glass-border">
              <DialogHeader>
                <DialogTitle>Add Timeline Event</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={eventType} onValueChange={(v) => v && setEventType(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="communication">Communication</SelectItem>
                        <SelectItem value="transaction">Transaction</SelectItem>
                        <SelectItem value="location">Location</SelectItem>
                        <SelectItem value="document">Document</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Occurred at</Label>
                    <Input
                      type="datetime-local"
                      value={occurredAt}
                      onChange={(e) => setOccurredAt(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">Add Event</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {investigations.length > 0 && (
        <Select value={selectedId} onValueChange={(v) => v && setSelectedId(v)}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue placeholder="Select investigation" />
          </SelectTrigger>
          <SelectContent>
            {investigations.map((inv) => (
              <SelectItem key={inv.id} value={inv.id}>{inv.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : !selectedId ? (
        <GlassCard className="p-8 text-center">
          <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Create an investigation to start building timelines.</p>
        </GlassCard>
      ) : events.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <p className="text-sm text-muted-foreground">No events in this timeline yet.</p>
        </GlassCard>
      ) : (
        <div className="relative">
          <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-px bg-glass-border" />
          <div className="space-y-4">
            {events.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative pl-10 sm:pl-14"
              >
                <div className="absolute left-2.5 sm:left-4 top-5 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                <GlassCard className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-medium">{event.title}</h3>
                        <Badge className={`text-[10px] ${eventTypeColors[event.event_type] || ""}`}>
                          {event.event_type}
                        </Badge>
                      </div>
                      {event.description && (
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(event.occurred_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(event.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TimelinePage() {
  return (
    <AppShell>
      <Suspense fallback={<Skeleton className="h-96 w-full max-w-3xl mx-auto rounded-2xl" />}>
        <TimelineContent />
      </Suspense>
    </AppShell>
  );
}
