"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, Search as SearchIcon, Clock, Database, GitBranch } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import type { SearchResult, SearchResponse } from "@/lib/types";

const entityTypeColors: Record<string, string> = {
  person: "bg-chart-1/20 text-chart-1",
  organization: "bg-chart-2/20 text-chart-2",
  financial: "bg-chart-4/20 text-chart-4",
  device: "bg-chart-3/20 text-chart-3",
  location: "bg-primary/20 text-primary",
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [entityType, setEntityType] = useState<string>("all");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const handleSearch = useCallback(async (searchQuery?: string) => {
    const q = (searchQuery ?? query).trim();
    if (!q) return;

    setLoading(true);
    try {
      const response = await api.search.query(q, {
        entity_types: entityType !== "all" ? [entityType] : undefined,
        limit: 30,
      });
      setResults(response);
      setRecentSearches((prev) => [q, ...prev.filter((s) => s !== q)].slice(0, 5));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [query, entityType]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        <PageHeader
          title="Search"
          description="Find entities across investigations and knowledge graph"
        />

        <GlassCard strong className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search people, organizations, accounts..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-12 pl-10 text-base"
              />
            </div>
            <Select value={entityType} onValueChange={(v) => v && setEntityType(v)}>
              <SelectTrigger className="w-full sm:w-40 h-12">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="person">Person</SelectItem>
                <SelectItem value="organization">Organization</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="device">Device</SelectItem>
                <SelectItem value="location">Location</SelectItem>
              </SelectContent>
            </Select>
            <Button className="h-12 px-6" onClick={() => handleSearch()} disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>

          {recentSearches.length > 0 && !results && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Recent:
              </span>
              {recentSearches.map((s) => (
                <button
                  key={s}
                  onClick={() => { setQuery(s); handleSearch(s); }}
                  className="text-xs px-2.5 py-1 rounded-full glass hover:bg-accent transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </GlassCard>

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl" />
              ))}
            </motion.div>
          )}

          {results && !loading && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{results.total} results for &ldquo;{results.query}&rdquo;</span>
                <span>{results.took_ms}ms</span>
              </div>

              {results.results.length === 0 ? (
                <GlassCard className="p-8 text-center">
                  <p className="text-muted-foreground">No entities found. Try a different query.</p>
                </GlassCard>
              ) : (
                <div className="space-y-2">
                  {results.results.map((result: SearchResult, i: number) => (
                    <motion.div
                      key={`${result.id}-${i}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <SearchResultCard result={result} />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}

function SearchResultCard({ result }: { result: SearchResult }) {
  const typeColor = entityTypeColors[result.entity_type] || "bg-muted text-muted-foreground";

  return (
    <GlassCard className="p-4 hover:border-primary/20 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium truncate">{result.name}</h3>
            <Badge className={`text-[10px] ${typeColor}`}>{result.entity_type}</Badge>
            {result.risk_score > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                Risk {result.risk_score.toFixed(0)}
              </Badge>
            )}
          </div>
          {result.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{result.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              {result.source === "graph" ? <GitBranch className="h-3 w-3" /> : <Database className="h-3 w-3" />}
              {result.source}
            </span>
          </div>
        </div>
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/graph?entity=${result.id}`} />}>
          View graph
        </Button>
      </div>
    </GlassCard>
  );
}
