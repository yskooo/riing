---
name: Wake Me Up — key constraints
description: Non-obvious decisions and gotchas for the Wake Me Up alarm app
---

## react-native-maps
- Must stay pinned at **1.18.0** — other versions crash Expo Go.
- Do NOT add to `plugins` array in app.json (will crash).
- Web bundler fails if react-native-maps is imported directly; use platform files: `MapPicker.native.tsx` (native), `MapPicker.tsx` (web default). Same pattern for `RouteMap`.

**Why:** react-native-maps imports `codegenNativeCommands` which is native-only; Metro web bundler rejects it.

## expo-av
- expo-av v16 (SDK 54) is deprecated and shows a console warning. The `Audio.Sound` legacy API still works.
- Set `playsInSilentModeIOS: true` in `Audio.setAudioModeAsync` so alarm fires in iOS silent mode.
- The alarm WAV is at `assets/sounds/alarm.wav` — generated with Node.js (Python unavailable on Nix).

**Why:** Audio must play even when phone is silenced for a reliable alarm.

## Platform-specific component files
- TypeScript resolves the base file (no platform suffix). Metro resolves `.native.tsx` on native, `.tsx` on web.
- Pattern: `Component.tsx` (web stub + TypeScript types), `Component.native.tsx` (native implementation that imports types from the base file).

## Background location
- Background tracking requires a dev build; foreground works in Expo Go.
- Background task (`wake-me-up-background-location`) must be imported at module level in `_layout.tsx`.
- When alarm fires in background task: remove AsyncStorage key AND stop location updates to prevent battery drain + repeat alarms.

## Navigation
- Destination detail screen: `app/destination/[id].tsx` — uses OSRM free routing API for route polyline.
- OSRM endpoint: `https://router.project-osrm.org/route/v1/driving/{lon},{lat};{lon},{lat}?overview=full&geometries=geojson`
- OSRM returns `[longitude, latitude]` pairs — must swap to `{latitude, longitude}` for react-native-maps.
- 6-second timeout on OSRM fetch; falls back to straight-line polyline.
