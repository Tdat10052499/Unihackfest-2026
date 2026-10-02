// Feature flags (docs/09-milestone-lock/non-ui-plan.md N11). Created early in N8 for FEATURES.dispute;
// N11 adds the route guards that use the other flags.
const dev = typeof __DEV__ !== 'undefined' && __DEV__;

export const FEATURES = {
  swap: false,
  xstocks: false,
  dapps: false,
  mwa: false,
  /** P1 group: dispute, concede, propose/accept split. Off until the screens exist. */
  dispute: false,
  records: true,
  devTools: dev,
} as const;
