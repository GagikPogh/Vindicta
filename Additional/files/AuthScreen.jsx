"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, UserPlus } from "lucide-react";
import ScanField from "./ScanField";
import GlitchButton from "./GlitchButton";
import ScrambleText from "./ScrambleText";

/**
 * AuthScreen
 * -----------------------------------------------------------------------------
 * Full sign-in / register surface for Vindicta. On mount, a single laser
 * scanline sweeps top-to-bottom across the panel, and the ScanFields stagger
 * in beneath it with a clip-path shutter reveal (handled inside ScanField via
 * `clipReveal` + `revealDelay`).
 *
 * Props
 *  mode          - "login" | "register" (default "login")
 *  onModeChange  - called with the new mode when the toggle is used
 *  onSubmit      - called with { mode, values } on form submit
 *  loading       - shows the GlitchButton scanning state
 */
export default function AuthScreen({
  mode = "login",
  onModeChange,
  onSubmit,
  loading = false,
}) {
  const [values, setValues] = useState({
    handle: "",
    email: "",
    password: "",
    confirm: "",
  });

  const isRegister = mode === "register";

  const fieldDef = isRegister
    ? [
        { name: "handle", label: "OPERATOR HANDLE", type: "text" },
        { name: "email", label: "CONTACT VECTOR", type: "email" },
        { name: "password", label: "CIPHER KEY", type: "password" },
        { name: "confirm", label: "CONFIRM KEY", type: "password" },
      ]
    : [
        { name: "handle", label: "OPERATOR HANDLE", type: "text" },
        { name: "password", label: "CIPHER KEY", type: "password" },
      ];

  const handleChange = (name) => (e) =>
    setValues((v) => ({ ...v, [name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.({ mode, values });
  };

  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-md border border-zinc-800 bg-[#0D0D11] p-8 shadow-[0_0_60px_-15px_rgba(255,0,51,0.25)]">
      {/* ambient grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      {/* mount scanline sweep */}
      <motion.div
        key={mode}
        initial={{ top: "0%" }}
        animate={{ top: "100%" }}
        transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
        className="pointer-events-none absolute left-0 z-20 h-[2px] w-full bg-[#FF0033] shadow-[0_0_12px_2px_rgba(255,0,51,0.8)]"
      />

      <div className="relative z-10">
        <div className="mb-1 flex items-center gap-2 text-[#FF0033]">
          {isRegister ? <UserPlus size={14} /> : <ShieldCheck size={14} />}
          <ScrambleText
            key={mode}
            text={isRegister ? "NEW OPERATOR REGISTRATION" : "IDENTITY VERIFICATION"}
            trigger="mount"
            className="text-[11px] font-semibold uppercase tracking-[0.25em]"
          />
        </div>
        <p className="mb-7 font-mono text-[11px] text-zinc-500">
          {isRegister
            ? "Provision credentials to access the Vindicta link-analysis grid."
            : "Submit credentials to resume your active investigation session."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <AnimatePresence mode="wait">
            <motion.div key={mode} className="space-y-5">
              {fieldDef.map((f, i) => (
                <ScanField
                  key={f.name}
                  label={f.label}
                  type={f.type}
                  name={f.name}
                  value={values[f.name]}
                  onChange={handleChange(f.name)}
                  clipReveal
                  revealDelay={0.25 + i * 0.12}
                  required
                />
              ))}
            </motion.div>
          </AnimatePresence>

          <GlitchButton type="submit" loading={loading} className="mt-2 w-full">
            {isRegister ? "Provision Access" : "Authenticate"}
          </GlitchButton>
        </form>

        <button
          type="button"
          onClick={() => onModeChange?.(isRegister ? "login" : "register")}
          className="mt-6 w-full text-center font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-[#FF0033]"
        >
          {isRegister
            ? "Already provisioned? Authenticate instead"
            : "No credentials on file? Register an operator"}
        </button>
      </div>
    </div>
  );
}
