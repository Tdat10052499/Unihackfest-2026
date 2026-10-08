// D30 sign-up pieces (boards OnbRole, OnbCountry, OnbBusiness, OnbAgreement in docs/02-thiet-ke/canvas-v2/), built on
// the v2 tokens. Copy comes from @ned/core (account/copy.ts, legal/agreement.ts); nothing is typed inline here.
import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { Country } from '@ned/core/account/countries.ts';
import { elevation, fonts, palette, radius, space } from '@/constants/design';

/** Title (Space Grotesk 700 28) and subtitle (Inter 15 / 1.45, #3F3F49) of the D30 boards */
export function StepTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <>
      <Text style={s.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={s.sub}>{sub}</Text>
    </>
  );
}

/** Radio of the boards: 22 px ring, #6A22B0 when on */
export function Radio({ on }: { on: boolean }) {
  return <View style={[s.radio, on && s.radioOn]}>{on ? <View style={s.radioDot} /> : null}</View>;
}

/** Selectable card (OnbResidence / OnbRole): white + S1 when off, tint without shadow when on */
export function ChoiceCard({
  on,
  onPress,
  label,
  children,
  style,
}: {
  on: boolean;
  onPress: () => void;
  label: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [s.choice, on ? s.choiceOn : elevation.s1, pressed && s.pressed, style]}
    >
      {children}
    </Pressable>
  );
}

/** Checkbox card (OnbConsent / OnbAgreement): 24 px box, never ticked by default */
export function CheckCard({ checked, onPress, text }: { checked: boolean; onPress: () => void; text: string }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={[s.check, checked ? s.checkOn : elevation.s1]}
    >
      <View style={[s.tick, checked && s.tickOn]}>{checked ? <Feather name="check" size={16} color={palette.onAccent} /> : null}</View>
      <Text style={s.checkText}>{text}</Text>
    </Pressable>
  );
}

/** Info line: 16 px info icon + caption */
export function InfoLine({ text, style }: { text: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[s.info, style]}>
      <Feather name="info" size={16} color={palette.caption} style={s.infoIcon} />
      <Text style={s.infoText}>{text}</Text>
    </View>
  );
}

/** Notice card: tint, radius 16, Inter 14 #3F3F49 */
export function TintNotice({ text, icon, style }: { text: string; icon?: React.ComponentProps<typeof Feather>['name']; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[s.notice, style]} accessibilityLiveRegion="polite">
      {icon ? <Feather name={icon} size={18} color={palette.ink2} style={s.infoIcon} /> : null}
      <Text style={s.noticeText}>{text}</Text>
    </View>
  );
}

/** Two-letter code chip (Space Mono 700 12, as the "VN" chip of OnbResidence) */
export function CodeChip({ code, on }: { code: string; on?: 'card' | 'ground' }) {
  return (
    <View style={[s.code, on === 'ground' && s.codeOnGround]}>
      <Text style={s.codeText}>{code}</Text>
    </View>
  );
}

/** Single-choice chip: white + S1 off, tint + #6A22B0 on */
export function Chip({ label, on, onPress, style }: { label: string; on: boolean; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={({ pressed }) => [s.chip, on ? s.chipOn : elevation.s1, pressed && s.pressed, style]}
    >
      <Text style={[s.chipText, on && s.chipTextOn]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** The country rows of OnbCountry (56 px, code chip, name, radio), dividers between rows */
export function CountryRows({ countries, selected, onPick }: { countries: Country[]; selected: string | null; onPick: (code: string) => void }) {
  return (
    <>
      {countries.map((c, i) => {
        const on = selected === c.code;
        return (
          <Pressable
            key={c.code}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={c.name}
            onPress={() => onPick(c.code)}
            style={[s.countryRow, i > 0 && s.divider, on && s.countryRowOn]}
          >
            <CodeChip code={c.code} />
            <Text style={s.countryName} numberOfLines={1}>
              {c.name}
            </Text>
            <Radio on={on} />
          </Pressable>
        );
      })}
    </>
  );
}

/** Footer caption under a disabled button */
export function FootCaption({ text }: { text: string }) {
  return <Text style={s.footCaption}>{text}</Text>;
}

export const accountStyles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: space[6], paddingTop: 22, paddingBottom: space[6] },
  footer: { paddingHorizontal: space[6], paddingTop: space[3], paddingBottom: 28, backgroundColor: palette.ground },
  label: { marginTop: space[5], fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink },
  optional: { fontFamily: fonts.bodyMedium, color: palette.caption },
  link: { color: palette.link, fontFamily: fonts.bodySemi, textDecorationLine: 'underline' },
});

const s = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.6, color: palette.ink },
  sub: { marginTop: space[2], fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: palette.ink2 },
  pressed: { opacity: 0.9 },
  radio: { width: 22, height: 22, borderRadius: radius.pill, borderWidth: 2, borderColor: palette.muted, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: palette.link },
  radioDot: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: palette.link },
  choice: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], padding: space[4], borderRadius: radius.xl, backgroundColor: palette.card },
  choiceOn: { backgroundColor: palette.tint },
  check: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: space[4], borderRadius: radius.xl, backgroundColor: palette.card },
  checkOn: { backgroundColor: palette.tint },
  // The checkbox square is a control (like radio and switch), the one place a ring is allowed
  tick: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: palette.muted, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center' },
  tickOn: { backgroundColor: palette.accent, borderColor: palette.accent },
  checkText: { flex: 1, fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: palette.ink },
  info: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  infoIcon: { marginTop: 1 },
  infoText: { flex: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: palette.caption },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: radius.lg, backgroundColor: palette.tint },
  noticeText: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: palette.ink2 },
  code: { width: 32, height: 24, borderRadius: radius.sm, backgroundColor: palette.field, alignItems: 'center', justifyContent: 'center' },
  codeOnGround: { backgroundColor: palette.card },
  codeText: { fontFamily: fonts.monoBold, fontSize: 12, color: palette.ink },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: palette.tint },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: palette.ink },
  chipTextOn: { color: palette.link },
  countryRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], height: 56, paddingHorizontal: space[4] },
  countryRowOn: { backgroundColor: palette.tint },
  divider: { borderTopWidth: 1, borderTopColor: palette.divider },
  countryName: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 16, color: palette.ink },
  footCaption: { marginTop: space[2], textAlign: 'center', fontFamily: fonts.body, fontSize: 13, color: palette.caption },
});
