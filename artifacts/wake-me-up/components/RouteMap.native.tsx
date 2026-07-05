import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker, Polyline } from 'react-native-maps';

import type { RouteCoord, RouteMapProps } from './RouteMap';

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

async function fetchRoute(
  from: RouteCoord,
  to: RouteCoord,
  signal: AbortSignal
): Promise<{ coords: RouteCoord[]; durationMin: number; distanceKm: number; steps: number } | null> {
  const url = [
    'https://router.project-osrm.org/route/v1/driving',
    `/${from.longitude},${from.latitude}`,
    `;${to.longitude},${to.latitude}`,
    '?overview=full&geometries=geojson&steps=true',
  ].join('');

  const res = await fetch(url, { signal });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    code: string;
    routes?: Array<{
      geometry: { coordinates: [number, number][] };
      distance: number;
      duration: number;
      legs: Array<{ steps: unknown[] }>;
    }>;
  };

  if (data.code !== 'Ok' || !data.routes?.[0]) return null;

  const route = data.routes[0];
  const coords: RouteCoord[] = route.geometry.coordinates.map(([lon, lat]) => ({
    latitude: lat,
    longitude: lon,
  }));
  const durationMin = Math.round(route.duration / 60);
  const distanceKm = parseFloat((route.distance / 1000).toFixed(1));
  const steps = route.legs.reduce((n, leg) => n + leg.steps.length, 0);

  return { coords, durationMin, distanceKm, steps };
}

export default function RouteMap({ destination, userLocation, onRouteFetched }: RouteMapProps) {
  const mapRef = useRef<MapView | null>(null);
  const [routeCoords, setRouteCoords] = useState<RouteCoord[]>([]);
  const [loading, setLoading] = useState(false);
  const didFit = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const fitMap = (user?: RouteCoord | null) => {
    const dest = { latitude: destination.latitude, longitude: destination.longitude };
    if (!user) {
      mapRef.current?.animateToRegion({
        ...dest, latitudeDelta: 0.025, longitudeDelta: 0.025,
      }, 600);
    } else {
      mapRef.current?.fitToCoordinates([dest, user], {
        edgePadding: { top: 130, right: 60, bottom: 270, left: 60 },
        animated: true,
      });
    }
  };

  useEffect(() => {
    if (!userLocation) {
      if (!didFit.current) {
        setTimeout(() => { fitMap(null); didFit.current = true; }, 400);
      }
      return;
    }

    // Cancel any in-flight fetch
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    didFit.current = true;
    setLoading(true);

    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    fetchRoute(userLocation, { latitude: destination.latitude, longitude: destination.longitude }, controller.signal)
      .then((result) => {
        clearTimeout(timeoutId);
        if (controller.signal.aborted) return;

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
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        if (controller.signal.aborted) return;
        // Straight-line fallback on any error
        setRouteCoords([
          userLocation,
          { latitude: destination.latitude, longitude: destination.longitude },
        ]);
        fitMap(userLocation);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
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
        {/* Glow + solid route polyline */}
        {routeCoords.length > 1 && (
          <>
            <Polyline
              coordinates={routeCoords}
              strokeColor={PRIMARY + '30'}
              strokeWidth={12}
              lineCap="round"
              lineJoin="round"
            />
            <Polyline
              coordinates={routeCoords}
              strokeColor={PRIMARY + '80'}
              strokeWidth={6}
              lineCap="round"
              lineJoin="round"
            />
            <Polyline
              coordinates={routeCoords}
              strokeColor={PRIMARY}
              strokeWidth={3}
              lineCap="round"
              lineJoin="round"
            />
          </>
        )}

        {/* Wake-up perimeter circle */}
        <Circle
          center={{ latitude: destination.latitude, longitude: destination.longitude }}
          radius={destination.perimeter}
          fillColor={PRIMARY + '15'}
          strokeColor={PRIMARY + '70'}
          strokeWidth={1.5}
        />

        {/* Destination marker */}
        <Marker
          coordinate={{ latitude: destination.latitude, longitude: destination.longitude }}
          anchor={{ x: 0.5, y: 0.5 }}
          title={destination.name}
        >
          <View style={styles.pin}>
            <View style={styles.pinInner} />
          </View>
        </Marker>
      </MapView>

      {loading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator color={PRIMARY} size="small" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: PRIMARY + '30', borderWidth: 2, borderColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
  },
  pinInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: PRIMARY },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
});

export type { RouteCoord, RouteMapProps };
