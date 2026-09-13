import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
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
  network?: string;
  rateInfo?: string;
}

export interface NeoPhysicalWalletCardProps {
  cards?: StablecoinCardData[];
  onDepositPress?: () => void;
  onSendPress?: () => void;
  onSwapActionPress?: () => void;
  onCardChange?: (card: StablecoinCardData) => void;
  onAddCardPress?: () => void;
}

// Cấu hình lò xo Snappy dứt khoát Neo-brutalism (stiffness: 280, damping: 20, mass: 0.8)
const SNAPPY_SPRING_CONFIG = {
  damping: 20,
  stiffness: 280,
  mass: 0.8,
};

// Cấu hình lò xo mở rộng Tap to Expand (stiffness: 220, damping: 20)
const EXPAND_SPRING_CONFIG = {
  damping: 20,
  stiffness: 220,
  mass: 0.8,
};

export const NeoPhysicalWalletCard: React.FC<NeoPhysicalWalletCardProps> = ({
  cards = [],
  onDepositPress,
  onSendPress,
  onSwapActionPress,
  onCardChange,
  onAddCardPress,
}) => {
  // Mặc định 3 thẻ Stablecoin nếu chưa truyền vào (chuẩn thẻ tài chính vật lý)
  const initialCards: StablecoinCardData[] = cards.length > 0 ? cards : [
    {
      id: 'usdc',
      currency: 'USDC',
      name: 'US DOLLAR',
      symbol: '$',
      themeColor: '#00E5FF', // Cyan / Xanh lam pastel chuẩn Neo-brutalism
      badgeBg: '#FFFFFF',
      balanceUsd: '$17.50',
      balanceFormatted: '$17.50',
      accountName: 'JON SNOW',
      maskedWallet: '**** 8421',
      rateInfo: '1 USDC = $1.00',
    },
    {
      id: 'eurc',
      currency: 'EURC',
      name: 'EURO',
      symbol: '€',
      themeColor: '#FFD6E8', // Hồng phấn pastel theo yêu cầu
      badgeBg: '#FFFFFF',
      balanceUsd: '$16.20',
      balanceFormatted: '€15.80',
      accountName: 'JON SNOW',
      maskedWallet: '**** 8421',
      rateInfo: '1 EURC = €1.00',
    },
    {
      id: 'pyusd',
      currency: 'PYUSD',
      name: 'PAYPAL USD',
      symbol: '$',
      themeColor: '#FEF08A', // Vàng nhạt pastel ấm
      badgeBg: '#FFFFFF',
      balanceUsd: '$25.00',
      balanceFormatted: '$25.00',
      accountName: 'JON SNOW',
      maskedWallet: '**** 8421',
      rateInfo: '1 PYUSD = $1.00',
    },
  ];

  // Thứ tự index vật lý của 3 thẻ: cardOrder[0] là Front, cardOrder[1] là Middle, cardOrder[2] là Back
  const [cardOrder, setCardOrder] = useState<number[]>([0, 1, 2]);
  const [cardDataList, setCardDataList] = useState<StablecoinCardData[]>(initialCards);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  // Shared values cho từng thẻ 0, 1, 2
  // Card 0 (Front ban đầu)
  const card0TranslateY = useSharedValue(0);
  const card0TranslateX = useSharedValue(0);
  const card0Rotate = useSharedValue(0);
  const card0Scale = useSharedValue(1);
  const card0ZIndex = useSharedValue(5);

  // Card 1 (Middle ban đầu)
  const card1TranslateY = useSharedValue(-8);
  const card1TranslateX = useSharedValue(0);
  const card1Rotate = useSharedValue(1.5);
  const card1Scale = useSharedValue(0.98);
  const card1ZIndex = useSharedValue(4);

  // Card 2 (Back ban đầu)
  const card2TranslateY = useSharedValue(-16);
  const card2TranslateX = useSharedValue(0);
  const card2Rotate = useSharedValue(-1.5);
  const card2Scale = useSharedValue(0.96);
  const card2ZIndex = useSharedValue(3);

  // Thẻ "Thêm ví Stablecoin" (Add Coin Card) - Trượt lên điền vào khoảng trống giữa cụm thẻ và túi ví
  const addCardTranslateY = useSharedValue(20);
  const addCardScale = useSharedValue(0.95);
  const addCardOpacity = useSharedValue(0);

  // Shared values nảy số khi đổi thẻ (Rolling Numbers / Scale Pop & Fade)
  const balanceScale = useSharedValue(1);
  const balanceOpacity = useSharedValue(1);
  const balanceTranslateY = useSharedValue(0);

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

  // Pha 2 & Pha 3: Đạt đỉnh Parabol (-160, 60), đảo lớp zIndex và thực hiện nhét vào sau tức thì (Zero-delay)
  const onApexReached = useCallback((frontIdx: number, midIdx: number, backIdx: number) => {
    // 1. Cập nhật state thứ tự thẻ
    const newOrder = [midIdx, backIdx, frontIdx];
    setCardOrder(newOrder);

    // 2. Thông báo cho component cha (HomeScreen) biết thẻ active mới
    if (onCardChange) {
      onCardChange(cardDataList[midIdx]);
    }

    // Hiệu ứng số chạy / Pop nảy số sang số dư thẻ mới
    balanceOpacity.value = withTiming(1, { duration: 150 });
    balanceTranslateY.value = withSpring(0, SNAPPY_SPRING_CONFIG);
    balanceScale.value = withSequence(
      withTiming(1.18, { duration: 100, easing: Easing.out(Easing.quad) }),
      withSpring(1, SNAPPY_SPRING_CONFIG)
    );

    // 3. Pha 3 (Nhét vào sau & Đùn thẻ mới lên):
    const frontCtrl = cardAnimControllers[frontIdx];
    frontCtrl.zIndex.value = 2; // Hạ zIndex xuống thấp nhất
    frontCtrl.translateX.value = withSpring(0, SNAPPY_SPRING_CONFIG);
    frontCtrl.rotate.value = withSpring(-1.5, SNAPPY_SPRING_CONFIG);
    frontCtrl.scale.value = withSpring(0.96, SNAPPY_SPRING_CONFIG);
    frontCtrl.translateY.value = withSpring(
      isRevealed ? -100 : -16,
      SNAPPY_SPRING_CONFIG,
      (isDone) => {
        if (isDone) {
          runOnJS(onAnimationFinished)();
        }
      }
    );

    // Thẻ Middle cũ (midIdx): Đùn lên làm Front Card mới
    const midCtrl = cardAnimControllers[midIdx];
    midCtrl.zIndex.value = 5; // Nâng zIndex lên cao nhất
    midCtrl.translateX.value = withSpring(0, SNAPPY_SPRING_CONFIG);
    midCtrl.rotate.value = withSpring(0, SNAPPY_SPRING_CONFIG);
    midCtrl.scale.value = withSpring(1.0, SNAPPY_SPRING_CONFIG);
    midCtrl.translateY.value = withSpring(isRevealed ? -75 : 0, SNAPPY_SPRING_CONFIG);

    // Thẻ Back cũ (backIdx): Tiến lên làm Middle Card mới
    const backCtrl = cardAnimControllers[backIdx];
    backCtrl.zIndex.value = 4; // Nâng lên lớp giữa
    backCtrl.translateX.value = withSpring(0, SNAPPY_SPRING_CONFIG);
    backCtrl.rotate.value = withSpring(1.5, SNAPPY_SPRING_CONFIG);
    backCtrl.scale.value = withSpring(0.98, SNAPPY_SPRING_CONFIG);
    backCtrl.translateY.value = withSpring(isRevealed ? -88 : -8, SNAPPY_SPRING_CONFIG);
  }, [cardDataList, isRevealed, onCardChange, onAnimationFinished]);

  // Kích hoạt chuỗi hoạt ảnh Đổi thẻ (Snappy Realistic Arc Trajectory Swap)
  const handleSwapPress = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Bắt đầu chuỗi lật: Nhấc nhẹ số cũ lên & mờ dần
    balanceOpacity.value = withTiming(0.15, { duration: 90 });
    balanceTranslateY.value = withTiming(-8, { duration: 90 });
    balanceScale.value = withTiming(0.92, { duration: 90 });

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
      isRevealed ? -180 : -160,
      { duration: SWAP_OUT_DURATION, easing: FAST_EASING },
      (isFinished) => {
        if (isFinished) {
          runOnJS(onApexReached)(frontIdx, midIdx, backIdx);
        }
      }
    );
  }, [isAnimating, isRevealed, cardOrder, onApexReached]);

  // Tap to Expand / Bung cụm thẻ lên vừa phải tạo khoảng không & Thẻ Add Coin trượt lên điền vào giữa
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
      // 1. Cụm thẻ chính trượt lên vừa phải (-75px, -88px, -100px) tạo khoảng trống 60px bên dưới
      frontCtrl.translateY.value = withSpring(-75, EXPAND_SPRING_CONFIG);
      frontCtrl.rotate.value = withSpring(0, EXPAND_SPRING_CONFIG);

      midCtrl.translateY.value = withSpring(-88, EXPAND_SPRING_CONFIG);
      midCtrl.rotate.value = withSpring(2, EXPAND_SPRING_CONFIG);

      backCtrl.translateY.value = withSpring(-100, EXPAND_SPRING_CONFIG);
      backCtrl.rotate.value = withSpring(-2, EXPAND_SPRING_CONFIG);

      // 2. Thẻ "Add Coin" trượt từ dưới miệng ví lên (-64px), điền vừa vặn vào khoảng trống 60px
      addCardTranslateY.value = withSpring(-64, EXPAND_SPRING_CONFIG);
      addCardScale.value = withSpring(1.0, EXPAND_SPRING_CONFIG);
      addCardOpacity.value = withTiming(1, { duration: 150 });
    } else {
      // Thu gọn tất cả thẻ về vị trí cắm gọn gàng trong ví
      frontCtrl.translateY.value = withSpring(0, SNAPPY_SPRING_CONFIG);
      frontCtrl.rotate.value = withSpring(0, SNAPPY_SPRING_CONFIG);

      midCtrl.translateY.value = withSpring(-8, SNAPPY_SPRING_CONFIG);
      midCtrl.rotate.value = withSpring(1.5, SNAPPY_SPRING_CONFIG);

      backCtrl.translateY.value = withSpring(-16, SNAPPY_SPRING_CONFIG);
      backCtrl.rotate.value = withSpring(-1.5, SNAPPY_SPRING_CONFIG);

      // Thẻ "Add Coin" trượt sâu xuống đáy ví và ẩn đi
      addCardTranslateY.value = withSpring(20, SNAPPY_SPRING_CONFIG);
      addCardScale.value = withSpring(0.95, SNAPPY_SPRING_CONFIG);
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

  // Animated Style cho thẻ "Thêm ví" (Add Coin Card)
  const addCardAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: addCardTranslateY.value },
      { scale: addCardScale.value },
    ],
    opacity: addCardOpacity.value,
  }));

  const animatedBalanceStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: balanceScale.value },
      { translateY: balanceTranslateY.value },
    ],
    opacity: balanceOpacity.value,
  }));

  const cardAnimStyles = [card0AnimStyle, card1AnimStyle, card2AnimStyle];

  // Helper render từng thẻ Stablecoin với bóng đổ cứng đồng bộ (Chuẩn thẻ tài chính vật lý)
  const renderCardItem = (cardIndex: number) => {
    const cardData = cardDataList[cardIndex];
    if (!cardData) return null;

    const animStyle = cardAnimStyles[cardIndex];

    // Format chuỗi ví dạng số thẻ ngân hàng: **** **** **** 8421
    const rawWallet = cardData.maskedWallet || '8421';
    const last4 = rawWallet.replace(/[^a-zA-Z0-9]/g, '').slice(-4) || '8421';
    const formattedCardNumber = `**** **** **** ${last4}`;

    // Tên người dùng viết hoa toàn bộ (VD: JON SNOW)
    const formattedCardHolder = (cardData.accountName || 'JON SNOW').toUpperCase();

    // Tên tiền tệ hiển thị viết hoa (VD: US DOLLAR, EURO, PAYPAL USD)
    const currencyDisplayName = (cardData.name || cardData.currency || 'US DOLLAR').toUpperCase();

    // Ký hiệu icon đồng Stablecoin tròn viền đen
    const coinSymbolChar = cardData.symbol || (cardData.currency === 'EURC' ? '€' : '$');

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

          {/* Thân thẻ viền đen dày 3px Neo-brutalism */}
          <View style={[styles.cardItemBody, { backgroundColor: cardData.themeColor }]}>
            {/* ========================================================= */}
            {/* HÀNG 1 (Top Row): Icon đồng Stablecoin Tròn (Trái) & Tên Tiền Tệ (Phải) */}
            {/* ========================================================= */}
            <View style={styles.cardTopRow}>
              {/* Trái: Icon của đồng Stablecoin tròn, viền đen */}
              <View style={styles.cardCoinBadge}>
                <Text style={styles.cardCoinBadgeText}>{coinSymbolChar}</Text>
              </View>

              {/* Phải: Text hiển thị tên tiền tệ (VD: "US DOLLAR"), font Black/Bold, chữ hoa */}
              <Text style={styles.cardCurrencyTitleText} numberOfLines={1}>
                {currencyDisplayName}
              </Text>
            </View>

            {/* ========================================================= */}
            {/* HÀNG 2 (Middle Row): Chip EMV vật lý & Icon sóng NFC Contactless */}
            {/* ========================================================= */}
            <View style={styles.cardMiddleRow}>
              {/* Chip thẻ ngân hàng vật lý mô phỏng chuẩn Neo-brutalism */}
              <View style={styles.emvChip}>
                <View style={styles.emvChipLineHoriz} />
                <View style={styles.emvChipLineVert} />
              </View>

              {/* Icon sóng chạm NFC ở bên phải */}
              <View style={styles.contactlessIconContainer}>
                <MaterialCommunityIcons name="contactless-payment" size={24} color="#000000" />
              </View>
            </View>

            {/* ========================================================= */}
            {/* HÀNG 3 (Bottom Row): Chuỗi số thẻ **** **** **** 8421 & Tên chủ thẻ */}
            {/* ========================================================= */}
            <View style={styles.cardBottomRow}>
              {/* Chuỗi ví định dạng số thẻ ngân hàng: **** **** **** 8421 */}
              <Text style={styles.cardNumberText} numberOfLines={1}>
                {formattedCardNumber}
              </Text>

              {/* Tên người dùng viết hoa toàn bộ */}
              <Text style={styles.cardHolderNameText} numberOfLines={1}>
                {formattedCardHolder}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.outerContainer}>
      {/* 1. Lớp bóng đổ cứng đen bao ngoài toàn bộ cụm Ví */}
      <View style={styles.walletHardShadow} />

      {/* 2. Lớp lót bên trong túi ví (Leather Pocket Inner Lining) - Xóa bỏ khoảng trống đen */}
      <View style={styles.walletInnerLining} />

      {/* ========================================================================= */}
      {/* 3. NGĂN CHỨA THẺ (Card Stack Bay - Nằm sau Túi ví) */}
      {/* ========================================================================= */}
      <View style={styles.cardBayContainer} pointerEvents="box-none">
        {/* 3 Thẻ Stablecoin chính (Xếp chồng) */}
        {renderCardItem(2)}
        {renderCardItem(1)}
        {renderCardItem(0)}

        {/* THẺ DẸT "THÊM VÍ STABLECOIN" - Nằm ngay tại khoảng trống lộ ra giữa cụm thẻ và miệng ví */}
        <Animated.View style={[styles.addCardPosition, addCardAnimStyle]}>
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={(e) => {
              e.stopPropagation?.();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (onAddCardPress) {
                onAddCardPress();
              }
            }}
            style={styles.addCardTouchable}
          >
            {/* Lớp bóng đen cứng lót dưới */}
            <View style={styles.addCardShadow} />
            {/* Thân thẻ dẹt: Nền vàng chanh #CCFF00, viền đen nét đứt 2px, bo góc 14px */}
            <View style={styles.addCardBody}>
              <View style={styles.addCardLeftContent}>
                <View style={styles.addCardPlusBadge}>
                  <Feather name="plus" size={15} color="#000000" />
                </View>
                <Text style={styles.addCardTitleText}>Thêm Stablecoin</Text>
              </View>
              <View style={styles.addCardNewPill}>
                <Text style={styles.addCardNewPillText}>+ NEW</Text>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* ========================================================================= */}
      {/* 4. TÚI VÍ (Front Pouch - Nền trắng/kem, zIndex: 100 đè lên nửa dưới các thẻ) */}
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

        {/* Hàng 3 nút bấm Hành động (Nhận, Chuyển, Đổi - 3 cột bằng nhau) */}
        <View style={styles.pouchActionsRow}>
          {/* Nút 1: Nhận (Deposit) - Nền vàng pastel, icon mũi tên xuống */}
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
              <Ionicons name="arrow-down" size={15} color="#000000" />
              <Text style={styles.pouchActionBtnText}>Nhận</Text>
            </View>
          </TouchableOpacity>

          {/* Nút 2: Chuyển (Send) - Nền trắng kem, icon mũi tên lên */}
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
              <Ionicons name="arrow-up" size={15} color="#000000" />
              <Text style={styles.pouchActionBtnText}>Chuyển</Text>
            </View>
          </TouchableOpacity>

          {/* Nút 3: Đổi (Swap) - Nền Vàng Chanh #CCFF00 nổi bật chuẩn Neo-brutalism */}
          <TouchableOpacity
            style={styles.pouchActionBtnWrapper}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (onSwapActionPress) {
                onSwapActionPress();
              }
            }}
            activeOpacity={0.85}
          >
            <View style={styles.pouchActionBtnShadow} />
            <View style={[styles.pouchActionBtnBody, { backgroundColor: '#CCFF00' }]}>
              <Ionicons name="swap-horizontal" size={16} color="#000000" />
              <Text style={styles.pouchActionBtnText}>Đổi</Text>
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
    height: 360, // Chiều cao vừa vặn, không bị khoảng trống quá lớn
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
  walletInnerLining: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F5EFE6', // Nền da bên trong ví (kem ấm) loại bỏ hoàn toàn khoảng trống đen
    borderRadius: 26,
    borderWidth: 3,
    borderColor: '#000000',
    zIndex: 1,
  },

  // 1. Ngăn chứa thẻ (Card Bay)
  cardBayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    alignItems: 'center',
    zIndex: 10,
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
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    backgroundColor: '#000000',
    borderRadius: 16,
  },
  cardItemBody: {
    width: '100%',
    height: '100%',
    borderRadius: 16, // Bo góc 16px
    borderWidth: 3, // Viền đen 3px dày chuẩn Neo-brutalism
    borderColor: '#000000',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    justifyContent: 'space-between',
  },

  // 1.1 Hàng trên (Top Row): Coin Badge tròn & Tên tiền tệ
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardCoinBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardCoinBadgeText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
  },
  cardCurrencyTitleText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // 1.2 Hàng giữa (Middle Row): EMV Chip & Sóng NFC Contactless
  cardMiddleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 1,
  },
  emvChip: {
    width: 32,
    height: 23,
    borderRadius: 4,
    backgroundColor: '#FDE047',
    borderWidth: 1.5,
    borderColor: '#000000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emvChipLineHoriz: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  emvChipLineVert: {
    position: 'absolute',
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  contactlessIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 1.3 Hàng dưới (Bottom Row): Số thẻ ngân hàng & Tên chủ thẻ
  cardBottomRow: {
    gap: 2,
  },
  cardNumberText: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1.8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cardHolderNameText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // Thẻ dẹt "Thêm ví Stablecoin" (Add Coin Card - Nằm gọn trong khoảng trống 60px)
  addCardPosition: {
    position: 'absolute',
    top: 130, // Khởi đầu tại vị trí miệng túi ví
    width: '92%',
    height: 48, // Chiều cao dạng dẹt vừa vặn
    zIndex: 25, // Nằm trên nền ví để hiển thị và chạm thoải mái
  },
  addCardTouchable: {
    width: '100%',
    height: '100%',
  },
  addCardShadow: {
    position: 'absolute',
    top: 2.5,
    left: 2.5,
    right: -2.5,
    bottom: -2.5,
    backgroundColor: '#000000',
    borderRadius: 16,
  },
  addCardBody: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#000000',
    backgroundColor: '#CCFF00', // Vàng chanh/Xanh lá mạ Neo-brutalism
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addCardLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addCardPlusBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.8,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCardTitleText: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.2,
  },
  addCardNewPill: {
    backgroundColor: '#111827',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  addCardNewPillText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // 2. Túi ví (Front Pouch - zIndex: 100 tuyệt đối che nửa dưới thẻ)
  frontPouchContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 240, // Chiều cao túi ví cắt ngang nửa dưới các thẻ
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
    gap: 8,
    width: '100%',
  },
  pouchActionBtnWrapper: {
    flex: 1,
    position: 'relative',
    height: 42,
  },
  pouchActionBtnShadow: {
    position: 'absolute',
    top: 2.5,
    left: 2.5,
    right: -2.5,
    bottom: -2.5,
    backgroundColor: '#000000',
    borderRadius: 999,
  },
  pouchActionBtnBody: {
    height: 42,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#000000',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 2,
  },
  pouchActionBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
  },
});
