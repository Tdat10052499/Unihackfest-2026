import { create } from 'zustand';
import type { JupiterOrder } from '@/services/jupiter';
import type { XStock, XStockRange } from '@/services/xstocks';

type XStocksState = {
  stock: XStock | null;
  side: 'buy' | 'sell';
  amount: string;
  quote: JupiterOrder | null;
  range: XStockRange;
  result: 'success' | 'failed';
  error: string;
  setStock: (stock: XStock) => void;
  setSide: (side: 'buy' | 'sell') => void;
  setAmount: (amount: string) => void;
  setQuote: (quote: JupiterOrder | null) => void;
  setRange: (range: XStockRange) => void;
  setResult: (result: 'success' | 'failed', error?: string) => void;
};

export const useXStocksStore = create<XStocksState>((set) => ({
  stock: null,
  side: 'buy',
  amount: '',
  quote: null,
  range: '1D',
  result: 'success',
  error: '',
  setStock: (stock) => set({ stock }),
  setSide: (side) => set({ side, amount: '', quote: null }),
  setAmount: (amount) => set({ amount, quote: null }),
  setQuote: (quote) => set({ quote }),
  setRange: (range) => set({ range }),
  setResult: (result, error = '') => set({ result, error }),
}));
