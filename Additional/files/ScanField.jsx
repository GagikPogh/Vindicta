"use client";

import { useEffect, useRef, useState, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Lightweight non-cryptographic hash purely for the visual fingerprint readout.
// Deterministic on the current input value + a per-keystroke salt so digits churn
// every time the user types, selling the "live fingerprinting" illusion.
function pseudoHash(input, salt) {
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

/**
 * ScanField
 * -----------------------------------------------------------------------------
 * Text/password input for the Vindicta auth shell. On focus, the border and
 * label flip to the neon-red accent; while the user types, a small live hash
 * readout in the top-right corner re-rolls on every keystroke, simulating an
 * active fingerprinting pass.
 *
 * Props mirror a normal controlled <input>: value, onChange, type, label,
 * placeholder, name, autoComplete, required, plus `clipReveal` to opt into the
 * shutter reveal animation (used by AuthScreen when staggering fields in).
 */
export default function ScanField({
  label = "FIELD",
  type = "text",
  value,
  onChange,
  name,
  placeholder = "",
  autoComplete = "off",
  required = false,
  clipReveal = false,
  revealDelay = 0,
  className = "",
}) {
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
      transition={{ duration: 0.55, delay: revealDelay, ease: [0.65, 0, 0.35, 1] }}
    >
      <label
        htmlFor={inputId}
        className={`mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] transition-colors duration-200 ${
          focused ? "text-[#FF0033]" : "text-zinc-500"
        }`}
      >
        <span>{label}</span>
        <AnimatePresence>
          {focused && (
            <motion.span
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.15 }}
              className="font-mono text-[9px] tracking-tighter text-[#FF0033]/70"
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
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className={`w-full rounded-sm border bg-[#0D0D11] px-3.5 py-2.5 font-mono text-sm text-zinc-200 outline-none transition-all duration-200 placeholder:text-zinc-600 ${
            focused
              ? "border-[#FF0033] shadow-[0_0_0_1px_rgba(255,0,51,0.4),0_0_18px_-2px_rgba(255,0,51,0.55)]"
              : "border-zinc-800 hover:border-zinc-700"
          }`}
        />

        {/* corner ticks, only lit while focused — echoes the HUD bracket motif */}
        <span
          className={`pointer-events-none absolute -left-px -top-px h-2 w-2 border-l border-t transition-colors duration-200 ${
            focused ? "border-[#FF0033]" : "border-transparent"
          }`}
        />
        <span
          className={`pointer-events-none absolute -bottom-px -right-px h-2 w-2 border-b border-r transition-colors duration-200 ${
            focused ? "border-[#FF0033]" : "border-transparent"
          }`}
        />

        {/* scanline that sweeps once per focus event */}
        <AnimatePresence>
          {focused && (
            <motion.div
              key="sweep"
              initial={{ top: "0%", opacity: 0.9 }}
              animate={{ top: "100%", opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="pointer-events-none absolute left-0 h-px w-full bg-[#FF0033]/80"
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
