// Logic onboarding (T1.3 + T1.6): chi phí thật (không có gas sponsorship), bước tiếp theo, dựng giao dịch tạo hồ sơ.
import { LAMPORTS_PER_SOL, PublicKey, Transaction, type Connection } from '@solana/web3.js';
import {
  buildCreateProfileTx,
  buildLinkPhoneTx,
  fetchReverseRecord,
  type ReverseRecord,
} from './identity';
import { useUserStore } from '../stores/useUserStore';
import { useWalletModeStore, waitForWalletModeHydration, type WalletMode } from '../stores/useWalletModeStore';
import { useRegionStore, waitForRegionHydration } from '../stores/useRegionStore';
import { useConsentStore, waitForConsentHydration } from '../stores/useConsentStore';
import type { Region } from './milestone/view';
import { FEATURES } from '../constants/features';
import { useAccountStore, waitForAccountHydration } from '../stores/useAccountStore';
import { accountState, hasOlderAgreement, type AccountStep } from './accountOnboarding';
import { consentVersion } from '@ned/core/legal/agreement.ts';

/** Kích thước account on-chain (ned_program + SPL Token) — xem docs/03-ky-thuat/dev-handoff.md mục 1a */
export const ACCOUNT_SIZES = { name: 49, reverse: 42, phone: 49, usdcAta: 165 } as const;
/** Phí cơ bản 1 chữ ký */
export const FEE_PER_TX = 5_000;
/** Biên an toàn cho số SOL nạp trước (rent có thể đổi, thêm vài giao dịch đầu tiên) */
const SAFETY_MARGIN = 1.25;

export interface SetupCost {
  /** Name + Reverse + phí 1 giao dịch */
  profile: number;
  /** Thêm Phone (nếu bật) */
  phone: number;
  /** ATA USDC của chính ví (khi nhận/gửi USDC lần đầu) */
  usdcAta: number;
  /** Số lamports tối thiểu cần có trước khi tạo hồ sơ (profile + phone + ATA + vài phí, cộng biên an toàn) */
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
  // Làm tròn lên bội số 0.0005 SOL cho dễ đọc
  const step = 0.0005 * LAMPORTS_PER_SOL;
  return {
    profile: name + reverse + FEE_PER_TX,
    phone,
    usdcAta,
    required: Math.ceil((base * SAFETY_MARGIN) / step) * step,
  };
}

/** Hiển thị lamports thành "0.0053" (tối đa 4 chữ số thập phân, bỏ số 0 thừa) */
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
 * Bước tiếp theo sau khi đăng nhập + có ví (non-ui-plan N11):
 *   chưa có ReverseRecord → consent (V2: trước mọi thứ) → fund (thiếu SOL, chạy âm thầm) → profile
 *   đã có ReverseRecord   → consent (nếu chưa đồng ý) → region (nếu chưa chọn) → home
 */
export async function resolveOnboarding(connection: Connection, wallet: string): Promise<OnboardingState> {
  if (FEATURES.accountRoles) return resolveAccountOnboarding(connection, wallet);
  const owner = new PublicKey(wallet);
  const reverse = await fetchReverseRecord(connection, owner);
  await Promise.all([waitForConsentHydration(), waitForRegionHydration(), waitForWalletModeHydration()]);
  const needsConsent = CONSENT_SCREEN_READY && !useConsentStore.getState().getConsent(wallet);
  if (reverse) {
    syncProfileToUserStore(wallet, reverse.username);
    if (needsConsent) return { step: 'consent', reverse };
    migrateRegionFromMode(wallet);
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

/** Wallet mode chosen before regions existed → region ('simple' → 'vn', 'crypto' → 'intl'); never asks again */
export function regionFromMode(mode: WalletMode): Region {
  return mode === 'crypto' ? 'intl' : 'vn';
}

function migrateRegionFromMode(wallet: string) {
  if (useRegionStore.getState().getRegion(wallet)) return;
  const mode = useWalletModeStore.getState().getMode(wallet);
  if (mode) useRegionStore.getState().setRegion(wallet, regionFromMode(mode));
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

/** create_profile (+ link_phone) gộp trong MỘT giao dịch; ví người dùng ký và trả phí + rent */
export function buildOnboardingTx(wallet: string, username: string, phoneKey?: Uint8Array): Transaction {
  const owner = new PublicKey(wallet);
  const tx = new Transaction().add(...buildCreateProfileTx(owner, username).instructions);
  if (phoneKey) tx.add(...buildLinkPhoneTx(owner, phoneKey).instructions);
  return tx;
}

/** Home hiện @username từ user store — đồng bộ sau khi đọc/tạo hồ sơ on-chain */
export function syncProfileToUserStore(wallet: string, username: string): void {
  const store = useUserStore.getState();
  store.setWalletAddress(wallet);
  store.setUsername(username);
}

/** Moved to services/chain/errors.ts; re-exported for existing callers. */
export { describeTxError } from './chain/errors';
