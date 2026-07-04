import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface Destination {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  perimeter: number; // meters
}

export interface TrackingInfo {
  destinationId: string;
  currentLat: number;
  currentLon: number;
  distanceMeters: number;
}

interface DestinationsState {
  destinations: Destination[];
  activeTracking: TrackingInfo | null;
  alarmTriggered: boolean;
  alarmDestinationName: string | null;
  // Actions
  addDestination: (d: Omit<Destination, 'id'>) => void;
  removeDestination: (id: string) => void;
  startTracking: (id: string) => void;
  stopTracking: () => void;
  updateTracking: (info: TrackingInfo) => void;
  triggerAlarm: (name: string) => void;
  dismissAlarm: () => void;
}

export const useDestinationsStore = create<DestinationsState>()(
  persist(
    (set, get) => ({
      destinations: [],
      activeTracking: null,
      alarmTriggered: false,
      alarmDestinationName: null,

      addDestination: (d) =>
        set((state) => ({
          destinations: [
            ...state.destinations,
            {
              ...d,
              id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
            },
          ],
        })),

      removeDestination: (id) =>
        set((state) => ({
          destinations: state.destinations.filter((d) => d.id !== id),
          activeTracking:
            state.activeTracking?.destinationId === id
              ? null
              : state.activeTracking,
        })),

      startTracking: (id) =>
        set({
          activeTracking: {
            destinationId: id,
            currentLat: 0,
            currentLon: 0,
            distanceMeters: Infinity,
          },
        }),

      stopTracking: () => set({ activeTracking: null }),

      updateTracking: (info) => set({ activeTracking: info }),

      triggerAlarm: (name) =>
        set({ alarmTriggered: true, alarmDestinationName: name }),

      dismissAlarm: () =>
        set({
          alarmTriggered: false,
          alarmDestinationName: null,
          activeTracking: null,
        }),
    }),
    {
      name: 'wake-me-up-destinations',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist destinations list, not runtime tracking state
      partialize: (state) => ({ destinations: state.destinations }),
    }
  )
);
