// Design tokens của onboarding — lấy từ docs/02-thiet-ke/README.md và các file canvas Onb*.dc.html (khung 390×844).
// Tên font khớp với key nạp bằng useFonts trong app/_layout.tsx (@expo-google-fonts).

export const onbColors = {
  purple: '#7B2FBE',
  purple400: '#9B4FDE',
  purple300: '#B87AED',
  purple600: '#5A1D9E',
  indigo: '#6366F1',
  lavender: '#C9A2F2',
  success: '#22C55E',
  successText: '#4ADE80',
  warning: '#FBBF24',
  danger: '#F87171',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.68)',
  textSubtle: 'rgba(255,255,255,0.5)',
  border: 'rgba(255,255,255,0.14)',
  surface: 'rgba(255,255,255,0.05)',
  dark: '#16101F',
} as const;

/** Nền tối onboarding: linear-gradient(170deg, #110822 → #0D0618 → #080812 → #06060E) */
export const onbBackground = {
  colors: ['#110822', '#0D0618', '#080812', '#06060E'] as const,
  locations: [0, 0.3, 0.6, 1] as const,
};

/** Nút chính: linear-gradient(135deg, #7B2FBE, #9B4FDE, #6366F1), cao 56, bo 16 */
export const onbPrimaryGradient = ['#7B2FBE', '#9B4FDE', '#6366F1'] as const;

export const onbFonts = {
  heading: 'SpaceGrotesk_700Bold',
  headingMedium: 'SpaceGrotesk_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  mono: 'SpaceMono_400Regular',
  monoBold: 'SpaceMono_700Bold',
} as const;
