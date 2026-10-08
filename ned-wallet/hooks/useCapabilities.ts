// What the signed-in wallet may do (roles-and-agreement-build.md §4). Flag on: core capabilities(profile); flag off:
// today's region-only rule. Same shape either way, so call sites do not branch. UI gates only: the program does not
// know roles or residence. The money view still reads useRegion().
import { useAuth } from '../services/auth';
import { capabilitiesFor } from '../services/accountSettings';
import { useAccountStore } from '../stores/useAccountStore';
import { FEATURES } from '../constants/features';
import { useRegion } from './useRegion';

export function useCapabilities() {
  const { walletAddress } = useAuth();
  const { region } = useRegion();
  const profile = useAccountStore((st) => (walletAddress ? st.profiles[walletAddress] ?? null : null));
  return capabilitiesFor(FEATURES.accountRoles, profile, region);
}
