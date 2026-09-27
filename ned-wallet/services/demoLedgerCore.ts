export type DemoHolding = { mint: string; symbol: string; quantity: number; costBasisUsd: number };
export type DemoLedger = { cashUsdc: number; holdings: DemoHolding[]; trades: Record<string, unknown>[] };

export const emptyLedger = (): DemoLedger => ({ cashUsdc: 0, holdings: [], trades: [] });

export function buyDemo(
  ledger: DemoLedger,
  input: { mint: string; symbol: string; usd: number; quantity: number; time?: string },
): DemoLedger {
  if (input.usd <= 0 || input.quantity <= 0) throw new Error('Invalid demo buy quote');
  const fee = input.usd * 0.0025;
  const previous = ledger.holdings.find((holding) => holding.mint === input.mint);
  const holdings = previous
    ? ledger.holdings.map((holding) => holding.mint === input.mint
      ? { ...holding, quantity: holding.quantity + input.quantity, costBasisUsd: holding.costBasisUsd + input.usd }
      : holding)
    : [...ledger.holdings, { mint: input.mint, symbol: input.symbol, quantity: input.quantity, costBasisUsd: input.usd }];
  return {
    ...ledger,
    cashUsdc: ledger.cashUsdc - input.usd,
    holdings,
    trades: [...ledger.trades, { side: 'buy', ...input, fee, time: input.time || new Date().toISOString() }],
  };
}

export function sellDemo(
  ledger: DemoLedger,
  input: { mint: string; symbol: string; quantity: number; proceedsUsd: number; time?: string },
): DemoLedger {
  const holding = ledger.holdings.find((item) => item.mint === input.mint);
  if (!holding || input.quantity <= 0 || input.quantity > holding.quantity || input.proceedsUsd < 0) {
    throw new Error('Not enough demo shares');
  }

  const fee = input.proceedsUsd * 0.0025;
  const costBasis = holding.costBasisUsd * (input.quantity / holding.quantity);
  const remaining = holding.quantity - input.quantity;
  const holdings = remaining > 1e-12
    ? ledger.holdings.map((item) => item.mint === input.mint
      ? { ...item, quantity: remaining, costBasisUsd: holding.costBasisUsd - costBasis }
      : item)
    : ledger.holdings.filter((item) => item.mint !== input.mint);
  const proceeds = input.proceedsUsd - fee;
  return {
    ...ledger,
    cashUsdc: ledger.cashUsdc + proceeds,
    holdings,
    trades: [...ledger.trades, {
      side: 'sell', ...input, fee, proceeds, costBasis, pnl: proceeds - costBasis,
      time: input.time || new Date().toISOString(),
    }],
  };
}

export function resetDemo(): DemoLedger {
  return emptyLedger();
}
