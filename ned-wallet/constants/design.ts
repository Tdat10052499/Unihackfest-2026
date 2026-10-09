// N.E.D DesignKit — "Modern Minimal v2" (build-plan B2, decision D17): light theme, no outlines; depth comes from
// tone and a soft shadow. Values from docs/02-thiet-ke/canvas-v2/Main.dc.html and MotionSurfaces.dc.html.
// Screens never write colours, font sizes or radii themselves: they use this file or components/design.
// The dark-theme names (surface1–3, glass.*, light.*, home.*, gradients.screen, orbs) are kept as DEPRECATED aliases
// with light values so screens keep working until B3/B4 rebuild them on `palette`; do not use them in new code.
import { Platform, StyleSheet, type ViewStyle } from 'react-native';

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

/** Light palette (Main board). New code uses these names. */
export const palette = {
  ground: '#F4F4F6', // screen background
  card: '#FFFFFF',
  field: '#F4F4F6', // filled inputs, tonal cards on white
  row: '#F7F7F9', // grouped list on white
  hoverGround: '#EEEEF2',
  divider: '#F0F0F3', // the only line allowed: between rows of one list
  ink: '#111116',
  ink2: '#3F3F49',
  caption: '#5E5E6A',
  muted: '#8A8A96', // placeholders only (3.3:1 on white)
  accent: purple[500],
  accentPressed: '#6A22B0',
  link: '#6A22B0',
  tint: '#F2EAFB',
  onAccent: '#FFFFFF',
  scrim: 'rgba(17,17,22,0.32)',
  switchOff: '#D9D9E0',
} as const;

/** Status tints: background · ink (text and icons) · dot */
export const status = {
  info: { bg: '#EEEFFE', ink: '#3730A3', dot: '#4F46E5' },
  accent: { bg: '#F2EAFB', ink: '#6A22B0', dot: '#7B2FBE' },
  warning: { bg: '#FFF5E1', ink: '#8A5300', dot: '#F59E0B' },
  success: { bg: '#E7F6EC', ink: '#127A3A', dot: '#16A34A' },
  error: { bg: '#FDECEC', ink: '#B42318', dot: '#D92D20' },
  neutral: { bg: '#F4F4F6', ink: '#3F3F49', dot: '#8A8A96' },
} as const;

/** Semantic colours. The surface/text names keep their dark-theme meaning with light values (see header). */
export const colors = {
  purple,
  brand: purple[500],

  background: palette.ground,
  /** @deprecated use palette.card */
  surface1: palette.card,
  /** @deprecated use palette.card (Card) */
  surface2: palette.card,
  /** @deprecated use palette.hoverGround */
  surface3: palette.hoverGround,
  /** @deprecated no outlines in v2: only list dividers (palette.divider) */
  border: palette.divider,

  success: status.success.dot,
  error: status.error.dot,
  warning: status.warning.dot,
  info: status.info.dot,

  text: palette.ink,
  textSecondary: palette.caption,
  /** Hints and timestamps: caption, not muted, to keep 4.5:1 on white */
  textTertiary: palette.caption,
  textAccent: palette.link,

  successText: status.success.ink,
  errorText: status.error.ink,
  warningText: status.warning.ink,
  infoText: status.info.ink,
  errorSoftText: status.error.ink,

  white: '#FFFFFF',
  black: '#000000',
} as const;

/** @deprecated dark-theme glass layer, mapped to light tonal fills; borders are transparent (no outlines) */
export const glass = {
  fill: palette.card,
  fillStrong: palette.field,
  border: 'transparent',
  borderStrong: 'transparent',
  divider: palette.divider,
  iconTint: palette.tint,
  toggleOff: palette.switchOff,
  popover: palette.card,
  popoverBorder: 'transparent',
  selectedFill: palette.tint,
  /** Focus is shown with a halo (shadows.focusHalo); this tone stays for screens not yet rebuilt */
  focusBorder: 'rgba(123,47,190,0.45)',
  cardLabel: 'rgba(255,255,255,0.85)', // on the coloured mini wallet cards
  nav: palette.card,
  navActive: palette.tint,
  shadow: '0 1px 2px rgba(17,17,22,0.04), 0 6px 16px -6px rgba(17,17,22,0.10)',
  scrim: palette.scrim,
  onBrand: 'rgba(255,255,255,0.14)', // on purple (splash)
  onBrandBorder: 'rgba(255,255,255,0.32)',
  accentFill: status.accent.bg,
  accentBorder: 'transparent',
  successFill: status.success.bg,
  successBorder: 'transparent',
  errorFill: status.error.bg,
  errorBorder: 'transparent',
  errorSoftFill: status.error.bg,
  errorSoftBorder: 'transparent',
  warningFill: status.warning.bg,
  warningBorder: 'transparent',
  infoFill: status.info.bg,
  infoBorder: 'transparent',
} as const;

/** @deprecated Home lower half; same as palette now */
export const light = {
  background: palette.card,
  surface: palette.tint,
  divider: palette.divider,
  text: palette.ink,
  textSecondary: palette.caption,
  accent: purple[500],
  successText: status.success.ink,
  errorText: status.error.ink,
} as const;

/** Dải màu hero Home (HomeV4, sheet = light): 7 mốc, nội suy smoothstep 6 bước/đoạn như canvas */
// v2: a light tint fading into the ground (the dark hero is retired; Home is rebuilt in B3/B4)
const heroKeys: [number, string][] = [
  [0, '#F2EAFB'],
  [1, '#F4F4F6'],
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
  heroTop: '#F2EAFB',
  heroColors: heroRamp.colors,
  heroLocations: heroRamp.locations,
  tile: palette.card,
  tileShadow: '0 1px 2px rgba(17,17,22,0.04), 0 6px 16px -6px rgba(17,17,22,0.10)',
  /** Thẻ ví mini 64×40: linear-gradient(135deg, a 0%, b 55%, c 100%) */
  walletCards: {
    cash: ['#9B4FDE', '#6366F1', '#1A0B33'] as const,
    crypto: ['#1FB58F', '#5B3FD0', '#120826'] as const,
    stocks: ['#E0A33A', '#8A3AD0', '#1A0B33'] as const,
  },
  walletLocations: [0, 0.55, 1] as const,
  addCardBorder: palette.switchOff,
  /** Phần xu của số dư lớn */
  cents: palette.caption,
} as const;

/** Gradient Accents — dùng với expo-linear-gradient, hướng 135deg */
export const gradients = {
  /** v2 buttons are flat accent (two equal stops keep the LinearGradient call sites working) */
  primary: [purple[500], purple[500]] as const,
  purpleIndigo: [purple[500], colors.info] as const,
  purplePink: [purple[400], '#EC4899'] as const,
  deep: [purple[600], purple[500], purple[400]] as const, // NED Deep
  /** Card Accent: linear-gradient(135deg, rgba(123,47,190,0.15), rgba(155,79,222,0.05)) */
  accentCard: [status.accent.bg, status.accent.bg] as const,
  /** @deprecated the screen background is flat palette.ground in v2 */
  screen: [palette.ground, palette.ground, palette.ground, palette.ground] as const,
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
  /** Below this window width (iPhone SE 1st gen, small Android) rows wrap instead of cutting text */
  narrow: 360,
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

/** Màu dữ liệu (đã chạy validator dataviz trên nền tối — docs/archive/02-thiet-ke-v1/trang-thai-thiet-ke.md v62/v85) và màu nhận diện tài sản (HomeV4) */
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
  /** v2 S1: cards and rows on the ground */
  s1: '0 1px 2px rgba(17,17,22,0.04), 0 6px 16px -6px rgba(17,17,22,0.10)',
  /** v2 S-accent: the selected card, the primary call to action */
  sAccent: '0 1px 2px rgba(123,47,190,0.06), 0 10px 28px -10px rgba(123,47,190,0.30)',
  /** v2 popover / sheet */
  pop: '0 18px 48px rgba(17,17,22,0.16), 0 2px 6px rgba(17,17,22,0.06)',
  /** v2 field focus halo */
  focusHalo: '0 0 0 3px rgba(123,47,190,0.18)',
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

/**
 * v2 elevation per platform (MotionSurfaces): web boxShadow, iOS shadow props, Android elevation.
 * Spread into a style: `[styles.card, elevation.s1]`.
 */
const elevated = (web: string, color: string, opacity: number, radius: number, y: number, android: number): ViewStyle =>
  Platform.select<ViewStyle>({
    web: { boxShadow: web } as ViewStyle,
    ios: { shadowColor: color, shadowOpacity: opacity, shadowRadius: radius, shadowOffset: { width: 0, height: y } },
    default: { elevation: android, shadowColor: color },
  });
export const elevation = {
  s1: elevated(shadows.s1, palette.ink, 0.08, 8, 4, 2),
  sAccent: elevated(shadows.sAccent, purple[500], 0.22, 14, 8, 4),
  pop: elevated(shadows.pop, palette.ink, 0.16, 24, 12, 12),
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
/** @deprecated ambient glows belong to the dark theme; AmbientGlow renders nothing in v2 */
export const orbs = {
  /** OnbWelcome / Setup / Profile / Send: tím giữa, có dải indigo */
  brand: [{ x: 0, y: 40, w: 400, h: 380, color: '123,47,190', alpha: 0.36, stop: 0.68, mid: ['99,102,241', 0.1, 0.45] }],
  /** Receive: tím giữa, sau thẻ QR */
  receive: [{ x: 0, y: 90, w: 400, h: 360, color: '123,47,190', alpha: 0.3, stop: 0.65 }],
  /** Settings / History: tím góc trên phải */
  settings: [{ x: 105, y: -60, w: 260, h: 260, color: '123,47,190', alpha: 0.22, stop: 0.65 }],
  /** OnbSetup: indigo giữa */
  setup: [{ x: 0, y: 120, w: 380, h: 360, color: '99,102,241', alpha: 0.26, stop: 0.65 }],
  /** Màn kết quả thành công: xanh giữa */
  success: [{ x: 0, y: 140, w: 340, h: 300, color: '34,197,94', alpha: 0.18, stop: 0.62 }],
  /** Hero Home: elip indigo phải + tím trái */
  homeHero: [
    { x: 125, y: 150, w: 420, h: 340, color: '99,102,241', alpha: 0.32, stop: 0.7, mid: ['99,102,241', 0.12, 0.4] },
    { x: -155, y: 210, w: 380, h: 300, color: '155,79,222', alpha: 0.26, stop: 0.7, mid: ['155,79,222', 0.1, 0.4] },
  ],
} satisfies Record<string, Orb[]>;
export type OrbPreset = keyof typeof orbs;
