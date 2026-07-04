import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { useColors } from '@/hooks/useColors';
import { useDestinationsStore } from '@/store/destinationsStore';
import { startAlarm, stopAlarm } from '@/services/alarmService';
import { stopTracking } from '@/services/trackingService';

export default function AlarmScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { alarmDestinationName, dismissAlarm } = useDestinationsStore();

  // Store timeout IDs so we can clear them on unmount
  const timeout1 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeout2 = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pulsing ring animations
  const ring1Scale = useSharedValue(1);
  const ring1Opacity = useSharedValue(0.6);
  const ring2Scale = useSharedValue(1);
  const ring2Opacity = useSharedValue(0.4);
  const ring3Scale = useSharedValue(1);
  const ring3Opacity = useSharedValue(0.2);
  const iconScale = useSharedValue(1);

  useEffect(() => {
    // Start alarm haptics
    startAlarm();

    // Ring 1 — fastest
    ring1Scale.value = withRepeat(
      withSequence(
        withTiming(2.2, { duration: 900, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 0 })
      ),
      -1,
      false
    );
    ring1Opacity.value = withRepeat(
      withSequence(withTiming(0, { duration: 900 }), withTiming(0.6, { duration: 0 })),
      -1,
      false
    );

    // Ring 2 — delayed
    timeout1.current = setTimeout(() => {
      ring2Scale.value = withRepeat(
        withSequence(
          withTiming(2.8, { duration: 1000, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 0 })
        ),
        -1,
        false
      );
      ring2Opacity.value = withRepeat(
        withSequence(withTiming(0, { duration: 1000 }), withTiming(0.4, { duration: 0 })),
        -1,
        false
      );
    }, 300);

    // Ring 3 — most delayed
    timeout2.current = setTimeout(() => {
      ring3Scale.value = withRepeat(
        withSequence(
          withTiming(3.4, { duration: 1100, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 0 })
        ),
        -1,
        false
      );
      ring3Opacity.value = withRepeat(
        withSequence(withTiming(0, { duration: 1100 }), withTiming(0.2, { duration: 0 })),
        -1,
        false
      );
    }, 600);

    // Icon pulse
    iconScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 500 }),
        withTiming(1, { duration: 500 })
      ),
      -1,
      true
    );

    return () => {
      // Clean up haptics and all pending timers on unmount
      stopAlarm();
      if (timeout1.current) clearTimeout(timeout1.current);
      if (timeout2.current) clearTimeout(timeout2.current);
    };
  }, []);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));
  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring3Scale.value }],
    opacity: ring3Opacity.value,
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const handleDismiss = async () => {
    stopAlarm();
    if (timeout1.current) clearTimeout(timeout1.current);
    if (timeout2.current) clearTimeout(timeout2.current);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await stopTracking();
    dismissAlarm();
    router.replace('/');
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: '#000000' }]}>
      {/* Animated rings */}
      <View style={styles.center} pointerEvents="none">
        <Animated.View
          style={[
            styles.ring,
            { borderColor: '#00D4FF', width: 160, height: 160, borderRadius: 80 },
            ring3Style,
          ]}
        />
        <Animated.View
          style={[
            styles.ring,
            { borderColor: '#00D4FF', width: 140, height: 140, borderRadius: 70 },
            ring2Style,
          ]}
        />
        <Animated.View
          style={[
            styles.ring,
            { borderColor: '#00D4FF', width: 120, height: 120, borderRadius: 60 },
            ring1Style,
          ]}
        />

        {/* Core circle */}
        <Animated.View
          style={[
            styles.core,
            { backgroundColor: '#00D4FF' + '20', borderColor: '#00D4FF' + '60' },
            iconStyle,
          ]}
        >
          <Ionicons name="alarm" size={48} color="#00D4FF" />
        </Animated.View>
      </View>

      {/* Top label */}
      <View style={[styles.topContent, { paddingTop: topPad + 60 }]}>
        <Text style={styles.wakeUpLabel}>WAKE UP</Text>
      </View>

      {/* Bottom content */}
      <View style={[styles.bottomContent, { paddingBottom: bottomPad + 24 }]}>
        <Text style={styles.arrivingText}>Arriving at</Text>
        <Text style={styles.destinationName} numberOfLines={2}>
          {alarmDestinationName ?? 'your stop'}
        </Text>

        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={handleDismiss}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark" size={22} color="#000" />
          <Text style={styles.dismissText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  core: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topContent: {
    alignItems: 'center',
  },
  wakeUpLabel: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: '#00D4FF',
    letterSpacing: 6,
    opacity: 0.9,
  },
  bottomContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  arrivingText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#8E8E93',
    letterSpacing: 0.3,
  },
  destinationName: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 32,
  },
  dismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00D4FF',
    paddingHorizontal: 48,
    paddingVertical: 18,
    borderRadius: 50,
    width: '100%',
    marginBottom: 16,
  },
  dismissText: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#000000',
    letterSpacing: 0.2,
  },
});
