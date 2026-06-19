export const HUD_EASE = [0.16, 1, 0.3, 1] as const;

export const STAGGER_MS = 60;

export const hudTransition = (duration = 0.55, delay = 0) => ({
  duration,
  delay,
  ease: HUD_EASE,
});

export function staggerDelay(index: number, baseMs = STAGGER_MS) {
  return (index * baseMs) / 1000;
}

export const hudFadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 12 },
};

export const hudShutter = {
  initial: { clipPath: "inset(50% 0 50% 0)", opacity: 0 },
  animate: { clipPath: "inset(0% 0 0% 0)", opacity: 1 },
  exit: { clipPath: "inset(50% 0 50% 0)", opacity: 0 },
};
