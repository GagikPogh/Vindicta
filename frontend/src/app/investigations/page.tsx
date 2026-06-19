"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, FolderSearch, MoreHorizontal, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { Investigation } from "@/lib/types";

const statusColors: Record<string, string> = {
  active: "bg-chart-3/20 text-chart-3",
  draft: "bg-muted text-muted-foreground",
  on_hold: "bg-chart-4/20 text-chart-4",
  closed: "bg-secondary text-secondary-foreground",
  archived: "bg-muted text-muted-foreground",
};

const priorityColors: Record<string, string> = {
  low: "text-muted-foreground",
  medium: "text-chart-2",
  high: "text-chart-4",
  critical: "text-destructive",
};

export default function InvestigationsPage() {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [creating, setCreating] = useState(false);

  const loadInvestigations = async () => {
    try {
      const data = await api.investigations.list();
      setInvestigations(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load investigations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvestigations();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const inv = await api.investigations.create({ title, description, priority });
      setInvestigations((prev) => [inv, ...prev]);
      setDialogOpen(false);
      setTitle("");
      setDescription("");
      toast.success("Investigation created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.investigations.delete(id);
      setInvestigations((prev) => prev.filter((i) => i.id !== id));
      toast.success("Investigation deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        <PageHeader
          title="Investigations"
          description="Manage and track your active cases"
          action={
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger
                render={
                  <Button>
                    <Plus className="h-4 w-4" />
                    New Investigation
                  </Button>
                }
              />
              <DialogContent className="glass-strong border-glass-border sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Investigation</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Operation Nightfall"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief case description..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={(v) => v && setPriority(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={creating}>
                    {creating ? "Creating..." : "Create Investigation"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          }
        />

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : investigations.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <FolderSearch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-1">No investigations yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first investigation to start tracking entities and events.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Create Investigation
            </Button>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {investigations.map((inv, i) => (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <GlassCard className="p-4 sm:p-5 hover:border-primary/20 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/investigations/${inv.id}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold truncate">{inv.title}</h3>
                        <Badge className={`text-[10px] ${statusColors[inv.status] || ""}`}>
                          {inv.status}
                        </Badge>
                        <span className={`text-xs font-medium ${priorityColors[inv.priority]}`}>
                          {inv.priority}
                        </span>
                      </div>
                      {inv.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{inv.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{inv.entity_count} entities</span>
                        <span>{inv.event_count} events</span>
                        <span>
                          Updated {formatDistanceToNow(new Date(inv.updated_at), { addSuffix: true })}
                        </span>
                      </div>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="glass-strong">
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleDelete(inv.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
