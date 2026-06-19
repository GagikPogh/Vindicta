"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Clock,
  ExternalLink,
  Globe,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Share2,
  Shield,
  Tag,
  Users,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ScanningIris } from "@/components/phone/scanning-iris";
import { ShutterCard } from "@/components/phone/shutter-card";
import { TerminalLog } from "@/components/phone/terminal-log";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { PhoneLookupHistoryItem, PhoneLookupResult } from "@/lib/types";

const PLATFORM_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  telegram: { icon: MessageCircle, color: "text-sky-400", label: "Telegram" },
  instagram: { icon: Share2, color: "text-pink-400", label: "Instagram" },
  facebook: { icon: Users, color: "text-blue-400", label: "Facebook" },
  viber: { icon: Phone, color: "text-purple-400", label: "Viber" },
  whatsapp: { icon: MessageCircle, color: "text-green-400", label: "WhatsApp" },
  twitter: { icon: Globe, color: "text-sky-300", label: "Twitter/X" },
  linkedin: { icon: Users, color: "text-blue-300", label: "LinkedIn" },
  tiktok: { icon: Globe, color: "text-foreground", label: "TikTok" },
  vk: { icon: Users, color: "text-blue-500", label: "VK" },
  google: { icon: Search, color: "text-muted-foreground", label: "Google" },
  truecaller: { icon: Phone, color: "text-primary", label: "Truecaller" },
};

const SOURCE_LABELS: Record<string, string> = {
  internal: "Internal DB",
  imported: "Contact import",
  investigator: "Analyst",
  osint_public: "Public OSINT",
  carrier_api: "Carrier API",
  demo: "Demo data",
};

const DEMO_NUMBERS = ["+79001234567", "+14155550100"];

function openUrl(url: string) {
  if (url.startsWith("viber://")) {
    window.location.href = url;
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export default function PhoneLookupPage() {
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<PhoneLookupResult | null>(null);
  const [history, setHistory] = useState<PhoneLookupHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [newTag, setNewTag] = useState("");

  const loadHistory = useCallback(async () => {
    try {
      const data = await api.phone.history();
      setHistory(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleLookup = async (query?: string) => {
    const q = (query ?? phone).trim();
    if (!q) return;

    setLoading(true);
    setResult(null);
    try {
      const data = await api.phone.lookup(q);
      setResult(data);
      setPhone(q);
      loadHistory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!result || !newTag.trim()) return;
    try {
      await api.phone.addTag(result.e164, newTag.trim());
      toast.success("Метка добавлена");
      setTagDialogOpen(false);
      setNewTag("");
      handleLookup(result.e164);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка");
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        <PageHeader
          title="Phone Intelligence"
          description="Contact tags, social profiles, and carrier data from internal records and lawful OSINT sources"
        />

        <GlassCard strong glow className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="+7 900 123 45 67"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                className="h-12 pl-10 text-base font-mono"
              />
            </div>
            <Button className="h-12 px-8" onClick={() => handleLookup()} disabled={loading}>
              {loading ? "Scanning..." : "Analyze"}
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Demo:</span>
            {DEMO_NUMBERS.map((num) => (
              <button
                key={num}
                onClick={() => { setPhone(num); handleLookup(num); }}
                className="text-xs font-mono px-2.5 py-1 rounded-full glass hover:bg-accent transition-colors"
              >
                {num}
              </button>
            ))}
          </div>
        </GlassCard>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence mode="wait">
              {loading && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <GlassCard className="p-8 flex flex-col items-center gap-6">
                    <ScanningIris size={112} />
                    <div className="w-full max-w-md">
                      <p className="font-mono text-xs uppercase tracking-[0.2em] text-crimson text-center mb-3">
                        Scanning number...
                      </p>
                      <TerminalLog active className="max-h-40" />
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {result && !loading && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <ShutterCard title="Number Profile" icon={<Phone className="h-4 w-4 text-crimson" />} defaultOpen>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-2xl font-bold font-mono tracking-tight">{result.e164}</p>
                        {result.carrier && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {result.carrier.name && (
                              <Badge variant="secondary">{result.carrier.name}</Badge>
                            )}
                            {result.carrier.line_type && (
                              <Badge variant="outline" className="capitalize">{result.carrier.line_type}</Badge>
                            )}
                            {result.carrier.region && (
                              <Badge variant="outline">{result.carrier.region}</Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{result.took_ms}ms</p>
                        {result.cached && <p>cached</p>}
                        <p>{result.tag_count} tags · {result.profile_count} profiles</p>
                      </div>
                    </div>

                    {result.risk_indicators.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {result.risk_indicators.map((r) => (
                          <Badge key={r.type} variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {r.label}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </ShutterCard>

                  <Tabs defaultValue="tags">
                    <TabsList className="glass w-full sm:w-auto">
                      <TabsTrigger value="tags">
                        <Tag className="h-4 w-4 sm:mr-1.5" />
                        <span className="hidden sm:inline">Contact Tags</span>
                        <span className="sm:hidden">Tags</span>
                        <Badge className="ml-1.5 text-[10px]" variant="secondary">{result.tag_count}</Badge>
                      </TabsTrigger>
                      <TabsTrigger value="social">
                        <Users className="h-4 w-4 sm:mr-1.5" />
                        <span className="hidden sm:inline">Social Profiles</span>
                        <Badge className="ml-1.5 text-[10px]" variant="secondary">{result.profile_count}</Badge>
                      </TabsTrigger>
                      <TabsTrigger value="links">
                        <ExternalLink className="h-4 w-4 sm:mr-1.5" />
                        <span className="hidden sm:inline">Search Links</span>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="tags" className="mt-4 space-y-2">
                      <div className="flex justify-end mb-2">
                        <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
                          <DialogTrigger
                            render={
                              <Button size="sm" variant="outline">
                                <Plus className="h-4 w-4" />
                                Add tag
                              </Button>
                            }
                          />
                          <DialogContent className="glass-strong border-glass-border">
                            <DialogHeader>
                              <DialogTitle>New contact tag</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAddTag} className="space-y-4 mt-2">
                              <div className="space-y-2">
                                <Label>Contact name</Label>
                                <Input
                                  value={newTag}
                                  onChange={(e) => setNewTag(e.target.value)}
                                  placeholder="Name in address book"
                                  required
                                />
                              </div>
                              <Button type="submit" className="w-full">Save</Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>

                      {result.contact_tags.length === 0 ? (
                        <GlassCard className="p-8 text-center text-sm text-muted-foreground">
                          No contact tags found in database
                        </GlassCard>
                      ) : (
                        result.contact_tags.map((tag, i) => (
                          <motion.div
                            key={tag.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                          >
                            <GlassCard className="p-4 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-semibold text-base">{tag.tag_name}</p>
                                <div className="flex flex-wrap gap-2 mt-1.5">
                                  <Badge variant="secondary" className="text-[10px]">
                                    {SOURCE_LABELS[tag.source] || tag.source}
                                  </Badge>
                                  {tag.source_detail && (
                                    <span className="text-[10px] text-muted-foreground">{tag.source_detail}</span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(tag.recorded_at), "d MMM yyyy", { locale: enUS })}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {Math.round(tag.confidence * 100)}% confidence
                                </p>
                              </div>
                            </GlassCard>
                          </motion.div>
                        ))
                      )}
                    </TabsContent>

                    <TabsContent value="social" className="mt-4 space-y-2">
                      {result.social_profiles.length === 0 ? (
                        <GlassCard className="p-8 text-center text-sm text-muted-foreground">
                          No social profiles found
                        </GlassCard>
                      ) : (
                        result.social_profiles.map((profile, i) => {
                          const meta = PLATFORM_META[profile.platform] || {
                            icon: Globe,
                            color: "text-muted-foreground",
                            label: profile.platform,
                          };
                          const Icon = meta.icon;
                          return (
                            <motion.div
                              key={profile.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.04 }}
                            >
                              <GlassCard className="p-4 hover:border-primary/25 transition-colors">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent ${meta.color}`}>
                                      <Icon className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-medium">{meta.label}</p>
                                      {profile.display_name && (
                                        <p className="text-sm text-muted-foreground truncate">{profile.display_name}</p>
                                      )}
                                      {profile.username && (
                                        <p className="text-xs font-mono text-primary truncate">@{profile.username}</p>
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => openUrl(profile.profile_url)}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                    Open
                                  </Button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-3 text-[10px] text-muted-foreground">
                                  <Badge variant="outline" className="text-[10px]">
                                    {SOURCE_LABELS[profile.source] || profile.source}
                                  </Badge>
                                  <span>Found {format(new Date(profile.discovered_at), "d MMM yyyy", { locale: enUS })}</span>
                                  <span>{Math.round(profile.confidence * 100)}%</span>
                                </div>
                              </GlassCard>
                            </motion.div>
                          );
                        })
                      )}
                    </TabsContent>

                    <TabsContent value="links" className="mt-4 space-y-2">
                      {result.search_links.map((link) => {
                        const meta = PLATFORM_META[link.platform] || {
                          icon: ExternalLink,
                          color: "text-muted-foreground",
                          label: link.label,
                        };
                        const Icon = meta.icon;
                        return (
                          <GlassCard
                            key={link.url}
                            className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:border-primary/25 transition-colors"
                            onClick={() => openUrl(link.url)}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className={`h-4 w-4 ${meta.color}`} />
                              <span className="text-sm font-medium">{link.label}</span>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </GlassCard>
                        );
                      })}
                    </TabsContent>
                  </Tabs>
                </motion.div>
              )}

              {!result && !loading && (
                <GlassCard className="p-10 text-center">
                  <Shield className="h-12 w-12 text-primary mx-auto mb-4 opacity-60" />
                  <h3 className="font-semibold mb-2">Phone Intelligence</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Enter a phone number to search contact tags, linked social profiles,
                    and carrier data from internal records and lawful OSINT sources.
                  </p>
                </GlassCard>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-4">
            <GlassCard className="p-4 sm:p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Lookup History
              </h3>
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground">No history yet</p>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { setPhone(item.e164); handleLookup(item.e164); }}
                      className="w-full text-left p-3 rounded-xl hover:bg-accent/50 transition-colors"
                    >
                      <p className="font-mono text-sm font-medium">{item.e164}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {item.tag_count} tags · {item.profile_count} profiles ·{" "}
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: enUS })}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </GlassCard>

            <GlassCard className="p-4 sm:p-5">
              <h3 className="text-sm font-semibold mb-2">Data Sources</h3>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li>• Internal intelligence database</li>
                <li>• Contact list imports</li>
                <li>• Public OSINT</li>
                <li>• Carrier API (Numverify)</li>
                <li>• Direct verification links</li>
              </ul>
              <p className="text-[10px] text-muted-foreground mt-3 border-t border-glass-border pt-3">
                Data is collected only from lawful sources and proprietary investigations.
                Third-party breach databases are not supported.
              </p>
            </GlassCard>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
