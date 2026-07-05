import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { useColors } from '@/hooks/useColors';
import { PRESET_RINGTONES, PRESET_SOURCES, type RingtoneOption } from '@/constants/ringtones';
import { useDestinationsStore } from '@/store/destinationsStore';
import { previewAlarm } from '@/services/alarmService';
import { type AVPlaybackSource } from 'expo-av';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { selectedRingtone, setRingtone } = useDestinationsStore();
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [pickingFile, setPickingFile] = useState(false);
  const stopPreviewRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    return () => {
      stopPreviewRef.current?.();
    };
  }, []);

  const handlePreview = async (id: string, source: AVPlaybackSource) => {
    await stopPreviewRef.current?.();
    stopPreviewRef.current = null;

    if (previewing === id) {
      setPreviewing(null);
      return;
    }

    setPreviewing(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const stop = await previewAlarm(source);
    stopPreviewRef.current = stop;

    setTimeout(() => {
      setPreviewing((cur) => (cur === id ? null : cur));
      stopPreviewRef.current = null;
    }, 2600);
  };

  const handleSelectPreset = (preset: (typeof PRESET_RINGTONES)[number]) => {
    stopPreviewRef.current?.();
    stopPreviewRef.current = null;
    setPreviewing(null);
    Haptics.selectionAsync();
    setRingtone({
      type: 'preset',
      name: preset.name,
      label: preset.label,
      description: preset.description,
    });
  };

  const handlePickFile = async () => {
    setPickingFile(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true, // creates a local copy that persists until cache is cleared
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      // Store the copied URI directly — expo-av can play file:// and content:// URIs
      setRingtone({ type: 'custom', uri: asset.uri, displayName: asset.name });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Could not pick file', 'Please try again or choose a built-in sound.');
    } finally {
      setPickingFile(false);
    }
  };

  const handleClearCustom = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRingtone({
      type: 'preset',
      name: 'classic',
      label: 'Classic',
      description: 'Two-tone rising alarm',
    });
  };

  const topPad = Platform.OS === 'web' ? 60 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const isPresetSelected = (name: string) =>
    selectedRingtone.type === 'preset' && selectedRingtone.name === name;
  const isCustomSelected = selectedRingtone.type === 'custom';

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Alarm Sound</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Built-in sounds */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>BUILT-IN SOUNDS</Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {PRESET_RINGTONES.map((preset, idx) => {
            const selected = isPresetSelected(preset.name);
            const isPlaying = previewing === preset.name;
            const isLast = idx === PRESET_RINGTONES.length - 1;

            return (
              <React.Fragment key={preset.name}>
                <Pressable
                  onPress={() => handleSelectPreset(preset)}
                  style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <View style={[styles.radioOuter, { borderColor: selected ? '#00D4FF' : colors.border }]}>
                    {selected && <View style={styles.radioInner} />}
                  </View>

                  <View style={styles.rowText}>
                    <Text style={[styles.rowTitle, { color: colors.foreground }]}>{preset.label}</Text>
                    <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{preset.description}</Text>
                  </View>

                  <TouchableOpacity
                    onPress={() =>
                      handlePreview(preset.name, PRESET_SOURCES[preset.name] as AVPlaybackSource)
                    }
                    style={[
                      styles.previewBtn,
                      { backgroundColor: isPlaying ? '#00D4FF20' : colors.secondary },
                    ]}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={isPlaying ? 'stop' : 'play'}
                      size={14}
                      color={isPlaying ? '#00D4FF' : colors.mutedForeground}
                    />
                  </TouchableOpacity>
                </Pressable>

                {!isLast && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              </React.Fragment>
            );
          })}
        </View>

        {/* From device */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 28 }]}>
          FROM YOUR DEVICE
        </Text>

        {isCustomSelected && selectedRingtone.type === 'custom' && (
          <View
            style={[styles.card, { backgroundColor: colors.card, borderColor: '#00D4FF40', marginBottom: 8 }]}
          >
            <View style={styles.row}>
              <View style={[styles.radioOuter, { borderColor: '#00D4FF' }]}>
                <View style={styles.radioInner} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {selectedRingtone.displayName}
                </Text>
                <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>Custom sound</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() =>
                    handlePreview('custom', { uri: selectedRingtone.uri })
                  }
                  style={[
                    styles.previewBtn,
                    { backgroundColor: previewing === 'custom' ? '#00D4FF20' : colors.secondary },
                  ]}
                  hitSlop={8}
                >
                  <Ionicons
                    name={previewing === 'custom' ? 'stop' : 'play'}
                    size={14}
                    color={previewing === 'custom' ? '#00D4FF' : colors.mutedForeground}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleClearCustom}
                  style={[styles.previewBtn, { backgroundColor: colors.secondary }]}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={14} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity
          onPress={handlePickFile}
          disabled={pickingFile}
          style={[styles.pickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          {pickingFile ? (
            <ActivityIndicator color="#00D4FF" />
          ) : (
            <>
              <Ionicons name="folder-open-outline" size={20} color="#00D4FF" />
              <Text style={[styles.pickBtnText, { color: '#00D4FF' }]}>
                {isCustomSelected ? 'Change audio file' : 'Pick audio from device'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Supports MP3, WAV, M4A and other audio formats.{'\n'}
          {Platform.OS === 'ios'
            ? 'Opens Files app — iCloud Drive and On My iPhone both work.'
            : 'Opens your music, downloads, and storage folders.'}
        </Text>

        {/* Info note */}
        <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={colors.mutedForeground}
            style={{ marginTop: 1 }}
          />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            Your selected sound plays when the alarm fires with the app open. Background
            notifications use the system alert sound — install the standalone app build for
            fully custom background alarm sounds.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  scroll: { paddingHorizontal: 20, paddingTop: 24, gap: 8 },
  sectionLabel: {
    fontSize: 11, fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.2, marginBottom: 10,
  },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00D4FF' },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  rowSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  previewBtn: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 48 },
  pickBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 8,
  },
  pickBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  hint: {
    fontSize: 12, fontFamily: 'Inter_400Regular',
    lineHeight: 18, textAlign: 'center', marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row', gap: 10, padding: 14,
    borderRadius: 12, borderWidth: 1, marginTop: 20,
  },
  infoText: {
    flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18,
  },
});
