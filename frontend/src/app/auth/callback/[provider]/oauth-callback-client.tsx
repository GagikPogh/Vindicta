"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield } from "lucide-react";
import { toast } from "sonner";

import { GlassCard } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { setTokens } from "@/lib/auth";
import { useAuthStore } from "@/stores/auth-store";

export default function OAuthCallbackClient({ params }: { params: Promise<{ provider: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthStore();
  const [provider, setProvider] = useState<string>("");

  useEffect(() => {
    params.then((p) => setProvider(p.provider));
  }, [params]);

  useEffect(() => {
    if (!provider) return;

    const code = searchParams.get("code");
    if (!code) {
      toast.error("Authentication failed");
      router.replace("/login");
      return;
    }

    const handleCallback = async () => {
      try {
        const redirectUri = `${window.location.origin}/auth/callback/${provider}`;
        const tokens = provider === "google"
          ? await api.auth.googleCallback(code, redirectUri)
          : await api.auth.appleCallback(code, redirectUri);

        setTokens(tokens);
        const user = await api.auth.me();
        setUser(user);
        toast.success("Signed in successfully");
        router.replace("/dashboard");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Authentication failed");
        router.replace("/login");
      }
    };

    handleCallback();
  }, [provider, searchParams, router, setUser]);

  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <GlassCard className="p-8 w-full max-w-sm text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
            <Shield className="h-6 w-6 text-primary animate-pulse" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Completing authentication...</p>
        <Skeleton className="h-2 w-full rounded-full" />
      </GlassCard>
    </div>
  );
}
