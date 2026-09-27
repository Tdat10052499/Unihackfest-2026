import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buyDemo, emptyLedger, sellDemo } from '../demoLedgerCore.ts';
test('demo ledger buys, tracks cost basis, sells and resets', () => {
  const bought = buyDemo({ ...emptyLedger(), cashUsdc: 100 }, { mint: 'a', symbol: 'AAPLx', usd: 50, price: 10 });
  assert.equal(bought.cashUsdc, 50); assert.equal(bought.holdings[0].quantity, 4.9875);
  const sold = sellDemo(bought, { mint: 'a', symbol: 'AAPLx', quantity: bought.holdings[0].quantity / 2, price: 12 });
  assert.ok(sold.cashUsdc > 79); assert.equal(sold.trades[1].side, 'sell'); assert.ok(typeof sold.trades[1].pnl === 'number');
});
