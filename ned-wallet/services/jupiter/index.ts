import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'expo-router';

export const JUPITER_ORDER_URL = 'https://api.jup.ag/swap/v2/order';
export const JUPITER_TOKENS_URL = 'https://api.jup.ag/tokens/v2';
export const MAINNET_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const WSOL_MINT = 'So11111111111111111111111111111111111111112';
export const NED_FEE_BPS = 25;
export const QUOTE_REFRESH_MS = 15_000;
export const ORDER_INTERVAL_MS = 2_100;
export type SwapAsset = 'SOL' | 'USDC';
export type Slippage = 'auto' | 0.5 | 1 | 3;
export type JupiterToken = { id: string; name?: string; symbol?: string; icon?: string; decimals: number; isVerified?: boolean; tags?: string[]; usdPrice?: number; liquidity?: number };
export type JupiterOrder = { inputMint: string; outputMint: string; inAmount: string; outAmount: string; outUsdValue?: number; otherAmountThreshold: string; slippageBps?: number; priceImpact?: number; priceImpactPct?: string; routePlan?: { swapInfo?: { label?: string; inAmount?: string; outAmount?: string }; percent?: number }[]; feeBps?: number; platformFee?: { amount?: string; feeBps?: number; feeMint?: string }; router?: string; transaction?: string | null; requestId?: string };
export const DEVNET_USDC_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
export const DEVNET_TO_MAINNET: Record<string, string> = { [DEVNET_USDC_MINT]: MAINNET_USDC_MINT, SOL: WSOL_MINT };
export function mapDevnetMintToMainnet(mint: string): string | null { return DEVNET_TO_MAINNET[mint] ?? null; }
export function quoteMintForAsset(asset: SwapAsset): string { return asset === 'SOL' ? WSOL_MINT : MAINNET_USDC_MINT; }
export function calculateFee(amount: bigint, feeBps = NED_FEE_BPS): bigint { return (amount * BigInt(feeBps)) / 10_000n; }
export function calculateMinimumReceived(order: JupiterOrder, feeBps = NED_FEE_BPS): bigint { const minimum = BigInt(order.otherAmountThreshold || '0'); return minimum - calculateFee(minimum, feeBps); }

type QueueJob<T> = { run: () => Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void; signal?: AbortSignal };
class RequestQueue { private jobs: QueueJob<unknown>[] = []; private running = false; private lastRun = 0;
  enqueue<T>(run: () => Promise<T>, signal?: AbortSignal): Promise<T> { return new Promise<T>((resolve, reject) => { this.jobs.push({ run, resolve: resolve as (value: unknown) => void, reject, signal }); void this.drain(); }); }
  private async drain() { if (this.running) return; this.running = true; while (this.jobs.length) { const job = this.jobs.shift()!; if (job.signal?.aborted) { job.reject(new DOMException('Request cancelled', 'AbortError')); continue; } const wait = Math.max(0, ORDER_INTERVAL_MS - (Date.now() - this.lastRun)); if (wait) await new Promise((resolve) => setTimeout(resolve, wait)); this.lastRun = Date.now(); try { job.resolve(await job.run()); } catch (error) { job.reject(error); } } this.running = false; }
}
const orderQueue = new RequestQueue(); let previousOrderController: AbortController | null = null; const tokenCache = new Map<string, { expires: number; value: JupiterToken[] }>();
async function fetchJson<T>(url: string, init?: RequestInit, timeout = 12_000): Promise<T> { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeout); try { const response = await fetch(url, { ...init, signal: controller.signal }); if (!response.ok) throw new Error(`Jupiter request failed (${response.status})`); return await response.json() as T; } finally { clearTimeout(timer); } }
export async function getOrder(inputMint: string, outputMint: string, amount: string | number | bigint, slippage: Slippage = 'auto'): Promise<JupiterOrder> { previousOrderController?.abort(); const controller = new AbortController(); previousOrderController = controller; const params = new URLSearchParams({ inputMint, outputMint, amount: String(amount) }); if (slippage !== 'auto') params.set('slippageBps', String(Math.round(slippage * 100))); return orderQueue.enqueue(() => fetchJson<JupiterOrder>(`${JUPITER_ORDER_URL}?${params.toString()}`), controller.signal); }
async function getTokenEndpoint(path: string, cacheKey: string): Promise<JupiterToken[]> { const cached = tokenCache.get(cacheKey); if (cached && cached.expires > Date.now()) return cached.value; const key = process.env.EXPO_PUBLIC_JUPITER_API_KEY; if (!key) throw new Error('EXPO_PUBLIC_JUPITER_API_KEY is not configured'); const value = await fetchJson<JupiterToken[]>(`${JUPITER_TOKENS_URL}${path}`, { headers: { 'x-api-key': key } }); tokenCache.set(cacheKey, { expires: Date.now() + 300_000, value }); return value; }
export const searchTokens = (query: string) => getTokenEndpoint(`/search?query=${encodeURIComponent(query)}`, `search:${query}`);
export const getTokens = (tag: 'verified' | 'stocks' | 'lst') => getTokenEndpoint(`/tag?query=${tag}`, `tag:${tag}`);
export function useSwapQuote(inputMint: string | null, outputMint: string | null, amount: string, slippage: Slippage = 'auto') {
  const focused = usePathname() === '/swap';
  const [quote, setQuote] = useState<JupiterOrder | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [isStale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(15);
  const refresh = useCallback(async () => {
    if (!inputMint || !outputMint || !amount || Number(amount) <= 0) { setQuote(null); return; }
    setLoading(true); setError(null);
    try { setQuote(await getOrder(inputMint, outputMint, amount, slippage)); setStale(false); setSecondsRemaining(15); }
    catch (e) { if ((e as Error).name !== 'AbortError') { setError((e as Error).message); setStale(true); } }
    finally { setLoading(false); }
  }, [inputMint, outputMint, amount, slippage]);
  // The effect owns the 15-second quote subscription; refresh intentionally updates its status state.
  useEffect(() => {
    if (!focused) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const tick = setInterval(() => { setSecondsRemaining((s) => { if (s <= 1) { void refresh(); return 15; } return s - 1; }); }, 1000);
    return () => clearInterval(tick);
  }, [focused, refresh]);
  return { quote, isLoading, isStale, error, secondsRemaining, refresh };
}
export { orderQueue as __orderQueue };
