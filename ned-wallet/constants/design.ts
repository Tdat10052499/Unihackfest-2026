// N.E.D DesignKit — token lấy từ docs/02-thiet-ke/ned-wallet-ui.pdf trang 6 (Design Token System)
// và trang 7 (Typography System); giá trị gốc ở canvas Main.dc.html / Typography.dc.html.
// Màn hình không tự viết mã màu, cỡ chữ, bo góc: lấy từ file này hoặc components/design.
import { StyleSheet } from 'react-native';

/** Primary — NED Purple (from Mascot), 500 là màu thương hiệu */
export const purple = {
  100: '#F0E4FF',
  200: '#D4B5F7',
  300: '#B87AED',
  400: '#9B4FDE',
  500: '#7B2FBE',
  600: '#5A1D9E',
  700: '#3D1270',
  800: '#270A4D',
  900: '#160530',
} as const;

export const colors = {
  purple,
  brand: purple[500],

  // Surfaces (Dark-First)
  background: '#0A0A0A',
  surface1: '#141418',
  surface2: '#1C1C24', // Card
  surface3: '#252530', // Hover / pressed
  border: '#353540', // Border / Divider

  // Semantic Colors
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#6366F1',

  // Text Hierarchy
  text: '#FFFFFF', // Headlines, balances, CTAs
  textSecondary: '#9CA3AF', // Labels, descriptions
  textTertiary: '#6B7280', // Hints, timestamps
  textAccent: purple[400], // Links, highlights

  // Chữ trạng thái trên nền tối: sắc sáng của cùng màu semantic (các board màn hình dùng)
  successText: '#4ADE80',
  errorText: '#F87171',
  warningText: '#FBBF24',
  infoText: '#A5B4FC',

  white: '#FFFFFF',
  black: '#000000',
} as const;

/** Lớp kính trên nền gradient (Visual Effects — Glassmorphism): nền trong + viền mảnh */
export const glass = {
  fill: 'rgba(255,255,255,0.05)',
  fillStrong: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.1)',
  borderStrong: 'rgba(255,255,255,0.14)',
  divider: 'rgba(255,255,255,0.07)',
  iconTint: 'rgba(155,79,222,0.18)', // ô icon trong hàng danh sách
  nav: 'rgba(22,16,31,0.94)', // thanh điều hướng nổi
  navActive: 'rgba(155,79,222,0.3)',
  shadow: '0 12px 30px rgba(0,0,0,0.45)',
  scrim: 'rgba(0,0,0,0.6)', // nền mờ sau modal
  onBrand: 'rgba(255,255,255,0.14)', // kính trên nền tím (splash, thẻ filled)
  onBrandBorder: 'rgba(255,255,255,0.32)',
  accentFill: 'rgba(123,47,190,0.15)', // Card Accent: purple glow bg
  accentBorder: 'rgba(123,47,190,0.3)', // Card Accent: border purple/30%
  successFill: 'rgba(34,197,94,0.12)',
  successBorder: 'rgba(74,222,128,0.35)',
  errorFill: 'rgba(239,68,68,0.1)',
  errorBorder: 'rgba(248,113,113,0.4)',
  warningFill: 'rgba(245,158,11,0.12)',
  warningBorder: 'rgba(251,191,36,0.35)',
  infoFill: 'rgba(99,102,241,0.1)',
  infoBorder: 'rgba(129,140,248,0.28)',
} as const;

/** Nửa dưới sáng của Home (PDF trang 8 / HomeV4 tweak sheet=light) */
export const light = {
  background: '#FFFFFF',
  surface: '#F6F0FB',
  divider: '#F0ECF6',
  text: '#16101F',
  textSecondary: '#6B6780',
  accent: purple[500],
  successText: '#15803D',
  errorText: '#B91C1C',
} as const;

/** Home (HomeV4): phần trên tối → tím → nửa dưới sáng; ô thao tác sáng; thẻ ví mini */
export const home = {
  heroTop: '#0A0614',
  heroColors: ['#0A0614', '#251052', '#7550C9', '#FFFFFF'] as const,
  heroLocations: [0, 0.42, 0.72, 1] as const,
  tile: 'rgba(250,248,255,0.94)',
  tileShadow: '0 6px 20px rgba(40,12,90,0.18)',
  cryptoCard: ['#238D9E', '#6341BB'] as const,
} as const;

/** Gradient Accents — dùng với expo-linear-gradient, hướng 135deg */
export const gradients = {
  primary: [purple[500], purple[400]] as const, // NED Primary — nút chính, Active
  purpleIndigo: [purple[500], colors.info] as const,
  purplePink: [purple[400], '#EC4899'] as const,
  deep: [purple[600], purple[500], purple[400]] as const, // NED Deep
  /** Card Accent: linear-gradient(135deg, rgba(123,47,190,0.15), rgba(155,79,222,0.05)) */
  accentCard: ['rgba(123,47,190,0.15)', 'rgba(155,79,222,0.05)'] as const,
  /** Nền màn tối: linear-gradient(170deg, #110822 0%, #0D0618 30%, #080812 60%, #06060E 100%) */
  screen: ['#110822', '#0D0618', '#080812', '#06060E'] as const,
  screenLocations: [0, 0.3, 0.6, 1] as const,
} as const;

/** 135deg cho LinearGradient */
export const diagonal = { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } } as const;

/** Spacing Scale (4px base) */
export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

/** Border Radius: sm 8 · md 12 · lg 16 (nút) · xl 20 (thẻ) · pill */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 9999,
} as const;

/** Font Stack: Space Grotesk (500/600/700) · Inter (400/500/600) · Space Mono (400/700) — key nạp ở app/_layout.tsx */
export const fonts = {
  display: 'SpaceGrotesk_700Bold',
  displaySemi: 'SpaceGrotesk_600SemiBold',
  displayMedium: 'SpaceGrotesk_500Medium',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  mono: 'SpaceMono_400Regular',
  monoBold: 'SpaceMono_700Bold',
} as const;

/** Chiều cao nút (Button System) và vùng chạm tối thiểu */
export const sizes = {
  button: 52,
  touch: 44,
  maxContent: 480,
} as const;

const lh = (size: number, ratio: number) => Math.round(size * ratio);

/** Typography System — tên theo PDF trang 7 */
export const type = StyleSheet.create({
  display: { fontFamily: fonts.display, fontSize: 56, lineHeight: lh(56, 1.1), letterSpacing: -1.5, color: colors.text },
  hero: { fontFamily: fonts.display, fontSize: 48, lineHeight: lh(48, 1.1), letterSpacing: -1.2, color: colors.text },
  h1: { fontFamily: fonts.displaySemi, fontSize: 32, lineHeight: lh(32, 1.2), letterSpacing: -0.6, color: colors.text },
  h2: { fontFamily: fonts.displaySemi, fontSize: 24, lineHeight: lh(24, 1.3), letterSpacing: -0.3, color: colors.text },
  h3: { fontFamily: fonts.displayMedium, fontSize: 20, lineHeight: lh(20, 1.3), color: colors.text },
  bodyLarge: { fontFamily: fonts.body, fontSize: 16, lineHeight: lh(16, 1.5), color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: lh(14, 1.5), color: colors.textSecondary },
  caption: { fontFamily: fonts.body, fontSize: 12, lineHeight: lh(12, 1.4), color: colors.textTertiary },
  mono: { fontFamily: fonts.mono, fontSize: 14, lineHeight: lh(14, 1.4), color: colors.text },
  monoLarge: { fontFamily: fonts.mono, fontSize: 20, lineHeight: lh(20, 1.4), color: colors.text },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    lineHeight: lh(12, 1.3),
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  /** Chữ nút: Space Grotesk 16 / 600 */
  button: { fontFamily: fonts.displaySemi, fontSize: 16, color: colors.text },
});

export type TypeVariant = keyof typeof type;

/** Màu dữ liệu (đã chạy validator dataviz trên nền tối — trang-thai-thiet-ke.md v62/v85) và màu nhận diện tài sản (HomeV4) */
export const dataColors = {
  series: ['#9B4FDE', '#C98500', '#3987E5', '#199E70'] as const,
  other: '#6B6780',
  usdc: '#2775CA',
  sol: '#9945FF',
  up: colors.successText,
  down: colors.errorText,
} as const;
