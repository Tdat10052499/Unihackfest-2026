import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient } from '../services/supabase';

// Re-declare interface to avoid circular dependency with NeoPhysicalWalletCard
export interface StablecoinCardData {
  id: string;
  currency: string;
  name: string;
  symbol: string;
  themeColor: string;
  badgeBg: string;
  balanceUsd: string;
  balanceFormatted: string;
  accountName: string;
  maskedWallet: string;
  network?: string;
  rateInfo?: string;
  logoUrl?: string;
}

export const DEFAULT_USDC_CARD: StablecoinCardData = {
  id: 'usdc_default',
  currency: 'USDC',
  name: 'US DOLLAR',
  symbol: '$',
  themeColor: '#00E5FF',
  badgeBg: '#FFFFFF',
  balanceUsd: '$0.00',
  balanceFormatted: '$0.00',
  accountName: 'N.E.D User',
  maskedWallet: '**** ****',
  rateInfo: '1 USDC = $1.00',
  logoUrl: 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/usdc.png',
};

// Metadata danh sách các loại stablecoin hỗ trợ
export const SUPPORTED_STABLECOINS_MAP: Record<string, Partial<StablecoinCardData>> = {
  USDC: DEFAULT_USDC_CARD,
  USDT: {
    name: 'Tether USD',
    symbol: 'USDT',
    themeColor: '#26A17B',
    badgeBg: '#FFFFFF',
    rateInfo: '1 USDT = $1.00',
    logoUrl: 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/usdt.png',
  },
  PYUSD: {
    name: 'PayPal USD',
    symbol: 'PYUSD',
    themeColor: '#0079C1',
    badgeBg: '#FFFFFF',
    rateInfo: '1 PYUSD = $1.00',
    logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/27772.png',
  },
  EURC: {
    name: 'Euro Coin',
    symbol: 'EURC',
    themeColor: '#0052FF',
    badgeBg: '#FFFFFF',
    rateInfo: '1 EURC = €1.00',
    logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/20243.png',
  },
  DAI: {
    name: 'Dai Stablecoin',
    symbol: 'DAI',
    themeColor: '#F4B731',
    badgeBg: '#FFFFFF',
    rateInfo: '1 DAI = $1.00',
    logoUrl: 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/dai.png',
  },
  FDUSD: {
    name: 'First Digital USD',
    symbol: 'FDUSD',
    themeColor: '#131518',
    badgeBg: '#FFFFFF',
    rateInfo: '1 FDUSD = $1.00',
    logoUrl: 'https://s2.coinmarketcap.com/static/img/coins/64x64/26081.png',
  },
};

export const buildCardDataFromCurrency = (
  currency: string,
  accountName: string = 'N.E.D User',
  maskedWallet: string = '**** ****',
  fallbackColor?: string
): StablecoinCardData => {
  const upper = currency.toUpperCase();
  const meta = SUPPORTED_STABLECOINS_MAP[upper] || {};
  return {
    id: `stable_${upper.toLowerCase()}`,
    currency: upper,
    name: meta.name || `${upper} Stablecoin`,
    symbol: meta.symbol || (upper === 'EURC' ? '€' : '$'),
    themeColor: meta.themeColor || fallbackColor || '#00E5FF',
    badgeBg: meta.badgeBg || '#FFFFFF',
    balanceUsd: '$0.00',
    balanceFormatted: (meta.symbol || '$') === '€' ? '€0.00' : '$0.00',
    accountName,
    maskedWallet,
    rateInfo: meta.rateInfo || `1 ${upper} = $1.00`,
    logoUrl: meta.logoUrl,
  };
};

export interface WalletCardsState {
  walletCards: StablecoinCardData[];
  activeWalletAddress: string | null;
  isLoading: boolean;
  addCard: (card: StablecoinCardData, walletAddress?: string) => Promise<void>;
  removeCard: (id: string, walletAddress?: string) => Promise<void>;
  resetCards: () => void;
  loadCardsForWallet: (walletAddress: string, accountName?: string) => Promise<void>;
}

export const getWalletCardsStorageKey = (walletAddress: string) => `stablecoins_${walletAddress}`;

export const useWalletCardsStore = create<WalletCardsState>((set, get) => ({
  walletCards: [DEFAULT_USDC_CARD],
  activeWalletAddress: null,
  isLoading: false,

  resetCards: () => {
    set({
      walletCards: [DEFAULT_USDC_CARD],
      activeWalletAddress: null,
      isLoading: false,
    });
  },

  loadCardsForWallet: async (walletAddress: string, accountName: string = 'N.E.D User') => {
    if (!walletAddress) {
      get().resetCards();
      return;
    }

    const currentActive = get().activeWalletAddress;
    // BẮT BUỘC: Nếu đổi ví hoặc ví chưa được nạp, lập tức reset về mặc định [DEFAULT_USDC_CARD]
    // Điều này ngăn chặn việc giao diện của Ví B bị chớp lên các thẻ của Ví A trong lúc chờ fetch!
    if (currentActive !== walletAddress) {
      set({
        walletCards: [DEFAULT_USDC_CARD],
        activeWalletAddress: walletAddress,
        isLoading: true,
      });
    }

    const storageKey = getWalletCardsStorageKey(walletAddress);
    const masked = `**** ${walletAddress.slice(-4)}`;

    // 1. Đọc nhanh từ cache AsyncStorage có nối walletAddress vào tên key
    try {
      const cached = await AsyncStorage.getItem(storageKey);
      if (cached) {
        const parsed: StablecoinCardData[] = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          set({ walletCards: parsed });
        }
      }
    } catch (err) {
      console.warn('⚠️ [useWalletCardsStore] Lỗi đọc cache AsyncStorage:', err);
    }

    // 2. Fetch dữ liệu từ Supabase: supabase.from('wallet_assets').select('*').eq('wallet_address', walletAddress)
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('wallet_assets')
        .select('*')
        .eq('wallet_address', walletAddress);

      if (error) {
        console.warn('⚠️ [useWalletCardsStore] Lỗi khi tải wallet_assets từ Supabase:', error);
        set({ isLoading: false });
        return;
      }

      // Luôn đảm bảo thẻ USDC mặc định nằm ở vị trí đầu tiên
      const mergedList: StablecoinCardData[] = [
        {
          ...DEFAULT_USDC_CARD,
          accountName,
          maskedWallet: masked,
        },
      ];

      if (Array.isArray(data) && data.length > 0) {
        data.forEach((row: any) => {
          const cur = (row.currency || '').toUpperCase();
          if (cur && cur !== 'USDC' && !mergedList.some((c) => c.currency === cur)) {
            mergedList.push(
              buildCardDataFromCurrency(cur, accountName, masked, row.color)
            );
          }
        });
      }

      set({ walletCards: mergedList, isLoading: false });

      // Cập nhật lại cache AsyncStorage gắn với ví
      await AsyncStorage.setItem(storageKey, JSON.stringify(mergedList));
    } catch (syncErr) {
      console.error('❌ [useWalletCardsStore] Lỗi sync Supabase wallet_assets:', syncErr);
      set({ isLoading: false });
    }
  },

  addCard: async (card: StablecoinCardData, walletAddress?: string) => {
    const targetWallet = walletAddress || get().activeWalletAddress;
    const isDuplicate = get().walletCards.some((c) => c.currency === card.currency);
    if (isDuplicate) return;

    const updatedCards = [...get().walletCards, card];
    set({ walletCards: updatedCards });

    if (targetWallet) {
      // 1. Lưu vào AsyncStorage có gắn walletAddress: AsyncStorage.getItem('stablecoins_' + walletAddress)
      const storageKey = getWalletCardsStorageKey(targetWallet);
      AsyncStorage.setItem(storageKey, JSON.stringify(updatedCards)).catch(() => {});

      // 2. Bắn API Supabase lưu vào bảng wallet_assets
      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase.from('wallet_assets').insert({
          wallet_address: targetWallet,
          currency: card.currency,
          network: 'Solana',
          color: card.themeColor,
        });
        if (error) {
          console.warn('⚠️ [useWalletCardsStore] Lỗi khi insert wallet_assets vào Supabase:', error);
        } else {
          console.log(`✅ [useWalletCardsStore] Đã lưu thẻ ${card.currency} vào Supabase cho ví: ${targetWallet}`);
        }
      } catch (dbErr) {
        console.error('❌ [useWalletCardsStore] Exception insert wallet_assets:', dbErr);
      }
    }
  },

  removeCard: async (id: string, walletAddress?: string) => {
    const targetWallet = walletAddress || get().activeWalletAddress;
    const cardToRemove = get().walletCards.find((c) => c.id === id);
    const updated = get().walletCards.filter((c) => c.id !== id);
    if (updated.length === 0) {
      updated.push(DEFAULT_USDC_CARD);
    }
    set({ walletCards: updated });

    if (targetWallet) {
      const storageKey = getWalletCardsStorageKey(targetWallet);
      AsyncStorage.setItem(storageKey, JSON.stringify(updated)).catch(() => {});

      if (cardToRemove && cardToRemove.currency !== 'USDC') {
        try {
          const supabase = getSupabaseClient();
          await supabase
            .from('wallet_assets')
            .delete()
            .eq('wallet_address', targetWallet)
            .eq('currency', cardToRemove.currency);
        } catch {}
      }
    }
  },
}));
