"use client";

import { useState } from "react";
import { motion } from "framer-motion";

import { ScanField } from "@/components/hud/scan-field";
import { GlitchButton } from "@/components/ui/glitch-button";
import { ScrambleText } from "@/components/ui/scramble-text";
import { hudTransition, staggerDelay } from "@/lib/motion";

interface AuthScreenProps {
  mode?: "login" | "register";
  loading?: boolean;
  onSubmit?: (data: Record<string, string>) => void;
}

export function AuthScreen({ mode = "login", loading = false, onSubmit }: AuthScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const fields =
    mode === "register"
      ? [
          { label: "FULL NAME", name: "full_name", autoComplete: "name", value: fullName, set: setFullName },
          { label: "EMAIL", name: "email", type: "email", autoComplete: "email", value: email, set: setEmail },
          { label: "PASSWORD", name: "password", type: "password", autoComplete: "new-password", value: password, set: setPassword },
        ]
      : [
          { label: "EMAIL", name: "email", type: "email", autoComplete: "email", value: email, set: setEmail },
          { label: "PASSWORD", name: "password", type: "password", autoComplete: "current-password", value: password, set: setPassword },
        ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={hudTransition(0.45)}
      className="relative z-10 w-full max-w-sm"
      style={{ willChange: "transform, opacity" }}
    >
      <motion.div
        aria-hidden
        initial={{ opacity: 0.9, y: 0 }}
        animate={{ opacity: 0, y: "110%" }}
        transition={hudTransition(0.9)}
        className="pointer-events-none absolute left-0 top-0 z-20 h-px w-full bg-vindicta-red shadow-glow-sm"
        style={{ willChange: "transform, opacity" }}
      />

      <div className="v-hud-corners relative border border-white/10 bg-graphite/80 p-8 backdrop-blur-sm">
        <ScrambleText
          as="h1"
          text={mode === "register" ? "OPERATOR REGISTRATION" : "SYSTEM ACCESS"}
          className="mb-1 block font-display text-lg font-bold tracking-[0.12em] text-cyber-white"
        />
        <p className="mb-7 font-mono text-[11px] uppercase tracking-[0.2em] text-cyber-mute">
          Vindicta // Secure Terminal
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const data: Record<string, string> = { email, password };
            if (mode === "register") data.full_name = fullName;
            onSubmit?.(data);
          }}
          className="space-y-5"
        >
          {fields.map((f, i) => (
            <ScanField
              key={f.name}
              label={f.label}
              name={f.name}
              type={f.type}
              autoComplete={f.autoComplete}
              value={f.value}
              onChange={f.set}
              required
              clipReveal
              revealDelay={staggerDelay(i + 2)}
            />
          ))}

          <GlitchButton type="submit" className="mt-2 w-full animate-glitchPulse" disabled={loading}>
            {loading
              ? "Processing..."
              : mode === "register"
                ? "Create Access"
                : "Sign In"}
          </GlitchButton>
        </form>
      </div>
    </motion.div>
  );
}
