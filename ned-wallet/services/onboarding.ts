// Onboarding logic (T1.3 + T1.6): real costs (no gas sponsorship), next step, building the create-profile transaction.
import { LAMPORTS_PER_SOL, PublicKey, Transaction, type Connection } from '@solana/web3.js';
import {
  buildCreateProfileTx,
  buildLinkPhoneTx,
  fetchReverseRecord,
  type ReverseRecord,
} from './identity';
import { useUserStore } from '../stores/useUserStore';
import { useRegionStore, waitForRegionHydration } from '../stores/useRegionStore';
import { useConsentStore, waitForConsentHydration } from '../stores/useConsentStore';
import { FEATURES } from '../constants/features';
import { useAccountStore, waitForAccountHydration } from '../stores/useAccountStore';
import { accountState, hasOlderAgreement, type AccountStep } from './accountOnboarding';
import { consentVersion } from '@ned/core/legal/agreement.ts';

/** On-chain account sizes (ned_program + SPL Token) — see docs/archive/03-engineering/dev-handoff.md section 1a */
export const ACCOUNT_SIZES = { name: 49, reverse: 42, phone: 49, usdcAta: 165 } as const;
/** Base fee for one signature */
export const FEE_PER_TX = 5_000;
/** Safety margin for the SOL funded in advance (rent may change, plus the first few transactions) */
const SAFETY_MARGIN = 1.25;

export interface SetupCost {
  /** Name + Reverse + the fee of one transaction */
  profile: number;
  /** Plus Phone (when enabled) */
  phone: number;
  /** The wallet's own USDC ATA (first time it receives/sends USDC) */
  usdcAta: number;
  /** Minimum lamports needed before creating the profile (profile + phone + ATA + a few fees, plus the safety margin) */
  required: number;
}

export async function getSetupCost(connection: Connection): Promise<SetupCost> {
  const [name, reverse, phone, usdcAta] = await Promise.all([
    connection.getMinimumBalanceForRentExemption(ACCOUNT_SIZES.name),
    connection.getMinimumBalanceForRentExemption(ACCOUNT_SIZES.reverse),
    connection.getMinimumBalanceForRentExemption(ACCOUNT_SIZES.phone),
    connection.getMinimumBalanceForRentExemption(ACCOUNT_SIZES.usdcAta),
  ]);
  const base = name + reverse + phone + usdcAta + 3 * FEE_PER_TX;
  // Round up to a multiple of 0.0005 SOL so it reads easily
  const step = 0.0005 * LAMPORTS_PER_SOL;
  return {
    profile: name + reverse + FEE_PER_TX,
    phone,
    usdcAta,
    required: Math.ceil((base * SAFETY_MARGIN) / step) * step,
  };
}

/** Shows lamports as "0.0053" (at most 4 decimals, trailing zeros dropped) */
export function formatSol(lamports: number, digits = 4): string {
  return (lamports / LAMPORTS_PER_SOL).toFixed(digits).replace(/\.?0+$/, '');
}

export type OnboardingStep = 'fund' | 'consent' | 'profile' | 'region' | 'home' | Exclude<AccountStep, 'fund' | 'profile' | 'home'>;

export interface OnboardingState {
  step: OnboardingStep;
  reverse: ReverseRecord | null;
  /** D30 R7: the role step opens as the update flow (/role?update=1) for a wallet that used N.E.D before */
  update?: boolean;
}

/** The consent screen (app/(onboarding)/consent.tsx, OnbConsent board) records consent with useConsentStore (B3) */
export const CONSENT_SCREEN_READY = true;

/**
 * Next step after sign-in once the wallet exists (non-ui-plan N11):
 *   no ReverseRecord  → consent (V2: before anything else) → fund (short of SOL, runs quietly) → profile
 *   ReverseRecord     → consent (if not given) → region (if not chosen) → home
 */
export async function resolveOnboarding(connection: Connection, wallet: string): Promise<OnboardingState> {
  if (FEATURES.accountRoles) return resolveAccountOnboarding(connection, wallet);
  const owner = new PublicKey(wallet);
  const reverse = await fetchReverseRecord(connection, owner);
  await Promise.all([waitForConsentHydration(), waitForRegionHydration()]);
  const needsConsent = CONSENT_SCREEN_READY && !useConsentStore.getState().getConsent(wallet);
  if (reverse) {
    syncProfileToUserStore(wallet, reverse.username);
    if (needsConsent) return { step: 'consent', reverse };
    return { step: useRegionStore.getState().getRegion(wallet) ? 'home' : 'region', reverse };
  }
  // V2 (compliance fix list): consent before anything that sends the wallet address to a third party (the faucet)
  if (needsConsent) return { step: 'consent', reverse: null };
  const [balance, cost] = await Promise.all([connection.getBalance(owner, 'confirmed'), getSetupCost(connection)]);
  if (balance < cost.required) return { step: 'fund', reverse: null };
  return { step: 'profile', reverse: null };
}

/**
 * D30 (FEATURES.accountRoles): role → country → business (business only) → agreement → fund → profile → home for a new
 * wallet; the missing ones of role / country / business / agreement, then home, for a returning one
 * (services/accountOnboarding.ts accountStep). The agreement holds consent v3, so it still comes before the faucet.
 */
async function resolveAccountOnboarding(connection: Connection, wallet: string): Promise<OnboardingState> {
  const owner = new PublicKey(wallet);
  const reverse = await fetchReverseRecord(connection, owner);
  await Promise.all([waitForConsentHydration(), waitForAccountHydration(), waitForRegionHydration()]);
  if (reverse) syncProfileToUserStore(wallet, reverse.username);
  const accounts = useAccountStore.getState();
  const facts = {
    hasReverse: Boolean(reverse),
    profile: accounts.getProfile(wallet),
    hasAgreement: Boolean(accounts.getAgreement(wallet) && useConsentStore.getState().getConsent(wallet)),
    short: false,
    olderAgreement: hasOlderAgreement(accounts.agreements[wallet], consentVersion(true)),
  };
  let state = accountState(facts);
  if (state.step === 'profile') {
    const [balance, cost] = await Promise.all([connection.getBalance(owner, 'confirmed'), getSetupCost(connection)]);
    state = accountState({ ...facts, short: balance < cost.required });
  }
  return { step: state.step, reverse, update: state.update };
}

/** Route for each step: welcome → setup → consent → (fund) → profile → residence → home; D30 adds /role, /country, /business, /agreement */
export function onboardingRoute(
  step: OnboardingStep,
  update = false
): '/home' | '/fund' | '/consent' | '/profile' | '/residence' | '/role' | '/role?update=1' | '/country' | '/business' | '/agreement' {
  if (step === 'role' && update) return '/role?update=1';
  switch (step) {
    case 'home':
      return '/home';
    case 'region':
      return '/residence';
    default:
      return `/${step}`;
  }
}

/** create_profile (+ link_phone) in ONE transaction; the user's wallet signs and pays fees + rent */
export function buildOnboardingTx(wallet: string, username: string, phoneKey?: Uint8Array): Transaction {
  const owner = new PublicKey(wallet);
  const tx = new Transaction().add(...buildCreateProfileTx(owner, username).instructions);
  if (phoneKey) tx.add(...buildLinkPhoneTx(owner, phoneKey).instructions);
  return tx;
}

/** Home shows @username from the user store — synced after reading/creating the on-chain profile */
export function syncProfileToUserStore(wallet: string, username: string): void {
  const store = useUserStore.getState();
  store.setWalletAddress(wallet);
  store.setUsername(username);
}

/** Moved to services/chain/errors.ts; re-exported for existing callers. */
export { describeTxError } from './chain/errors';
