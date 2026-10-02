// Feature flags (docs/09-milestone-lock/non-ui-plan.md N11). Created early in N8 for FEATURES.dispute;
// N11 adds the route guards that use the other flags.
const dev = typeof __DEV__ !== 'undefined' && __DEV__;
/** Dev harness (app/dev/*): __DEV__ builds, or a web build exported with EXPO_PUBLIC_DEV_TOOLS=1 (non-ui-plan N10) */
const devTools = dev || process.env.EXPO_PUBLIC_DEV_TOOLS === '1';

export const FEATURES = {
  swap: false,
  xstocks: false,
  dapps: false,
  mwa: false,
  /** P1 group: dispute, concede, propose/accept split. Off until the screens exist. */
  dispute: false,
  records: true,
  devTools,
} as const;
