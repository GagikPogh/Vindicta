"use client";

import { useEffect, useState } from "react";

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%";

interface UseScrambleTextOptions {
  trigger?: boolean;
  speed?: number;
  revealDelay?: number;
}

export function useScrambleText(
  text: string,
  { trigger = true, speed = 40, revealDelay = 0 }: UseScrambleTextOptions = {}
) {
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    if (!trigger) return;

    let frame = 0;
    const total = text.length;
    let intervalId: ReturnType<typeof setInterval>;

    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        frame++;
        const revealed = Math.floor((frame / (total * 2)) * total);
        const scrambled = text
          .split("")
          .map((char, i) => {
            if (char === " ") return " ";
            if (i < revealed) return text[i];
            return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
          })
          .join("");
        setDisplay(scrambled);
        if (revealed >= total) {
          setDisplay(text);
          clearInterval(intervalId);
        }
      }, speed);
    }, revealDelay);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [text, trigger, speed, revealDelay]);

  return display;
}
