// JS effects of the Jobs hub v4 (prompts-hub-v4.md V3): count-up stats, the auto-advancing How-it-works tabs and the
// Legal scroll spy. All three follow prefers-reduced-motion: counters show the final value at once, tabs do not move
// on their own. Amounts outside these hub stats never animate (src/motion.ts rules).
import { useEffect, useRef, useState } from 'react';
import { easeOutCubic, HUB_MS, HUB_SPY_OFFSET } from '../motion.ts';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Counts from 0 to `target` with easeOutCubic over `duration` ms; the target at once under reduced motion */
export function useCountUp(target: number, duration: number = HUB_MS.countUp): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  const from = useRef(0);
  useEffect(() => {
    if (prefersReducedMotion() || duration <= 0) {
      from.current = target;
      setValue(target);
      return;
    }
    const start = performance.now();
    const begin = from.current;
    let frame = 0;
    const step = (now: number) => {
      const t = (now - start) / duration;
      const v = begin + (target - begin) * easeOutCubic(t);
      from.current = v;
      setValue(t >= 1 ? target : v);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

/**
 * Index that advances every `interval` ms through `count` items, while not paused and motion is allowed.
 * `select(i)` jumps to an item and restarts the timer (a click on a tab).
 */
export function useAutoAdvance(count: number, interval: number = HUB_MS.autoAdvance, paused = false) {
  const [index, setIndex] = useState(0);
  const [round, setRound] = useState(0);
  useEffect(() => {
    if (paused || count < 2 || prefersReducedMotion()) return;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % count), interval);
    return () => window.clearTimeout(id);
  }, [index, round, count, interval, paused]);
  const select = (i: number) => {
    setIndex(((i % count) + count) % count);
    setRound((r) => r + 1);
  };
  return { index, select, round };
}

/** Id of the last section whose top has passed `offset` px from the top of the window (the first one before that) */
export function useScrollSpy(ids: readonly string[], offset: number = HUB_SPY_OFFSET): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  const key = ids.join('|');
  useEffect(() => {
    const list = key ? key.split('|') : [];
    const update = () => {
      let current = list[0] ?? null;
      for (const id of list) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top - offset <= 0) current = id;
      }
      setActive(current);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [key, offset]);
  return active;
}
