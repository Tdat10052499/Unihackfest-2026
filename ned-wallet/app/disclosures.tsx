// Disclosures (Disclosures board), reachable from Settings, the consent screen and Home "Suggested for you".
// The text is shared with N.E.D Jobs (@ned/core legal copy); it is reviewed by the compliance lead
// (docs/05-legal/compliance-lead-tasks.md): change it only with them.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Badge, IconButton, Screen } from '@/components/design';
import { fonts, palette, radius, space } from '@/constants/design';
import { disclosureItems, DISCLOSURES_LEAD } from '@/services/legalCopy';

type Icon = React.ComponentProps<typeof Feather>['name'];

/** Icon per line of the shared Disclosures list (@ned/core legal copy) */
const ICONS: Record<string, Icon> = {
  devnet: 'cloud-off',
  kyc: 'user-x',
  phone: 'phone-off',
  audit: 'shield-off',
  upgrade: 'tool',
  partner: 'repeat',
  fees: 'zap',
  disputes: 'pause-circle',
  'vn-release': 'arrow-right-circle',
  freeze: 'slash',
  link: 'link',
  public: 'globe',
  advice: 'info',
};
// C2 / S-1 (CL review 7 Oct): the disputes line describes the system, not this app's screens. Requesting changes is live
// in the program and the Workspace (D27) for the same contracts, so the phone app shows "No neutral arbiter" even while
// its own dispute screens (FEATURES.dispute) are still off.
const DISPUTES_LIVE = true;
const ITEMS = disclosureItems(DISPUTES_LIVE).map((d) => ({ ...d, icon: ICONS[d.id] ?? 'info' }));

export default function DisclosuresScreen() {
  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))} />
        <Text style={styles.title} accessibilityRole="header">
          Disclosures
        </Text>
        <Badge label="Devnet · test money" tone="warning" />
      </View>
      <Text style={styles.lead}>{DISCLOSURES_LEAD}</Text>
      <View accessibilityRole="list" style={styles.list}>
        {ITEMS.map((item, i) => (
          <View key={item.title} accessibilityRole="text" style={[styles.item, i > 0 && styles.divider]}>
            <View style={styles.icon}>
              <Feather name={item.icon} size={16} color={palette.link} />
            </View>
            <View style={styles.text}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemBody}>{item.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space[4], paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 2 },
  title: { flex: 1, fontFamily: fonts.display, fontSize: 18, color: palette.ink },
  lead: { marginTop: space[3], fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: palette.ink2 },
  list: { marginTop: space[3], borderRadius: radius.xl, backgroundColor: palette.card },
  item: { flexDirection: 'row', gap: space[3], paddingVertical: 13, paddingHorizontal: 14 },
  divider: { borderTopWidth: 1, borderTopColor: palette.divider },
  icon: { width: 32, height: 32, borderRadius: 10, backgroundColor: palette.tint, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0 },
  itemTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink },
  itemBody: { marginTop: 2, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: palette.caption },
});
