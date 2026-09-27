export type DemoHolding = { mint: string; symbol: string; quantity: number; costBasisUsd: number };
export type DemoLedger = { cashUsdc: number; holdings: DemoHolding[]; trades: Record<string, unknown>[] };
export const emptyLedger = (): DemoLedger => ({ cashUsdc: 0, holdings: [], trades: [] });
export function buyDemo(ledger: DemoLedger, input: { mint: string; symbol: string; usd: number; price: number; time?: string }): DemoLedger {
  const fee = input.usd * 0.0025; const quantity = Math.max(0, input.usd - fee) / input.price;
  const previous = ledger.holdings.find((h) => h.mint === input.mint); const holdings = previous ? ledger.holdings.map((h) => h.mint === input.mint ? { ...h, quantity: h.quantity + quantity, costBasisUsd: h.costBasisUsd + input.usd } : h) : [...ledger.holdings, { mint: input.mint, symbol: input.symbol, quantity, costBasisUsd: input.usd }];
  return { ...ledger, cashUsdc: ledger.cashUsdc - input.usd, holdings, trades: [...ledger.trades, { side: 'buy', ...input, fee, quantity, time: input.time || new Date().toISOString() }] };
}
export function sellDemo(ledger: DemoLedger, input: { mint: string; symbol: string; quantity: number; price: number; time?: string }): DemoLedger {
  const holding = ledger.holdings.find((h) => h.mint === input.mint); if (!holding || input.quantity <= 0 || input.quantity > holding.quantity) throw new Error('Not enough demo shares');
  const gross = input.quantity * input.price; const fee = gross * 0.0025; const cost = holding.costBasisUsd * (input.quantity / holding.quantity); const remaining = holding.quantity - input.quantity;
  const holdings = remaining > 1e-12 ? ledger.holdings.map((h) => h.mint === input.mint ? { ...h, quantity: remaining, costBasisUsd: h.costBasisUsd - cost } : h) : ledger.holdings.filter((h) => h.mint !== input.mint);
  return { ...ledger, cashUsdc: ledger.cashUsdc + gross - fee, holdings, trades: [...ledger.trades, { side: 'sell', ...input, fee, proceeds: gross - fee, pnl: gross - fee - cost, time: input.time || new Date().toISOString() }] };
}
export function resetDemo(): DemoLedger { return emptyLedger(); }
