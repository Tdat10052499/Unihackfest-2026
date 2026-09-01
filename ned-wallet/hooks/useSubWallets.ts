import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const STORAGE_KEY = '@ned_sub_wallets_v1';

export function useSubWallets(mainUsdBalance: number = 100) {
  const [subWallets, setSubWallets] = useState<SubWalletItem[]>([
    {
      id: 'sub_vnd',
      currency: 'VND',
      symbol: 'đ',
      name: 'Việt Nam Đồng',
      balance: 2500000,
      rateToUsd: 25400,
      color: '#FFF1A6',
    },
  ]);

  // Load từ storage khi khởi động
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSubWallets(parsed);
          }
        } catch (e) {
          console.log('Error loading sub wallets:', e);
        }
      }
    });
  }, []);

  // Lưu vào storage khi state thay đổi
  const saveSubWallets = useCallback(async (wallets: SubWalletItem[]) => {
    setSubWallets(wallets);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(wallets));
    } catch (e) {
      console.log('Error saving sub wallets:', e);
    }
  }, []);

  // Thêm ví phụ mới
  const addSubWallet = useCallback(
    async (currencyCode: 'VND' | 'EUR' | 'GBP' | 'JPY') => {
      // Kiểm tra xem đã có ví tiền tệ này chưa
      const exists = subWallets.some((w) => w.currency === currencyCode);
      if (exists) return false;

      const currencyConfig = SUPPORTED_CURRENCIES.find((c) => c.currency === currencyCode);
      if (!currencyConfig) return false;

      const newWallet: SubWalletItem = {
        id: `sub_${currencyCode.toLowerCase()}_${Date.now()}`,
        currency: currencyConfig.currency,
        symbol: currencyConfig.symbol,
        name: currencyConfig.name,
        balance: 0,
        rateToUsd: currencyConfig.rateToUsd,
        color: currencyConfig.color,
      };

      const updated = [...subWallets, newWallet];
      await saveSubWallets(updated);
      return true;
    },
    [subWallets, saveSubWallets]
  );

  // Xóa ví phụ
  const removeSubWallet = useCallback(
    async (walletId: string) => {
      const updated = subWallets.filter((w) => w.id !== walletId);
      await saveSubWallets(updated);
    },
    [subWallets, saveSubWallets]
  );

  // Thực hiện đổi tiền (Swap USD -> SubWallet Currency)
  const executeSwap = useCallback(
    async (targetCurrency: string, usdAmount: number) => {
      if (usdAmount <= 0) return { success: false, error: 'Số tiền không hợp lệ' };
      if (usdAmount > mainUsdBalance) return { success: false, error: 'Số dư USD không đủ' };

      const walletIndex = subWallets.findIndex((w) => w.currency === targetCurrency);
      if (walletIndex === -1) return { success: false, error: 'Không tìm thấy ví đích' };

      const targetWallet = subWallets[walletIndex];
      const receivedAmount = usdAmount * targetWallet.rateToUsd;

      const updatedWallets = [...subWallets];
      updatedWallets[walletIndex] = {
        ...targetWallet,
        balance: targetWallet.balance + receivedAmount,
      };

      await saveSubWallets(updatedWallets);
      return {
        success: true,
        receivedAmount,
        currency: targetWallet.currency,
        symbol: targetWallet.symbol,
      };
    },
    [subWallets, mainUsdBalance, saveSubWallets]
  );

  return {
    subWallets,
    addSubWallet,
    removeSubWallet,
    executeSwap,
  };
}
