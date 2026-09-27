import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterXStockTokens, isUsMarketOpen, XSTOCK_CHART_INTERVAL } from '../xstocksCore.ts';

test('filters stock-tag response fields into liquid verified xStock tokens', () => {
  const tokens = [
    { id: 'aapl', symbol: 'AAPLx', name: 'Apple xStock', decimals: 8, tags: ['stocks'], isVerified: true, liquidity: 50_000, usdPrice: 201.25, mcap: 100_000, holderCount: 120, stats24h: { priceChange: 1.4, buyVolume: 20, sellVolume: 10 } },
    { id: 'nvda', symbol: 'NVDAx', name: 'NVIDIA xStock', decimals: 8, tags: ['stocks'], isVerified: true, liquidity: 25_000, usdPrice: 131.2, stats24h: { priceChange: -2, buyVolume: 5, sellVolume: 7 } },
    { id: 'unverified', symbol: 'SPYx', decimals: 8, tags: ['stocks'], isVerified: false, liquidity: 40_000, usdPrice: 600 },
    { id: 'illiquid', symbol: 'TSLAx', decimals: 8, tags: ['stocks'], isVerified: true, liquidity: 9_999, usdPrice: 300 },
    { id: 'plain', symbol: 'SOL', decimals: 9, tags: ['stocks'], isVerified: true, liquidity: 1_000_000, usdPrice: 150 },
  ];
  const result = filterXStockTokens(tokens);
  assert.deepEqual(result.map((token) => token.symbol), ['AAPLx', 'NVDAx']);
  assert.equal(result[0].volume24h, 30);
  assert.equal(result[0].usdPrice, 201.25);
});

test('US market follows weekday New York hours and closes on weekends', () => {
  assert.equal(isUsMarketOpen(new Date('2026-09-28T14:00:00.000Z')), true);
  assert.equal(isUsMarketOpen(new Date('2026-09-28T21:00:00.000Z')), false);
  assert.equal(isUsMarketOpen(new Date('2026-09-26T14:00:00.000Z')), false);
});

test('6M chart uses daily OHLCV candles', () => {
  assert.deepEqual(XSTOCK_CHART_INTERVAL['6M'], { timeframe: 'day', aggregate: 1, limit: 180 });
});
