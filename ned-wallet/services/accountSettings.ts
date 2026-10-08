// D30 role gates and Settings → "Your account" (roles-and-agreement-build.md §4–§5). Pure, so node --test runs it:
// hooks/useCapabilities.ts and app/settings.tsx pass the store data in.
import type { AccountProfile, CountryCode } from '@ned/core/account/types.ts';
import { canBeClient, canChangeCountry, type Capabilities, type CountryChange, type OpenClientWork } from '@ned/core/account/rules.ts';
import { GATE_COPY } from '@ned/core/account/copy.ts';

/** Moved to core (shared with the Workspace, R6) */
export { capabilitiesFor } from '@ned/core/account/rules.ts';

/** The GATE_COPY line when a client action is refused: Vietnam residents get the Vietnam line */
export const clientGateLine = (cap: Pick<Capabilities, 'region'>) => (cap.region === 'vn' ? GATE_COPY.clientNeededVN : GATE_COPY.clientNeeded);

/** Open client work that blocks a move to Vietnam: client contracts not settled, and listings Open or Selected */
export function openClientWork(
  funds: readonly { role: 'client' | 'freelancer'; state: string }[],
  listings: readonly { state: string }[]
): OpenClientWork {
  return {
    clientContracts: funds.filter((f) => f.role === 'client' && f.state !== 'settled').length,
    listings: listings.filter((j) => j.state === 'Open' || j.state === 'Selected').length,
  };
}

/** canChangeCountry from core, with the counts above */
export const countryChange = (
  profile: AccountProfile,
  next: CountryCode,
  funds: readonly { role: 'client' | 'freelancer'; state: string }[],
  listings: readonly { state: string }[]
): CountryChange => canChangeCountry(profile, next, openClientWork(funds, listings));

/** The profile after a confirmed move: Vietnam drops the client role and the business details */
export function profileWithCountry(p: AccountProfile, country: CountryCode, now: number): AccountProfile {
  if (canBeClient(country)) return { ...p, country, updatedAt: now };
  const { business: _drop, ...rest } = p;
  return { ...rest, country, freelancer: true, client: null, updatedAt: now };
}

export type RoleSwitch = 'freelancer' | 'client';

/**
 * Whether a role switch can change: the last role that is on stays on (settings.atLeastOne); Also hire stays off for
 * Vietnam residents (settings.alsoHireVN).
 */
export function roleSwitchState(p: AccountProfile, role: RoleSwitch): { on: boolean; locked: 'atLeastOne' | 'vietnam' | null } {
  const on = role === 'freelancer' ? p.freelancer : !!p.client;
  if (!canBeClient(p.country)) return { on, locked: 'vietnam' };
  const other = role === 'freelancer' ? !!p.client : p.freelancer;
  return { on, locked: on && !other ? 'atLeastOne' : null };
}

/** The profile after a role switch; an invalid change returns the profile unchanged */
export function profileWithRole(p: AccountProfile, role: RoleSwitch, on: boolean, now: number = Date.now()): AccountProfile {
  if (roleSwitchState(p, role).locked) return p;
  if (role === 'freelancer') return { ...p, freelancer: on, updatedAt: now };
  // A business keeps its details; Also hire comes back as a business when the details are still saved
  return { ...p, client: on ? { kind: p.business ? 'business' : 'individual' } : null, updatedAt: now };
}
