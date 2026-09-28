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
  errorSoftText: '#FCA5A5',

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
  toggleOff: 'rgba(255,255,255,0.18)',
  popover: '#1A1428',
  popoverBorder: 'rgba(184,122,237,0.3)',
  selectedFill: 'rgba(123,47,190,0.2)',
  focusBorder: 'rgba(155,79,222,0.5)',
  cardLabel: 'rgba(255,255,255,0.85)',
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
  errorSoftFill: 'rgba(239,68,68,0.08)',
  errorSoftBorder: 'rgba(248,113,113,0.3)',
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

/** Dải màu hero Home (HomeV4, sheet = light): 7 mốc, nội suy smoothstep 6 bước/đoạn như canvas */
const heroKeys: [number, string][] = [
  [0, '#0A0614'],
  [0.22, '#140A2C'],
  [0.42, '#2A1363'],
  [0.58, '#4A2BA3'],
  [0.72, '#8A6AD8'],
  [0.86, '#D9CDF6'],
  [1, '#FFFFFF'],
];
function smoothRamp(keys: [number, string][]) {
  const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const colorsOut: string[] = [];
  const locations: number[] = [];
  for (let k = 0; k < keys.length - 1; k++) {
    const [p0, c0] = keys[k];
    const [p1, c1] = keys[k + 1];
    const a = hex(c0);
    const b = hex(c1);
    for (let j = 0; j < 6; j++) {
      const t = j / 6;
      const e = t * t * (3 - 2 * t);
      colorsOut.push(`rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * e)).join(',')})`);
      locations.push(p0 + (p1 - p0) * t);
    }
  }
  colorsOut.push(keys[keys.length - 1][1]);
  locations.push(1);
  return { colors: colorsOut as [string, string, ...string[]], locations: locations as [number, number, ...number[]] };
}
const heroRamp = smoothRamp(heroKeys);

/** Home (HomeV4): phần trên tối → tím → nửa dưới sáng; ô thao tác sáng; thẻ ví mini */
export const home = {
  heroTop: '#0A0614',
  heroColors: heroRamp.colors,
  heroLocations: heroRamp.locations,
  tile: 'rgba(250,248,255,0.94)',
  tileShadow: '0 6px 20px rgba(40,12,90,0.18)',
  /** Thẻ ví mini 64×40: linear-gradient(135deg, a 0%, b 55%, c 100%) */
  walletCards: {
    cash: ['#9B4FDE', '#6366F1', '#1A0B33'] as const,
    crypto: ['#1FB58F', '#5B3FD0', '#120826'] as const,
    stocks: ['#E0A33A', '#8A3AD0', '#1A0B33'] as const,
  },
  walletLocations: [0, 0.55, 1] as const,
  addCardBorder: 'rgba(255,255,255,0.55)',
  /** Phần xu của số dư lớn */
  cents: 'rgba(255,255,255,0.72)',
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

/**
 * Đổ bóng & chiều sâu — lấy nguyên từ các board canvas (box-shadow). React Native 0.86 và web đều nhận `boxShadow`.
 */
export const shadows = {
  /** Viên kính trên hero Home (header pill): 0 8px 24px + viền sáng trên */
  glassPill: '0 8px 24px rgba(8,2,20,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
  /** Thanh điều hướng nổi */
  nav: '0 10px 30px rgba(10,4,24,0.45)',
  /** Thẻ ví mini trên Home */
  miniCard: '0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.25)',
  /** Ô thao tác sáng trên Home */
  tile: '0 6px 20px rgba(40,12,90,0.18)',
  /** Nút / chấm tím nổi (avatar người nhận, nút kéo xác nhận) */
  brandGlow: '0 4px 14px rgba(123,47,190,0.45)',
  /** Nút trắng Continue with Google */
  google: '0 8px 28px rgba(123,47,190,0.35)',
  /** Thẻ QR trắng (Receive) */
  qrCard: '0 18px 48px rgba(20,6,50,0.45)',
  /** Popover / menu nổi (slippage, toast) */
  popover: '0 18px 40px rgba(0,0,0,0.55)',
  toast: '0 12px 30px rgba(0,0,0,0.45)',
  /** Núm công tắc */
  knob: '0 1px 3px rgba(0,0,0,0.35)',
  /** Vầng sáng quanh icon kết quả thành công */
  successGlow: '0 0 40px rgba(34,197,94,0.25)',
  /** Vòng focus / đang chọn (OnbMode, ô nhập người nhận) */
  focusRing: '0 0 0 4px rgba(155,79,222,0.14)',
  /** Icon app ở Splash */
  appIcon: '0 18px 50px rgba(30,6,70,0.45), inset 0 1px 0 rgba(255,255,255,0.35)',
} as const;

/** Kính mờ (backdrop-filter: blur(18px)) — chỉ có hiệu lực trên web; react-native-web tự thêm -webkit- cho Safari */
export const blur = {
  glass: { backdropFilter: 'blur(18px)' },
  soft: { backdropFilter: 'blur(16px)' },
} as const;

/**
 * Quầng sáng nền (ambient orbs) theo từng board. Toạ độ theo khung 390px; `x` là tâm ngang so với giữa màn,
 * `y` là mép trên. `color` là rgb, `alpha` là độ đậm ở tâm, `stop` là điểm tắt (transparent X%).
 */
export type Orb = { x: number; y: number; w: number; h: number; color: string; alpha: number; stop: number; mid?: [string, number, number] };
export const orbs = {
  /** OnbWelcome / Setup / Profile / Mode / Send: tím giữa, có dải indigo */
  brand: [{ x: 0, y: 40, w: 400, h: 380, color: '123,47,190', alpha: 0.36, stop: 0.68, mid: ['99,102,241', 0.1, 0.45] }],
  /** Receive: tím giữa, sau thẻ QR */
  receive: [{ x: 0, y: 90, w: 400, h: 360, color: '123,47,190', alpha: 0.3, stop: 0.65 }],
  /** Settings / History: tím góc trên phải */
  settings: [{ x: 105, y: -60, w: 260, h: 260, color: '123,47,190', alpha: 0.22, stop: 0.65 }],
  /** Swap: indigo góc trên trái */
  swap: [{ x: -105, y: -40, w: 240, h: 240, color: '99,102,241', alpha: 0.18, stop: 0.65 }],
  /** xStocks list: hổ phách góc phải + tím bên trái */
  market: [
    { x: 105, y: -60, w: 280, h: 280, color: '245,158,11', alpha: 0.16, stop: 0.65 },
    { x: -155, y: 260, w: 260, h: 260, color: '123,47,190', alpha: 0.2, stop: 0.62 },
  ],
  /** OnbSetup: indigo giữa */
  setup: [{ x: 0, y: 120, w: 380, h: 360, color: '99,102,241', alpha: 0.26, stop: 0.65 }],
  /** XStockBuy: tím giữa trên */
  buy: [{ x: 0, y: 60, w: 300, h: 240, color: '123,47,190', alpha: 0.22, stop: 0.65 }],
  /** XStockSell: indigo giữa trên */
  sell: [{ x: 0, y: 60, w: 300, h: 240, color: '99,102,241', alpha: 0.2, stop: 0.65 }],
  /** XStockReview: tím sau khối số tiền */
  review: [{ x: 0, y: 90, w: 320, h: 220, color: '123,47,190', alpha: 0.2, stop: 0.65 }],
  /** xStock detail: xanh nhạt góc phải */
  detail: [{ x: 135, y: 80, w: 280, h: 280, color: '34,197,94', alpha: 0.1, stop: 0.65 }],
  /** Màn kết quả thành công: xanh giữa */
  success: [{ x: 0, y: 140, w: 340, h: 300, color: '34,197,94', alpha: 0.18, stop: 0.62 }],
  /** Hero Home: elip indigo phải + tím trái */
  homeHero: [
    { x: 125, y: 150, w: 420, h: 340, color: '99,102,241', alpha: 0.32, stop: 0.7, mid: ['99,102,241', 0.12, 0.4] },
    { x: -155, y: 210, w: 380, h: 300, color: '155,79,222', alpha: 0.26, stop: 0.7, mid: ['155,79,222', 0.1, 0.4] },
  ],
} satisfies Record<string, Orb[]>;
export type OrbPreset = keyof typeof orbs;
