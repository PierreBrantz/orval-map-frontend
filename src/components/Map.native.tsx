// src/components/Map.native.tsx
import React from "react";
import MapView, { MapPressEvent, Marker, Region } from "react-native-maps";
import { StyleSheet } from "react-native";
import { Place } from "../types/Place";

export interface MapProps {
  region: Region;
  onRegionChangeComplete: (region: Region) => void;
  places: Place[];
  onMapPress: (event: MapPressEvent) => void;
  onMarkerPress: (place: Place) => void;
  isThisMyPlace?: (place: Place) => boolean;
  isPlaceVisited: (place: Place) => boolean;
}

// Ce composant reçoit toutes les props nécessaires depuis MapScreen
export default function Map({ region, onRegionChangeComplete, places, onMapPress, onMarkerPress, isPlaceVisited }: MapProps) {
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
