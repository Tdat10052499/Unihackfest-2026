import { getTokens, searchTokens } from './jupiter/index.ts';
import type { JupiterToken } from './jupiter/index.ts';
import { filterXStockTokens, XSTOCK_CHART_INTERVAL } from './xstocksCore.ts';
import type { XStockRange } from './xstocksCore.ts';
export { filterXStockTokens, isUsMarketOpen, sortXStocks, XSTOCK_CHART_INTERVAL } from './xstocksCore.ts';
export type { XStockRange } from './xstocksCore.ts';

export type XStock = JupiterToken & {
  symbol: string;
  liquidity: number;
  priceChange24h: number;
  volume24h: number;
};

const CACHE_MS = 5 * 60_000;
let cache: { expires: number; items: XStock[] } | null = null;
const chartCache = new Map<string, { expires: number; rows: Ohlcv[] }>();

export type Ohlcv = [number, number, number, number, number, number];

export async function getXStocks(force = false): Promise<XStock[]> {
  if (!force && cache && cache.expires > Date.now()) return cache.items;

  let tokens: JupiterToken[];
  try {
    tokens = await getTokens('stocks');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('EXPO_PUBLIC_JUPITER_API_KEY')) {
      throw new Error('Jupiter API key is missing. Add EXPO_PUBLIC_JUPITER_API_KEY to the app environment and deploy again.');
    }
    if (message.includes('(401)') || message.includes('(403)')) {
      throw new Error(`Jupiter rejected the API key (${message.match(/\((\d{3})\)/)?.[1] ?? 'auth error'}). Check the public key configured in the deployed environment.`);
    }
    throw new Error(`Could not load xStocks from Jupiter. Check your connection and try again. (${message})`);
  }

  const items = filterXStockTokens(tokens);
  if (tokens.length === 0) {
    throw new Error('Jupiter returned 0 stocks. Check the API key, Jupiter stocks tag availability, and deployed environment.');
  }
  if (tokens.length > 0 && items.length === 0) {
    throw new Error(`Jupiter returned ${tokens.length} stocks, but none matched xStock filters (verified, ticker ending in “x”, liquidity ≥ $10,000).`);
  }
  cache = { expires: Date.now() + CACHE_MS, items };
  return items;
}

export async function searchXStocks(query: string): Promise<XStock[]> {
  return filterXStockTokens(await searchTokens(query));
}

export type XStockSort = 'movers' | 'traded' | 'az';

let geckoLastRequest = 0;
let geckoQueue = Promise.resolve();

async function geckoJson<T>(url: string): Promise<T> {
  const previous = geckoQueue;
  let release = () => {};
  geckoQueue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    const wait = Math.max(0, 2_100 - (Date.now() - geckoLastRequest));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    geckoLastRequest = Date.now();
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Chart data unavailable (${response.status})`);
    return await response.json() as T;
  } finally {
    release();
  }
}

export async function getGeckoOhlcv(mint: string, range: XStockRange = '1D'): Promise<Ohlcv[]> {
  const cacheKey = `${mint}:${range}`;
  const cached = chartCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.rows;

  const pools = await geckoJson<{ data?: { id?: string; attributes?: { reserve_in_usd?: string } }[] }>(`https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}/pools?page=1`);
  const pool = pools.data?.sort((a, b) => Number(b.attributes?.reserve_in_usd ?? 0) - Number(a.attributes?.reserve_in_usd ?? 0))[0]?.id?.split('_').pop();
  if (!pool) return [];

  const interval = XSTOCK_CHART_INTERVAL[range];
  const url = new URL(`https://api.geckoterminal.com/api/v2/networks/solana/pools/${pool}/ohlcv/${interval.timeframe}`);
  url.searchParams.set('aggregate', String(interval.aggregate));
  url.searchParams.set('limit', String(interval.limit));
  url.searchParams.set('token', mint);
  const json = await geckoJson<{ data?: { attributes?: { ohlcv_list?: Ohlcv[] } } }>(url.toString());
  const rows = (json.data?.attributes?.ohlcv_list ?? []).sort((a, b) => a[0] - b[0]);
  chartCache.set(cacheKey, { expires: Date.now() + 60_000, rows });
  return rows;
}
