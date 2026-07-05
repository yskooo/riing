import { Audio, type AVPlaybackSource } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { PRESET_SOURCES } from '@/constants/ringtones';
import { useDestinationsStore } from '@/store/destinationsStore';

let sound: Audio.Sound | null = null;
let hapticInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Resolve the audio source from the store's selected ringtone.
 * Metro requires static requires — dynamic requires are not allowed,
 * so preset sources are pre-resolved in constants/ringtones.ts.
 */
function getAudioSource(): AVPlaybackSource {
  const ringtone = useDestinationsStore.getState().selectedRingtone;
  if (ringtone.type === 'custom') {
    return { uri: ringtone.uri };
  }
  return (PRESET_SOURCES[ringtone.name] ?? PRESET_SOURCES.classic) as AVPlaybackSource;
}

/**
 * Start the alarm:
 * - Plays the user-selected alarm sound on loop (even in iOS silent mode)
 * - Fires continuous strong haptics every 800ms
 */
export async function startAlarm(): Promise<void> {
  if (Platform.OS === 'web') return;

  // Haptics — immediate burst then repeat
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  hapticInterval = setInterval(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, 800);

  // Audio — bypass silent mode on iOS
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
    });

    const source = getAudioSource();
    const { sound: s } = await Audio.Sound.createAsync(source, {
      shouldPlay: true,
      isLooping: true,
      volume: 1.0,
    }).catch(async (e) => {
      // Custom URI may be stale (cache evicted) — fall back to preset classic
      console.warn('[Alarm] Primary source failed, falling back to classic:', e);
      return Audio.Sound.createAsync(PRESET_SOURCES.classic as AVPlaybackSource, {
        shouldPlay: true,
        isLooping: true,
        volume: 1.0,
      });
    });
    sound = s;
  } catch (e) {
    // Haptics-only fallback if all audio fails (e.g. restricted environment)
    console.warn('[Alarm] Audio failed, haptics-only:', e);
  }
}

/**
 * Preview a sound briefly (2.5 s) without haptics — used in settings.
 * Returns a cleanup function that stops the preview.
 */
export async function previewAlarm(
  source: AVPlaybackSource
): Promise<() => Promise<void>> {
  if (Platform.OS === 'web') return async () => {};

  let previewSound: Audio.Sound | null = null;
  const timer = setTimeout(() => stopPreview(), 2500);

  async function stopPreview() {
    clearTimeout(timer);
    if (previewSound) {
      const s = previewSound;
      previewSound = null;
      try { await s.stopAsync(); await s.unloadAsync(); } catch { /* ignore */ }
    }
  }

  try {
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
    const { sound: s } = await Audio.Sound.createAsync(source, { shouldPlay: true, volume: 1.0 });
    previewSound = s;
  } catch (e) {
    console.warn('[Alarm] Preview failed:', e);
  }

  return stopPreview;
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
    sound = null;
    try {
      await s.stopAsync();
      await s.unloadAsync();
    } catch {
      // already unloaded
    }
  }
}
