// Default (web) implementation of MapPicker.
// Metro bundler will use MapPicker.native.tsx on iOS/Android at runtime.
// TypeScript resolves this file for type checking across all platforms.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export interface PinCoord {
  latitude: number;
  longitude: number;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MapHandle {
  animateToRegion?: (region: MapRegion, duration?: number) => void;
}

export interface MapPickerProps {
  mapRef?: React.RefObject<MapHandle | null>;
  initialRegion?: MapRegion;
  pin: PinCoord | null;
  pinColor?: string;
  pinTitle?: string;
  showsUserLocation?: boolean;
  onPress?: (coord: PinCoord) => void;
}

// Web stub — react-native-maps is native only
export default function MapPicker(_props: MapPickerProps) {
  const colors = useColors();
  return (
    <View style={[styles.container, { backgroundColor: '#111' }]}>
      <Ionicons name="map-outline" size={64} color={colors.mutedForeground} />
      <Text style={[styles.text, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
        Map available on iOS & Android
      </Text>
      <Text style={[styles.sub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
        Scan the QR code with Expo Go to test on your device
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
  text: {
    fontSize: 16,
    marginTop: 8,
  },
  sub: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 40,
    opacity: 0.7,
  },
});
