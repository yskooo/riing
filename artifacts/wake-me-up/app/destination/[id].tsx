import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';

import { useColors } from '@/hooks/useColors';
import { useDestinationsStore } from '@/store/destinationsStore';
import { startTracking, stopTracking } from '@/services/trackingService';
import { formatDistance } from '@/utils/distance';
import RouteMap, { type RouteCoord } from '@/components/RouteMap';

export default function DestinationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { destinations, activeTracking } = useDestinationsStore();
  const destination = destinations.find((d) => d.id === id);

  const [userLocation, setUserLocation] = useState<RouteCoord | null>(null);
  const [routeDurationMin, setRouteDurationMin] = useState<number | null>(null);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  const isTrackingThis = activeTracking?.destinationId === id;

  // Fetch user location once on mount (and keep live coords from store if tracking)
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const load = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      } catch {
        // no-op
      }
    };
    load();
  }, []);

  // While tracking, keep user location fresh from the store
  useEffect(() => {
    if (isTrackingThis && activeTracking) {
      const { currentLat, currentLon } = activeTracking;
      if (currentLat !== 0 || currentLon !== 0) {
        setUserLocation({ latitude: currentLat, longitude: currentLon });
      }
    }
  }, [isTrackingThis, activeTracking?.currentLat, activeTracking?.currentLon]);

  if (!destination) {
    return (
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        <Text style={{ color: '#fff', padding: 24 }}>Destination not found.</Text>
      </View>
    );
  }

  const handleStartTracking = async () => {
    if (isTrackingThis) return;
    if (activeTracking) await stopTracking();

    setStarting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Required', 'Please grant location permission to track your journey.');
        return;
      }
      await startTracking(destination);
    } catch {
      Alert.alert('Error', 'Could not start tracking. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const handleStopTracking = async () => {
    setStopping(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await stopTracking();
    setStopping(false);
  };

  const liveDistance = isTrackingThis && activeTracking
    ? formatDistance(activeTracking.distanceMeters)
    : null;

  const displayDistance = liveDistance
    ?? (routeDistanceKm != null ? `${routeDistanceKm} km` : null);

  const topPad = Platform.OS === 'web' ? 60 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      {/* Full-screen route map */}
      <RouteMap
        destination={destination}
        userLocation={userLocation}
        onRouteFetched={(dur, dist) => {
          setRouteDurationMin(dur);
          setRouteDistanceKm(dist);
        }}
      />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.topTitle}>
          <Text style={styles.topName} numberOfLines={1}>{destination.name}</Text>
          <Text style={styles.topPerimeter}>
            Alarm within {formatDistance(destination.perimeter)}
          </Text>
        </View>

        {isTrackingThis && (
          <View style={styles.liveChip}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>

      {/* Bottom panel */}
      <View style={[styles.bottomPanel, { paddingBottom: bottomPad + 16 }]}>
        {/* Stats row */}
        <View style={styles.statsRow}>
          {displayDistance && (
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{displayDistance}</Text>
              <Text style={styles.statLabel}>{isTrackingThis ? 'remaining' : 'away'}</Text>
            </View>
          )}
          {routeDurationMin != null && !isTrackingThis && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {routeDurationMin < 1 ? '<1' : routeDurationMin} min
                </Text>
                <Text style={styles.statLabel}>estimated</Text>
              </View>
            </>
          )}
          {isTrackingThis && activeTracking && activeTracking.distanceMeters < Infinity && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{formatDistance(destination.perimeter)}</Text>
                <Text style={styles.statLabel}>alarm zone</Text>
              </View>
            </>
          )}
        </View>

        {/* Action button */}
        {isTrackingThis ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#1a1a1a', borderColor: '#FF3B30' }]}
            onPress={handleStopTracking}
            disabled={stopping}
          >
            {stopping ? (
              <ActivityIndicator color="#FF3B30" />
            ) : (
              <>
                <Ionicons name="stop-circle" size={20} color="#FF3B30" />
                <Text style={[styles.actionText, { color: '#FF3B30' }]}>Stop Tracking</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: pressed ? '#00b8db' : '#00D4FF',
                borderColor: '#00D4FF',
                opacity: starting ? 0.8 : 1,
              },
            ]}
            onPress={handleStartTracking}
            disabled={starting}
          >
            {starting ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="navigate" size={20} color="#000" />
                <Text style={[styles.actionText, { color: '#000' }]}>Start Tracking</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
    // Blur-like gradient behind the bar
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: { flex: 1 },
  topName: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    letterSpacing: -0.2,
  },
  topPerimeter: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#00D4FF20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00D4FF60',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00D4FF' },
  liveText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#00D4FF', letterSpacing: 1 },

  // Bottom panel
  bottomPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.82)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingTop: 16,
    gap: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingBottom: 4,
  },
  statBox: { alignItems: 'center', gap: 2 },
  statValue: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 17,
    borderRadius: 50,
    borderWidth: 1.5,
  },
  actionText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.1,
  },
});
