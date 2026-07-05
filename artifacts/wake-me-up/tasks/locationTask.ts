import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { haversineDistance } from '@/utils/distance';

export const LOCATION_TASK_NAME = 'wake-me-up-background-location';
export const ACTIVE_DESTINATION_KEY = 'wake-me-up-active-destination';

/** Android notification channel ID for alarms (must match _layout.tsx setup) */
export const ALARM_CHANNEL_ID = 'wake-me-up-alarm';

export interface StoredDestination {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  perimeter: number;
}

type TaskData = { locations: Location.LocationObject[] };
type TaskError = { message: string };

TaskManager.defineTask(
  LOCATION_TASK_NAME,
  async ({ data, error }: { data: TaskData; error: TaskError | null }) => {
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
        // Fire the alarm notification — max priority, uses the alarm channel on Android
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `⏰ Wake up! Arriving at ${dest.name}`,
            body: `You're within ${Math.round(distance)}m of your stop — time to get ready!`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
            data: { alarm: true, destinationId: dest.id, destinationName: dest.name },
          },
          // On Android, bind to the alarm channel (MAX importance + bypassDnd).
          // On iOS, trigger: null fires immediately with the native alert sound.
          trigger: Platform.OS === 'android'
            ? ({ channelId: ALARM_CHANNEL_ID } as Notifications.NotificationTriggerInput)
            : null,
        });

        // Clear the active destination so the task doesn't re-trigger
        await AsyncStorage.removeItem(ACTIVE_DESTINATION_KEY);

        // Stop background location updates — alarm fired, no need to continue
        try {
          const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
          if (running) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        } catch { /* already stopped */ }
      }
    } catch (e) {
      console.error('[LocationTask] Failed to process location:', e);
    }
  }
);
