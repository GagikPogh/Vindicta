"use client";

import { motion } from "framer-motion";

/**
 * ScrollReveal
 * -----------------------------------------------------------------------------
 * Generic reveal-on-scroll wrapper: fades in, lifts up from translateY,
 * scales from a slightly smaller size, and un-blurs. Designed to be wrapped
 * around any block of HUD content.
 *
 * For lists, render one <ScrollReveal index={i}> per item and pass a shared
 * staggerMs — each item's delay is computed as index * (staggerMs / 1000).
 *
 * Props
 *  children   - content to reveal
 *  className  - tailwind classes passed to the wrapping <motion.div>
 *  index      - position in a list, used with staggerMs (default 0)
 *  staggerMs  - delay step between siblings, in ms (default 0)
 *  delay      - flat extra delay in seconds, stacks on top of stagger (default 0)
 *  y          - initial vertical offset in px (default 24)
 *  scale      - initial scale (default 0.96)
 *  blur       - initial blur in px (default 8)
 *  duration   - animation duration in seconds (default 0.6)
 *  once       - only animate the first time it enters view (default true)
 *  amount     - fraction of element that must be visible to trigger (default 0.2)
 *  as         - element tag for the wrapper, default "div"
 */
export default function ScrollReveal({
  children,
  className = "",
  index = 0,
  staggerMs = 0,
  delay = 0,
  y = 24,
  scale = 0.96,
  blur = 8,
  duration = 0.6,
  once = true,
  amount = 0.2,
  as = "div",
}) {
  const Tag = motion[as] || motion.div;
  const computedDelay = delay + (index * staggerMs) / 1000;

  return (
    <Tag
      className={className}
      initial={{
        opacity: 0,
        y,
        scale,
        filter: `blur(${blur}px)`,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
      }}
      viewport={{ once, amount }}
      transition={{
        duration,
        delay: computedDelay,
        ease: [0.16, 1, 0.3, 1], // sharp settle, no bounce — fits the HUD register
      }}
    >
      {children}
    </Tag>
  );
}

/**
 * ScrollRevealList
 * -----------------------------------------------------------------------------
 * Convenience wrapper: maps an array of items into staggered ScrollReveal
 * instances automatically, so callers don't have to thread `index` manually.
 *
 * Usage:
 *  <ScrollRevealList items={results} staggerMs={80} as="li" className="...">
 *    {(item) => <ResultRow data={item} />}
 *  </ScrollRevealList>
 */
export function ScrollRevealList({
  items = [],
  children,
  staggerMs = 80,
  className = "",
  as = "div",
  ...rest
}) {
  return items.map((item, i) => (
    <ScrollReveal
      key={item?.id ?? i}
      index={i}
      staggerMs={staggerMs}
      as={as}
      className={className}
      {...rest}
    >
      {children(item, i)}
    </ScrollReveal>
  ));
}
