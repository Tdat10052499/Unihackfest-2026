export type StockLike = {
  symbol: string;
  priceChange24h: number;
  volume24h: number;
};

export type StockTokenLike = {
  id: string;
  symbol?: string;
  isVerified?: boolean;
  liquidity?: number;
  stats24h?: {
    priceChange?: number;
    buyVolume?: number;
    sellVolume?: number;
  };
};

export type XStockRange = '1D' | '1W' | '1M' | '6M';
export const XSTOCK_CHART_INTERVAL: Record<XStockRange, { timeframe: 'hour' | 'day'; aggregate: 1; limit: number }> = {
  '1D': { timeframe: 'hour', aggregate: 1, limit: 24 },
  '1W': { timeframe: 'hour', aggregate: 1, limit: 168 },
  '1M': { timeframe: 'day', aggregate: 1, limit: 30 },
  '6M': { timeframe: 'day', aggregate: 1, limit: 180 },
};

export function filterXStockTokens<T extends StockTokenLike>(tokens: T[]) {
  return tokens
    .filter((token) => token.symbol?.endsWith('x'))
    .filter((token) => token.isVerified === true)
    .filter((token) => (token.liquidity ?? 0) >= 10_000)
    .map((token) => ({
      ...token,
      symbol: token.symbol!,
      liquidity: token.liquidity ?? 0,
      priceChange24h: token.stats24h?.priceChange ?? 0,
      volume24h: (token.stats24h?.buyVolume ?? 0) + (token.stats24h?.sellVolume ?? 0),
    }));
}

export function sortXStocks<T extends StockLike>(items: T[], sort: 'movers' | 'traded' | 'az'): T[] {
  return [...items].sort((a, b) => {
    if (sort === 'az') return a.symbol.localeCompare(b.symbol);
    if (sort === 'traded') return b.volume24h - a.volume24h;
    return Math.abs(b.priceChange24h) - Math.abs(a.priceChange24h);
  });
}

export function isUsMarketOpen(date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);
  const day = parts.find((part) => part.type === 'weekday')?.value;
  if (day === 'Sat' || day === 'Sun') return false;
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0) % 24;
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  const currentMinute = hour * 60 + minute;
  return currentMinute >= 570 && currentMinute < 960;
}
