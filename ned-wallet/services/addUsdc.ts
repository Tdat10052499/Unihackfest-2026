// Add USDC (international client): how much test USDC the open contracts still need before Slide to lock, and the
// faucet constants. Pure, so node --test runs it; app/add-usdc.tsx passes the funds and the balance in.
import type { FundView } from './milestone/view';

/** Circle's public faucet. It has no documented way to prefill the address, so the app copies it first */
export const FAUCET_URL = 'https://faucet.circle.com/';
/** Balance polling after the faucet opens: every 5 s, for up to 5 minutes */
export const ADD_USDC_POLL_MS = 5_000;
export const ADD_USDC_POLL_LIMIT_MS = 5 * 60_000;
/** Below this the network-fee row offers test SOL (~0.01 SOL) */
export const LOW_SOL_LAMPORTS = 10_000_000;

type LockableFund = Pick<FundView, 'address' | 'role' | 'actions' | 'milestones'>;

/**
 * USDC base units needed by the contracts where this wallet is the client and the next step is Lock. With `fund`, only
 * that contract counts (the "Add USDC" button on its Lock screen).
 */
export function usdcNeededToLock(funds: readonly LockableFund[], fund?: string): bigint {
  return funds
    .filter((f) => (fund ? f.address === fund : true) && f.role === 'client' && f.actions.includes('lock'))
    .reduce((sum, f) => sum + f.milestones.reduce((s, m) => s + m.amountUnits, 0n), 0n);
}

/** A USDC balance (decimal) in base units */
export const usdcUnits = (balance: number): bigint => BigInt(Math.round(balance * 1_000_000));

/** max(0, needed − balance); the whole amount while the balance is unknown */
export function stillNeeded(needed: bigint, balanceUnits: bigint | null): bigint {
  if (balanceUnits === null) return needed;
  return needed > balanceUnits ? needed - balanceUnits : 0n;
}

/** The test USDC that arrived since the faucet opened, or null when the balance has not risen */
export function arrivedSince(start: number | null, now: number | null): number | null {
  if (start === null || now === null) return null;
  const delta = Math.round((now - start) * 1_000_000) / 1_000_000;
  return delta > 0 ? delta : null;
}
