import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { useNetworkStore, SolanaNetwork } from '../stores/useNetworkStore';
import { fetchUsdcBalance } from '../services/solanaConnection';

export const USD_TO_VND_RATE = 25400;

export interface UseUsdcBalanceReturn {
  usdcBalance: number;
  formattedUsd: string;
  formattedVnd: string;
  isLoading: boolean;
  error: string | null;
  activeNetwork: SolanaNetwork;
  refreshBalance: () => Promise<void>;
}

/**
 * Định dạng số tiền USD sang chuỗi hiển thị chuẩn Neo-brutalism
 */
export function formatUsdcDisplay(amount: number): string {
  if (isNaN(amount) || amount <= 0) return '$0.00';
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Định dạng số tiền VND quy đổi từ USDC
 */
export function formatVndDisplay(usdcAmount: number): string {
  if (isNaN(usdcAmount) || usdcAmount <= 0) return 'đ 0';
  const vnd = Math.round(usdcAmount * USD_TO_VND_RATE);
  return `đ ${vnd.toLocaleString('vi-VN')}`;
}

const inFlightMap = new Map<string, Promise<number>>();

/**
 * useUsdcBalance: Hook lấy số dư SPL Token (USDC) thực tế từ Helius RPC
 * - Hoàn toàn không phụ thuộc vào số dư SOL hay quy đổi ảo.
 * - Tự động tải lại khi đổi mạng (Devnet <-> Mainnet).
 * - Trả về $0.00 nếu tài khoản chưa có token.
 */
export function useUsdcBalance(walletAddress?: string | null): UseUsdcBalanceReturn {
  const { activeNetwork } = useNetworkStore();
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const storageKey = walletAddress
    ? `@ned_usdc_balance_${walletAddress}_${activeNetwork}`
    : null;

  // 1. Tải số dư cache ngay khi mở màn hình
  useEffect(() => {
    if (!storageKey) return;
    if (Platform.OS === 'web' && typeof window === 'undefined') return;

    AsyncStorage.getItem(storageKey).then((cached) => {
      if (cached !== null) {
        const num = parseFloat(cached);
        if (!isNaN(num)) {
          setUsdcBalance(num);
        }
      }
    });
  }, [storageKey]);

  // 2. Hàm làm mới số dư on-chain qua Helius
  const refreshBalance = useCallback(async () => {
    if (!walletAddress) {
      setUsdcBalance(0);
      return;
    }

    const key = `${walletAddress}_${activeNetwork}`;

    try {
      setIsLoading(true);
      setError(null);

      // In-flight deduplication
      let promise = inFlightMap.get(key);
      if (!promise) {
        promise = fetchUsdcBalance(walletAddress, activeNetwork);
        inFlightMap.set(key, promise);
      }

      const bal = await promise;
      inFlightMap.delete(key);

      setUsdcBalance(bal);

      if (storageKey) {
        try {
          await AsyncStorage.setItem(storageKey, bal.toString());
        } catch {}
      }
    } catch (err: any) {
      console.warn(`⚠️ [useUsdcBalance] Lỗi tải số dư USDC (${activeNetwork}):`, err?.message);
      setError(err?.message || 'Không thể lấy số dư USDC');
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, activeNetwork, storageKey]);

  // 3. Tự động gọi khi walletAddress hoặc activeNetwork thay đổi
  useEffect(() => {
    if (walletAddress) {
      refreshBalance();
    }
  }, [walletAddress, activeNetwork, refreshBalance]);

  return {
    usdcBalance,
    formattedUsd: formatUsdcDisplay(usdcBalance),
    formattedVnd: formatVndDisplay(usdcBalance),
    isLoading,
    error,
    activeNetwork,
    refreshBalance,
  };
}
