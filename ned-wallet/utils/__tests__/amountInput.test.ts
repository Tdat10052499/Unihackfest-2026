import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeAmountInput } from '../amountInput.ts';

test('amount input accepts comma/dot and keeps the first separator', () => {
  const cases = [['0,1', '0,1', '0.1'], ['0.1', '0.1', '0.1'], ['1,', '1,', '1.'], [',5', ',5', '.5'], ['1,2,3', '1,23', '1.23'], ['12.345678901', '12.345678', '12.345678']];
  for (const [input, display, normalized] of cases) assert.deepEqual(sanitizeAmountInput(input, 6), { display, normalized });
});
