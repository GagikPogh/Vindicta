"use client";

import { useInView } from "@/hooks/useInView";
import { useScrambleText } from "@/hooks/useScrambleText";

interface ScrambleTextProps {
  text: string;
  className?: string;
  as?: "span" | "h1" | "h2" | "p" | "div";
  speed?: number;
  revealDelay?: number;
}

export function ScrambleText({
  text,
  className = "",
  as: Tag = "span",
  speed,
  revealDelay,
}: ScrambleTextProps) {
  const [ref, inView] = useInView<HTMLElement>({ threshold: 0.4 });
  const display = useScrambleText(text, { trigger: inView, speed, revealDelay });

  return (
    <Tag ref={ref as React.RefObject<never>} className={`font-mono tabular-nums ${className}`} aria-label={text}>
      {display}
    </Tag>
  );
}
