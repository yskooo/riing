import React from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

import type { MapHandle, MapPickerProps, MapRegion } from './MapPicker';

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a1a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#888888' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#444444' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#888888' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#111111' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a2a' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a1a1a' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a3a3a' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1a1a1a' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#080808' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3a3a3a' }] },
];

// MapView satisfies the MapHandle interface (it has animateToRegion)
export default function MapPicker({
  mapRef,
  initialRegion,
  pin,
  pinColor,
  pinTitle,
  showsUserLocation,
  onPress,
}: MapPickerProps) {
  const nativeRegion: Region | undefined = initialRegion
    ? {
        latitude: initialRegion.latitude,
        longitude: initialRegion.longitude,
        latitudeDelta: initialRegion.latitudeDelta,
        longitudeDelta: initialRegion.longitudeDelta,
      }
    : undefined;

  return (
    <MapView
      ref={mapRef as React.RefObject<MapView | null>}
      style={StyleSheet.absoluteFill}
      initialRegion={nativeRegion}
      onPress={(e) => onPress?.(e.nativeEvent.coordinate)}
      customMapStyle={DARK_MAP_STYLE}
      showsUserLocation={showsUserLocation ?? false}
      showsMyLocationButton={false}
      showsCompass={false}
      toolbarEnabled={false}
    >
      {pin && (
        <Marker
          coordinate={pin}
          pinColor={pinColor}
          title={pinTitle ?? 'Destination'}
        />
      )}
    </MapView>
  );
}

// Re-export types so they can be imported from MapPicker.native too
export type { MapHandle, MapPickerProps, MapRegion };
