import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, Circle } from 'react-native-maps';

import type { RouteMapProps, RouteCoord } from './RouteMap';

// Same dark style used in the add screen
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

const PRIMARY = '#00D4FF';
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

async function fetchOsrmRoute(from: RouteCoord, to: RouteCoord): Promise<{
  coords: RouteCoord[];
  durationMin: number;
  distanceKm: number;
} | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const url = `${OSRM_BASE}/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: controller.signal });
    const data = await res.json();
    clearTimeout(timeout);

    if (!data.routes?.[0]) return null;

    const route = data.routes[0];
    const coords: RouteCoord[] = (route.geometry.coordinates as [number, number][]).map(
      ([lon, lat]) => ({ latitude: lat, longitude: lon })
    );
    const durationMin = Math.round(route.duration / 60);
    const distanceKm = parseFloat((route.distance / 1000).toFixed(1));
    return { coords, durationMin, distanceKm };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

export default function RouteMap({ destination, userLocation, onRouteFetched }: RouteMapProps) {
  const mapRef = useRef<MapView | null>(null);
  const [routeCoords, setRouteCoords] = useState<RouteCoord[]>([]);
  const [loading, setLoading] = useState(false);
  const didFit = useRef(false);

  const fitMap = (user?: RouteCoord | null) => {
    const points: RouteCoord[] = [
      { latitude: destination.latitude, longitude: destination.longitude },
    ];
    if (user) points.push(user);
    if (points.length === 1) {
      mapRef.current?.animateToRegion({
        latitude: destination.latitude,
        longitude: destination.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 600);
    } else {
      mapRef.current?.fitToCoordinates(points, {
        edgePadding: { top: 120, right: 60, bottom: 260, left: 60 },
        animated: true,
      });
    }
  };

  useEffect(() => {
    if (!userLocation) {
      // No user location yet — just center on destination
      setTimeout(() => {
        if (!didFit.current) {
          fitMap(null);
          didFit.current = true;
        }
      }, 400);
      return;
    }

    didFit.current = true;
    setLoading(true);

    fetchOsrmRoute(userLocation, {
      latitude: destination.latitude,
      longitude: destination.longitude,
    }).then((result) => {
      setLoading(false);
      if (result) {
        setRouteCoords(result.coords);
        onRouteFetched?.(result.durationMin, result.distanceKm);
      } else {
        // Straight-line fallback
        setRouteCoords([
          userLocation,
          { latitude: destination.latitude, longitude: destination.longitude },
        ]);
      }
      fitMap(userLocation);
    });
  }, [userLocation?.latitude, userLocation?.longitude]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        customMapStyle={DARK_MAP_STYLE}
        initialRegion={{
          latitude: destination.latitude,
          longitude: destination.longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
        showsUserLocation={!!userLocation}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        onMapReady={() => {
          if (!didFit.current) {
            fitMap(userLocation);
            didFit.current = true;
          }
        }}
      >
        {/* Route polyline — outer glow then solid line */}
        {routeCoords.length > 1 && (
          <>
            <Polyline
              coordinates={routeCoords}
              strokeColor={PRIMARY + '40'}
              strokeWidth={10}
              lineCap="round"
              lineJoin="round"
            />
            <Polyline
              coordinates={routeCoords}
              strokeColor={PRIMARY}
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
            />
          </>
        )}

        {/* Perimeter circle around destination */}
        <Circle
          center={{ latitude: destination.latitude, longitude: destination.longitude }}
          radius={destination.perimeter}
          fillColor={PRIMARY + '12'}
          strokeColor={PRIMARY + '60'}
          strokeWidth={1.5}
        />

        {/* Destination pin */}
        <Marker
          coordinate={{ latitude: destination.latitude, longitude: destination.longitude }}
          anchor={{ x: 0.5, y: 1 }}
          title={destination.name}
        >
          <View style={styles.pin}>
            <View style={styles.pinInner} />
          </View>
        </Marker>
      </MapView>

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator color={PRIMARY} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PRIMARY + '30',
    borderWidth: 2,
    borderColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PRIMARY,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export type { RouteMapProps, RouteCoord };
