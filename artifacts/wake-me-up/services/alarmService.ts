import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

let sound: Audio.Sound | null = null;
let hapticInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the alarm — plays the alarm WAV on loop (even in silent mode)
 * and fires continuous strong haptics.
 */
export async function startAlarm(): Promise<void> {
  if (Platform.OS === 'web') return;

  // Haptics — immediate strong burst, then every 800ms
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  hapticInterval = setInterval(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, 800);

  // Audio — plays even in iOS silent mode
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
    });

    const { sound: s } = await Audio.Sound.createAsync(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../assets/sounds/alarm.wav'),
      { shouldPlay: true, isLooping: true, volume: 1.0 }
    );
    sound = s;
  } catch (e) {
    // Haptics-only fallback if audio fails (e.g. Expo Go simulator)
    console.warn('[Alarm] Audio failed, haptics-only:', e);
  }
}

/**
 * Stop the alarm — clears haptics and unloads audio.
 */
export async function stopAlarm(): Promise<void> {
  if (hapticInterval) {
    clearInterval(hapticInterval);
    hapticInterval = null;
  }

  if (sound) {
    const s = sound;
    sound = null; // null first to prevent double-stop
    try {
      await s.stopAsync();
      await s.unloadAsync();
    } catch {
      // ignore — might already be unloaded
    }
  }
}
