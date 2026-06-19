"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { hudTransition } from "@/lib/motion";

function pseudoHash(input: string, salt: number) {
  let h1 = 0xdeadbeef ^ salt;
  let h2 = 0x41c6ce57 ^ salt;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = (h1 ^ (h1 >>> 16)) >>> 0;
  h2 = (h2 ^ (h2 >>> 16)) >>> 0;
  return (h1.toString(16) + h2.toString(16)).slice(0, 12).toUpperCase();
}

interface ScanFieldProps {
  label?: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  name?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  clipReveal?: boolean;
  revealDelay?: number;
  className?: string;
  onSubmit?: () => void;
}

export function ScanField({
  label = "TARGET SIGNATURE",
  type = "text",
  value,
  onChange,
  name = "target",
  placeholder = "8.8.8.8 or infrastructure.example.net",
  autoComplete = "off",
  required = false,
  clipReveal = false,
  revealDelay = 0,
  className = "",
  onSubmit,
}: ScanFieldProps) {
  const [focused, setFocused] = useState(false);
  const [hash, setHash] = useState("000000000000");
  const saltRef = useRef(0);
  const inputId = useId();

  useEffect(() => {
    if (!value) {
      setHash("000000000000");
      return;
    }
    saltRef.current += 1;
    setHash(pseudoHash(value, saltRef.current));
  }, [value]);

  return (
    <motion.div
      className={`relative ${className}`}
      initial={clipReveal ? { clipPath: "inset(0 0 100% 0)", opacity: 0 } : false}
      animate={clipReveal ? { clipPath: "inset(0 0 0% 0)", opacity: 1 } : false}
      transition={hudTransition(0.55, revealDelay)}
    >
      <label
        htmlFor={inputId}
        className={`mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] transition-colors duration-200 ${
          focused ? "text-vindicta-red" : "text-cyber-mute"
        }`}
      >
        <span>{label}</span>
        <AnimatePresence>
          {focused && (
            <motion.span
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={hudTransition(0.15)}
              className="font-mono text-[9px] tracking-tighter text-vindicta-red/70"
            >
              0x{hash}
            </motion.span>
          )}
        </AnimatePresence>
      </label>

      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit?.()}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className={`w-full rounded-sm border bg-graphite-950 px-3.5 py-3 font-mono text-sm text-cyber-white outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-cyber-mute/40 ${
            focused
              ? "border-vindicta-red shadow-[0_0_0_1px_rgba(255,0,51,0.4),0_0_18px_-2px_rgba(255,0,51,0.55)]"
              : "border-white/10 hover:border-white/20"
          }`}
        />

        <span
          className={`pointer-events-none absolute -left-px -top-px h-2 w-2 border-l border-t transition-colors duration-200 ${
            focused ? "border-vindicta-red" : "border-transparent"
          }`}
        />
        <span
          className={`pointer-events-none absolute -bottom-px -right-px h-2 w-2 border-b border-r transition-colors duration-200 ${
            focused ? "border-vindicta-red" : "border-transparent"
          }`}
        />

        <AnimatePresence>
          {focused && (
            <motion.div
              key="sweep"
              initial={{ opacity: 0.9, y: 0 }}
              animate={{ opacity: 0, y: "100%" }}
              exit={{ opacity: 0 }}
              transition={hudTransition(0.7)}
              className="pointer-events-none absolute left-0 top-0 h-px w-full bg-vindicta-red/80"
              style={{ willChange: "transform, opacity" }}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
