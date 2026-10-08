// D30 · The N.E.D Agreement (boards OnbAgreement, OnbAgreementBusiness, OnbAgreementReady, OnbAgreementNed). Behind
// FEATURES.accountRoles. Three separate boxes, never ticked by default. "Agree and continue" records consent v3, the
// profile, the agreement (with the hash of the exact text shown) and the region, then hands over to /setup.
import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { getWorkspaceOrigin } from '@ned/core/config.ts';
import { AGREEMENT_CHECKS, AGREEMENT_COPY, AGREEMENT_LINKS as L, agreementCards, agreementLinks, isDutyCard, NED_CARD, NED_CARD_PREVIEW } from '@ned/core/legal/agreement.ts';
import { useAuth } from '../../services/auth';
import { commitAgreement, draftFromProfile, draftReadyForAgreement, draftToProfile, isBusinessDraft, signupSteps } from '../../services/accountOnboarding';
import { useSignupDraft } from '../../stores/useSignupDraft';
import { useAccountStore } from '../../stores/useAccountStore';
import { useConsentStore } from '../../stores/useConsentStore';
import { useRegionStore } from '../../stores/useRegionStore';
import { FEATURES } from '../../constants/features';
import { OnbScreen, PrimaryButton, StepHeader } from '../../components/onboarding/ui';
import { CheckCard, FootCaption, StepTitle, accountStyles } from '../../components/onboarding/account';
import { Button, Sheet } from '@/components/design';
import { elevation, fonts, palette, radius, space, status } from '../../constants/design';

export default function AgreementScreen() {
  const { isReady, isAuthenticated, walletAddress } = useAuth();
  const draft = useSignupDraft((st) => st.draft);
  const setDraft = useSignupDraft((st) => st.setDraft);
  const resetDraft = useSignupDraft((st) => st.reset);
  const stored = useAccountStore((st) => st.getProfile(walletAddress));
  const [ticks, setTicks] = useState([false, false, false]);
  const [nedOpen, setNedOpen] = useState(false);

  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace('/welcome');
  }, [isReady, isAuthenticated]);

  // A returning wallet sent here by /setup (new agreement version) agrees with the profile it already has
  useEffect(() => {
    if (!draft.country && stored) setDraft(draftFromProfile(stored));
  }, [draft.country, stored, setDraft]);

  if (!FEATURES.accountRoles) return <Redirect href="/setup" />;
  if (!draft.country && stored) return null;
  // A Vietnam draft with a client role, or one with steps missing, never reaches the agreement
  if (!draftReadyForAgreement(draft)) return <Redirect href="/role" />;

  const all = ticks.every(Boolean);
  const business = isBusinessDraft(draft);
  const cards = agreementCards(draft);

  const agree = () => {
    const profile = draftToProfile(draft, Date.now());
    if (!walletAddress || !all || !profile) return;
    commitAgreement(
      {
        acceptConsent: (w, scope, version) => useConsentStore.getState().accept(w, scope, version),
        setProfile: (w, p) => useAccountStore.getState().setProfile(w, p),
        acceptAgreement: (w, r) => useAccountStore.getState().acceptAgreement(w, r),
        setRegion: (w, r) => useRegionStore.getState().setRegion(w, r),
      },
      walletAddress,
      profile,
      Date.now()
    );
    resetDraft();
    router.replace('/setup');
  };

  const links = agreementLinks(draft);
  return (
    <OnbScreen glow={false}>
      <StepHeader step={business ? 4 : 3} total={signupSteps(draft)} onBack={() => router.replace(business ? '/business' : '/country')} />
      <ScrollView style={accountStyles.flex} contentContainerStyle={accountStyles.scroll}>
        <StepTitle title={AGREEMENT_COPY.title} sub={AGREEMENT_COPY.sub} />
        <View style={[styles.card, styles.opening, elevation.s1]}>
          <Text style={styles.openingText}>{AGREEMENT_COPY.opening}</Text>
        </View>

        {cards.map((card) =>
          card === NED_CARD ? null : (
            <View key={card.heading} style={[styles.card, elevation.s1]} accessibilityLabel={card.heading}>
              <Text style={styles.heading} accessibilityRole="header">
                {card.heading}
              </Text>
              {isDutyCard(card) ? (
                <>
                  <Text style={styles.sub}>{AGREEMENT_COPY.countOn}</Text>
                  <Lines lines={card.countOn} mark="check" />
                  <Text style={styles.sub}>{AGREEMENT_COPY.agreeTo}</Text>
                  <Lines lines={card.agreeTo} mark="dot" />
                </>
              ) : (
                <Lines lines={card.items} mark="dot" first />
              )}
            </View>
          )
        )}

        <View style={[styles.card, elevation.s1]}>
          <Text style={styles.heading} accessibilityRole="header">
            {NED_CARD.heading}
          </Text>
          <Lines lines={NED_CARD.items.slice(0, NED_CARD_PREVIEW)} mark="dot" first />
          <Text style={styles.more} onPress={() => setNedOpen(true)} accessibilityRole="button">
            {AGREEMENT_COPY.ned.more}
          </Text>
        </View>

        <Text style={styles.links}>
          {L.lead}{' '}
          <Text style={accountStyles.link} onPress={() => router.push('/terms')} accessibilityRole="link">
            {L.terms}
          </Text>
          {L.separator}
          <Text style={accountStyles.link} onPress={() => router.push('/privacy')} accessibilityRole="link">
            {L.privacy}
          </Text>
          {L.separator}
          <Text style={accountStyles.link} onPress={() => router.push('/disclosures')} accessibilityRole="link">
            {L.disclosures}
          </Text>
          {links.includes(AGREEMENT_COPY.linksBusiness) ? (
            <>
              {L.separator}
              <Text
                style={accountStyles.link}
                onPress={() => Linking.openURL(`${getWorkspaceOrigin()}/jobs/legal?doc=rules`)}
                accessibilityRole="link"
              >
                {AGREEMENT_COPY.linksBusiness}
              </Text>
            </>
          ) : null}
        </Text>

        <View style={styles.checks}>
          {AGREEMENT_CHECKS.map((text, i) => (
            <CheckCard key={i} checked={ticks[i]} text={text} onPress={() => setTicks((t) => t.map((v, j) => (j === i ? !v : v)))} />
          ))}
        </View>
      </ScrollView>
      <View style={accountStyles.footer}>
        <PrimaryButton title={AGREEMENT_COPY.button} onPress={agree} disabled={!all || !walletAddress} />
        {!all ? <FootCaption text={AGREEMENT_COPY.disabled} /> : null}
        <Text style={styles.version}>{AGREEMENT_COPY.version}</Text>
      </View>

      <Sheet visible={nedOpen} onClose={() => setNedOpen(false)} title={NED_CARD.heading}>
        <ScrollView style={styles.sheetList}>
          <Lines lines={NED_CARD.items} mark="dot" first />
        </ScrollView>
        <Button title={AGREEMENT_COPY.close} variant="secondary" onPress={() => setNedOpen(false)} style={styles.sheetClose} />
      </Sheet>
    </OnbScreen>
  );
}

function Lines({ lines, mark, first }: { lines: readonly string[]; mark: 'check' | 'dot'; first?: boolean }) {
  return (
    <View accessibilityRole="list" style={[styles.lines, first && styles.linesFirst]}>
      {lines.map((line) => (
        <View key={line} style={styles.line}>
          {mark === 'check' ? (
            <Feather name="check" size={18} color={status.success.dot} style={styles.mark} />
          ) : (
            <View style={styles.dot} />
          )}
          <Text style={styles.lineText}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: space[3], padding: 18, borderRadius: radius.xl, backgroundColor: palette.card },
  opening: { marginTop: 18, padding: space[4] },
  openingText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: palette.ink2 },
  heading: { fontFamily: fonts.displaySemi, fontSize: 18, color: palette.ink },
  sub: { marginTop: 14, fontFamily: fonts.bodySemi, fontSize: 13, color: palette.caption },
  lines: { marginTop: space[2], gap: 10 },
  linesFirst: { marginTop: space[3] },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  mark: { marginTop: 1 },
  dot: { width: 6, height: 6, marginTop: 8, marginHorizontal: 6, borderRadius: radius.pill, backgroundColor: palette.link },
  lineText: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: palette.ink },
  more: { marginTop: space[2], paddingVertical: 12, fontFamily: fonts.bodySemi, fontSize: 14, color: palette.link },
  links: { marginTop: space[4], fontFamily: fonts.body, fontSize: 13, lineHeight: 21, color: palette.caption },
  checks: { marginTop: space[4], gap: 10 },
  version: { marginTop: 6, textAlign: 'center', fontFamily: fonts.body, fontSize: 12, color: palette.caption },
  sheetList: { maxHeight: 520 },
  sheetClose: { marginTop: space[4] },
});
