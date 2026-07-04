# Wake Me Up

A location-based alarm app for commuters — wakes you up (via alarm and vibration) when you're within a set distance of your destination, so you never miss your stop.

## Run & Operate

- `pnpm --filter @workspace/wake-me-up run dev` — run the Expo dev server
- Scan the QR code in the URL bar with **Expo Go** to test on your phone
- `pnpm --filter @workspace/api-server run dev` — run the Express API server (port 5000)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **Mobile:** Expo SDK 54, Expo Router (file-based routing), React Native 0.81
- **State:** Zustand (with AsyncStorage persist middleware)
- **Maps:** react-native-maps 1.18.0 (pinned — only version working in Expo Go)
- **Location:** expo-location (foreground + background tracking)
- **Notifications:** expo-notifications (alarm trigger)
- **Background tasks:** expo-task-manager

## Where things live

- `artifacts/wake-me-up/` — the mobile app
  - `app/(tabs)/index.tsx` — Home screen (destinations list + tracking status)
  - `app/add.tsx` — Add destination (map pin drop + name/perimeter config)
  - `app/alarm.tsx` — Full-screen alarm UI
  - `store/destinationsStore.ts` — Zustand store (persisted via AsyncStorage)
  - `tasks/locationTask.ts` — Background location task
  - `services/trackingService.ts` — Start/stop foreground + background tracking
  - `services/alarmService.ts` — Haptic alarm (continuous vibration pattern)
  - `components/MapPicker.tsx` — Web fallback for map (TypeScript resolution)
  - `components/MapPicker.native.tsx` — Native map (react-native-maps)
  - `constants/colors.ts` — OLED dark + light theme tokens
- `artifacts/api-server/` — Express API server (health check, ready for extension)

## Architecture decisions

- **Zustand + AsyncStorage persist** for destinations — simpler than a full backend DB for a single-user alarm app.
- **Platform-specific files** (`MapPicker.native.tsx` / `MapPicker.tsx`) for react-native-maps to prevent web bundler failures (maps imports native-only modules).
- **Foreground + background tracking** — foreground uses `watchPositionAsync`, background uses `startLocationUpdatesAsync` with a TaskManager task. Background requires a development build for full support.
- **Background task self-terminates** after alarm fires — removes the AsyncStorage key and stops location updates, preventing repeat alarms and battery drain.
- **No backend in v1** — all data is local (AsyncStorage). A backend can be added later for cloud sync or shared alarms.

## Product

- Home screen: saved destinations list with live tracking status + real-time distance
- Add destination: full-screen dark map (tap to pin), geocoding search, perimeter presets (300m/500m/1km/2km)
- Alarm screen: full-screen OLED black with pulsing cyan rings, haptic alarm, one-tap dismiss
- Dark OLED theme (true black) with electric cyan (#00D4FF) accent — optimized for midnight use

## User preferences

_Populate as you build._

## Gotchas

- `react-native-maps` must be pinned to **exactly 1.18.0** — other versions crash in Expo Go.
- Do NOT add `react-native-maps` to the `plugins` array in `app.json` — it will crash.
- Background location tracking requires a **development build** — it does not fully work in Expo Go. Foreground tracking works in Expo Go.
- Background task (`wake-me-up-background-location`) must be imported in `_layout.tsx` at module level to register before use.
- The `MapPicker.tsx` file exists for TypeScript resolution only. Metro uses `MapPicker.native.tsx` on native and `MapPicker.web.tsx` on web at runtime.
