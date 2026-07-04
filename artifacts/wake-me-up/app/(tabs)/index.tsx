import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';

import { useColors } from '@/hooks/useColors';
import { Destination, useDestinationsStore } from '@/store/destinationsStore';
import { startTracking, stopTracking } from '@/services/trackingService';
import { formatDistance } from '@/utils/distance';

// ─── Animated tracking dot ───────────────────────────────────────────────────

function PulseDot({ color }: { color: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.5, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 700 }), withTiming(0.9, { duration: 700 })),
      -1,
      false
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

// ─── Active Tracking Card ─────────────────────────────────────────────────────

function TrackingCard() {
  const colors = useColors();
  const { activeTracking, destinations } = useDestinationsStore();
  const [cancelling, setCancelling] = useState(false);

  if (!activeTracking) return null;

  const destination = destinations.find((d) => d.id === activeTracking.destinationId);
  if (!destination) return null;

  const distance = formatDistance(activeTracking.distanceMeters);

  const handleCancel = async () => {
    setCancelling(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await stopTracking();
    setCancelling(false);
  };

  const handleOpenMaps = () => {
    const { latitude, longitude, name } = destination;
    const url = Platform.OS === 'ios'
      ? `maps://app?daddr=${latitude},${longitude}&q=${encodeURIComponent(name)}`
      : `geo:${latitude},${longitude}?q=${encodeURIComponent(name)}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://maps.google.com/?q=${latitude},${longitude}`);
    });
  };

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(18)}
      exiting={SlideOutDown}
      style={[styles.trackingCard, { backgroundColor: colors.card, borderColor: colors.primary + '40' }]}
    >
      <View style={styles.trackingHeader}>
        <View style={styles.trackingTitleRow}>
          <PulseDot color={colors.primary} />
          <Text style={[styles.trackingLabel, { color: colors.mutedForeground }]}>
            TRACKING
          </Text>
        </View>
        <View style={styles.trackingActions}>
          <TouchableOpacity onPress={handleOpenMaps} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="navigate-outline" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleCancel}
            style={styles.iconBtn}
            hitSlop={8}
            disabled={cancelling}
          >
            <Ionicons name="close-circle" size={22} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.trackingName, { color: colors.foreground }]} numberOfLines={1}>
        {destination.name}
      </Text>

      <View style={styles.trackingMeta}>
        <View style={[styles.distanceBadge, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.distanceText, { color: colors.primary }]}>{distance}</Text>
        </View>
        <Text style={[styles.perimeterHint, { color: colors.mutedForeground }]}>
          Alarm at {formatDistance(destination.perimeter)}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Destination Card ─────────────────────────────────────────────────────────

function DestinationCard({
  destination,
  isActiveDestination,
  onTrack,
  onDelete,
}: {
  destination: Destination;
  isActiveDestination: boolean;
  onTrack: () => void;
  onDelete: () => void;
}) {
  const colors = useColors();

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut}>
      <Pressable
        onPress={onTrack}
        onLongPress={onDelete}
        style={({ pressed }) => [
          styles.destCard,
          {
            backgroundColor: colors.card,
            borderColor: isActiveDestination ? colors.primary + '50' : colors.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.destIconWrap,
            {
              backgroundColor: isActiveDestination
                ? colors.primary + '20'
                : colors.secondary,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="map-marker"
            size={22}
            color={isActiveDestination ? colors.primary : colors.mutedForeground}
          />
        </View>

        <View style={styles.destInfo}>
          <Text style={[styles.destName, { color: colors.foreground }]} numberOfLines={1}>
            {destination.name}
          </Text>
          <Text style={[styles.destMeta, { color: colors.mutedForeground }]}>
            Wake-up at {formatDistance(destination.perimeter)}
          </Text>
        </View>

        <View style={styles.destRight}>
          {isActiveDestination ? (
            <View style={[styles.activeChip, { backgroundColor: colors.primary + '20' }]}>
              <PulseDot color={colors.primary} />
              <Text style={[styles.activeChipText, { color: colors.primary }]}>Live</Text>
            </View>
          ) : (
            <View style={[styles.trackBtn, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="play" size={16} color={colors.primary} />
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Home Screen ─────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { destinations, activeTracking, removeDestination } = useDestinationsStore();
  const [starting, setStarting] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // Set up notification permissions + listeners
  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[Home] Notification permission not granted');
      }
    })();

    notificationListener.current = Notifications.addNotificationReceivedListener((n) => {
      const data = n.request.content.data;
      if (data?.alarm) {
        // App is in foreground — trigger alarm via store
        useDestinationsStore.getState().triggerAlarm(String(data.destinationName ?? 'your stop'));
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((res) => {
      const data = res.notification.request.content.data;
      if (data?.alarm) {
        useDestinationsStore.getState().triggerAlarm(String(data.destinationName ?? 'your stop'));
        router.replace('/alarm');
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  const handleTrack = useCallback(
    async (destination: Destination) => {
      // Already tracking this destination
      if (activeTracking?.destinationId === destination.id) return;

      // Stop any existing tracking first
      if (activeTracking) {
        await stopTracking();
      }

      setStarting(destination.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Location Required',
            'Please grant location permission to track your journey.',
            [{ text: 'OK' }]
          );
          return;
        }
        await startTracking(destination);
      } catch (e) {
        Alert.alert('Error', 'Could not start tracking. Please try again.');
      } finally {
        setStarting(null);
      }
    },
    [activeTracking]
  );

  const handleDelete = useCallback(
    (destination: Destination) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Alert.alert(
        'Remove Destination',
        `Remove "${destination.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              if (activeTracking?.destinationId === destination.id) {
                stopTracking();
              }
              removeDestination(destination.id);
            },
          },
        ]
      );
    },
    [activeTracking, removeDestination]
  );

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 12, borderBottomColor: colors.border },
        ]}
      >
        <View>
          <Text style={[styles.appName, { color: colors.mutedForeground }]}>
            WAKE ME UP
          </Text>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {destinations.length === 0
              ? 'No destinations'
              : `${destinations.length} saved`}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/add');
          }}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={22} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      {/* Active tracking card */}
      <TrackingCard />

      {/* Destinations list */}
      <FlatList
        data={destinations}
        keyExtractor={(item) => item.id}
        scrollEnabled={destinations.length > 0}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom:
              Platform.OS === 'web' ? 34 + 80 : insets.bottom + 80,
          },
        ]}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="map-marker-off-outline"
              size={56}
              color={colors.mutedForeground}
            />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No saved destinations
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              Add your stop and never miss it again
            </Text>
            <TouchableOpacity
              style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/add');
              }}
            >
              <Ionicons name="add" size={18} color={colors.primaryForeground} />
              <Text style={[styles.emptyAddText, { color: colors.primaryForeground }]}>
                Add Destination
              </Text>
            </TouchableOpacity>
          </View>
        )}
        renderItem={({ item }) => (
          <DestinationCard
            destination={item}
            isActiveDestination={activeTracking?.destinationId === item.id}
            onTrack={() => handleTrack(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  appName: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Tracking card
  trackingCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  trackingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  trackingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trackingLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.5,
  },
  trackingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    padding: 2,
  },
  trackingName: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  trackingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  distanceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  distanceText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  perimeterHint: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  // Destinations list
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  destCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  destIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destInfo: {
    flex: 1,
  },
  destName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  destMeta: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  destRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  activeChipText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  trackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
  },
  emptyAddText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});
