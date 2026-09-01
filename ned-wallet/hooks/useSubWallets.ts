import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface SubWalletItem {
  id: string;
  currency: 'VND' | 'EUR' | 'GBP' | 'JPY';
  symbol: string;
  name: string;
  balance: number;
  rateToUsd: number; // 1 USD = rateToUsd units
  color: string;
}

export const SUPPORTED_CURRENCIES: Omit<SubWalletItem, 'id' | 'balance'>[] = [
  {
    currency: 'VND',
    symbol: 'đ',
    name: 'Việt Nam Đồng',
    rateToUsd: 25400,
    color: '#FFF1A6', // Vàng pastel
  },
  {
    currency: 'EUR',
    symbol: '€',
    name: 'Euro',
    rateToUsd: 0.92,
    color: '#D8FAF7', // Xanh mint pastel
  },
  {
    currency: 'GBP',
    symbol: '£',
    name: 'Bảng Anh',
    rateToUsd: 0.79,
    color: '#FFD6E8', // Hồng pastel
  },
  {
    currency: 'JPY',
    symbol: '¥',
    name: 'Yên Nhật',
    rateToUsd: 152.5,
    color: '#E9DCFE', // Tím pastel
  },
];

/**
 * useSubWallets: Quản lý danh sách Ví Phụ (VND, EUR...) chuẩn bị tích hợp Anchor PDA
 */
export function useSubWallets(userId?: string | null, onchainUsdcBalance: number = 0) {
  const storageKey = `@ned_active_fiat_wallets_${userId || 'guest'}`;
  const [activeCurrencies, setActiveCurrencies] = useState<string[]>([]);
  const [subWallets, setSubWallets] = useState<SubWalletItem[]>([]);

  // 1. Tải danh sách active currencies từ local storage khi khởi động
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window === 'undefined') return;

    AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              setActiveCurrencies(parsed);
              return;
            }
          } catch {}
        }
        setActiveCurrencies([]);
      })
      .catch(() => setActiveCurrencies([]));
  }, [storageKey]);

  // 2. Tính toán danh sách SubWallets dựa trên activeCurrencies & số dư on-chain thực tế
  useEffect(() => {
    const wallets: SubWalletItem[] = activeCurrencies
      .map((cur) => {
        const config = SUPPORTED_CURRENCIES.find((c) => c.currency === cur);
        if (!config) return null;

        // Tính số dư quy đổi động từ số dư USDC on-chain thực tế
        const dynamicBalance = Math.round(onchainUsdcBalance * config.rateToUsd);

        return {
          id: `sub_${cur.toLowerCase()}`,
          currency: config.currency as 'VND' | 'EUR' | 'GBP' | 'JPY',
          symbol: config.symbol,
          name: config.name,
          balance: dynamicBalance,
          rateToUsd: config.rateToUsd,
          color: config.color,
        };
      })
      .filter((w): w is SubWalletItem => w !== null);

    setSubWallets(wallets);
  }, [activeCurrencies, onchainUsdcBalance]);

  // 3. Thêm ví phụ mới
  const addSubWallet = useCallback(
    async (currencyCode: 'VND' | 'EUR' | 'GBP' | 'JPY') => {
      if (activeCurrencies.includes(currencyCode)) return false;

      const updated = [...activeCurrencies, currencyCode];
      setActiveCurrencies(updated);

      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {}
      return true;
    },
    [activeCurrencies, storageKey]
  );

  // 4. Xóa ví phụ
  const removeSubWallet = useCallback(
    async (currencyCode: string) => {
      const updated = activeCurrencies.filter((c) => c !== currencyCode);
      setActiveCurrencies(updated);

      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {}
    },
    [activeCurrencies, storageKey]
  );

  // 5. Thực hiện đổi tiền (Swap)
  const executeSwap = useCallback(
    async (targetCurrency: string, usdAmount: number) => {
      if (usdAmount <= 0) return { success: false, error: 'Số tiền không hợp lệ' };
      if (usdAmount > onchainUsdcBalance) return { success: false, error: 'Số dư USDC không đủ' };

      const config = SUPPORTED_CURRENCIES.find((c) => c.currency === targetCurrency);
      if (!config) return { success: false, error: 'Không tìm thấy loại tiền tệ' };

      const receivedAmount = Math.round(usdAmount * config.rateToUsd);

      return {
        success: true,
        receivedAmount,
        currency: config.currency,
        symbol: config.symbol,
      };
    },
    [onchainUsdcBalance]
  );

  return {
    subWallets,
    activeCurrencies,
    addSubWallet,
    removeSubWallet,
    executeSwap,
  };
}
