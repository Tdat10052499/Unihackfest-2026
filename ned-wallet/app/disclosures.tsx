// Disclosures (Disclosures board), reachable from Settings, the consent screen and Home "Suggested for you".
// Copy is reviewed by the compliance lead (docs/05-legal/compliance-lead-tasks.md): change it only with them.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Badge, IconButton, Screen } from '@/components/design';
import { fonts, palette, radius, space } from '@/constants/design';
import { FEATURES } from '@/constants/features';
import { disputeDisclosure } from '@/services/legalCopy';

type Icon = React.ComponentProps<typeof Feather>['name'];

const ITEMS: { icon: Icon; title: string; body: string }[] = [
  { icon: 'cloud-off', title: 'Devnet only', body: 'This demo runs on Solana devnet with test money. Nothing here has real value.' },
  { icon: 'user-x', title: 'No KYC yet', body: 'N.E.D does not check anyone’s identity in this version.' },
  { icon: 'phone-off', title: 'Phone numbers are not verified', body: 'We don’t send a code. A number on a profile may not belong to that person.' },
  { icon: 'shield-off', title: 'The program is not audited', body: 'The Solana program that locks and releases USDC has not had a security audit.' },
  { icon: 'repeat', title: 'The payout partner is simulated', body: 'No payout partner is connected in this demo. No VND is sent to any bank.' },
  { icon: 'zap', title: 'Network fees use test SOL', body: 'Each action costs about 0.000005 test SOL on devnet. N.E.D charges no fee during the pilot.' },
  // C2: follows FEATURES.dispute ("No disputes in this demo" while it is off)
  { icon: 'pause-circle', ...disputeDisclosure(FEATURES.dispute) },
  { icon: 'arrow-right-circle', title: 'After release in the Vietnam path', body: 'Once a milestone is released to the payout partner, you rely on that partner to send you the VND.' },
  { icon: 'slash', title: 'Circle can freeze USDC addresses', body: 'USDC is issued by Circle, which can freeze an address. N.E.D cannot undo that.' },
  // D15 (product-spec 5.1): the invite link carries the key that opens the brief and the delivery
  { icon: 'link', title: 'Anyone with the contract link can read it', body: 'The contract link holds the key to the brief and the delivery. Anyone who has the link can read them, but cannot move money. Share it only with the other party.' },
  // Updated for B1: the brief and delivery are stored encrypted on Solana (the board said N.E.D never stores the delivery link)
  { icon: 'globe', title: 'Public on-chain', body: 'Contract titles and the fingerprints of the brief and the delivery are public. The brief and the delivery are stored encrypted on Solana. N.E.D never stores your bank details.' },
  { icon: 'info', title: 'Not advice', body: 'This is not legal, tax or financial advice.' },
];

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
      <Text style={styles.lead}>Please read these before you lock or receive anything. Version 1.0.0 · pilot on Solana devnet.</Text>
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
