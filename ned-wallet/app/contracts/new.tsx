// New contract (international view). The ContractNew boards are built in build-plan B4; until then this screen says
// so instead of a dead tile. Not reachable from the Vietnam view (decision D18).
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, IconButton, Screen } from '@/components/design';
import { fonts, palette, radius, space } from '@/constants/design';
import { useRegion } from '@/hooks/useRegion';

export default function NewContractScreen() {
  const { region } = useRegion();
  const vn = (region ?? 'vn') === 'vn';
  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
        <Text style={styles.title} accessibilityRole="header">
          New contract
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{vn ? 'Not available in the Vietnam view' : 'Coming in the next build'}</Text>
        <Text style={styles.body}>
          {vn
            ? 'In the Vietnam view you receive contracts from clients. Share your @username so a client can send you one.'
            : 'Creating a contract with milestones arrives in the next build of the app. Your contracts so far are listed under Contracts.'}
        </Text>
      </View>
      <Button title="See your contracts" variant="secondary" onPress={() => router.replace('/contracts')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space[4], gap: space[4] },
  header: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  title: { fontFamily: fonts.display, fontSize: 18, color: palette.ink },
  card: { padding: space[5], borderRadius: radius.xl, backgroundColor: palette.card, gap: space[2] },
  cardTitle: { fontFamily: fonts.display, fontSize: 18, color: palette.ink },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: palette.caption },
});
