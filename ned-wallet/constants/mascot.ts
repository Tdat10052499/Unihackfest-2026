/**
 * N.E.D Wallet Mascot Asset Registry
 * Gấu tím có ria mép đặc trưng của thương hiệu N.E.D
 */

export const MASCOT_IMAGES = {
  /** Mascot vui vẻ, nháy mắt, giơ ngón cái (Thành công, chào mừng, hoàn tất) */
  happy: require('@/assets/images/mascot-happy.png'),
  /** Mascot buồn, rơi nước mắt (Thất bại, trống rỗng, không có dữ liệu) */
  sad: require('@/assets/images/mascot-sad.png'),
  /** Mascot thắc mắc, suy nghĩ với dấu hỏi chấm (Đang tìm kiếm, quét radar, xác nhận) */
  question: require('@/assets/images/mascot-question.png'),
  /** Mascot tức giận bốc khói, khoanh tay (Bị từ chối, lỗi nghiêm trọng, kick khỏi phòng) */
  angry: require('@/assets/images/mascot-angry.png'),
  /** Mascot ngại ngùng có tim bay, má hồng (Nhận tiền, quà tặng, lời cảm ơn) */
  love: require('@/assets/images/mascot-love.png'),
  /** Mascot chào mừng truyền thống */
  welcome: require('@/assets/images/mascot-welcome.png'),
  /** Mascot buồn ngủ (Phòng chờ) */
  sleepy: require('@/assets/images/mascot-sleepy.png'),
} as const;

export type MascotMood = keyof typeof MASCOT_IMAGES;

export const MASCOT_LABELS: Record<MascotMood, string> = {
  happy: 'Vui vẻ / Thành công',
  sad: 'Buồn bã / Trống',
  question: 'Thắc mắc / Đang quét',
  angry: 'Tức giận / Bị từ chối',
  love: 'Yêu thích / Nhận quà',
  welcome: 'Chào mừng',
  sleepy: 'Buồn ngủ / Chờ đợi',
};
