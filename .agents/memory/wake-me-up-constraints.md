---
name: Wake Me Up — key constraints
description: Pinned package versions, API quirks, and architectural decisions for the Wake Me Up Expo app
---

## react-native-maps
- Pinned to `1.18.0` — only version compatible with Expo Go on SDK 54
- Do NOT add to `app.json` plugins
- Metro uses platform-specific files: `MapPicker.native.tsx` / `MapPicker.tsx`, `RouteMap.native.tsx` / `RouteMap.tsx`

## expo-av
- v16 installed (legacy `Audio.Sound` API)
- Expected deprecation warning is safe — expo-av v16 is the correct SDK 54 version
- Cannot use hooks in non-React services; use `Audio.Sound.createAsync` directly in `alarmService.ts`
- `playsInSilentModeIOS: true` is required to bypass iOS silent mode

## expo-file-system
- v19 dropped `documentDirectory` from the main TypeScript export
- Do NOT import `FileSystem.documentDirectory` — causes TS error
- For custom ringtone persistence: use `DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true })` and store the returned URI
- Cache URIs can be evicted by OS — `alarmService.ts` has a fallback to `classic` preset if the custom URI fails

## expo-document-picker
- v14 for SDK 54 (was wrongly installed as v57 — fixed via `pnpm exec expo install`)
- Result shape: `{ canceled: boolean, assets: Array<{ uri, name, size, ... }> }`

## Notification channel (Android)
- Channel ID `wake-me-up-alarm` created in `app/_layout.tsx` via `Notifications.setNotificationChannelAsync`
- Channel config: `MAX` importance, `bypassDnd: true`, strong vibration pattern
- Notifications MUST specify `{ channelId: ALARM_CHANNEL_ID }` as trigger on Android (done in `locationTask.ts`)
- On iOS: use `trigger: null` (immediate fire, no channel concept)

## Navigation deep links
- iOS: `maps://?daddr=lat,lon` (canonical Apple Maps URL) with Google Maps web fallback
- Android: `google.navigation:q=lat,lon&mode=r` (Google Maps app) with Google Maps web fallback

## OSRM routing
- Free, no API key: `router.project-osrm.org/route/v1/driving`
- 10s timeout with straight-line fallback
- `?overview=full&geometries=geojson&steps=true` for road-following polyline + step count
- Abort controller cleans up on component unmount and when userLocation changes

## Store shape
- `selectedRingtone: RingtoneOption` persisted via AsyncStorage (in `partialize`)
- Type: `PresetRingtone | CustomRingtone` — defined in `constants/ringtones.ts`
- `PRESET_SOURCES` typed as `Record<RingtonePreset, number>` (Metro `require()` returns numbers in RN)

## Background task
- Task name: `wake-me-up-background-location`
- Active destination stored in AsyncStorage key `wake-me-up-active-destination`
- Task self-terminates after alarm fires (removes key + stops location updates)
