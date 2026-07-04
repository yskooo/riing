import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

let hapticInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the alarm — continuous strong haptics while the alarm is active.
 * On iOS/Android, this fires a series of impact + notification patterns.
 */
export function startAlarm(): void {
  if (Platform.OS === 'web') return;

  // Initial strong burst
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

  hapticInterval = setInterval(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, 800);
}

/**
 * Stop the alarm and cancel any scheduled haptics.
 */
export function stopAlarm(): void {
  if (hapticInterval) {
    clearInterval(hapticInterval);
    hapticInterval = null;
  }
}
