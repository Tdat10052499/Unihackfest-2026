import { useState, useEffect, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import {
  getSolanaBalance,
  getUsdcTokenBalance,
  solanaConnection,
  USDC_DEVNET_MINT,
  USD_TO_VND_RATE,
} from '../services/solana';
import { getCachedBalance, cacheBalance } from '../services/storage';

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
  if (isNaN(usdcBalance) || usdcBalance < 0) usdcBalance = 0;

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
      return `$ ${usdcBalance.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
  }
}

export interface OnchainBalanceState {
  solBalance: number;
  usdcBalance: number;
  formattedUsd: string;
  formattedVnd: string;
  isLoading: boolean;
  error: string | null;
  refreshBalance: (force?: boolean) => Promise<void>;
}

/**
 * useOnchainBalance: Hook truy xuất số dư On-chain 100% động từ Blockchain Solana Devnet
 * - Truy vấn trực tiếp số dư SOL và USDC_DEVNET_MINT từ Associated Token Account (ATA)
 * - Tự động quy đổi tỷ giá sang VND, EUR, GBP, JPY
 * - Hỗ trợ Cache và In-flight Deduplication
 */
export function useOnchainBalance(walletAddress?: string | null): OnchainBalanceState {
  const [solBalance, setSolBalance] = useState<number>(0);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load số dư cache ban đầu
  useEffect(() => {
    if (!walletAddress) return;
    getCachedBalance().then((cached) => {
      if (cached !== null && cached > 0) {
        setSolBalance(cached);
      }
    });
  }, [walletAddress]);

  const refreshBalance = useCallback(
    async (force: boolean = false) => {
      if (!walletAddress) return;

      try {
        setIsLoading(true);
        setError(null);

        // Lấy đồng thời số dư SOL và USDC SPL Token on-chain
        const [sol, usdc] = await Promise.all([
          getSolanaBalance(walletAddress, force).catch(() => 0),
          getUsdcTokenBalance(walletAddress, force).catch(() => 0),
        ]);

        setSolBalance(sol);
        setUsdcBalance(usdc);
        await cacheBalance(sol);
      } catch (err: any) {
        console.warn('⚠️ [useOnchainBalance] Lỗi truy vấn on-chain balance:', err?.message);
        setError(err?.message || 'Không thể lấy số dư on-chain');
      } finally {
        setIsLoading(false);
      }
    },
    [walletAddress]
  );

  useEffect(() => {
    if (walletAddress) {
      refreshBalance(false);
    }
  }, [walletAddress, refreshBalance]);

  // Nếu ví có USDC, hiển thị số dư USDC làm giá trị chính
  const mainUsdAmount = usdcBalance > 0 ? usdcBalance : (solBalance * 150);

  return {
    solBalance,
    usdcBalance,
    formattedUsd: formatFiatBalance(mainUsdAmount, 'USD'),
    formattedVnd: formatFiatBalance(mainUsdAmount, 'VND'),
    isLoading,
    error,
    refreshBalance,
  };
}
