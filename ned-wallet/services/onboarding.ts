// Logic onboarding (T1.3 + T1.6): chi phí thật (không có gas sponsorship), bước tiếp theo, dựng giao dịch tạo hồ sơ.
import { LAMPORTS_PER_SOL, PublicKey, Transaction, type Connection } from '@solana/web3.js';
import {
  buildCreateProfileTx,
  buildLinkPhoneTx,
  fetchReverseRecord,
  type ReverseRecord,
} from './identity';
import { useUserStore } from '../stores/useUserStore';
import { useWalletModeStore, waitForWalletModeHydration } from '../stores/useWalletModeStore';

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

export type OnboardingStep = 'fund' | 'profile' | 'mode' | 'home';

export interface OnboardingState {
  step: OnboardingStep;
  reverse: ReverseRecord | null;
}

/**
 * Bước tiếp theo sau khi đăng nhập + có ví:
 * có ReverseRecord → (chưa chọn mode ? mode : home); chưa có → (thiếu SOL ? fund : profile)
 */
export async function resolveOnboarding(connection: Connection, wallet: string): Promise<OnboardingState> {
  const owner = new PublicKey(wallet);
  const reverse = await fetchReverseRecord(connection, owner);
  if (reverse) {
    syncProfileToUserStore(wallet, reverse.username);
    await waitForWalletModeHydration();
    return { step: useWalletModeStore.getState().getMode(wallet) ? 'home' : 'mode', reverse };
  }
  const [balance, cost] = await Promise.all([connection.getBalance(owner, 'confirmed'), getSetupCost(connection)]);
  return { step: balance >= cost.required ? 'profile' : 'fund', reverse: null };
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
