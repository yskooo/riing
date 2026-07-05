export type RingtonePreset = 'classic' | 'pulse' | 'beacon';

export interface PresetRingtone {
  type: 'preset';
  name: RingtonePreset;
  label: string;
  description: string;
}

export interface CustomRingtone {
  type: 'custom';
  uri: string;
  displayName: string;
}

export type RingtoneOption = PresetRingtone | CustomRingtone;

export const PRESET_RINGTONES: PresetRingtone[] = [
  {
    type: 'preset',
    name: 'classic',
    label: 'Classic',
    description: 'Two-tone rising alarm',
  },
  {
    type: 'preset',
    name: 'pulse',
    label: 'Pulse',
    description: 'Rapid urgent beeps',
  },
  {
    type: 'preset',
    name: 'beacon',
    label: 'Beacon',
    description: 'Slow sonar ping',
  },
];

export const DEFAULT_RINGTONE: PresetRingtone = PRESET_RINGTONES[0];

/**
 * Metro requires static requires — no dynamic imports for audio assets.
 * require() returns a number (asset ID) in React Native — valid as AVPlaybackSource.
 */
export const PRESET_SOURCES: Record<RingtonePreset, number> = {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  classic: require('../assets/sounds/alarm.wav') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  pulse: require('../assets/sounds/alarm-pulse.wav') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  beacon: require('../assets/sounds/alarm-beacon.wav') as number,
};
