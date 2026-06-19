"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useAnimationFrame } from "framer-motion";

/**
 * ScrambleText
 * -----------------------------------------------------------------------------
 * Decrypts a string into view: cycles random glyphs over each character slot
 * before "locking" the real character in, left-to-right, like a terminal
 * brute-forcing a hash. Triggers once the element enters the viewport.
 *
 * Props
 *  text        - the final string to reveal
 *  className   - tailwind classes for the wrapper <span>
 *  speed       - ms between scramble ticks (lower = faster flicker)
 *  revealDelay - ms between each character locking in
 *  glyphs      - character pool used while scrambling
 *  trigger     - "mount" | "inView" (default "inView")
 *  as          - element tag, default "span"
 *  onComplete  - callback fired once fully decrypted
 */
export default function ScrambleText({
  text = "",
  className = "",
  speed = 35,
  revealDelay = 28,
  glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!<>-_\\/[]{}—=+*^?#$%",
  trigger = "inView",
  as = "span",
  onComplete,
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" });
  const [display, setDisplay] = useState(() => text.replace(/[^\s]/g, " "));
  const lockedCountRef = useRef(0);
  const tickRef = useRef(0);
  const startedRef = useRef(false);
  const doneRef = useRef(false);

  const shouldRun = trigger === "mount" || isInView;

  useEffect(() => {
    if (!shouldRun || startedRef.current) return;
    startedRef.current = true;
    lockedCountRef.current = 0;
    doneRef.current = false;
  }, [shouldRun]);

  // ms accumulators, driven by a single rAF loop for both scramble + reveal cadence
  const lastScrambleRef = useRef(0);
  const lastRevealRef = useRef(0);

  useAnimationFrame((t) => {
    if (!startedRef.current || doneRef.current) return;

    if (t - lastRevealRef.current >= revealDelay) {
      lastRevealRef.current = t;
      if (lockedCountRef.current < text.length) {
        lockedCountRef.current += 1;
      }
      if (lockedCountRef.current >= text.length) {
        doneRef.current = true;
        setDisplay(text);
        onComplete?.();
        return;
      }
    }

    if (t - lastScrambleRef.current >= speed) {
      lastScrambleRef.current = t;
      tickRef.current += 1;
      const locked = lockedCountRef.current;
      let out = "";
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (i < locked || char === " ") {
          out += char;
        } else {
          out += glyphs[Math.floor(Math.random() * glyphs.length)];
        }
      }
      setDisplay(out);
    }
  });

  const Tag = motion[as] || motion.span;

  return (
    <Tag
      ref={ref}
      className={`font-mono tabular-nums tracking-wide ${className}`}
      aria-label={text}
    >
      {display}
    </Tag>
  );
}
