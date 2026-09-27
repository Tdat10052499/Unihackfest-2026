import AsyncStorage from '@react-native-async-storage/async-storage';
import { buyDemo, DemoLedger, emptyLedger, sellDemo } from './demoLedgerCore';
export type { DemoHolding, DemoLedger } from './demoLedgerCore';
const key = (wallet: string) => `@ned_demo_ledger:${wallet}`;
export async function getDemoLedger(wallet?: string | null): Promise<DemoLedger> { if (!wallet) return emptyLedger(); try { const raw = await AsyncStorage.getItem(key(wallet)); return raw ? { ...emptyLedger(), ...JSON.parse(raw) } : emptyLedger(); } catch { return emptyLedger(); } }
async function save(wallet: string, ledger: DemoLedger) { await AsyncStorage.setItem(key(wallet), JSON.stringify(ledger)); return ledger; }
export async function recordDemoBuy(wallet: string, input: Parameters<typeof buyDemo>[1]) { return save(wallet, buyDemo(await getDemoLedger(wallet), input)); }
export async function recordDemoSell(wallet: string, input: Parameters<typeof sellDemo>[1]) { return save(wallet, sellDemo(await getDemoLedger(wallet), input)); }
export async function resetDemoLedger(wallet: string) { return save(wallet, emptyLedger()); }
export async function recordDemoSwap(wallet: string, input: { inputSymbol: string; inputAmount: string; outputSymbol: string; outputAmount: string; feeUsd?: number }) {
  const ledger = await getDemoLedger(wallet); const inputUsd = input.inputSymbol === 'USDC' ? Number(input.inputAmount) : 0; const outputUsd = input.outputSymbol === 'USDC' ? Number(input.outputAmount) : 0;
  return save(wallet, { ...ledger, cashUsdc: ledger.cashUsdc + outputUsd - inputUsd, trades: [...ledger.trades, { side: 'swap', ...input, fee: input.feeUsd || 0, time: new Date().toISOString() }] });
}
