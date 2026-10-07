// Motion tokens of docs/02-thiet-ke/canvas-v2/MotionSurfaces.dc.html, for Motion for React (D17, D20).
// Rules: only opacity and transform; nothing over 400 ms; exits ≈ 70 % of the enter; stagger ≤ 5 items, 40 ms apart;
// amounts never animate; Reduce Motion → instant (MotionConfig reducedMotion="user" in main.tsx).
import { MotionGlobalConfig, type Transition, type Variants } from 'motion/react';

export const EASE = [0.2, 0, 0, 1] as const;
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const DURATION = {
  press: 0.16,
  hover: 0.2,
  screenFade: 0.2,
  screenRise: 0.36,
  stateChange: 0.32,
  popover: 0.2,
  sheet: 0.36,
  backdrop: 0.22,
  fieldFocus: 0.18,
} as const;

export const STAGGER = 0.04;
export const STAGGER_MAX = 5;
/** Exit time as a share of the enter time */
export const EXIT_RATIO = 0.7;

/** Screen enter: the page fades in, then its first STAGGER_MAX children rise 10 px, 40 ms apart */
export const screen: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: DURATION.screenFade, ease: EASE, when: 'beforeChildren' } },
};

export const staggerParent: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: STAGGER } },
};

/** Child of a stagger list; pass the index so items after the fifth all start with the fifth */
export const rise: Variants = {
  hidden: { opacity: 0, y: 10 },
  shown: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.screenRise, ease: EASE_OUT, delay: Math.min(i, STAGGER_MAX - 1) * STAGGER },
  }),
};

/** Wallet panel: grows from the top-right corner (scale 0.97 → 1, 6 px drop) */
export const popover: Variants = {
  closed: { opacity: 0, y: -6, scale: 0.97 },
  open: { opacity: 1, y: 0, scale: 1, transition: { duration: DURATION.popover, ease: EASE_OUT } },
  exit: { opacity: 0, y: -6, scale: 0.97, transition: { duration: DURATION.popover * EXIT_RATIO, ease: EASE } },
};

/** Jobs hub v4 (prompts-hub-v4.md V3): load and interaction timings in ms; the CSS lives in jobs/motion.css */
export const HUB_MS = {
  pageFade: 240,
  rise: 520,
  riseStagger: 90,
  pop: 200,
  sheet: 360,
  countUp: 1400,
  autoAdvance: 6000,
} as const;
/** Scroll spy line of the Legal page, in px from the top */
export const HUB_SPY_OFFSET = 170;

/** easeOutCubic for the hub counters */
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

export const stateChange: Transition = { duration: DURATION.stateChange, ease: EASE_OUT };

/**
 * "Reduce motion: everything becomes an instant change" (MotionSurfaces). MotionConfig reducedMotion="user" only
 * drops transforms and keeps opacity fades, so this also makes every Motion animation instant while the setting is on.
 */
export function followReducedMotion(): void {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const apply = () => {
    MotionGlobalConfig.instantAnimations = mq.matches;
  };
  apply();
  mq.addEventListener('change', apply);
}
