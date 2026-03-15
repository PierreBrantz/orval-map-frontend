import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  StatusBar,
  Image,
  Linking
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";

import { fetchPlaces, addPlace, updatePlace, uploadImage } from "../api/places";
import { useApiBaseUrl } from "../hooks/useApiBaseUrl";
import { useAuth } from "../context/AuthContext";
import { Place } from "../types/Place";

export default function MapScreen() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  // État pour le formulaire d'ajout/édition
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Partial<Place>>({});
  const [isUploading, setIsUploading] = useState(false);

  // Recherche
  const [searchText, setSearchText] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // On commence sans région définie, on attend la localisation
  const [region, setRegion] = useState<Region | undefined>(undefined);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  const slideAnim = useRef(new Animated.Value(300)).current;

  const { baseUrl } = useApiBaseUrl();
  const { roles, username, logout, isGuest } = useAuth();

  // 🔐 Gestion des Rôles
  const isAdmin = roles.includes("ROLE_ADMIN") || roles.includes("ADMIN");
  const isOwner = roles.includes("ROLE_OWNER") || roles.includes("OWNER");

  // Chargement des lieux
  useEffect(() => {
    if (!baseUrl) return;
    fetchPlaces(baseUrl).then(setPlaces).catch(err => console.error(err));
  }, [baseUrl]);

  // Chargement de la position utilisateur initiale
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission refusée", "La localisation est nécessaire. Affichage par défaut sur Orval.");
          setDefaultRegion();
          return;
        }

        let location = await Location.getLastKnownPositionAsync({});
        if (!location) {
          location = await Location.getCurrentPositionAsync({});
        }

        if (location) {
          setRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          });
        } else {
          setDefaultRegion();
        }
      } catch (e) {
        console.warn("Erreur localisation", e);
        setDefaultRegion();
      } finally {
        setIsLoadingLocation(false);
      }
    })();
  }, []);

  const setDefaultRegion = () => {
    setRegion({
      latitude: 49.6383,
      longitude: 5.3480,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
  };

  // Animation du panneau
  useEffect(() => {
    if (selectedPlace) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedPlace]);

  // 🚀 Fonction de Navigation
  const handleNavigation = (place: Place) => {
    const { lat, lng } = place;
    const url = Platform.select({
      ios: `http://maps.apple.com/?daddr=${lat},${lng}`,
      android: `google.navigation:q=${lat},${lng}`
    });

    if (url) {
      Linking.openURL(url).catch(err => Alert.alert("Erreur", "Impossible de lancer l'application de navigation."));
    }
  };

  // 🔍 Fonction de recherche de ville
  const handleSearchCity = async () => {
    if (!searchText.trim()) return;
    Keyboard.dismiss();
    setIsSearching(true);

    try {
      const geocoded = await Location.geocodeAsync(searchText);

      if (geocoded && geocoded.length > 0) {
        const { latitude, longitude } = geocoded[0];
        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      } else {
        Alert.alert("Introuvable", "Aucune ville trouvée avec ce nom.");
      }
    } catch (error) {
      console.warn(error);
      Alert.alert("Erreur", "Impossible d'effectuer la recherche.");
    } finally {
      setIsSearching(false);
    }
  };

  // 📸 Fonction pour choisir une image
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Désolé', 'Nous avons besoin de la permission pour accéder à vos photos !');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      setEditingPlace(p => ({ ...p, imageUrl: result.assets[0].uri }));
    }
  };

  // 🔐 Helper pour récupérer le nom du propriétaire de manière robuste
  const getOwnerUsername = (place: any) => {
    if (place.ownerUsername) return place.ownerUsername;
    if (place.owner && place.owner.username) return place.owner.username;
    return null;
  };

  // 🔐 Logique de permission d'édition
  const canEdit =
    isAdmin ||
    (isOwner && selectedPlace && getOwnerUsername(selectedPlace) === username);

  const handleSavePlace = async () => {
    if (!baseUrl || !editingPlace.id) {
      Alert.alert("Erreur", "Impossible de sauvegarder sans ID de lieu ou URL de base.");
      return;
    }

    try {
      if (!editingPlace.name || !editingPlace.lat || !editingPlace.lng) {
        Alert.alert("Erreur", "Nom et coordonnées requis");
        return;
      }

      setIsUploading(true);

      let finalImageUrl = editingPlace.imageUrl;
      if (editingPlace.imageUrl && editingPlace.imageUrl.startsWith('file://')) {
        try {
          console.log(`📤 Envoi de l'image pour le lieu ${editingPlace.id}...`);
          finalImageUrl = await uploadImage(baseUrl, editingPlace.id, editingPlace.imageUrl);
          console.log("✅ Image uploadée :", finalImageUrl);
        } catch (uploadError: any) {
          console.error(uploadError);
          Alert.alert("Erreur Upload", "Impossible d'envoyer l'image. Vérifiez votre connexion ou le serveur.");
          setIsUploading(false);
          return;
        }
      }

      const placeToSave = { ...editingPlace, imageUrl: finalImageUrl };

      let saved: Place;
      if (placeToSave.id) {
        saved = await updatePlace(baseUrl, placeToSave as Place);
      } else {
        saved = await addPlace(baseUrl, placeToSave as Omit<Place, "id">);
      }

      setPlaces((prev) =>
        prev.some((p) => p.id === saved.id)
          ? prev.map((p) => (p.id === saved.id ? saved : p))
          : [...prev, saved]
      );

      setIsModalVisible(false);
      setEditingPlace({});
      if (saved.id === selectedPlace?.id) {
        setSelectedPlace(saved);
      }
      Alert.alert("Succès", "Lieu enregistré !");
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Impossible d'enregistrer le lieu");
    } finally {
      setIsUploading(false);
    }
  };

  const openAddModal = () => {
    setEditingPlace({
      lat: region?.latitude || 0,
      lng: region?.longitude || 0,
    });
    setIsModalVisible(true);
  };

  const openEditModal = (place: Place) => {
    setEditingPlace({ ...place });
    setIsModalVisible(true);
  };

  if (isLoadingLocation || !region) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="#ff8c00" />
        <Text style={{ marginTop: 10, color: "#666" }}>Recherche de votre position...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* 🗺️ MAP (Full Screen) */}
      <MapView
        style={StyleSheet.absoluteFill}
        region={region}
        onRegionChangeComplete={setRegion}
        onPress={() => {
          setSelectedPlace(null);
          Keyboard.dismiss();
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        {places.map((p) => {
          const placeOwner = getOwnerUsername(p);
          const isMyPlace = username && placeOwner && String(placeOwner) === String(username);
          const pinColor = isMyPlace ? "green" : "red";

          return (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.lat, longitude: p.lng }}
              pinColor={pinColor}
              onPress={(e) => {
                e.stopPropagation();
                setSelectedPlace(p);
              }}
            />
          );
        })}
      </MapView>

      {/* 🔍 TOP BAR FLOTTANTE */}
      <SafeAreaView style={styles.topContainer} pointerEvents="box-none">
        <View style={styles.searchBarContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une ville..."
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearchCity}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.iconButton} onPress={handleSearchCity} disabled={isSearching}>
            {isSearching ? <ActivityIndicator size="small" color="#ff8c00" /> : <Text style={{fontSize: 18}}>🔍</Text>}
          </TouchableOpacity>
        </View>

        {/* Bouton Logout ou Login si invité */}
        {isGuest ? (
          <TouchableOpacity style={styles.circleButton} onPress={logout}>
            <Text style={{fontSize: 18}}>🔑</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.circleButton} onPress={logout}>
            <Text style={{fontSize: 18}}>🚪</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>

      {/* ➕ FAB AJOUTER (Admin seulement) */}
      {isAdmin && (
        <View style={styles.fabContainer} pointerEvents="box-none">
          <TouchableOpacity style={styles.fabButton} onPress={openAddModal}>
            <Text style={styles.fabText}>➕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 📦 PANNEAU INFOS (Lecture seule) */}
      <Animated.View
        style={[styles.panel, { transform: [{ translateY: slideAnim }] }]}
      >
        {selectedPlace && (
          <>
            {selectedPlace.imageUrl ? (
              <Image
                source={{ uri: selectedPlace.imageUrl }}
                style={styles.placeImage}
                resizeMode="cover"
              />
            ) : null}

            <View style={styles.panelHeader}>
              <Text style={styles.placeTitle}>{selectedPlace.name}</Text>
              <TouchableOpacity onPress={() => setSelectedPlace(null)}>
                <Text style={{ fontSize: 20, color: "#666" }}>✖</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.placeDesc}>{selectedPlace.description || "Pas de description"}</Text>
            <Text style={styles.placeCity}>📍 {selectedPlace.city || "Ville inconnue"}</Text>

            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.navigateBtn}
                onPress={() => handleNavigation(selectedPlace)}
              >
                <Text style={styles.actionBtnText}>🚀 Y Aller</Text>
              </TouchableOpacity>

              {canEdit && (
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => openEditModal(selectedPlace)}
                >
                  <Text style={styles.actionBtnText}>✏️ Modifier</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </Animated.View>

      {/* ✏️ MODAL EDITION (Style Bottom Sheet) */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.modalTitle}>
                {editingPlace.id ? "Modifier le café" : "Ajouter un lieu"}
              </Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Text style={{ fontSize: 20, color: "#999" }}>✖</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              {editingPlace.imageUrl ? (
                <Image
                  source={{ uri: editingPlace.imageUrl }}
                  style={styles.previewImage}
                />
              ) : (
                <View style={styles.placeholderImage}>
                  <Text style={{ color: "#999" }}>Aucune image</Text>
                </View>
              )}

              <TouchableOpacity style={styles.pickImageButton} onPress={pickImage}>
                <Text style={styles.pickImageText}>📷 Choisir une photo</Text>
              </TouchableOpacity>

              <Text style={styles.label}>Nom du café</Text>
              <TextInput
                style={styles.input}
                value={editingPlace.name}
                onChangeText={(t) => setEditingPlace(p => ({ ...p, name: t }))}
                placeholder="Ex: Le BeerLovers"
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={editingPlace.description}
                onChangeText={(t) => setEditingPlace(p => ({ ...p, description: t }))}
                placeholder="Décrivez l'ambiance..."
                multiline
              />

              <Text style={styles.label}>Ville</Text>
              <TextInput
                style={styles.input}
                value={editingPlace.city}
                onChangeText={(t) => setEditingPlace(p => ({ ...p, city: t }))}
                placeholder="Ville"
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 5 }}>
                  <Text style={styles.label}>Latitude</Text>
                  <TextInput
                    style={styles.input}
                    value={String(editingPlace.lat || "")}
                    keyboardType="numeric"
                    onChangeText={(t) => setEditingPlace(p => ({ ...p, lat: parseFloat(t) || 0 }))}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 5 }}>
                  <Text style={styles.label}>Longitude</Text>
                  <TextInput
                    style={styles.input}
                    value={String(editingPlace.lng || "")}
                    keyboardType="numeric"
                    onChangeText={(t) => setEditingPlace(p => ({ ...p, lng: parseFloat(t) || 0 }))}
                  />
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveButton, isUploading && { backgroundColor: "#ccc" }]}
              onPress={handleSavePlace}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.saveButtonText}>💾 Enregistrer les modifications</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  // TOP BAR
  topContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    zIndex: 10,
    alignItems: "flex-start",
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 30,
    padding: 5,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 16,
    color: "#333",
  },
  iconButton: {
    padding: 10,
    borderRadius: 20,
  },
  circleButton: {
    width: 45,
    height: 45,
    borderRadius: 25,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },

  // FAB
  fabContainer: {
    position: "absolute",
    bottom: 220,
    right: 20,
    zIndex: 10,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ff8c00",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  fabText: {
    fontSize: 24,
    color: "white",
  },

  // PANEL INFO
  panel: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "white",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 10,
    zIndex: 20,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  placeImage: {
    width: "100%",
    height: 150,
    borderRadius: 10,
    marginBottom: 15,
  },
  placeTitle: { fontSize: 22, fontWeight: "bold", color: "#333" },
  placeDesc: { fontSize: 16, color: "#666", marginBottom: 5 },
  placeCity: { fontSize: 14, color: "#999", fontStyle: "italic", marginBottom: 10 },

  actionsContainer: {
    flexDirection: "row",
    marginTop: 15,
  },
  navigateBtn: {
    flex: 1,
    backgroundColor: "#ff8c00",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  editBtn: {
    flex: 1,
    backgroundColor: "#666",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginLeft: 10,
  },
  actionBtnText: {
    color: "white",
    fontWeight: "bold",
  },

  // BOTTOM SHEET MODAL
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  bottomSheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 10,
  },
  bottomSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ff8c00",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 5,
    color: "#333",
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  row: { flexDirection: "row" },
  previewImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#eee",
  },
  placeholderImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
  },
  pickImageButton: {
    backgroundColor: "#eee",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
  },
  pickImageText: {
    color: "#333",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#ff8c00",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
