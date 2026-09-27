import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isUsMarketOpen, sortXStocks } from '../xstocksCore.ts';
const token = (symbol: string, change: number, volume: number) => ({ id: symbol, symbol, decimals: 6, isVerified: true, liquidity: 20_000, priceChange24h: change, volume24h: volume });
test('xStocks sorting and market hours', () => { const items = [token('ZZZx', 1, 100), token('AAPLx', 5, 10)]; assert.equal(sortXStocks(items, 'movers')[0].symbol, 'AAPLx'); assert.equal(sortXStocks(items, 'az')[0].symbol, 'AAPLx'); assert.equal(isUsMarketOpen(new Date('2026-09-28T15:00:00Z')), true); assert.equal(isUsMarketOpen(new Date('2026-09-27T15:00:00Z')), false); });
