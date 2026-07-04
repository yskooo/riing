import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { router } from 'expo-router';

import { useColors } from '@/hooks/useColors';
import { useDestinationsStore } from '@/store/destinationsStore';
import MapPicker, { type MapHandle, type MapRegion, type PinCoord } from '@/components/MapPicker';

const PERIMETER_PRESETS = [
  { label: '300 m', value: 300 },
  { label: '500 m', value: 500 },
  { label: '1 km', value: 1000 },
  { label: '2 km', value: 2000 },
];

const DEFAULT_REGION: MapRegion = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function AddScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const addDestination = useDestinationsStore((s) => s.addDestination);

  const mapRef = useRef<MapHandle | null>(null);
  const [region, setRegion] = useState<MapRegion>(DEFAULT_REGION);
  const [pin, setPin] = useState<PinCoord | null>(null);
  const [name, setName] = useState('');
  const [perimeter, setPerimeter] = useState(500);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locationLoaded, setLocationLoaded] = useState(false);

  // Try to center map on user's current location
  useEffect(() => {
    if (Platform.OS === 'web') {
      setLocationLoaded(true);
      return;
    }
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const userRegion: Region = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          };
          setRegion(userRegion);
          mapRef.current?.animateToRegion?.(userRegion, 600);
        }
      } catch {
        // Use default region
      } finally {
        setLocationLoaded(true);
      }
    })();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await Location.geocodeAsync(searchQuery.trim());
      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        const newRegion: Region = {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setRegion(newRegion);
        setPin({ latitude, longitude });
        mapRef.current?.animateToRegion?.(newRegion, 600);
        if (!name) {
          setName(searchQuery.trim());
        }
      } else {
        Alert.alert('Not found', 'Could not find that location. Try a different search.');
      }
    } catch {
      Alert.alert('Error', 'Search failed. Please check your connection and try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleMapPress = (coord: PinCoord) => {
    setPin(coord);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a name for this destination.');
      return;
    }
    if (!pin) {
      Alert.alert('Pin required', 'Tap on the map to mark your destination.');
      return;
    }

    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    addDestination({
      name: name.trim(),
      latitude: pin.latitude,
      longitude: pin.longitude,
      perimeter,
    });

    router.back();
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      {/* Full-screen map (native only via platform files) */}
      <MapPicker
        mapRef={mapRef}
        initialRegion={region}
        pin={pin}
        pinColor={colors.primary}
        pinTitle={name || 'Destination'}
        showsUserLocation={locationLoaded}
        onPress={handleMapPress}
      />

      {/* Search bar overlay */}
      <View style={[styles.searchBar, { top: topPad + 12, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>

        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          placeholder="Search for a place…"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
          returnKeyType="search"
        />

        {searching ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <TouchableOpacity onPress={handleSearch} hitSlop={8}>
            <Ionicons name="search" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tap hint */}
      {!pin && Platform.OS !== 'web' && (
        <View style={[styles.hintBubble, { backgroundColor: colors.card + 'E0' }]}>
          <Ionicons name="hand-left-outline" size={14} color={colors.mutedForeground} />
          <Text style={[styles.hintText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Tap map to drop a pin
          </Text>
        </View>
      )}

      {/* Bottom panel */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.panelContainer}
      >
        <View
          style={[
            styles.panel,
            {
              backgroundColor: colors.card,
              paddingBottom: bottomPad + 16,
            },
          ]}
        >
          {/* Name input */}
          <View style={[styles.inputRow, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <Ionicons name="bookmark-outline" size={18} color={colors.mutedForeground} />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Destination name"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.textInput, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
              returnKeyType="done"
            />
          </View>

          {/* Perimeter label */}
          <View>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              Wake-up distance
            </Text>
            <Text style={[styles.perimeterHint, { color: colors.mutedForeground }]}>
              500 m recommended — enough time to prepare
            </Text>
          </View>

          {/* Perimeter presets */}
          <View style={styles.presets}>
            {PERIMETER_PRESETS.map((preset) => (
              <Pressable
                key={preset.value}
                onPress={() => {
                  setPerimeter(preset.value);
                  Haptics.selectionAsync();
                }}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor:
                      perimeter === preset.value ? colors.primary : colors.secondary,
                    borderColor:
                      perimeter === preset.value ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.presetText,
                    {
                      color:
                        perimeter === preset.value
                          ? colors.primaryForeground
                          : colors.foreground,
                      fontFamily:
                        perimeter === preset.value ? 'Inter_600SemiBold' : 'Inter_400Regular',
                    },
                  ]}
                >
                  {preset.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Save button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || !pin || !name.trim()}
            style={[
              styles.saveBtn,
              {
                backgroundColor: pin && name.trim() ? colors.primary : colors.secondary,
                opacity: saving ? 0.7 : 1,
              },
            ]}
          >
            {saving ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={pin && name.trim() ? colors.primaryForeground : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.saveBtnText,
                    {
                      color:
                        pin && name.trim() ? colors.primaryForeground : colors.mutedForeground,
                    },
                  ]}
                >
                  Save Destination
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  backBtn: {
    padding: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: 22,
    padding: 0,
  },
  hintBubble: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  hintText: {
    fontSize: 13,
  },
  panelContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  panel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingTop: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
    height: 22,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  perimeterHint: {
    fontSize: 12,
    marginTop: 2,
  },
  presets: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 14,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 30,
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});
