/**
 * N.E.D Wallet Mascot Asset Registry
 * Gấu tím đặc trưng của thương hiệu N.E.D - 16 biểu cảm chính thức
 */

export const MASCOT_IMAGES = {
  // 16 Mascot chính thức từ thư viện thiết kế
  angry: require('@/assets/images/mascot teddy - angry.png'),
  confused: require('@/assets/images/mascot teddy - confused.png'),
  crying: require('@/assets/images/mascot teddy - crying.png'),
  curious: require('@/assets/images/mascot teddy - curious.png'),
  embarrassed: require('@/assets/images/mascot teddy - embarrassed.png'),
  exciting: require('@/assets/images/mascot teddy - exciting.png'),
  frustrated: require('@/assets/images/mascot teddy - frustrated.png'),
  happy: require('@/assets/images/mascot teddy - happy.png'),
  laughing: require('@/assets/images/mascot teddy - laughing.png'),
  proud: require('@/assets/images/mascot teddy - proud.png'),
  sad: require('@/assets/images/mascot teddy - sad.png'),
  scared: require('@/assets/images/mascot teddy - scared.png'),
  sleepy: require('@/assets/images/mascot teddy - sleepy.png'),
  surprised: require('@/assets/images/mascot teddy - surprised.png'),
  thinking: require('@/assets/images/mascot teddy - thinking.png'),
  waving: require('@/assets/images/mascot teddy - waving.png'),

  // Các bí danh (Aliases) để tương thích và thuận tiện sử dụng
  welcome: require('@/assets/images/mascot teddy - waving.png'),
  love: require('@/assets/images/mascot teddy - embarrassed.png'),
  question: require('@/assets/images/mascot teddy - curious.png'),
  peekingThinking: require('@/assets/images/mascot teddy - thinking.png'),
} as const;

export type MascotMood = keyof typeof MASCOT_IMAGES;

export const MASCOT_LABELS: Record<MascotMood, string> = {
  angry: 'Tức giận bốc khói',
  confused: 'Bối rối / Lúng túng',
  crying: 'Khóc / Buồn rầu',
  curious: 'Tò mò / Thắc mắc',
  embarrassed: 'Ngại ngùng / Trái tim',
  exciting: 'Hào hứng / Ăn mừng',
  frustrated: 'Bực bội / Khó chịu',
  happy: 'Vui vẻ / Hạnh phúc',
  laughing: 'Cười tươi',
  proud: 'Tự hào / Hãnh diện',
  sad: 'Buồn bã',
  scared: 'Hoảng sợ',
  sleepy: 'Buồn ngủ / Zzzz',
  surprised: 'Ngạc nhiên / Bất ngờ',
  thinking: 'Đang suy nghĩ',
  waving: 'Vẫy tay chào / Welcome',

  // Aliases
  welcome: 'Chào mừng (Vẫy tay)',
  love: 'Yêu thích (Ngại ngùng)',
  question: 'Dấu hỏi (Tò mò)',
  peekingThinking: 'Gấu ngó suy nghĩ thanh toán',
};
