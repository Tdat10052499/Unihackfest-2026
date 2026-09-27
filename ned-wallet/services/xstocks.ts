import { getTokens, searchTokens } from './jupiter/index.ts';
import type { JupiterToken } from './jupiter/index.ts';
export { isUsMarketOpen, sortXStocks } from './xstocksCore';
export type XStock = JupiterToken & { symbol: string; liquidity: number; priceChange24h: number; volume24h: number };
const MIN_LIQUIDITY = 10_000;
let cache: { expires: number; items: XStock[] } | null = null;
function toXStock(token: JupiterToken): XStock | null { const symbol = token.symbol || ''; if (!symbol.endsWith('x') || !token.isVerified || (token.liquidity || 0) < MIN_LIQUIDITY) return null; return { ...token, symbol, liquidity: token.liquidity || 0, priceChange24h: token.stats24h?.priceChange || 0, volume24h: (token.stats24h?.buyVolume || 0) + (token.stats24h?.sellVolume || 0) }; }
export async function getXStocks(force = false): Promise<XStock[]> { if (!force && cache && cache.expires > Date.now()) return cache.items; const items = (await getTokens('stocks')).map(toXStock).filter((item): item is XStock => !!item); cache = { expires: Date.now() + 300_000, items }; return items; }
export async function searchXStocks(query: string): Promise<XStock[]> { const items = (await searchTokens(query)).map(toXStock).filter((item): item is XStock => !!item); return items; }
export type XStockSort = 'movers' | 'traded' | 'az';
export async function getGeckoOhlcv(mint: string, days: '1' | '7' | '30' | '180' = '1'): Promise<[number, number, number, number, number, number][]> { const search = await fetch(`https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}/pools?page=1`); if (!search.ok) throw new Error('Chart data unavailable'); const pools = await search.json() as { data?: { id?: string }[] }; const pool = pools.data?.[0]?.id?.split('_').pop(); if (!pool) return []; const response = await fetch(`https://api.geckoterminal.com/api/v2/networks/solana/pools/${pool}/ohlcv/hour?aggregate=1&limit=${days === '180' ? 1000 : 500}`); if (!response.ok) throw new Error('Chart data unavailable'); const json = await response.json() as { data?: { attributes?: { ohlcv_list?: [number, number, number, number, number, number][] } } }; return json.data?.attributes?.ohlcv_list || []; }
