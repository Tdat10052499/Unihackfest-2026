// Pure Swap helpers (no React): quote mints and the demo N.E.D fee. Mints come from constants/chain.ts.
import { USDC_DEVNET_MINT, USDC_MAINNET_MINT } from '../../constants/chain.ts';

export const MAINNET_USDC_MINT = USDC_MAINNET_MINT.toBase58();
export const DEVNET_USDC_MINT = USDC_DEVNET_MINT.toBase58();
export const WSOL_MINT = 'So11111111111111111111111111111111111111112';
export const NED_FEE_BPS = 25;
export type SwapAsset = 'SOL' | 'USDC';
export const DEVNET_TO_MAINNET: Record<string, string> = { [DEVNET_USDC_MINT]: MAINNET_USDC_MINT, SOL: WSOL_MINT };
export function mapDevnetMintToMainnet(mint: string): string | null { return DEVNET_TO_MAINNET[mint] ?? null; }
export function quoteMintForAsset(asset: SwapAsset): string { return asset === 'SOL' ? WSOL_MINT : MAINNET_USDC_MINT; }
export function calculateFee(amount: bigint, feeBps = NED_FEE_BPS): bigint { return (amount * BigInt(feeBps)) / 10_000n; }
export function calculateMinimumReceived(order: { otherAmountThreshold: string }, feeBps = NED_FEE_BPS): bigint { const minimum = BigInt(order.otherAmountThreshold || '0'); return minimum - calculateFee(minimum, feeBps); }
