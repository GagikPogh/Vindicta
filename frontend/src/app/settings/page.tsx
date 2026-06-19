"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Lock, Moon, Shield, User } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    investigationUpdates: true,
    riskAlerts: true,
  });
  const [security, setSecurity] = useState({
    twoFactor: false,
    sessionTimeout: true,
  });

  const initials = user?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "VA";

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.users.updateProfile({ full_name: fullName });
      setUser(updated);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      const updated = await api.users.updateProfile({
        preferences: { notifications, security, theme: "dark" },
      });
      setUser(updated);
      toast.success("Preferences saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save preferences");
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-2xl mx-auto">
        <PageHeader
          title="Settings"
          description="Manage your account and preferences"
        />

        <Tabs defaultValue="profile">
          <TabsList className="glass w-full sm:w-auto">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="security">
              <Lock className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={user?.avatar_url} />
                    <AvatarFallback className="text-lg bg-primary/20 text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{user?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">
                      via {user?.oauth_provider}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={user?.email || ""} disabled />
                  </div>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Save changes"}
                  </Button>
                </form>
              </GlassCard>
            </motion.div>
          </TabsContent>

          <TabsContent value="notifications" className="mt-4">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className="p-6 space-y-4">
                {[
                  { key: "email" as const, label: "Email notifications", desc: "Receive updates via email" },
                  { key: "push" as const, label: "Push notifications", desc: "Browser and mobile alerts" },
                  { key: "investigationUpdates" as const, label: "Investigation updates", desc: "Changes to your cases" },
                  { key: "riskAlerts" as const, label: "Risk alerts", desc: "High-risk entity detections" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={notifications[item.key]}
                      onCheckedChange={(checked) =>
                        setNotifications((prev) => ({ ...prev, [item.key]: checked }))
                      }
                    />
                  </div>
                ))}
                <Separator />
                <Button onClick={handleSavePreferences}>Save preferences</Button>
              </GlassCard>
            </motion.div>
          </TabsContent>

          <TabsContent value="security" className="mt-4">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <GlassCard className="p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Security Settings</h3>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Two-factor authentication</p>
                    <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
                  </div>
                  <Switch
                    checked={security.twoFactor}
                    onCheckedChange={(checked) =>
                      setSecurity((prev) => ({ ...prev, twoFactor: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Session timeout</p>
                    <p className="text-xs text-muted-foreground">Auto-logout after inactivity</p>
                  </div>
                  <Switch
                    checked={security.sessionTimeout}
                    onCheckedChange={(checked) =>
                      setSecurity((prev) => ({ ...prev, sessionTimeout: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Dark mode</p>
                      <p className="text-xs text-muted-foreground">Always enabled for optimal experience</p>
                    </div>
                  </div>
                  <Switch checked disabled />
                </div>

                <Button onClick={handleSavePreferences}>Save security settings</Button>
              </GlassCard>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
