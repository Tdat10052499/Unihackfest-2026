import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buyDemo, emptyLedger, resetDemo, sellDemo } from '../demoLedgerCore.ts';

test('demo ledger records quote quantity, cost basis, sale proceeds and reset', () => {
  const bought = buyDemo({ ...emptyLedger(), cashUsdc: 100 }, {
    mint: 'a', symbol: 'AAPLx', usd: 50, quantity: 4.812345,
  });
  assert.equal(bought.cashUsdc, 50);
  assert.equal(bought.holdings[0].quantity, 4.812345);
  assert.equal(bought.holdings[0].costBasisUsd, 50);

  const sold = sellDemo(bought, {
    mint: 'a', symbol: 'AAPLx', quantity: 2.4061725, proceedsUsd: 32,
  });
  assert.ok(sold.cashUsdc > 81);
  assert.ok(sold.holdings[0].quantity > 2.4);
  assert.equal(sold.trades[1].side, 'sell');
  assert.ok(typeof sold.trades[1].pnl === 'number');
  assert.deepEqual(resetDemo(), emptyLedger());
});
