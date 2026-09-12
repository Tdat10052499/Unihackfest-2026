import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

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
  network: string;
  rateInfo?: string;
}

export interface NeoPhysicalWalletCardProps {
  cards?: StablecoinCardData[];
  onDepositPress?: () => void;
  onSendPress?: () => void;
  onCardChange?: (card: StablecoinCardData) => void;
  onAddCardPress?: () => void;
}

// Cấu hình lò xo Snappy dứt khoát Neo-brutalism (stiffness: 280, damping: 20, mass: 0.8)
const SNAPPY_SPRING_CONFIG = {
  damping: 20,
  stiffness: 280,
  mass: 0.8,
};

const SPRING_REVEAL_CONFIG = {
  damping: 18,
  stiffness: 240,
  mass: 0.8,
};

export const NeoPhysicalWalletCard: React.FC<NeoPhysicalWalletCardProps> = ({
  cards = [],
  onDepositPress,
  onSendPress,
  onCardChange,
  onAddCardPress,
}) => {
  // Mặc định 3 thẻ Stablecoin nếu chưa truyền vào
  const initialCards: StablecoinCardData[] = cards.length > 0 ? cards : [
    {
      id: 'usdc',
      currency: 'USDC',
      name: 'USD Coin',
      symbol: '$',
      themeColor: '#00E5FF', // Cyan chuẩn Neo-brutalism
      badgeBg: '#FFFFFF',
      balanceUsd: '$17.50',
      balanceFormatted: '$17.50',
      accountName: 'teichi',
      maskedWallet: '**** fFKV',
      network: 'SOLANA',
      rateInfo: '1 USDC = $1.00',
    },
    {
      id: 'eurc',
      currency: 'EURC',
      name: 'Euro Coin',
      symbol: '€',
      themeColor: '#FEF08A', // Vàng pastel ấm
      badgeBg: '#FFFFFF',
      balanceUsd: '$16.20',
      balanceFormatted: '€15.80',
      accountName: 'teichi',
      maskedWallet: '**** fFKV',
      network: 'SOLANA',
      rateInfo: '1 EURC = €1.00',
    },
    {
      id: 'pyusd',
      currency: 'PYUSD',
      name: 'PayPal USD',
      symbol: '$',
      themeColor: '#FFD6E8', // Hồng pastel
      badgeBg: '#FFFFFF',
      balanceUsd: '$25.00',
      balanceFormatted: '$25.00',
      accountName: 'teichi',
      maskedWallet: '**** fFKV',
      network: 'SOLANA',
      rateInfo: '1 PYUSD = $1.00',
    },
  ];

  // Thứ tự index vật lý của 3 thẻ: cardOrder[0] là Front, cardOrder[1] là Middle, cardOrder[2] là Back
  const [cardOrder, setCardOrder] = useState<number[]>([0, 1, 2]);
  const [cardDataList, setCardDataList] = useState<StablecoinCardData[]>(initialCards);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  // Shared values cho từng thẻ 0, 1, 2 để tạo chuyển động Arc Trajectory thực tế
  // Card 0 (Front ban đầu)
  const card0TranslateY = useSharedValue(0);
  const card0TranslateX = useSharedValue(0);
  const card0Rotate = useSharedValue(0);
  const card0Scale = useSharedValue(1);
  const card0ZIndex = useSharedValue(5);

  // Card 1 (Middle ban đầu)
  const card1TranslateY = useSharedValue(-10);
  const card1TranslateX = useSharedValue(0);
  const card1Rotate = useSharedValue(1.5);
  const card1Scale = useSharedValue(0.98);
  const card1ZIndex = useSharedValue(4);

  // Card 2 (Back ban đầu)
  const card2TranslateY = useSharedValue(-20);
  const card2TranslateX = useSharedValue(0);
  const card2Rotate = useSharedValue(-1.5);
  const card2Scale = useSharedValue(0.96);
  const card2ZIndex = useSharedValue(3);

  // Thẻ "Thêm ví Stablecoin" (Add Coin Card) - Ẩn sau cùng (zIndex: 0 hoặc 1)
  const addCardTranslateY = useSharedValue(20);
  const addCardScale = useSharedValue(0.92);
  const addCardRotate = useSharedValue(0);
  const addCardOpacity = useSharedValue(0);

  // Shared value nảy số khi đổi thẻ (Rolling Numbers / Scale Pop)
  const balanceScale = useSharedValue(1);

  // Cập nhật khi props `cards` thay đổi
  useEffect(() => {
    if (cards && cards.length > 0) {
      setCardDataList(cards);
    }
  }, [cards]);

  const activeFrontCard = cardDataList[cardOrder[0]] || initialCards[0];
  const nextCard = cardDataList[cardOrder[1]] || cardDataList[cardOrder[0]];

  // Mảng controllers tương ứng cho 3 thẻ
  const cardAnimControllers = [
    { translateY: card0TranslateY, translateX: card0TranslateX, rotate: card0Rotate, scale: card0Scale, zIndex: card0ZIndex },
    { translateY: card1TranslateY, translateX: card1TranslateX, rotate: card1Rotate, scale: card1Scale, zIndex: card1ZIndex },
    { translateY: card2TranslateY, translateX: card2TranslateX, rotate: card2Rotate, scale: card2Scale, zIndex: card2ZIndex },
  ];

  // Callback kết thúc toàn bộ chuỗi animation
  const onAnimationFinished = useCallback(() => {
    setIsAnimating(false);
  }, []);

  // Pha 2 & Pha 3: Đạt đỉnh Parabol (-180, 60), đảo lớp zIndex và thực hiện nhét vào sau tức thì (Zero-delay)
  const onApexReached = useCallback((frontIdx: number, midIdx: number, backIdx: number) => {
    // 1. Cập nhật state thứ tự thẻ
    const newOrder = [midIdx, backIdx, frontIdx];
    setCardOrder(newOrder);

    // 2. Thông báo cho component cha (HomeScreen) biết thẻ active mới
    if (onCardChange) {
      onCardChange(cardDataList[midIdx]);
    }

    // 3. Pha 3 (Nhét vào sau & Đùn thẻ mới lên):
    // Thẻ Front cũ (frontIdx): trượt từ (-180, 60) lượn xuống vị trí Back (-20, 0, rotate: -1.5, scale: 0.96)
    const frontCtrl = cardAnimControllers[frontIdx];
    frontCtrl.zIndex.value = 2; // Hạ zIndex xuống thấp nhất
    frontCtrl.translateX.value = withSpring(0, SNAPPY_SPRING_CONFIG);
    frontCtrl.rotate.value = withSpring(-1.5, SNAPPY_SPRING_CONFIG);
    frontCtrl.scale.value = withSpring(0.96, SNAPPY_SPRING_CONFIG);
    frontCtrl.translateY.value = withSpring(
      isRevealed ? -145 : -20,
      SNAPPY_SPRING_CONFIG,
      (isDone) => {
        if (isDone) {
          runOnJS(onAnimationFinished)();
        }
      }
    );

    // Thẻ Middle cũ (midIdx): Đùn lên (Push Up) làm Front Card mới (translateY: 0, scale: 1, rotate: 0)
    const midCtrl = cardAnimControllers[midIdx];
    midCtrl.zIndex.value = 5; // Nâng zIndex lên cao nhất
    midCtrl.translateX.value = withSpring(0, SNAPPY_SPRING_CONFIG);
    midCtrl.rotate.value = withSpring(0, SNAPPY_SPRING_CONFIG);
    midCtrl.scale.value = withSpring(1.0, SNAPPY_SPRING_CONFIG);
    midCtrl.translateY.value = withSpring(isRevealed ? -80 : 0, SNAPPY_SPRING_CONFIG);

    // Thẻ Back cũ (backIdx): Tiến lên làm Middle Card mới (translateY: -10, scale: 0.98, rotate: 1.5)
    const backCtrl = cardAnimControllers[backIdx];
    backCtrl.zIndex.value = 4; // Nâng lên lớp giữa
    backCtrl.translateX.value = withSpring(0, SNAPPY_SPRING_CONFIG);
    backCtrl.rotate.value = withSpring(1.5, SNAPPY_SPRING_CONFIG);
    backCtrl.scale.value = withSpring(0.98, SNAPPY_SPRING_CONFIG);
    backCtrl.translateY.value = withSpring(isRevealed ? -115 : -10, SNAPPY_SPRING_CONFIG);
  }, [cardDataList, isRevealed, onCardChange, onAnimationFinished]);

  // Kích hoạt chuỗi hoạt ảnh Đổi thẻ (Snappy Realistic Arc Trajectory Swap)
  const handleSwapPress = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Kích hoạt đồng thời hiệu ứng nảy số Total Balance phản hồi tức thì với ngón tay
    balanceScale.value = withSequence(
      withTiming(1.18, { duration: 100, easing: Easing.out(Easing.quad) }),
      withSpring(1, SNAPPY_SPRING_CONFIG)
    );

    const [frontIdx, midIdx, backIdx] = cardOrder;
    const frontCtrl = cardAnimControllers[frontIdx];

    // Đảm bảo Front Card ở zIndex cao nhất trong lúc rút lên
    frontCtrl.zIndex.value = 50;

    // Pha 1 (Rút lên cực nhanh 130ms, Easing phanh gấp ở đỉnh):
    const SWAP_OUT_DURATION = 130;
    const FAST_EASING = Easing.bezier(0.25, 1, 0.5, 1);

    frontCtrl.scale.value = withTiming(0.95, { duration: SWAP_OUT_DURATION, easing: FAST_EASING });
    frontCtrl.rotate.value = withTiming(15, { duration: SWAP_OUT_DURATION, easing: FAST_EASING });
    frontCtrl.translateX.value = withTiming(60, { duration: SWAP_OUT_DURATION, easing: FAST_EASING });
    frontCtrl.translateY.value = withTiming(
      -180,
      { duration: SWAP_OUT_DURATION, easing: FAST_EASING },
      (isFinished) => {
        if (isFinished) {
          // Pha 2 (Đảo lớp) & Pha 3 (Nhét vào sau & Đùn thẻ mới): kích hoạt tức thì không delay
          runOnJS(onApexReached)(frontIdx, midIdx, backIdx);
        }
      }
    );
  }, [isAnimating, cardOrder, onApexReached]);

  // Tap to Reveal / Bung thẻ lên cao hoặc thu lại (kèm thẻ "Thêm ví")
  const toggleReveal = useCallback(() => {
    if (isAnimating) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextState = !isRevealed;
    setIsRevealed(nextState);

    const [frontIdx, midIdx, backIdx] = cardOrder;
    const frontCtrl = cardAnimControllers[frontIdx];
    const midCtrl = cardAnimControllers[midIdx];
    const backCtrl = cardAnimControllers[backIdx];

    if (nextState) {
      // Bung thẻ lên cao (Lộ 70% thân thẻ)
      frontCtrl.translateY.value = withSpring(-80, SPRING_REVEAL_CONFIG);
      frontCtrl.rotate.value = withSpring(0, SPRING_REVEAL_CONFIG);

      midCtrl.translateY.value = withSpring(-115, SPRING_REVEAL_CONFIG);
      midCtrl.rotate.value = withSpring(3, SPRING_REVEAL_CONFIG);

      backCtrl.translateY.value = withSpring(-145, SPRING_REVEAL_CONFIG);
      backCtrl.rotate.value = withSpring(-3, SPRING_REVEAL_CONFIG);

      // Thẻ "Thêm ví" trượt lên cao nhất (-175px) để lộ rõ vùng dấu (+)
      addCardTranslateY.value = withSpring(-175, SPRING_REVEAL_CONFIG);
      addCardScale.value = withSpring(0.95, SPRING_REVEAL_CONFIG);
      addCardRotate.value = withSpring(0, SPRING_REVEAL_CONFIG);
      addCardOpacity.value = withTiming(1, { duration: 150 });
    } else {
      // Thu thẻ về vị trí cắm trong ví
      frontCtrl.translateY.value = withSpring(0, SNAPPY_SPRING_CONFIG);
      frontCtrl.rotate.value = withSpring(0, SNAPPY_SPRING_CONFIG);

      midCtrl.translateY.value = withSpring(-10, SNAPPY_SPRING_CONFIG);
      midCtrl.rotate.value = withSpring(1.5, SNAPPY_SPRING_CONFIG);

      backCtrl.translateY.value = withSpring(-20, SNAPPY_SPRING_CONFIG);
      backCtrl.rotate.value = withSpring(-1.5, SNAPPY_SPRING_CONFIG);

      // Thẻ "Thêm ví" thu gọn ẩn hoàn toàn trong ví
      addCardTranslateY.value = withSpring(20, SNAPPY_SPRING_CONFIG);
      addCardScale.value = withSpring(0.92, SNAPPY_SPRING_CONFIG);
      addCardRotate.value = withSpring(0, SNAPPY_SPRING_CONFIG);
      addCardOpacity.value = withTiming(0, { duration: 100 });
    }
  }, [isAnimating, isRevealed, cardOrder]);

  // Animated Styles cho từng thẻ 0, 1, 2
  const card0AnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: card0TranslateY.value },
      { translateX: card0TranslateX.value },
      { rotateZ: `${card0Rotate.value}deg` },
      { scale: card0Scale.value },
    ],
    zIndex: card0ZIndex.value,
  }));

  const card1AnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: card1TranslateY.value },
      { translateX: card1TranslateX.value },
      { rotateZ: `${card1Rotate.value}deg` },
      { scale: card1Scale.value },
    ],
    zIndex: card1ZIndex.value,
  }));

  const card2AnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: card2TranslateY.value },
      { translateX: card2TranslateX.value },
      { rotateZ: `${card2Rotate.value}deg` },
      { scale: card2Scale.value },
    ],
    zIndex: card2ZIndex.value,
  }));

  // Animated Style cho thẻ "Thêm ví"
  const addCardAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: addCardTranslateY.value },
      { scale: addCardScale.value },
      { rotateZ: `${addCardRotate.value}deg` },
    ],
    opacity: addCardOpacity.value,
    zIndex: 1, // zIndex thấp nhất ở tầng sau cùng
  }));

  const animatedBalanceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: balanceScale.value }],
  }));

  const cardAnimStyles = [card0AnimStyle, card1AnimStyle, card2AnimStyle];

  // Helper render từng thẻ Stablecoin với bóng đổ cứng đồng bộ
  const renderCardItem = (cardIndex: number) => {
    const cardData = cardDataList[cardIndex];
    if (!cardData) return null;

    const animStyle = cardAnimStyles[cardIndex];

    return (
      <Animated.View
        key={cardData.id}
        style={[styles.cardItemPosition, animStyle]}
      >
        <TouchableOpacity
          activeOpacity={0.94}
          onPress={toggleReveal}
          disabled={isAnimating}
          style={styles.cardTouchable}
        >
          {/* Lớp bóng đen cứng lót dưới chuyển động đồng bộ để viền không bị răng cưa */}
          <View style={styles.cardItemShadow} />

          {/* Thân thẻ viền đen 2.5px Neo-brutalism */}
          <View style={[styles.cardItemBody, { backgroundColor: cardData.themeColor }]}>
            {/* Hàng 1: Tên người dùng & Branding Web3 */}
            <View style={styles.cardItemTopRow}>
              <Text style={styles.cardItemAccountName} numberOfLines={1}>
                {cardData.accountName}
              </Text>
              <Text style={styles.cardItemBrandItalic}>
                {cardData.currency} <Text style={styles.cardItemBrandSub}>Web3</Text>
              </Text>
            </View>

            {/* Hàng 2: Chuỗi ví viết tắt & Badge SOLANA */}
            <View style={styles.cardItemBottomRow}>
              <Text style={styles.cardItemMaskedWallet}>{cardData.maskedWallet}</Text>
              <View style={styles.networkPill}>
                <MaterialCommunityIcons name="lightning-bolt" size={11} color="#000000" />
                <Text style={styles.networkPillText}>{cardData.network}</Text>
              </View>
            </View>

            {/* 3 dấu chấm nhỏ (dots) ở giữa rìa dưới */}
            <View style={styles.cardFooterRow}>
              <View style={styles.dotsIndicatorContainer}>
                <View style={[styles.dotItem, cardOrder[0] === cardIndex ? styles.dotItemActive : null]} />
                <View style={styles.dotItem} />
                <View style={styles.dotItem} />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.outerContainer}>
      {/* Lớp bóng đổ cứng đen bao ngoài toàn bộ cụm Ví */}
      <View style={styles.walletHardShadow} />

      {/* ========================================================================= */}
      {/* 1. NGĂN CHỨA THẺ (Card Stack Bay - Nằm sau Túi ví, không dùng overflow: hidden) */}
      {/* ========================================================================= */}
      <View style={styles.cardBayContainer} pointerEvents="box-none">
        {/* THẺ CHỨC NĂNG: "Thêm ví Stablecoin" (Add Coin Card) - Nằm sau cùng */}
        <Animated.View style={[styles.cardItemPosition, addCardAnimStyle]}>
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={(e) => {
              e.stopPropagation?.();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (onAddCardPress) {
                onAddCardPress();
              }
            }}
            style={styles.cardTouchable}
          >
            <View style={styles.cardItemShadow} />
            <View style={styles.addCardBody}>
              <View style={styles.addCardTopContent}>
                <View style={styles.addCardPlusBadge}>
                  <Feather name="plus" size={16} color="#000000" />
                </View>
                <Text style={styles.addCardTitleText}>Add Stablecoin</Text>
              </View>
              <Text style={styles.addCardSubText}>Tap to add new currency card</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* 3 Thẻ Stablecoin chính */}
        {renderCardItem(2)}
        {renderCardItem(1)}
        {renderCardItem(0)}
      </View>

      {/* ========================================================================= */}
      {/* 2. TÚI VÍ (Front Pouch - Nền trắng/kem, zIndex: 100 đè lên nửa dưới các thẻ) */}
      {/* ========================================================================= */}
      <View style={styles.frontPouchContainer}>
        {/* Miệng túi ví với NÚT "SWAP" NEO-BRUTALISM */}
        <View style={styles.pouchRimBar}>
          <TouchableOpacity
            style={[styles.swapBtnWrapper, isAnimating && styles.swapBtnDisabled]}
            onPress={handleSwapPress}
            disabled={isAnimating}
            activeOpacity={0.82}
          >
            <View style={styles.swapBtnShadow} />
            <View style={[styles.swapBtnBody, isAnimating && styles.swapBtnBodyActive]}>
              <Ionicons name="swap-horizontal" size={15} color="#000000" />
              <Text style={styles.swapBtnText}>Swap</Text>
              <View style={styles.swapBadgeNext}>
                <Text style={styles.swapBadgeNextText}>{nextCard.currency}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Khu vực Số dư lớn & Biểu tượng đồng xu */}
        <View style={styles.pouchBalanceArea}>
          <View style={[styles.coinSymbolBadge, { backgroundColor: activeFrontCard.themeColor }]}>
            <Text style={styles.coinSymbolText}>{activeFrontCard.symbol}</Text>
          </View>

          <Animated.View style={animatedBalanceStyle}>
            <Text style={styles.pouchBalanceNumber}>
              {activeFrontCard.balanceFormatted}
            </Text>
          </Animated.View>

          <View style={styles.balanceSubRow}>
            <Text style={styles.pouchBalanceLabel}>Total Balance</Text>
            <View style={styles.activeCurrencyTag}>
              <Text style={styles.activeCurrencyTagText}>{activeFrontCard.currency}</Text>
            </View>
          </View>
        </View>

        {/* Hàng nút bấm Hành động (Deposit & Send) */}
        <View style={styles.pouchActionsRow}>
          {/* Nút Deposit (Vàng nhạt, icon mũi tên xuống) */}
          <TouchableOpacity
            style={styles.pouchActionBtnWrapper}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (onDepositPress) onDepositPress();
            }}
            activeOpacity={0.85}
          >
            <View style={styles.pouchActionBtnShadow} />
            <View style={[styles.pouchActionBtnBody, { backgroundColor: '#FFF3A8' }]}>
              <Ionicons name="arrow-down" size={16} color="#000000" />
              <Text style={styles.pouchActionBtnText}>Deposit</Text>
            </View>
          </TouchableOpacity>

          {/* Nút Send (Trắng/kem, icon mũi tên lên) */}
          <TouchableOpacity
            style={styles.pouchActionBtnWrapper}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (onSendPress) onSendPress();
            }}
            activeOpacity={0.85}
          >
            <View style={styles.pouchActionBtnShadow} />
            <View style={[styles.pouchActionBtnBody, { backgroundColor: '#FFFFFF' }]}>
              <Ionicons name="arrow-up" size={16} color="#000000" />
              <Text style={styles.pouchActionBtnText}>Send</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'relative',
    width: '100%',
    height: 380, // Chiều cao bao bọc ngăn chứa thẻ + túi ví (không dùng overflow: hidden)
    marginTop: 18,
    marginBottom: 8,
  },
  walletHardShadow: {
    position: 'absolute',
    top: 5,
    left: 5,
    right: -5,
    bottom: -5,
    backgroundColor: '#000000',
    borderRadius: 28,
  },

  // 1. Ngăn chứa thẻ (Card Bay)
  cardBayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    alignItems: 'center',
    zIndex: 2,
  },
  cardItemPosition: {
    position: 'absolute',
    width: '92%',
    height: 140,
  },
  cardTouchable: {
    width: '100%',
    height: '100%',
  },
  cardItemShadow: {
    position: 'absolute',
    top: 3.5,
    left: 3.5,
    right: -3.5,
    bottom: -3.5,
    backgroundColor: '#000000',
    borderRadius: 18,
  },
  cardItemBody: {
    width: '100%',
    height: '100%',
    borderRadius: 16, // Bo góc 16px
    borderWidth: 2.5, // Viền đen 2.5px
    borderColor: '#000000',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    justifyContent: 'space-between',
  },

  // Thẻ "Thêm ví Stablecoin" (Dashed border Neo-brutalism)
  addCardBody: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    borderWidth: 2.5,
    borderStyle: 'dashed',
    borderColor: '#000000',
    backgroundColor: '#CCFF00', // Xanh lá mạ chói Neo-brutalism
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    justifyContent: 'space-between',
  },
  addCardTopContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addCardPlusBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCardTitleText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.3,
  },
  addCardSubText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
    opacity: 0.75,
  },

  cardItemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardItemAccountName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.3,
  },
  cardItemBrandItalic: {
    fontSize: 14,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#000000',
    letterSpacing: 0.2,
  },
  cardItemBrandSub: {
    fontSize: 11,
    fontWeight: '800',
    fontStyle: 'normal',
    color: '#000000',
  },
  cardItemBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardItemMaskedWallet: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.6,
  },
  networkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    gap: 2,
  },
  networkPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  dotsIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dotItem: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  dotItemActive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000000',
  },

  // 2. Túi ví (Front Pouch - zIndex: 100 tuyệt đối che nửa dưới thẻ)
  frontPouchContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 250, // Chiều cao túi ví cắt ngang nửa dưới các thẻ
    backgroundColor: '#FFFFFF', // Nền trắng của Túi ví
    borderRadius: 26,
    borderWidth: 3, // Viền đen 3px
    borderColor: '#000000',
    zIndex: 100, // zIndex cao nhất để che khuất vật lý
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
    justifyContent: 'space-between',
  },
  pouchRimBar: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },

  // Nút SWAP Neo-brutalism
  swapBtnWrapper: {
    position: 'relative',
    height: 32,
  },
  swapBtnDisabled: {
    opacity: 0.85,
  },
  swapBtnShadow: {
    position: 'absolute',
    top: 2.5,
    left: 2.5,
    right: -2.5,
    bottom: -2.5,
    backgroundColor: '#000000',
    borderRadius: 999,
  },
  swapBtnBody: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3C7', // Nền vàng nhạt pastel chuẩn Neo-brutalism
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 5,
  },
  swapBtnBodyActive: {
    backgroundColor: '#FDE68A',
  },
  swapBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.3,
  },
  swapBadgeNext: {
    backgroundColor: '#111827',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    marginLeft: 1,
  },
  swapBadgeNextText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  pouchBalanceArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  coinSymbolBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  coinSymbolText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
  },
  pouchBalanceNumber: {
    fontSize: 35,
    fontWeight: '900',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: -0.8,
  },
  balanceSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  pouchBalanceLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  activeCurrencyTag: {
    backgroundColor: '#111827',
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  activeCurrencyTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  pouchActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  pouchActionBtnWrapper: {
    flex: 1,
    position: 'relative',
    height: 44,
  },
  pouchActionBtnShadow: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: -3,
    bottom: -3,
    backgroundColor: '#000000',
    borderRadius: 999,
  },
  pouchActionBtnBody: {
    height: 44,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#000000',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  pouchActionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
});
