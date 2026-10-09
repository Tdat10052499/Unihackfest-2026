import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arrivedSince, stillNeeded, usdcNeededToLock, usdcUnits } from '../addUsdc.ts';

const fund = (address: string, role: 'client' | 'freelancer', actions: string[], amounts: number[]) =>
  ({ address, role, actions, milestones: amounts.map((a) => ({ amountUnits: BigInt(a * 1_000_000) })) }) as never;

test('needed to lock: client contracts whose next step is Lock, all milestones', () => {
  const funds = [
    fund('A', 'client', ['lock'], [10, 5]),
    fund('B', 'client', ['approve'], [50]),
    fund('C', 'freelancer', ['lock'], [99]),
    fund('D', 'client', ['lock', 'close'], [2.5]),
  ];
  assert.equal(usdcNeededToLock(funds), 17_500_000n);
  assert.equal(usdcNeededToLock(funds, 'A'), 15_000_000n, 'only that contract with ?fund');
  assert.equal(usdcNeededToLock(funds, 'B'), 0n, 'a contract already locked needs nothing');
  assert.equal(usdcNeededToLock([], undefined), 0n);
});

test('still needed and arrived', () => {
  assert.equal(usdcUnits(12.345678), 12_345_678n);
  assert.equal(stillNeeded(20_000_000n, 5_000_000n), 15_000_000n);
  assert.equal(stillNeeded(20_000_000n, 25_000_000n), 0n);
  assert.equal(stillNeeded(20_000_000n, null), 20_000_000n, 'unknown balance: the whole amount');
  assert.equal(arrivedSince(5, 25), 20);
  assert.equal(arrivedSince(5, 5), null);
  assert.equal(arrivedSince(null, 5), null);
});
