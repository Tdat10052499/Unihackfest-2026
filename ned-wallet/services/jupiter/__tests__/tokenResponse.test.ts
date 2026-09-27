import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadStockTokens, parseTokenResponse } from '../tokenResponse.ts';
import { filterXStockTokens } from '../../xstocksCore.ts';

test('HTTP 200 error object is reported rather than treated as tokens', () => {
  assert.throws(() => parseTokenResponse({ status: 400, message: 'Invalid tag provided.' }), /Invalid tag provided/);
  assert.throws(() => parseTokenResponse(null), /expected a token array/);
});

test('invalid stocks tag falls back to search and keeps issuer tag', async () => {
  const calls: string[] = [];
  const tokens = await loadStockTokens(async (path) => {
    calls.push(path);
    if (path.startsWith('/tag')) return parseTokenResponse<{ tags?: string[] }>({ status: 400, message: 'Invalid tag provided.' });
    return [{ tags: ['xstocks', 'verified'] }, { tags: ['verified'] }];
  });
  assert.deepEqual(calls, ['/tag?query=stocks', '/search?query=xStock']);
  assert.equal(tokens.length, 1);
});

test('authentication errors do not trigger a fallback', async () => {
  let calls = 0;
  await assert.rejects(loadStockTokens(async () => {
    calls += 1;
    throw new Error('HTTP 401');
  }), /401/);
  assert.equal(calls, 1);
});

test('live Jupiter search snapshot contains liquid verified xStocks', () => {
  const tokens = JSON.parse(readFileSync(new URL('../../__tests__/fixtures/xstocks-live.json', import.meta.url), 'utf8'));
  assert.equal(tokens.length, 20);
  assert.equal(filterXStockTokens(tokens).length, 20);
  assert.ok(tokens.some((token: { symbol: string }) => token.symbol === 'AAPLx'));
});
