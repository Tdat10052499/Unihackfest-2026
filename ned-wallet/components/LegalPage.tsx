// Shared layout for the text pages /terms, /privacy and /help (compliance fix list P3, U5): the Disclosures header,
// a heading line, then cards of short sections. Copy lives in services/legalCopy.ts.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Badge, IconButton, Screen } from '@/components/design';
import { elevation, fonts, palette, radius, space } from '@/constants/design';
import type { LegalSection } from '@/services/legalCopy';

export function LegalPage({ title, heading, sections }: { title: string; heading: string; sections: LegalSection[] }) {
  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))} />
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Badge label="Devnet · test money" tone="warning" />
      </View>
      <Text style={styles.lead}>{heading}</Text>
      {sections.map((s, i) => (
        <View key={s.title} style={styles.card}>
          <Text style={styles.cardTitle} accessibilityRole="header">
            {TERMS_NUMBERED.has(title) ? `${i + 1}. ` : ''}
            {s.title}
          </Text>
          {s.body.map((line, j) => (
            <View key={line} style={[styles.line, j > 0 && styles.lineGap]}>
              {s.list ? <Text style={styles.marker}>{s.list === 'number' ? `${j + 1}.` : '•'}</Text> : null}
              <Text style={styles.body}>{line}</Text>
            </View>
          ))}
        </View>
      ))}
    </Screen>
  );
}

/** The Terms draft numbers its items */
const TERMS_NUMBERED = new Set(['Terms of use']);

const styles = StyleSheet.create({
  content: { paddingHorizontal: space[4], paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 2 },
  title: { flex: 1, fontFamily: fonts.display, fontSize: 18, color: palette.ink },
  lead: { marginTop: space[3], fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 19, color: palette.ink2 },
  card: { marginTop: space[3], padding: 14, borderRadius: radius.xl, backgroundColor: palette.card, ...elevation.s1 },
  cardTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink },
  line: { flexDirection: 'row', gap: 6, marginTop: 6 },
  lineGap: { marginTop: 4 },
  marker: { minWidth: 14, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: palette.caption },
  body: { flex: 1, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: palette.caption },
});
