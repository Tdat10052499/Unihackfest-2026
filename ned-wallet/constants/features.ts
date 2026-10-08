// Feature flags (docs/09-milestone-lock/non-ui-plan.md N11). Created early in N8 for FEATURES.dispute;
// N11 adds the route guards that use the other flags.
import { CORE_FEATURES } from '@ned/core/features.ts';

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
  /** v1.4 (D29): core default; the phone app does not post jobs, so this only affects shared screens */
  lockAtHire: CORE_FEATURES.lockAtHire,
  /** D30 roles and agreement: core default (off); EXPO_PUBLIC_FEATURE_ACCOUNT_ROLES=true turns it on */
  accountRoles:
    process.env.EXPO_PUBLIC_FEATURE_ACCOUNT_ROLES === undefined
      ? CORE_FEATURES.accountRoles
      : process.env.EXPO_PUBLIC_FEATURE_ACCOUNT_ROLES === 'true',
  devTools,
} as const;
