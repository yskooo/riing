import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { haversineDistance } from '@/utils/distance';

export const LOCATION_TASK_NAME = 'wake-me-up-background-location';
export const ACTIVE_DESTINATION_KEY = 'wake-me-up-active-destination';

export interface StoredDestination {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  perimeter: number;
}

type TaskData = {
  locations: Location.LocationObject[];
};

type TaskError = {
  message: string;
};

TaskManager.defineTask(
  LOCATION_TASK_NAME,
  async ({
    data,
    error,
  }: {
    data: TaskData;
    error: TaskError | null;
  }) => {
    if (error) {
      console.error('[LocationTask] Error:', error.message);
      return;
    }

    if (!data?.locations?.length) return;

    const location = data.locations[0];
    if (!location) return;

    try {
      const raw = await AsyncStorage.getItem(ACTIVE_DESTINATION_KEY);
      if (!raw) return;

      const dest: StoredDestination = JSON.parse(raw);
      const distance = haversineDistance(
        location.coords.latitude,
        location.coords.longitude,
        dest.latitude,
        dest.longitude
      );

      if (distance <= dest.perimeter) {
        // Schedule alarm notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Wake up! Arriving at ${dest.name}`,
            body: `You are ${Math.round(distance)}m from your stop. Get ready!`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
            data: {
              alarm: true,
              destinationId: dest.id,
              destinationName: dest.name,
            },
          },
          trigger: null,
        });

        // Remove active destination to prevent repeat alarms
        await AsyncStorage.removeItem(ACTIVE_DESTINATION_KEY);

        // Stop background location updates — alarm has fired, no need to continue
        try {
          const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
          if (isRunning) {
            await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
          }
        } catch {
          // ignore if already stopped
        }
      }
    } catch (e) {
      console.error('[LocationTask] Failed to process location:', e);
    }
  }
);
