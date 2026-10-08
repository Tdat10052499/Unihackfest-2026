// Settings → "Your account" (D30, boards SettingsAccount / SettingsAccountVN; roles-and-agreement-build.md §5). Behind
// FEATURES.accountRoles; replaces the "I live in Vietnam" switch (closes D17). Copy: core SETTINGS_COPY, GATE_COPY.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SETTINGS_COPY } from '@ned/core/account/copy.ts';
import { countryName } from '@ned/core/account/countries.ts';
import { agreementText, CURRENT_AGREEMENT_VERSIONS } from '@ned/core/legal/agreement.ts';
import { Button, PressableScale, Sheet, Toggle } from '@/components/design';
import { CodeChip } from '@/components/onboarding/account';
import { fonts, palette, radius, space } from '@/constants/design';
import { useAuth } from '@/services/auth';
import { profileWithRole, roleSwitchState, type RoleSwitch } from '@/services/accountSettings';
import { useAccountStore } from '@/stores/useAccountStore';

const day = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** `onWithdraw`: today's withdraw flow (consent withdrawn, then sign out); the agreement is marked withdrawn first */
export function YourAccount({ onWithdraw, leaving }: { onWithdraw: () => Promise<void>; leaving: boolean }) {
  const router = useRouter();
  const { walletAddress } = useAuth();
  const profile = useAccountStore((st) => st.getProfile(walletAddress));
  const agreement = useAccountStore((st) => st.getAgreement(walletAddress));
  const [sheet, setSheet] = useState<'agreement' | 'text' | null>(null);

  if (!profile || !walletAddress) return null;

  const flip = (role: RoleSwitch, on: boolean) =>
    useAccountStore.getState().setProfile(walletAddress, profileWithRole(profile, role, on));
  const work = roleSwitchState(profile, 'freelancer');
  const hire = roleSwitchState(profile, 'client');
  const caption = (locked: 'atLeastOne' | 'vietnam' | null, role: RoleSwitch) =>
    locked === 'vietnam' && role === 'client' ? SETTINGS_COPY.alsoHireVN : locked === 'atLeastOne' ? SETTINGS_COPY.atLeastOne : null;
  const business = profile.client?.kind === 'business' && profile.business ? profile.business : null;
  const agreedValue = agreement ? SETTINGS_COPY.agreementValue(agreement.agreementVersion, day(agreement.acceptedAt)) : '';

  const withdraw = async () => {
    useAccountStore.getState().withdrawAgreement(walletAddress);
    await onWithdraw();
  };

  return (
    <>
      <Text style={styles.section} accessibilityRole="header">
        {SETTINGS_COPY.account}
      </Text>
      <View style={styles.card}>
        {([
          ['freelancer', SETTINGS_COPY.alsoWork, work],
          ['client', SETTINGS_COPY.alsoHire, hire],
        ] as const).map(([role, title, st], i) => {
          const note = caption(st.locked, role);
          return (
            <View key={role} style={[styles.row, i > 0 && styles.divider]}>
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>{title}</Text>
                {note ? <Text style={styles.caption}>{note}</Text> : null}
              </View>
              <Toggle accessibilityLabel={title} value={st.on} onValueChange={(v) => flip(role, v)} disabled={!!st.locked} />
            </View>
          );
        })}
        <Row title={SETTINGS_COPY.country} onPress={() => router.push('/country?edit=1')}>
          <CodeChip code={profile.country} />
          <Text style={styles.value}>{countryName(profile.country) ?? profile.country}</Text>
        </Row>
        {business ? (
          <Row title={SETTINGS_COPY.business} onPress={() => router.push('/business?edit=1')}>
            <Text style={styles.value} numberOfLines={1}>
              {SETTINGS_COPY.businessValue(business.name)}
            </Text>
          </Row>
        ) : null}
        <Row title={SETTINGS_COPY.agreement} onPress={() => setSheet('agreement')}>
          <Text style={styles.value}>{agreedValue}</Text>
        </Row>
      </View>

      <Sheet visible={sheet === 'agreement'} onClose={() => setSheet(null)} title={SETTINGS_COPY.agreement}>
        <View style={styles.sheetCard}>
          <View style={styles.row}>
            <Text style={[styles.rowTitle, styles.flex]}>{agreedValue}</Text>
          </View>
          <Row title={SETTINGS_COPY.agreementView} onPress={() => setSheet('text')} />
        </View>
        <Button title={SETTINGS_COPY.agreementWithdraw} variant="destructiveSoft" loading={leaving} onPress={() => void withdraw()} style={styles.sheetButton} />
      </Sheet>

      <Sheet visible={sheet === 'text'} onClose={() => setSheet('agreement')} title={SETTINGS_COPY.agreementView}>
        <ScrollView style={styles.textScroll}>
          <Text style={styles.agreementText}>
            {agreement
              ? agreementText(
                  { freelancer: agreement.roles.freelancer, client: agreement.roles.client ? { kind: agreement.roles.client } : null, country: agreement.country },
                  { ...CURRENT_AGREEMENT_VERSIONS, agreement: agreement.agreementVersion }
                )
              : ''}
          </Text>
        </ScrollView>
      </Sheet>
    </>
  );
}

function Row({ title, onPress, children }: { title: string; onPress(): void; children?: React.ReactNode }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={[styles.row, styles.divider]}>
      <Text style={[styles.rowTitle, styles.flex]}>{title}</Text>
      {children}
      <Feather name="chevron-right" size={18} color={palette.muted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  section: { paddingTop: 18, paddingHorizontal: 6, paddingBottom: space[2], fontFamily: fonts.bodySemi, fontSize: 13, color: palette.caption },
  card: { borderRadius: radius.xl, backgroundColor: palette.card, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 14, paddingVertical: space[2] },
  divider: { borderTopWidth: 1, borderTopColor: palette.divider },
  rowTitle: { fontFamily: fonts.bodyMedium, fontSize: 15, color: palette.ink },
  caption: { marginTop: 3, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: palette.caption },
  value: { flexShrink: 1, fontFamily: fonts.body, fontSize: 14, color: palette.caption },
  sheetCard: { borderRadius: radius.xl, backgroundColor: palette.field, overflow: 'hidden' },
  sheetButton: { marginTop: space[4] },
  textScroll: { maxHeight: 520 },
  agreementText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: palette.ink2 },
});
