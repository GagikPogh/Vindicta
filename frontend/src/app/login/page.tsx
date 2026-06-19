"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import { toast } from "sonner";

import { AuthScreen } from "@/components/auth/auth-screen";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();

  const handleSubmit = async (data: Record<string, string>) => {
    try {
      await login(data.email, data.password);
      toast.success("Welcome back");
      router.push("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    try {
      const redirectUri = `${window.location.origin}/auth/callback/${provider}`;
      const { url } = provider === "google"
        ? await api.auth.getGoogleUrl(redirectUri)
        : await api.auth.getAppleUrl(redirectUri);
      window.location.href = url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "OAuth not configured");
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-12 safe-top safe-bottom">
      <Link href="/" className="mb-8 inline-flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-crimson/20">
          <Shield className="h-5 w-5 text-crimson" />
        </div>
        <span className="font-display text-sm tracking-[0.2em] text-cyber-white uppercase">Vindicta</span>
      </Link>

      <AuthScreen mode="login" loading={isLoading} onSubmit={handleSubmit} />

      <div className="relative my-8 w-full max-w-sm">
        <Separator className="bg-white/10" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-cyber-mute font-mono uppercase tracking-widest">
          or continue with
        </span>
      </div>

      <div className="grid w-full max-w-sm grid-cols-2 gap-3">
        <Button variant="outline" className="h-11" onClick={() => handleOAuth("google")}>
          Google
        </Button>
        <Button variant="outline" className="h-11" onClick={() => handleOAuth("apple")}>
          Apple
        </Button>
      </div>

      <p className="mt-8 text-center text-sm text-cyber-mute">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-crimson hover:underline font-medium">
          Create one
        </Link>
      </p>
    </div>
  );
}
