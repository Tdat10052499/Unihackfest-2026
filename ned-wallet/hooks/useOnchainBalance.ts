import { useState, useEffect, useCallback } from 'react';
import { useNetworkStore, SolanaNetwork } from '../stores/useNetworkStore';
import { fetchUsdcBalance } from '../services/solanaConnection';

export interface FiatExchangeRates {
  VND: number;
  USD: number;
  EUR: number;
  GBP: number;
  JPY: number;
}

export const FIAT_RATES: FiatExchangeRates = {
  USD: 1,
  VND: 25400,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 152.5,
};

/**
 * Helper định dạng số dư Fiat động dựa trên số dư USDC On-chain thực tế
 * @param usdcBalance Số dư USDC on-chain
 * @param currencyType Loại tiền tệ: 'USD' | 'VND' | 'EUR' | 'GBP' | 'JPY'
 */
export function formatFiatBalance(
  usdcBalance: number,
  currencyType: 'USD' | 'VND' | 'EUR' | 'GBP' | 'JPY' = 'USD'
): string {
  if (isNaN(usdcBalance) || usdcBalance <= 0) {
    if (currencyType === 'VND') return 'đ 0';
    if (currencyType === 'EUR') return '€ 0.00';
    if (currencyType === 'GBP') return '£ 0.00';
    if (currencyType === 'JPY') return '¥ 0';
    return '$0.00';
  }

  switch (currencyType) {
    case 'VND': {
      const vnd = Math.round(usdcBalance * FIAT_RATES.VND);
      return `đ ${vnd.toLocaleString('vi-VN')}`;
    }
    case 'EUR': {
      const eur = (usdcBalance * FIAT_RATES.EUR).toFixed(2);
      return `€ ${parseFloat(eur).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    case 'GBP': {
      const gbp = (usdcBalance * FIAT_RATES.GBP).toFixed(2);
      return `£ ${parseFloat(gbp).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    case 'JPY': {
      const jpy = Math.round(usdcBalance * FIAT_RATES.JPY);
      return `¥ ${jpy.toLocaleString('ja-JP')}`;
    }
    case 'USD':
    default: {
      return `$${usdcBalance.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
  }
}

export interface OnchainBalanceState {
  usdcBalance: number;
  formattedUsd: string;
  formattedVnd: string;
  activeNetwork: SolanaNetwork;
  isLoading: boolean;
  error: string | null;
  refreshBalance: (force?: boolean) => Promise<void>;
}

/**
 * useOnchainBalance: Hook truy xuất số dư SPL Token (USDC) từ Helius RPC
 * - Hoàn toàn không sử dụng số dư Native SOL quy đổi ảo.
 * - Tự động đồng bộ khi chuyển đổi giữa Devnet và Mainnet-Beta.
 * - Trả về $0.00 và đ 0 nếu tài khoản chưa có token.
 */
export function useOnchainBalance(walletAddress?: string | null): OnchainBalanceState {
  const { activeNetwork } = useNetworkStore();
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBalance = useCallback(async (_force: boolean = false) => {
    if (!walletAddress) {
      setUsdcBalance(0);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Truy xuất số dư USDC on-chain thực tế qua Helius RPC
      const bal = await fetchUsdcBalance(walletAddress, activeNetwork);
      setUsdcBalance(bal);
    } catch (err: any) {
      console.warn(`⚠️ [useOnchainBalance] Lỗi truy vấn USDC (${activeNetwork}):`, err?.message);
      setError(err?.message || 'Không thể lấy số dư USDC on-chain');
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, activeNetwork]);

  useEffect(() => {
    if (walletAddress) {
      refreshBalance();
    }
  }, [walletAddress, activeNetwork, refreshBalance]);

  return {
    usdcBalance,
    formattedUsd: formatFiatBalance(usdcBalance, 'USD'),
    formattedVnd: formatFiatBalance(usdcBalance, 'VND'),
    activeNetwork,
    isLoading,
    error,
    refreshBalance,
  };
}
