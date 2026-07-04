// Default (web) stub for RouteMap.
// Metro uses RouteMap.native.tsx on iOS/Android at runtime.
// TypeScript resolves this file for type checking.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export interface RouteCoord {
  latitude: number;
  longitude: number;
}

export interface RouteMapProps {
  destination: RouteCoord & { name: string; perimeter: number };
  userLocation?: RouteCoord | null;
  onRouteFetched?: (durationMin: number, distanceKm: number) => void;
}

export default function RouteMap(_props: RouteMapProps) {
  const colors = useColors();
  return (
    <View style={[styles.container, { backgroundColor: '#0a0a0a' }]}>
      <Ionicons name="map-outline" size={64} color={colors.mutedForeground} />
      <Text style={[styles.text, { color: colors.mutedForeground }]}>
        Map available on iOS & Android
      </Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>
        Scan the QR code with Expo Go to navigate
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  text: { fontSize: 16, fontFamily: 'Inter_400Regular', marginTop: 8 },
  sub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingHorizontal: 40,
    opacity: 0.7,
  },
});
