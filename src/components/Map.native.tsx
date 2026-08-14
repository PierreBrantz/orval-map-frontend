// src/components/Map.native.tsx
import React from "react";
import MapView, { Marker } from "react-native-maps";
import { StyleSheet } from "react-native";

// Ce composant reçoit toutes les props nécessaires depuis MapScreen
export default function Map({ region, onRegionChangeComplete, places, onMapPress, onMarkerPress, isPlaceVisited }) {
  return (
    <MapView
      style={StyleSheet.absoluteFill}
      region={region}
      onRegionChangeComplete={onRegionChangeComplete}
      onPress={onMapPress}
      showsUserLocation
      showsMyLocationButton={false}
      toolbarEnabled={false}
    >
      {places.map((p) => (
        <Marker
          key={p.id}
          coordinate={{ latitude: p.lat, longitude: p.lng }}
          pinColor={isPlaceVisited(p) ? "green" : "red"} // Correction: Utilise la fonction isPlaceVisited
          onPress={(e) => {
            e.stopPropagation();
            onMarkerPress(p);
          }}
        />
      ))}
    </MapView>
  );
}
