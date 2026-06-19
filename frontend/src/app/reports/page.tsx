"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Plus, Download, Sparkles, Trash2, MoreHorizontal } from "lucide-react";
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
import type { Investigation, Report } from "@/lib/types";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  generating: "bg-chart-4/20 text-chart-4",
  completed: "bg-chart-3/20 text-chart-3",
  failed: "bg-destructive/20 text-destructive",
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [investigationId, setInvestigationId] = useState("");
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.reports.list(), api.investigations.list()])
      .then(([reps, invs]) => {
        setReports(reps);
        setInvestigations(invs);
      })
      .catch(() => toast.error("Failed to load reports"))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const report = await api.reports.create({
        title,
        description,
        investigation_id: investigationId || undefined,
      });
      setReports((prev) => [report, ...prev]);
      setDialogOpen(false);
      setTitle("");
      setDescription("");
      toast.success("Report created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create report");
    } finally {
      setCreating(false);
    }
  };

  const handleGenerate = async (id: string) => {
    setGenerating(id);
    try {
      const report = await api.reports.generate(id);
      setReports((prev) => prev.map((r) => (r.id === id ? report : r)));
      setSelectedReport(report);
      toast.success("Report generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setGenerating(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.reports.delete(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
      if (selectedReport?.id === id) setSelectedReport(null);
      toast.success("Report deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  const handleExport = (report: Report) => {
    const blob = new Blob([JSON.stringify(report.content, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.title.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported");
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-6xl mx-auto">
        <PageHeader
          title="Reports"
          description="Generate and manage investigative reports"
          action={
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger
                render={
                  <Button>
                    <Plus className="h-4 w-4" />
                    New Report
                  </Button>
                }
              />
              <DialogContent className="glass-strong border-glass-border">
                <DialogHeader>
                  <DialogTitle>Create Report</DialogTitle>
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
                  <div className="space-y-2">
                    <Label>Investigation</Label>
                    <Select value={investigationId} onValueChange={(v) => v && setInvestigationId(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select investigation (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {investigations.map((inv) => (
                          <SelectItem key={inv.id} value={inv.id}>{inv.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={creating}>
                    {creating ? "Creating..." : "Create Report"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          }
        />

        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))
            ) : reports.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No reports yet. Create one to get started.</p>
              </GlassCard>
            ) : (
              reports.map((report, i) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <GlassCard
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedReport?.id === report.id ? "border-primary/40" : "hover:border-primary/20"
                    }`}
                    onClick={() => setSelectedReport(report)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium truncate">{report.title}</h3>
                          <Badge className={`text-[10px] ${statusColors[report.status]}`}>
                            {report.status}
                          </Badge>
                        </div>
                        {report.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{report.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(report.updated_at), { addSuffix: true })}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-sm" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="glass-strong">
                          {report.investigation_id && (
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); handleGenerate(report.id); }}
                              disabled={generating === report.id}
                            >
                              <Sparkles className="h-4 w-4" />
                              {generating === report.id ? "Generating..." : "Generate"}
                            </DropdownMenuItem>
                          )}
                          {report.status === "completed" && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleExport(report); }}>
                              <Download className="h-4 w-4" />
                              Export JSON
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={(e) => { e.stopPropagation(); handleDelete(report.id); }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </GlassCard>
                </motion.div>
              ))
            )}
          </div>

          <GlassCard className="p-4 sm:p-6 min-h-[300px] lg:sticky lg:top-20">
            {selectedReport ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">{selectedReport.title}</h3>
                  <Badge className={`mt-1 text-[10px] ${statusColors[selectedReport.status]}`}>
                    {selectedReport.status}
                  </Badge>
                </div>
                {selectedReport.status === "completed" && selectedReport.content ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {(selectedReport.content as { summary?: string }).summary}
                    </p>
                    <pre className="text-xs bg-muted/30 rounded-xl p-4 overflow-auto max-h-[400px] font-mono">
                      {JSON.stringify(selectedReport.content, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">
                      {selectedReport.investigation_id
                        ? "Generate AI-powered report content from investigation data."
                        : "Link this report to an investigation to enable generation."}
                    </p>
                    {selectedReport.investigation_id && (
                      <Button
                        onClick={() => handleGenerate(selectedReport.id)}
                        disabled={generating === selectedReport.id}
                      >
                        <Sparkles className="h-4 w-4" />
                        {generating === selectedReport.id ? "Generating..." : "Generate Report"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Select a report to view details</p>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </AppShell>
  );
}
