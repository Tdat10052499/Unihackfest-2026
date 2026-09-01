import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getActiveFiatWallets, setActiveFiatWallets } from '../services/supabase';

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

const STORAGE_KEY = '@ned_sub_wallets_v2';

/**
 * useSubWallets: Quản lý danh sách Ví Phụ đồng bộ với Supabase & Tính toán tỷ giá động
 */
export function useSubWallets(userId?: string | null, onchainUsdcBalance: number = 0) {
  const [activeCurrencies, setActiveCurrencies] = useState<string[]>([]);
  const [subWallets, setSubWallets] = useState<SubWalletItem[]>([]);

  // 1. Fetch danh sách `active_fiat_wallets` từ Supabase profiles khi khởi động
  useEffect(() => {
    getActiveFiatWallets(userId)
      .then((currencies) => {
        if (Array.isArray(currencies)) {
          setActiveCurrencies(currencies);
        } else {
          setActiveCurrencies([]);
        }
      })
      .catch((err) => {
        console.warn('⚠️ [useSubWallets] Error fetching active fiat wallets:', err);
        setActiveCurrencies([]);
      });
  }, [userId]);

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

  // 3. Thêm ví phụ mới và đồng bộ lên Supabase
  const addSubWallet = useCallback(
    async (currencyCode: 'VND' | 'EUR' | 'GBP' | 'JPY') => {
      if (activeCurrencies.includes(currencyCode)) return false;

      const updated = [...activeCurrencies, currencyCode];
      setActiveCurrencies(updated);

      if (userId) {
        await setActiveFiatWallets(userId, updated);
      }
      return true;
    },
    [activeCurrencies, userId]
  );

  // 4. Xóa ví phụ
  const removeSubWallet = useCallback(
    async (currencyCode: string) => {
      const updated = activeCurrencies.filter((c) => c !== currencyCode);
      setActiveCurrencies(updated);

      if (userId) {
        await setActiveFiatWallets(userId, updated);
      }
    },
    [activeCurrencies, userId]
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
