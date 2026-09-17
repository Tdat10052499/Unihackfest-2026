import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  Image,
  Modal,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
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
  logoUrl?: string;
}

export interface NeoPhysicalWalletCardProps {
  cards?: StablecoinCardData[];
  onDepositPress?: () => void;
  onSendPress?: () => void;
  onSwapActionPress?: () => void;
  onCardChange?: (card: StablecoinCardData) => void;
  onAddCardPress?: () => void;
  onDeleteCardPress?: (card: StablecoinCardData) => void;
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
  onDeleteCardPress,
}) => {
  // Mặc định 1 thẻ USDC nếu chưa truyền vào (đảm bảo mảng không bao giờ rỗng)
  const DEFAULT_USDC_CARD: StablecoinCardData = {
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
  };

  const initialCards: StablecoinCardData[] = cards.length > 0 ? cards : [DEFAULT_USDC_CARD];

  const MAX_CONTROLLER_CARDS = 8;

  // Thứ tự index vật lý của các thẻ: cardOrder[0] là Front (thẻ đang active)
  const [cardOrder, setCardOrder] = useState<number[]>(() => initialCards.map((_, i) => i));
  const [cardDataList, setCardDataList] = useState<StablecoinCardData[]>(initialCards);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [deletingCard, setDeletingCard] = useState<StablecoinCardData | null>(null);

  // Custom Neo-brutalism Toast State
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const showToast = () => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastVisible(true);
    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 3000);
  };

  // Wiggle animation state cho các thẻ khi ở chế độ chỉnh sửa
  const wiggleRotate = useSharedValue(0);

  const startWiggle = useCallback(() => {
    wiggleRotate.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 120, easing: Easing.linear }),
        withTiming(-1.5, { duration: 120, easing: Easing.linear })
      ),
      -1,
      true
    );
  }, []);

  const stopWiggle = useCallback(() => {
    wiggleRotate.value = withTiming(0, { duration: 150 });
  }, []);

  // Tắt chế độ Edit Mode khi bấm ra ngoài hoặc thu ví lại
  useEffect(() => {
    if (!isRevealed && isEditing) {
      setIsEditing(false);
      stopWiggle();
    }
  }, [isRevealed, isEditing, stopWiggle]);

  const handleDeleteConfirm = () => {
    if (deletingCard) {
      // 1. Kiểm tra balance
      const balanceVal = parseFloat(deletingCard.balanceUsd.replace(/[^0-9.-]+/g, "")) || 0;
      if (balanceVal > 0) {
        setDeletingCard(null);
        showToast();
        return;
      }

      // Tắt hiệu ứng wiggle và chế độ edit sau khi xóa
      setIsEditing(false);
      stopWiggle();
      
      // Xóa thẻ khỏi danh sách (trừ khi nó là thẻ đang active, tuỳ logic ví)
      if (onDeleteCardPress) {
        onDeleteCardPress(deletingCard);
      } else {
        // Fallback fallback UI
        setCardDataList(prev => prev.filter(c => c.id !== deletingCard.id));
        setCardOrder(prev => {
          const idxToRemove = cardDataList.findIndex(c => c.id === deletingCard.id);
          const filteredOrder = prev.filter(idx => idx !== idxToRemove);
          return filteredOrder.map(idx => idx > idxToRemove ? idx - 1 : idx);
        });
      }

      setDeletingCard(null);
    }
  };

  // Chiều cao ví co giãn mượt mà theo dạng Accordion xuống dưới (không đẩy thẻ lên đè header)
  const walletHeight = useSharedValue(360);

  // Shared values cho tối đa 8 thẻ (USDC, USDT, EURC, PYUSD, DAI, FDUSD...)
  const card0TranslateY = useSharedValue(0);
  const card0TranslateX = useSharedValue(0);
  const card0Rotate = useSharedValue(0);
  const card0Scale = useSharedValue(1);
  const card0ZIndex = useSharedValue(20);

  const card1TranslateY = useSharedValue(-6);
  const card1TranslateX = useSharedValue(0);
  const card1Rotate = useSharedValue(2.0);
  const card1Scale = useSharedValue(0.98);
  const card1ZIndex = useSharedValue(18);

  const card2TranslateY = useSharedValue(-12);
  const card2TranslateX = useSharedValue(0);
  const card2Rotate = useSharedValue(-2.0);
  const card2Scale = useSharedValue(0.96);
  const card2ZIndex = useSharedValue(16);

  const card3TranslateY = useSharedValue(-16);
  const card3TranslateX = useSharedValue(0);
  const card3Rotate = useSharedValue(1.2);
  const card3Scale = useSharedValue(0.94);
  const card3ZIndex = useSharedValue(14);

  const card4TranslateY = useSharedValue(-18);
  const card4TranslateX = useSharedValue(0);
  const card4Rotate = useSharedValue(-1.2);
  const card4Scale = useSharedValue(0.92);
  const card4ZIndex = useSharedValue(12);

  const card5TranslateY = useSharedValue(-18);
  const card5TranslateX = useSharedValue(0);
  const card5Rotate = useSharedValue(1.0);
  const card5Scale = useSharedValue(0.90);
  const card5ZIndex = useSharedValue(10);

  const card6TranslateY = useSharedValue(-18);
  const card6TranslateX = useSharedValue(0);
  const card6Rotate = useSharedValue(-1.0);
  const card6Scale = useSharedValue(0.88);
  const card6ZIndex = useSharedValue(8);

  const card7TranslateY = useSharedValue(-18);
  const card7TranslateX = useSharedValue(0);
  const card7Rotate = useSharedValue(0.8);
  const card7Scale = useSharedValue(0.86);
  const card7ZIndex = useSharedValue(6);

  // Thẻ "Thêm ví Stablecoin" (Add Coin Card) - Nằm ngay khoảng hở khi túi ví trượt xuống
  const addCardTranslateY = useSharedValue(20);
  const addCardScale = useSharedValue(0.95);
  const addCardOpacity = useSharedValue(0);

  // Shared values nảy số khi đổi thẻ (Rolling Numbers / Scale Pop & Fade)
  const balanceScale = useSharedValue(1);
  const balanceOpacity = useSharedValue(1);
  const balanceTranslateY = useSharedValue(0);

  // Hiệu ứng cảnh báo nảy bật (Bounce Scale) cho toàn bộ Component
  const bounceScale = useSharedValue(1);

  const triggerErrorFeedback = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    bounceScale.value = withSequence(
      withTiming(1.04, { duration: 100 }),
      withSpring(1, { damping: 12, stiffness: 200 })
    );
  }, []);

  // Mảng controllers tương ứng cho các thẻ
  const cardAnimControllers = [
    { translateY: card0TranslateY, translateX: card0TranslateX, rotate: card0Rotate, scale: card0Scale, zIndex: card0ZIndex },
    { translateY: card1TranslateY, translateX: card1TranslateX, rotate: card1Rotate, scale: card1Scale, zIndex: card1ZIndex },
    { translateY: card2TranslateY, translateX: card2TranslateX, rotate: card2Rotate, scale: card2Scale, zIndex: card2ZIndex },
    { translateY: card3TranslateY, translateX: card3TranslateX, rotate: card3Rotate, scale: card3Scale, zIndex: card3ZIndex },
    { translateY: card4TranslateY, translateX: card4TranslateX, rotate: card4Rotate, scale: card4Scale, zIndex: card4ZIndex },
    { translateY: card5TranslateY, translateX: card5TranslateX, rotate: card5Rotate, scale: card5Scale, zIndex: card5ZIndex },
    { translateY: card6TranslateY, translateX: card6TranslateX, rotate: card6Rotate, scale: card6Scale, zIndex: card6ZIndex },
    { translateY: card7TranslateY, translateX: card7TranslateX, rotate: card7Rotate, scale: card7Scale, zIndex: card7ZIndex },
  ];

  // Hàm tính toán thuộc tính hiển thị theo thứ tự xếp chồng (Rank)
  // Đảm bảo thẻ xếp chồng an toàn, không bao giờ vượt quá -18px, hoàn toàn tránh Header
  const getStackTransform = (rank: number, isExpanded: boolean = false) => {
    switch (rank) {
      case 0:
        return { translateY: 0, translateX: 0, rotate: 0, scale: 1.0, zIndex: 20 };
      case 1:
        return { translateY: -6, translateX: 0, rotate: isExpanded ? 2.5 : 2.0, scale: 0.98, zIndex: 18 };
      case 2:
        return { translateY: -12, translateX: 0, rotate: isExpanded ? -2.5 : -2.0, scale: 0.96, zIndex: 16 };
      case 3:
        return { translateY: -16, translateX: 0, rotate: isExpanded ? 1.5 : 1.2, scale: 0.94, zIndex: 14 };
      case 4:
        return { translateY: -18, translateX: 0, rotate: isExpanded ? -1.5 : -1.2, scale: 0.92, zIndex: 12 };
      case 5:
        return { translateY: -18, translateX: 0, rotate: 1.0, scale: 0.90, zIndex: 10 };
      case 6:
        return { translateY: -18, translateX: 0, rotate: -1.0, scale: 0.88, zIndex: 8 };
      default:
        return { translateY: -18, translateX: 0, rotate: 0, scale: 0.86, zIndex: 6 };
    }
  };

  // Cập nhật khi props `cards` thay đổi (hỗ trợ thêm nhiều loại thẻ)
  useEffect(() => {
    const list = cards && cards.length > 0 ? cards : [DEFAULT_USDC_CARD];
    setCardDataList(list);

    setCardOrder((prevOrder) => {
      const validIndices = list.map((_, i) => i);
      const filtered = prevOrder.filter((idx) => idx < list.length);
      const missing = validIndices.filter((idx) => !filtered.includes(idx));
      const combined = [...filtered, ...missing];
      return combined.length > 0 ? combined : [0];
    });
  }, [cards]);

  const activeFrontCard = cardDataList[cardOrder[0]] || cardDataList[0] || DEFAULT_USDC_CARD;
  const nextCard = cardDataList[cardOrder[1]] || cardDataList[cardOrder[0]] || DEFAULT_USDC_CARD;

  // Callback kết thúc toàn bộ chuỗi animation
  const onAnimationFinished = useCallback(() => {
    setIsAnimating(false);
  }, []);

  // Pha đổi thẻ: Đạt đỉnh sang phải và nhét vào sau bộ bài
  const onApexReached = useCallback((currentFrontIdx: number) => {
    const newOrder = [...cardOrder.slice(1), cardOrder[0]];
    setCardOrder(newOrder);

    if (onCardChange) {
      const activeCard = cardDataList[newOrder[0]] || cardDataList[0];
      if (activeCard) {
        onCardChange(activeCard);
      }
    }

    balanceOpacity.value = withTiming(1, { duration: 150 });
    balanceTranslateY.value = withSpring(0, SNAPPY_SPRING_CONFIG);
    balanceScale.value = withSequence(
      withTiming(1.18, { duration: 100, easing: Easing.out(Easing.quad) }),
      withSpring(1, SNAPPY_SPRING_CONFIG)
    );

    newOrder.forEach((idx, rank) => {
      if (idx >= MAX_CONTROLLER_CARDS) return;
      const ctrl = cardAnimControllers[idx];
      const target = getStackTransform(rank, isRevealed);

      if (idx === currentFrontIdx) {
        ctrl.zIndex.value = target.zIndex;
        ctrl.translateX.value = withSpring(0, SNAPPY_SPRING_CONFIG);
        ctrl.rotate.value = withSpring(target.rotate, SNAPPY_SPRING_CONFIG);
        ctrl.scale.value = withSpring(target.scale, SNAPPY_SPRING_CONFIG);
        ctrl.translateY.value = withSpring(
          target.translateY,
          SNAPPY_SPRING_CONFIG,
          (isDone) => {
            if (isDone) {
              runOnJS(onAnimationFinished)();
            }
          }
        );
      } else {
        ctrl.zIndex.value = target.zIndex;
        ctrl.translateX.value = withSpring(0, SNAPPY_SPRING_CONFIG);
        ctrl.rotate.value = withSpring(target.rotate, SNAPPY_SPRING_CONFIG);
        ctrl.scale.value = withSpring(target.scale, SNAPPY_SPRING_CONFIG);
        ctrl.translateY.value = withSpring(target.translateY, SNAPPY_SPRING_CONFIG);
      }
    });
  }, [cardOrder, cardDataList, isRevealed, onCardChange, onAnimationFinished, cardAnimControllers]);

  // Kích hoạt chuỗi hoạt ảnh Đổi thẻ (Snappy Shuffle sang phải, không bay lên trần)
  const handleSwapPress = useCallback(() => {
    if (isAnimating) return;
    
    if (cardDataList.length < 2) {
      triggerErrorFeedback();
      return;
    }

    setIsAnimating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    balanceOpacity.value = withTiming(0.15, { duration: 90 });
    balanceTranslateY.value = withTiming(-6, { duration: 90 });
    balanceScale.value = withTiming(0.92, { duration: 90 });

    const frontIdx = cardOrder[0];
    const frontCtrl = cardAnimControllers[frontIdx];

    frontCtrl.zIndex.value = 50;

    const SWAP_OUT_DURATION = 140;
    const FAST_EASING = Easing.bezier(0.25, 1, 0.5, 1);

    frontCtrl.scale.value = withTiming(0.95, { duration: SWAP_OUT_DURATION, easing: FAST_EASING });
    frontCtrl.rotate.value = withTiming(14, { duration: SWAP_OUT_DURATION, easing: FAST_EASING });
    frontCtrl.translateX.value = withTiming(85, { duration: SWAP_OUT_DURATION, easing: FAST_EASING });
    frontCtrl.translateY.value = withTiming(
      -16,
      { duration: SWAP_OUT_DURATION, easing: FAST_EASING },
      (isFinished) => {
        if (isFinished) {
          runOnJS(onApexReached)(frontIdx);
        }
      }
    );
  }, [isAnimating, cardDataList, cardOrder, triggerErrorFeedback, onApexReached, cardAnimControllers]);

  // Chạm trực tiếp vào thẻ phía sau để đùn lên trước
  const handleBringCardToFront = useCallback((targetCardIdx: number) => {
    if (isAnimating) return;
    const currentFront = cardOrder[0];
    if (targetCardIdx === currentFront) return;

    setIsAnimating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    balanceOpacity.value = withTiming(0.15, { duration: 90 });
    balanceTranslateY.value = withTiming(-6, { duration: 90 });
    balanceScale.value = withTiming(0.92, { duration: 90 });

    const frontCtrl = cardAnimControllers[currentFront];
    frontCtrl.zIndex.value = 50;

    const SWAP_OUT_DURATION = 140;
    const FAST_EASING = Easing.bezier(0.25, 1, 0.5, 1);

    frontCtrl.scale.value = withTiming(0.95, { duration: SWAP_OUT_DURATION, easing: FAST_EASING });
    frontCtrl.rotate.value = withTiming(14, { duration: SWAP_OUT_DURATION, easing: FAST_EASING });
    frontCtrl.translateX.value = withTiming(85, { duration: SWAP_OUT_DURATION, easing: FAST_EASING });
    frontCtrl.translateY.value = withTiming(-16, { duration: SWAP_OUT_DURATION, easing: FAST_EASING }, (done) => {
      if (done) {
        runOnJS(() => {
          const remaining = cardOrder.filter((idx) => idx !== targetCardIdx);
          const newOrder = [targetCardIdx, ...remaining];
          setCardOrder(newOrder);

          if (onCardChange) {
            const activeCard = cardDataList[newOrder[0]] || cardDataList[0];
            if (activeCard) onCardChange(activeCard);
          }

          balanceOpacity.value = withTiming(1, { duration: 150 });
          balanceTranslateY.value = withSpring(0, SNAPPY_SPRING_CONFIG);
          balanceScale.value = withSequence(
            withTiming(1.18, { duration: 100, easing: Easing.out(Easing.quad) }),
            withSpring(1, SNAPPY_SPRING_CONFIG)
          );

          newOrder.forEach((idx, rank) => {
            if (idx >= MAX_CONTROLLER_CARDS) return;
            const ctrl = cardAnimControllers[idx];
            const target = getStackTransform(rank, isRevealed);

            if (idx === currentFront) {
              ctrl.zIndex.value = target.zIndex;
              ctrl.translateX.value = withSpring(0, SNAPPY_SPRING_CONFIG);
              ctrl.rotate.value = withSpring(target.rotate, SNAPPY_SPRING_CONFIG);
              ctrl.scale.value = withSpring(target.scale, SNAPPY_SPRING_CONFIG);
              ctrl.translateY.value = withSpring(target.translateY, SNAPPY_SPRING_CONFIG, (isDone) => {
                if (isDone) runOnJS(onAnimationFinished)();
              });
            } else {
              ctrl.zIndex.value = target.zIndex;
              ctrl.translateX.value = withSpring(0, SNAPPY_SPRING_CONFIG);
              ctrl.rotate.value = withSpring(target.rotate, SNAPPY_SPRING_CONFIG);
              ctrl.scale.value = withSpring(target.scale, SNAPPY_SPRING_CONFIG);
              ctrl.translateY.value = withSpring(target.translateY, SNAPPY_SPRING_CONFIG);
            }
          });
        })();
      }
    });
  }, [isAnimating, cardOrder, cardDataList, isRevealed, onCardChange, onAnimationFinished, cardAnimControllers]);

  // Tap to Expand / Co giãn chiều cao túi ví xuống dưới để lộ khoảng trống cho Thêm Stablecoin
  // Tuyệt đối không đẩy thẻ bay lên đè vào Header
  const toggleReveal = useCallback(() => {
    if (isAnimating) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextState = !isRevealed;
    setIsRevealed(nextState);

    if (nextState) {
      // 1. Mở rộng chiều cao túi ví xuống dưới (tạo khoảng hở 58px cho thẻ Thêm Stablecoin)
      walletHeight.value = withSpring(438, EXPAND_SPRING_CONFIG);

      // 2. Thẻ "Add Coin" trượt vào vị trí an toàn giữa thẻ chính và miệng túi ví
      addCardTranslateY.value = withSpring(0, EXPAND_SPRING_CONFIG);
      addCardScale.value = withSpring(1.0, EXPAND_SPRING_CONFIG);
      addCardOpacity.value = withTiming(1, { duration: 180 });

      // 3. Giữ các thẻ ở vị trí an toàn (Rank 0 tại 0, các thẻ sau xòe nhẹ góc, không bao giờ vượt -18px)
      cardOrder.forEach((idx, rank) => {
        if (idx >= MAX_CONTROLLER_CARDS) return;
        const ctrl = cardAnimControllers[idx];
        const target = getStackTransform(rank, true);
        ctrl.translateY.value = withSpring(target.translateY, EXPAND_SPRING_CONFIG);
        ctrl.rotate.value = withSpring(target.rotate, EXPAND_SPRING_CONFIG);
        ctrl.scale.value = withSpring(target.scale, EXPAND_SPRING_CONFIG);
        ctrl.zIndex.value = target.zIndex;
      });
    } else {
      // 1. Thu gọn ví về chiều cao chuẩn 360
      walletHeight.value = withSpring(360, SNAPPY_SPRING_CONFIG);

      // 2. Thẻ "Add Coin" trượt sâu xuống và ẩn đi
      addCardTranslateY.value = withSpring(20, SNAPPY_SPRING_CONFIG);
      addCardScale.value = withSpring(0.95, SNAPPY_SPRING_CONFIG);
      addCardOpacity.value = withTiming(0, { duration: 100 });

      // 3. Đưa các thẻ về trạng thái xếp chồng cơ bản
      cardOrder.forEach((idx, rank) => {
        if (idx >= MAX_CONTROLLER_CARDS) return;
        const ctrl = cardAnimControllers[idx];
        const target = getStackTransform(rank, false);
        ctrl.translateY.value = withSpring(target.translateY, SNAPPY_SPRING_CONFIG);
        ctrl.rotate.value = withSpring(target.rotate, SNAPPY_SPRING_CONFIG);
        ctrl.scale.value = withSpring(target.scale, SNAPPY_SPRING_CONFIG);
        ctrl.zIndex.value = target.zIndex;
      });
    }
  }, [isAnimating, isRevealed, cardOrder, cardAnimControllers]);

  // Animated Styles cho các thẻ
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

  const card3AnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: card3TranslateY.value },
      { translateX: card3TranslateX.value },
      { rotateZ: `${card3Rotate.value}deg` },
      { scale: card3Scale.value },
    ],
    zIndex: card3ZIndex.value,
  }));

  const card4AnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: card4TranslateY.value },
      { translateX: card4TranslateX.value },
      { rotateZ: `${card4Rotate.value}deg` },
      { scale: card4Scale.value },
    ],
    zIndex: card4ZIndex.value,
  }));

  const card5AnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: card5TranslateY.value },
      { translateX: card5TranslateX.value },
      { rotateZ: `${card5Rotate.value}deg` },
      { scale: card5Scale.value },
    ],
    zIndex: card5ZIndex.value,
  }));

  const card6AnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: card6TranslateY.value },
      { translateX: card6TranslateX.value },
      { rotateZ: `${card6Rotate.value}deg` },
      { scale: card6Scale.value },
    ],
    zIndex: card6ZIndex.value,
  }));

  const card7AnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: card7TranslateY.value },
      { translateX: card7TranslateX.value },
      { rotateZ: `${card7Rotate.value}deg` },
      { scale: card7Scale.value },
    ],
    zIndex: card7ZIndex.value,
  }));

  // Animated Style cho thẻ "Thêm ví" (Add Coin Card)
  const addCardAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: addCardTranslateY.value },
      { scale: addCardScale.value },
    ],
    opacity: addCardOpacity.value,
  }));

  const containerAnimStyle = useAnimatedStyle(() => ({
    height: walletHeight.value,
  }));

  const animatedBalanceStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: balanceScale.value },
      { translateY: balanceTranslateY.value },
    ],
    opacity: balanceOpacity.value,
  }));

  const animatedBounceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bounceScale.value }]
  }));

  const cardAnimStyles = [
    card0AnimStyle,
    card1AnimStyle,
    card2AnimStyle,
    card3AnimStyle,
    card4AnimStyle,
    card5AnimStyle,
    card6AnimStyle,
    card7AnimStyle,
  ];

  const sharedWiggleStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${wiggleRotate.value}deg` }
      ]
    };
  });

  // Helper render từng thẻ Stablecoin với bóng đổ cứng đồng bộ (Chuẩn thẻ tài chính vật lý)
  const renderCardItem = (cardIndex: number) => {
    const cardData = cardDataList[cardIndex];
    if (!cardData || cardIndex >= MAX_CONTROLLER_CARDS) return null;

    const animStyle = cardAnimStyles[cardIndex];
    const isFront = cardOrder[0] === cardIndex;

    const rawWallet = cardData.maskedWallet || '8421';
    const last4 = rawWallet.replace(/[^a-zA-Z0-9]/g, '').slice(-4) || '8421';
    const formattedCardNumber = `**** **** **** ${last4}`;

    const formattedCardHolder = (cardData.accountName || 'JON SNOW').toUpperCase();
    const currencyDisplayName = (cardData.name || cardData.currency || 'US DOLLAR').toUpperCase();
    const coinSymbolChar = cardData.symbol || (cardData.currency === 'EURC' ? '€' : '$');

    const isWiggling = isEditing && cardData.currency !== 'USDC';

    return (
      <Animated.View
        key={cardData.id || `card_${cardIndex}`}
        style={[styles.cardItemPosition, animStyle, isWiggling && sharedWiggleStyle]}
      >
        <TouchableOpacity
          activeOpacity={0.94}
          onLongPress={() => {
            if (cardData.currency !== 'USDC') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              setIsEditing(true);
              startWiggle();
            }
          }}
          delayLongPress={400}
          onPress={() => {
            if (isEditing) {
              setIsEditing(false);
              stopWiggle();
              return;
            }
            if (isFront) {
              toggleReveal();
            } else {
              handleBringCardToFront(cardIndex);
            }
          }}
          disabled={isAnimating}
          style={styles.cardTouchable}
        >
          {/* Lớp bóng đen cứng lót dưới chuyển động đồng bộ để viền không bị răng cưa */}
          <View style={styles.cardItemShadow} />

          {/* Thân thẻ viền đen dày 3px Neo-brutalism */}
          <View style={[styles.cardItemBody, { backgroundColor: cardData.themeColor }]}>
            
            {/* Nút Xóa đính góc trái (Hiển thị khi isEditing) */}
            {isWiggling && (
              <TouchableOpacity
                style={styles.deleteButton}
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDeletingCard(cardData);
                }}
              >
                <Feather name="x" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            {/* HÀNG 1 (Top Row): Icon đồng Stablecoin Tròn & Tên Tiền Tệ */}
            <View style={styles.cardTopRow}>
              <View style={styles.cardCoinBadge}>
                {cardData.logoUrl ? (
                  <Image source={{ uri: cardData.logoUrl }} style={styles.cardCoinImage} />
                ) : (
                  <Text style={styles.cardCoinBadgeText}>{coinSymbolChar}</Text>
                )}
              </View>

              <Text style={styles.cardCurrencyTitleText} numberOfLines={1}>
                {currencyDisplayName}
              </Text>
            </View>

            {/* HÀNG 2 (Middle Row): Chip EMV vật lý & Icon sóng NFC Contactless */}
            <View style={styles.cardMiddleRow}>
              <View style={styles.emvChip}>
                <View style={styles.emvChipLineHoriz} />
                <View style={styles.emvChipLineVert} />
              </View>

              <View style={styles.contactlessIconContainer}>
                <MaterialCommunityIcons name="contactless-payment" size={24} color="#000000" />
              </View>
            </View>

            {/* HÀNG 3 (Bottom Row): Chuỗi số thẻ **** **** **** 8421 & Tên chủ thẻ */}
            <View style={styles.cardBottomRow}>
              <Text style={styles.cardNumberText} numberOfLines={1}>
                {formattedCardNumber}
              </Text>

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
    <Animated.View style={[styles.outerContainer, containerAnimStyle, animatedBounceStyle]}>
      {/* 1. Lớp bóng đổ cứng đen bao ngoài toàn bộ cụm Ví */}
      <View style={styles.walletHardShadow} />

      {/* 2. Lớp lót bên trong túi ví (Leather Pocket Inner Lining) */}
      <View style={styles.walletInnerLining} />

      {/* ========================================================================= */}
      {/* 3. NGĂN CHỨA THẺ (Card Stack Bay - Hỗ trợ N loại thẻ) */}
      {/* ========================================================================= */}
      <View style={styles.cardBayContainer} pointerEvents="box-none">
        {/* Render danh sách thẻ theo thứ tự từ sau ra trước */}
        {cardOrder
          .slice(0, Math.min(cardDataList.length, MAX_CONTROLLER_CARDS))
          .slice()
          .reverse()
          .map((cardIdx) => renderCardItem(cardIdx))}

        {/* THẺ DẸT "THÊM VÍ STABLECOIN" */}
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
            {activeFrontCard.logoUrl ? (
              <Image source={{ uri: activeFrontCard.logoUrl }} style={styles.coinSymbolImage} />
            ) : (
              <Text style={styles.coinSymbolText}>{activeFrontCard.symbol}</Text>
            )}
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
              if (cardDataList.length < 2) {
                triggerErrorFeedback();
                return;
              }
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

        {/* ========================================================================= */}
        {/* 6. MODAL XÁC NHẬN XÓA THẺ (Neo-brutalism) */}
        {/* ========================================================================= */}
        <Modal
          visible={!!deletingCard}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setDeletingCard(null)}
        >
          <View style={styles.modalRoot}>
            <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setDeletingCard(null)} />
            <View style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>Xóa thẻ {deletingCard?.currency}?</Text>
              <Text style={styles.confirmDesc}>
                Bạn có chắc chắn muốn ẩn thẻ này khỏi ví? (Số dư trên chuỗi khối không bị ảnh hưởng)
              </Text>
              <View style={styles.confirmBtnRow}>
                <TouchableOpacity
                  style={[styles.confirmBtn, styles.btnCancel]}
                  onPress={() => setDeletingCard(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnTextBlack}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, styles.btnDelete]}
                  onPress={handleDeleteConfirm}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnTextWhite}>Xóa</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      {/* 5. Custom Neo-brutalism Toast */}
      {toastVisible && (
        <View style={styles.toastContainer} pointerEvents="none">
          <View style={styles.toastShadow} />
          <View style={styles.toastCard}>
            <Text style={styles.toastIcon}>⚠️</Text>
            <Text style={styles.toastText}>Không thể xóa thẻ đang có số dư. Vui lòng chuyển tiền đi trước.</Text>
          </View>
        </View>
      )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'relative',
    width: '100%',
    height: 360, // Chiều cao vừa vặn, không bị khoảng trống quá lớn
    marginTop: 22,
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
    height: 210,
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
    overflow: 'hidden',
  },
  cardCoinImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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

  // Thẻ dẹt "Thêm ví Stablecoin" (Add Coin Card - Nằm gọn trong khoảng trống giữa thẻ chính và miệng túi ví)
  addCardPosition: {
    position: 'absolute',
    top: 144, // Nằm ngay dưới đáy thẻ front (140) và trên miệng túi ví khi mở rộng (198)
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
    overflow: 'hidden',
  },
  coinSymbolImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
    paddingHorizontal: 8,
  },
  deleteButton: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF4C4C',
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  confirmCard: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 12,
  },
  confirmDesc: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  confirmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  btnCancel: {
    backgroundColor: '#FFFFFF',
  },
  btnDelete: {
    backgroundColor: '#FF4C4C',
  },
  btnTextBlack: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
  btnTextWhite: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pouchActionBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
  },
  
  // TOAST STYLES
  toastContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 9999,
  },
  toastShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    borderRadius: 16,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4C4C',
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
  },
  toastIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  toastText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#FFFFFF',
  },
});
