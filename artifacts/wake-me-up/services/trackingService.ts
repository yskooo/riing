import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

import { ACTIVE_DESTINATION_KEY, LOCATION_TASK_NAME } from '@/tasks/locationTask';
import { Destination, useDestinationsStore } from '@/store/destinationsStore';
import { haversineDistance } from '@/utils/distance';

let foregroundSubscription: Location.LocationSubscription | null = null;

export async function requestAllLocationPermissions(): Promise<{
  foreground: boolean;
  background: boolean;
}> {
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') {
    return { foreground: false, background: false };
  }

  if (Platform.OS === 'web') {
    return { foreground: true, background: false };
  }

  try {
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    return { foreground: true, background: bgStatus === 'granted' };
  } catch {
    return { foreground: true, background: false };
  }
}

export async function startTracking(destination: Destination): Promise<void> {
  // Persist destination for background task
  await AsyncStorage.setItem(ACTIVE_DESTINATION_KEY, JSON.stringify(destination));

  // Update Zustand store
  useDestinationsStore.getState().startTracking(destination.id);

  // Start high-accuracy foreground watch
  foregroundSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: 10, // fire every 10m of movement
      timeInterval: 5000,   // or every 5s
    },
    (location) => {
      const distance = haversineDistance(
        location.coords.latitude,
        location.coords.longitude,
        destination.latitude,
        destination.longitude
      );

      useDestinationsStore.getState().updateTracking({
        destinationId: destination.id,
        currentLat: location.coords.latitude,
        currentLon: location.coords.longitude,
        distanceMeters: distance,
      });

      // Trigger alarm if within perimeter
      if (distance <= destination.perimeter) {
        useDestinationsStore.getState().triggerAlarm(destination.name);
        stopTracking();
      }
    }
  );

  // Attempt to start background tracking (requires development build for full support)
  if (Platform.OS !== 'web') {
    try {
      const bgPermission = await Location.getBackgroundPermissionsAsync();
      if (bgPermission.granted) {
        const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (!isRunning) {
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 30,
            showsBackgroundLocationIndicator: true,
            foregroundService: {
              notificationTitle: 'Wake Me Up — Tracking Active',
              notificationBody: `Heading to ${destination.name}`,
              notificationColor: '#00D4FF',
            },
          });
        }
      }
    } catch {
      // Background location unavailable (e.g., Expo Go) — foreground only
    }
  }
}

export async function stopTracking(): Promise<void> {
  // Clear persisted destination
  await AsyncStorage.removeItem(ACTIVE_DESTINATION_KEY);

  // Stop foreground watcher
  if (foregroundSubscription) {
    foregroundSubscription.remove();
    foregroundSubscription = null;
  }

  // Stop background task
  if (Platform.OS !== 'web') {
    try {
      const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (isRunning) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
    } catch {
      // ignore
    }
  }

  // Update store
  useDestinationsStore.getState().stopTracking();
}
