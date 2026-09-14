import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useWalletCardsStore, StablecoinCardData } from '../../stores/useWalletCardsStore';

interface AddStablecoinModalProps {
  visible: boolean;
  onClose: () => void;
  accountName: string;
  maskedWallet: string;
}

const SUPPORTED_STABLECOINS = [
  {
    currency: 'USDT',
    symbol: 'USDT',
    name: 'Tether USD',
    themeColor: '#26A17B',
    badgeBg: '#FFFFFF',
    rateInfo: '1 USDT = $1.00',
  },
  {
    currency: 'PYUSD',
    symbol: 'PYUSD',
    name: 'PayPal USD',
    themeColor: '#0079C1',
    badgeBg: '#FFFFFF',
    rateInfo: '1 PYUSD = $1.00',
  },
  {
    currency: 'EURC',
    symbol: 'EURC',
    name: 'Euro Coin',
    themeColor: '#0052FF',
    badgeBg: '#FFFFFF',
    rateInfo: '1 EURC = €1.00',
  },
  {
    currency: 'DAI',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    themeColor: '#F4B731',
    badgeBg: '#FFFFFF',
    rateInfo: '1 DAI = $1.00',
  },
  {
    currency: 'FDUSD',
    symbol: 'FDUSD',
    name: 'First Digital USD',
    themeColor: '#131518',
    badgeBg: '#FFFFFF',
    rateInfo: '1 FDUSD = $1.00',
  }
];

export const AddStablecoinModal: React.FC<AddStablecoinModalProps> = ({
  visible,
  onClose,
  accountName,
  maskedWallet,
}) => {
  const { walletCards, addCard } = useWalletCardsStore();

  const availableCoins = useMemo(() => {
    return SUPPORTED_STABLECOINS.filter(
      (coin) => !walletCards.some((card) => card.currency === coin.currency)
    );
  }, [walletCards]);

  const handleAdd = (coin: any) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newCard: StablecoinCardData = {
      id: `stable_${coin.currency.toLowerCase()}`,
      currency: coin.currency,
      name: coin.name,
      symbol: coin.symbol,
      themeColor: coin.themeColor,
      badgeBg: coin.badgeBg,
      balanceUsd: '$0.00',
      balanceFormatted: coin.symbol === '€' ? '€0.00' : '$0.00',
      accountName: accountName,
      maskedWallet: maskedWallet,
      rateInfo: coin.rateInfo,
    };
    addCard(newCard);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Thêm Stablecoin</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Chọn đồng coin bạn muốn thêm vào ví chính.
          </Text>

          <View style={styles.listContainer}>
            {availableCoins.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>😎</Text>
                <Text style={styles.emptyText}>Bạn đã sở hữu toàn bộ bộ sưu tập Stablecoin!</Text>
              </View>
            ) : (
              availableCoins.map((coin) => (
                <View key={coin.currency} style={styles.coinRow}>
                  <View style={styles.coinInfo}>
                    <View style={styles.coinIconWrapper}>
                      <Text style={styles.coinSymbol}>{coin.symbol}</Text>
                    </View>
                    <View>
                      <Text style={styles.coinName}>{coin.name}</Text>
                      <Text style={styles.coinCurrency}>Solana Network</Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity
                    style={[styles.addBtnWrapper, { backgroundColor: coin.themeColor }]}
                    onPress={() => handleAdd(coin)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.addBtnShadow} />
                    <View style={[styles.addBtnBody, { backgroundColor: coin.themeColor }]}>
                      <Text style={styles.addBtnText}>Add</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 3,
    borderColor: '#000',
    padding: 24,
    minHeight: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 24,
    color: '#000',
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#64748B',
    marginBottom: 24,
  },
  listContainer: {
    flex: 1,
  },
  coinRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#F1F5F9',
  },
  coinInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  coinSymbol: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
    color: '#000',
  },
  coinName: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#000',
  },
  coinCurrency: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  addBtnWrapper: {
    width: 72,
    height: 36,
    borderRadius: 12,
  },
  addBtnShadow: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: -3,
    bottom: -3,
    backgroundColor: '#000',
    borderRadius: 12,
  },
  addBtnBody: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    color: '#000',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});
