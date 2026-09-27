export const MAINNET_USDC_MINT = 'EPjFWdd5AufSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const WSOL_MINT = 'So11111111111111111111111111111111111111112';
export const DEVNET_USDC_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
export const NED_FEE_BPS = 25;
export const DEVNET_TO_MAINNET: Record<string, string> = { [DEVNET_USDC_MINT]: MAINNET_USDC_MINT, SOL: WSOL_MINT };
export function mapDevnetMintToMainnet(mint: string): string | null { return DEVNET_TO_MAINNET[mint] ?? null; }
export function calculateFee(amount: bigint, feeBps = NED_FEE_BPS): bigint { return (amount * BigInt(feeBps)) / 10_000n; }
export function calculateMinimumReceived(order: { otherAmountThreshold: string }, feeBps = NED_FEE_BPS): bigint { const minimum = BigInt(order.otherAmountThreshold || '0'); return minimum - calculateFee(minimum, feeBps); }
