// Motion tokens (build-plan B2, decision D17): the token table of docs/02-design/canvas-v2/MotionSurfaces.dc.html.
// Same numbers as ned-workspace/src/motion.ts. Rules: only opacity and transform animate; nothing lasts over 400 ms;
// exits take about 70 % of the enter; stagger 40 ms for at most 5 items; amounts never animate;
// Reduce Motion turns every animation into an instant change (useMotion below, ReduceMotion.System on layout animations).
import { Easing, FadeInDown, ReduceMotion, SlideInDown, SlideOutDown, FadeIn, FadeOut, cubicBezier, useReducedMotion } from 'react-native-reanimated';

/** Durations in ms */
export const duration = {
  press: 160,
  hover: 200,
  screenFade: 200,
  screenRise: 360,
  stateChange: 320,
  popover: 200,
  sheet: 360,
  backdrop: 220,
  fieldFocus: 180,
} as const;

export const STAGGER_MS = 40;
export const STAGGER_MAX = 5;
export const EXIT_RATIO = 0.7;

/** Standard curve (state, press, fades) and the decelerating "out" curve (enter, rise, sheet) */
export const curve = {
  standard: [0.2, 0, 0, 1] as const,
  out: [0.16, 1, 0.3, 1] as const,
};
/** For Reanimated worklet animations and layout animations */
export const easing = {
  standard: Easing.bezier(...curve.standard),
  out: Easing.bezier(...curve.out),
};
/** For Reanimated 4 CSS transitions (transitionTimingFunction) */
export const cssEasing = {
  standard: cubicBezier(...curve.standard),
  out: cubicBezier(...curve.out),
};

/** Delay of the n-th item of a list: items after the fifth start with the fifth */
export const staggerDelay = (index: number) => Math.min(Math.max(index, 0), STAGGER_MAX - 1) * STAGGER_MS;

/**
 * Screen content enter as a Reanimated 4 CSS animation: fade + 10 px rise, 360 ms, 40 ms stagger (max 5).
 * Used instead of the FadeInDown layout animation for in-flow content: on web, layout `entering` leaves the element
 * position: absolute, which collapses a ScrollView's content height. Pass `reduce` from useMotion().
 */
export const riseKeyframes = {
  from: { opacity: 0, transform: [{ translateY: 10 }] },
  to: { opacity: 1, transform: [{ translateY: 0 }] },
};
export const riseStyle = (index: number, reduce: boolean) =>
  reduce
    ? {}
    : {
        animationName: riseKeyframes,
        animationDuration: duration.screenRise,
        animationDelay: staggerDelay(index),
        animationTimingFunction: cssEasing.out,
        animationFillMode: 'backwards' as const,
      };

/** Fade + 10 px rise as a layout animation, for elements that are absolutely positioned anyway */
export const enterRise = (index = 0) =>
  FadeInDown.duration(duration.screenRise)
    .delay(staggerDelay(index))
    .easing(easing.out)
    .withInitialValues({ opacity: 0, transform: [{ translateY: 10 }] })
    .reduceMotion(ReduceMotion.System);

export const sheetIn = SlideInDown.duration(duration.sheet).easing(easing.out).reduceMotion(ReduceMotion.System);
export const sheetOut = SlideOutDown.duration(Math.round(duration.sheet * EXIT_RATIO)).easing(easing.standard).reduceMotion(ReduceMotion.System);
export const backdropIn = FadeIn.duration(duration.backdrop).easing(easing.standard).reduceMotion(ReduceMotion.System);
export const backdropOut = FadeOut.duration(Math.round(duration.backdrop * EXIT_RATIO)).easing(easing.standard).reduceMotion(ReduceMotion.System);
export const popoverIn = FadeIn.duration(duration.popover).easing(easing.out).reduceMotion(ReduceMotion.System);
export const popoverOut = FadeOut.duration(Math.round(duration.popover * EXIT_RATIO)).easing(easing.standard).reduceMotion(ReduceMotion.System);

/**
 * Reduce Motion guard for CSS transitions and hand-written animations: `ms(duration.press)` is 0 when the system
 * setting is on, so the change is instant. Layout animations above already follow ReduceMotion.System.
 */
export function useMotion() {
  const reduce = useReducedMotion();
  return { reduce, ms: (value: number) => (reduce ? 0 : value) };
}
