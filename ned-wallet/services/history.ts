export type HistoryEntry = { id: string; time?: string; blockTime?: number; demoSwap?: boolean; amount?: string; title?: string };

export function mergeActivityHistory(onchain: HistoryEntry[], demos: HistoryEntry[]): HistoryEntry[] {
  const byId = new Map<string, HistoryEntry>();
  [...onchain, ...demos].forEach((item) => byId.set(item.id, item));
  return [...byId.values()].sort((a, b) => {
    const at = a.blockTime ? a.blockTime * 1000 : Date.parse(a.time || '') || 0;
    const bt = b.blockTime ? b.blockTime * 1000 : Date.parse(b.time || '') || 0;
    return bt - at;
  });
}

export function serializeDemoSwaps(items: HistoryEntry[]): string { return JSON.stringify(items.filter((item) => item.demoSwap === true)); }
export function parseDemoSwaps(raw: string | null): HistoryEntry[] {
  try { const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed.filter((item) => item?.demoSwap === true) : []; }
  catch { return []; }
}
