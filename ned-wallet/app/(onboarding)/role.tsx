// D30 step 1 · How will you use N.E.D? (board OnbRole). Behind FEATURES.accountRoles. The choice stays in the in-memory
// draft until the agreement is accepted.
// ?update=1 (R7, board OnbRoleUpdate): a wallet that used N.E.D before D30. The answers are preselected once from the
// money view and the wallet's history (build §6), the update notice shows, and there is no Back (already signed in).
import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ROLE_COPY } from '@ned/core/account/copy.ts';
import { useAuth } from '../../services/auth';
import { draftWithRole, preselectDraft, roleChoiceOf, signupSteps, type RoleChoice, type WalletHistory } from '../../services/accountOnboarding';
import { listFunds } from '@ned/core/milestone/queries.ts';
import { listMyApplications, listMyJobs } from '@ned/core/jobs/queries.ts';
import { useRegionStore } from '../../stores/useRegionStore';
import { useSignupDraft } from '../../stores/useSignupDraft';
import { FEATURES } from '../../constants/features';
import { OnbScreen, PrimaryButton, StepHeader } from '../../components/onboarding/ui';
import { ChoiceCard, FootCaption, InfoLine, Radio, StepTitle, TintNotice, accountStyles } from '../../components/onboarding/account';
import { fonts, palette, radius, space } from '../../constants/design';

const OPTIONS: { id: RoleChoice; icon: 'tool' | 'user' | 'briefcase'; copy: { title: string; tag: string; body: string } }[] = [
  { id: 'freelancer', icon: 'tool', copy: ROLE_COPY.freelancer },
  { id: 'individual', icon: 'user', copy: ROLE_COPY.client },
  { id: 'business', icon: 'briefcase', copy: ROLE_COPY.business },
];

export default function RoleScreen() {
  const { isReady, isAuthenticated, walletAddress } = useAuth();
  const update = useLocalSearchParams<{ update?: string }>().update === '1';
  const draft = useSignupDraft((st) => st.draft);
  const setDraft = useSignupDraft((st) => st.setDraft);
  const chosen = roleChoiceOf(draft);
  const preselected = useRef(false);

  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace('/welcome');
  }, [isReady, isAuthenticated]);

  // R7: preselect once, at the start of the update flow; a choice the user already made is never replaced
  useEffect(() => {
    if (!update || !walletAddress || preselected.current || !FEATURES.accountRoles) return;
    preselected.current = true;
    const region = useRegionStore.getState().getRegion(walletAddress);
    const apply = (history: WalletHistory | null) => {
      const current = useSignupDraft.getState().draft;
      if (roleChoiceOf(current) || current.country) return;
      useSignupDraft.getState().setDraft(preselectDraft(region, history));
    };
    if (region !== 'intl') return apply(null);
    void readHistory(walletAddress).then(apply, () => apply(null));
  }, [update, walletAddress]);

  if (!FEATURES.accountRoles) return <Redirect href="/setup" />;

  return (
    <OnbScreen glow={false}>
      <StepHeader step={1} total={signupSteps(draft)} onBack={update ? undefined : () => router.replace('/welcome')} />
      <ScrollView style={accountStyles.flex} contentContainerStyle={accountStyles.scroll}>
        {update ? <TintNotice text={ROLE_COPY.update} style={styles.update} /> : null}
        <StepTitle title={ROLE_COPY.title} sub={ROLE_COPY.sub} />
        <View accessibilityRole="radiogroup" accessibilityLabel={ROLE_COPY.title} style={styles.options}>
          {OPTIONS.map((o) => {
            const on = chosen === o.id;
            return (
              <ChoiceCard key={o.id} on={on} label={`${o.copy.title}, ${o.copy.tag}`} onPress={() => setDraft(draftWithRole(draft, o.id))}>
                <View style={styles.icon}>
                  <Feather name={o.icon} size={20} color={palette.ink2} />
                </View>
                <View style={styles.text}>
                  <View style={styles.titleRow}>
                    <Text style={styles.optionTitle}>{o.copy.title}</Text>
                    <View style={styles.tag}>
                      <Text style={styles.tagText} numberOfLines={1}>
                        {o.copy.tag}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.body}>{o.copy.body}</Text>
                </View>
                <View style={styles.radio}>
                  <Radio on={on} />
                </View>
              </ChoiceCard>
            );
          })}
        </View>
        <InfoLine text={ROLE_COPY.note} style={styles.note} />
      </ScrollView>
      <View style={accountStyles.footer}>
        <PrimaryButton title={ROLE_COPY.common.continue} onPress={() => router.push('/country')} disabled={!chosen} />
        {!chosen ? <FootCaption text={ROLE_COPY.common.chooseOne} /> : null}
      </View>
    </OnbScreen>
  );
}

/** Contracts created and accepted, listings posted, applications sent; read from the chain (no data is stored) */
async function readHistory(wallet: string): Promise<WalletHistory> {
  const [asClient, asFreelancer, listings, applications] = await Promise.all([
    listFunds(wallet, 'client'),
    listFunds(wallet, 'freelancer'),
    listMyJobs(wallet),
    listMyApplications(wallet),
  ]);
  return {
    createdContracts: asClient.length,
    acceptedContracts: asFreelancer.filter((f) => f.state !== 'Created').length,
    listings: listings.length,
    applications: applications.length,
  };
}

const styles = StyleSheet.create({
  update: { marginBottom: 18 },
  options: { marginTop: 22, gap: space[3] },
  icon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: palette.field, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space[2], rowGap: space[1] },
  optionTitle: { fontFamily: fonts.bodySemi, fontSize: 17, lineHeight: 22, color: palette.ink },
  tag: { paddingHorizontal: space[2], paddingVertical: 2, borderRadius: radius.pill, backgroundColor: palette.field },
  tagText: { fontFamily: fonts.bodySemi, fontSize: 11, lineHeight: 16, color: palette.ink2 },
  body: { marginTop: space[1], fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: palette.ink2 },
  radio: { marginTop: 9 },
  note: { marginTop: space[4] },
});
