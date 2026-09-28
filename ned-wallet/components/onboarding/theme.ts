// Tên cũ của onboarding, nay trỏ vào DesignKit (constants/design.ts) để mọi màn dùng chung một bộ token.
import { colors, fonts, glass, gradients } from '@/constants/design';

export const onbColors = {
  purple: colors.purple[500],
  purple400: colors.purple[400],
  purple300: colors.purple[300],
  purple600: colors.purple[600],
  indigo: colors.info,
  lavender: colors.purple[200],
  success: colors.success,
  successText: colors.successText,
  warning: colors.warningText,
  danger: colors.errorText,
  text: colors.text,
  textMuted: colors.textSecondary,
  textSubtle: colors.textTertiary,
  border: glass.borderStrong,
  surface: glass.fill,
  dark: '#16101F',
} as const;

export const onbBackground = {
  colors: gradients.screen,
  locations: gradients.screenLocations,
};

/** Nút chính: gradient NED Primary #7B2FBE → #9B4FDE */
export const onbPrimaryGradient = gradients.primary;

export const onbFonts = {
  heading: fonts.display,
  headingMedium: fonts.displaySemi,
  body: fonts.body,
  bodyMedium: fonts.bodyMedium,
  bodySemi: fonts.bodySemi,
  bodyBold: fonts.bodySemi, // DesignKit: Inter chỉ dùng 400/500/600
  mono: fonts.mono,
  monoBold: fonts.monoBold,
} as const;
