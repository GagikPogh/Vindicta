"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { GlitchButton } from "@/components/ui/glitch-button";
import { ScrambleText } from "@/components/ui/scramble-text";

const HASH_CHARS = "0123456789abcdef";

function fakeHash(len = 12) {
  return Array.from({ length: len }, () => HASH_CHARS[Math.floor(Math.random() * 16)]).join("");
}

interface ScanFieldProps {
  label: string;
  type?: string;
  name: string;
  autoComplete?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}

function ScanField({
  label,
  type = "text",
  name,
  autoComplete,
  value,
  onChange,
  required,
  placeholder,
}: ScanFieldProps) {
  const [focused, setFocused] = useState(false);
  const [hash, setHash] = useState(fakeHash);

  useEffect(() => {
    if (!focused) return;
    const id = setInterval(() => setHash(fakeHash()), 220);
    return () => clearInterval(id);
  }, [focused]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={name} className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyber-mute">
          {label}
        </label>
        {focused && (
          <span className="font-mono text-[9px] text-crimson/80 tabular-nums">{hash}</span>
        )}
      </div>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={[
          "w-full bg-graphite-2/80 px-4 py-3 font-mono text-sm text-cyber-white",
          "border border-white/10 outline-none transition-all duration-300",
          "placeholder:text-cyber-mute/50",
          focused ? "border-crimson shadow-glow-sm" : "hover:border-white/20",
        ].join(" ")}
      />
    </div>
  );
}

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
          { label: "Full name", name: "full_name", autoComplete: "name", value: fullName, set: setFullName },
          { label: "Email", name: "email", type: "email", autoComplete: "email", value: email, set: setEmail },
          { label: "Password", name: "password", type: "password", autoComplete: "new-password", value: password, set: setPassword },
        ]
      : [
          { label: "Email", name: "email", type: "email", autoComplete: "email", value: email, set: setEmail },
          { label: "Password", name: "password", type: "password", autoComplete: "current-password", value: password, set: setPassword },
        ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="relative z-10 w-full max-w-sm"
    >
      <motion.div
        aria-hidden
        initial={{ top: "-10%" }}
        animate={{ top: "110%" }}
        transition={{ duration: 0.9, ease: "easeIn" }}
        className="pointer-events-none absolute left-0 z-20 h-px w-full bg-crimson shadow-glow-sm"
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
            <motion.div
              key={f.name}
              initial={{ clipPath: "inset(0 0 100% 0)", opacity: 0 }}
              animate={{ clipPath: "inset(0 0 0% 0)", opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.25 + i * 0.12, ease: [0.2, 0.9, 0.2, 1] }}
            >
              <ScanField
                label={f.label}
                name={f.name}
                type={f.type}
                autoComplete={f.autoComplete}
                value={f.value}
                onChange={f.set}
                required
              />
            </motion.div>
          ))}

          <GlitchButton type="submit" className="mt-2 w-full" disabled={loading}>
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
