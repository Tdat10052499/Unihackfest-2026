import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeActivityHistory, parseDemoSwaps, serializeDemoSwaps } from '../history.ts';

test('history merges and sorts on-chain and demo swaps', () => {
  const result = mergeActivityHistory([{ id: 'chain', blockTime: 10 }], [{ id: 'demo', time: '1970-01-01T00:00:20Z', demoSwap: true }]);
  assert.deepEqual(result.map((item) => item.id), ['demo', 'chain']);
  assert.equal(result[0].demoSwap, true);
});

test('demo swap history serializes and reads back', () => {
  const raw = serializeDemoSwaps([{ id: 'demo', demoSwap: true, amount: '0,1 SOL' }, { id: 'chain' }]);
  assert.deepEqual(parseDemoSwaps(raw).map((item) => item.id), ['demo']);
  assert.deepEqual(parseDemoSwaps(null), []);
});
