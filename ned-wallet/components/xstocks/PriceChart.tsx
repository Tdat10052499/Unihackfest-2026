import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon, Polyline } from 'react-native-svg';

export function PriceChart({ values }: { values: number[] }) {
  if (values.length < 2) return <View style={styles.empty}><Text style={styles.label}>Chart data unavailable</Text></View>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 320},${100 - ((value - min) / (max - min || 1)) * 88}`).join(' ');
  return <Svg width="100%" height="140" viewBox="0 0 320 112"><Polygon points={`0,112 ${points} 320,112`} fill="rgba(155,79,222,0.18)" /><Polyline points={points} fill="none" stroke="#B87AED" strokeWidth="2.5" /></Svg>;
}

const styles = StyleSheet.create({ empty: { height: 120, alignItems: 'center', justifyContent: 'center' }, label: { color: 'rgba(255,255,255,0.5)', fontSize: 12 } });
