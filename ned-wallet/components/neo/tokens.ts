/**
 * Neo-brutalism Design System Tokens
 * Phục vụ phong cách viền đen dày, bóng đổ đặc không làm mờ (Hard/Solid Offset Shadow)
 */

export const NEO_COLORS = {
  light: {
    background: '#EFE9DF', // Nền chính Kem sáng (#EFE9DF / #F5F0E6)
    cardCyan: '#00E5FF', // Màu xanh ngọc thẻ ví chính (Header Card)
    cardExpenses: '#E0F7FA', // Màu xanh lam nhạt thẻ Expenses
    cardRecent: '#FAF5EE', // Màu kem nhạt thẻ Recent Transaction
    cardPurple: '#9E77DC', // Màu tím thẻ ví phụ
    cardPurpleDark: '#855CC7',
    cardWhite: '#FFFFFF', // Nền thẻ trắng
    cardLavender: '#F3EBFF', // Nền thẻ tím nhạt (Shake & Split)
    cardTealPastel: '#E6FAF8', // Nền thẻ xanh ngọc nhạt (Phone Transfer)
    teal: '#00A389', // Xanh ngọc chính (Progress bar & Receive button)
    tealDark: '#0D9488',
    pinkPastel: '#FFD6E8', // Hồng nhạt (See all button & Sent icon)
    pinkText: '#9D174D', // Chữ hồng đậm (See all)
    crimson: '#DC2626', // Đỏ thẫm (Received icon)
    buttonYellow: '#FFF3A8', // Màu vàng nhạt nút Deposit
    buttonCyan: '#CCFBF1', // Màu xanh mint nhạt nút Withdraw
    tabBarBg: '#FFFFFF', // Nền trắng thanh tab bar nổi
    tabActiveBg: '#000000', // Nền tab active (Viên thuốc đen)
    tabActiveText: '#FFFFFF', // Chữ/Icon tab active màu trắng
    tabInactiveCircle: '#DDD6FE', // Nền tròn tab inactive (Tím nhạt)
    tabInactiveIcon: '#000000', // Icon nét viền đen
    border: '#000000', // Viền đen đặc trưng
    shadow: '#000000', // Bóng đổ đen đặc
    textDark: '#000000', // Chữ tối đen
    textMuted: '#64748B', // Chữ phụ mờ
    textWhite: '#FFFFFF', // Chữ sáng
    textSubtlePurple: '#E2D4FD', // Chữ phụ trên nền tím
  },
  dark: {
    background: '#1A1824', // Nền tối
    cardPurple: '#8056C4', // Màu tím tối
    cardPurpleDark: '#673FA8',
    cardWhite: '#242230',
    cardLavender: '#2C273D',
    cardTealPastel: '#1E3333',
    teal: '#14B8A6',
    tealDark: '#0F766E',
    pinkPastel: '#4A2838',
    pinkText: '#F472B6',
    crimson: '#EF4444',
    buttonYellow: '#E8D572',
    buttonCyan: '#9EEAE3',
    tabBarBg: '#111827', // Nền thanh tab bar (Dark Mode: Đen)
    tabActiveBg: '#FFFFFF', // Nền tab active (Viên thuốc trắng)
    tabActiveText: '#111827', // Chữ/Icon tab active
    tabInactiveCircle: '#D8FAF7', // Nền tròn tab inactive (Xanh mint)
    tabInactiveIcon: '#111827',
    border: '#000000',
    shadow: '#000000',
    textDark: '#FFFFFF',
    textMuted: '#94A3B8',
    textWhite: '#111827',
    textSubtlePurple: '#D1C2F0',
  },
};

export const NEO_SHADOWS = {
  sm: {
    offset: 2.5,
    borderWidth: 2,
  },
  md: {
    offset: 4,
    borderWidth: 2.5,
  },
  lg: {
    offset: 5,
    borderWidth: 2.5,
  },
};
