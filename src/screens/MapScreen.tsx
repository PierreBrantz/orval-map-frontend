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
  Linking,
  FlatList
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

import { fetchPlaces, updatePlace, uploadPlaceImage, uploadRequestImage, suggestPlace, fetchPlaceRequests, validatePlaceRequest, verifyPlace } from "../api/places"; // ✅ Import verifyPlace
import { useApiBaseUrl } from "../hooks/useApiBaseUrl";
import { useAuth } from "../context/AuthContext";
import { Place, PlaceRequest } from "../types/Place";

export default function MapScreen() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  // Modals
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAdminPanelVisible, setIsAdminPanelVisible] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<PlaceRequest[]>([]);

  // Formulaire
  const [editingPlace, setEditingPlace] = useState<Partial<Place>>({});
  const [isUploading, setIsUploading] = useState(false);

  // Recherche & Localisation
  const [searchText, setSearchText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [region, setRegion] = useState<Region | undefined>(undefined);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  const slideAnim = useRef(new Animated.Value(300)).current;
  const alertShown = useRef(false);

  const { baseUrl } = useApiBaseUrl();
  const { roles, username, logout, isGuest, showLogin } = useAuth();

  const isAdmin = roles?.includes("ROLE_ADMIN") || roles?.includes("ADMIN");
  const isOwner = roles?.includes("ROLE_OWNER") || roles?.includes("OWNER");

  const getOwnerUsername = (place: Place | null) => {
    if (!place) return null;
    return place.ownerUsername || (place as any).owner?.username || null;
  };

  const isThisMyPlace = (place: Place) => {
    if (!username || !place) return false;
    const ownerName = getOwnerUsername(place);
    return ownerName && ownerName.toLowerCase().trim() === username.toLowerCase().trim();
  };

  useEffect(() => {
    if (!baseUrl) return;
    fetchPlaces(baseUrl).then(setPlaces).catch(err => console.error(err));
  }, [baseUrl, username]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setDefaultRegion();
          return;
        }
        let location = await Location.getLastKnownPositionAsync({});
        if (!location) location = await Location.getCurrentPositionAsync({});
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
        setDefaultRegion();
      } finally {
        setIsLoadingLocation(false);
      }
    })();
  }, []);

  const setDefaultRegion = () => {
    setRegion({ latitude: 49.6383, longitude: 5.3480, latitudeDelta: 0.05, longitudeDelta: 0.05 });
    setIsLoadingLocation(false);
  };

  useEffect(() => {
    if (selectedPlace) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }).start();
    }
  }, [selectedPlace]);

  const handleNavigation = (place: Place) => {
    const url = Platform.select({
      ios: `http://maps.apple.com/?daddr=${place.lat},${place.lng}`,
      android: `google.navigation:q=${place.lat},${place.lng}`
    });
    if (url) Linking.openURL(url).catch(() => Alert.alert("Erreur", "Navigation impossible."));
  };

  const handleSearchCity = async () => {
    if (!searchText.trim()) return;
    Keyboard.dismiss();
    setIsSearching(true);
    try {
      const geocoded = await Location.geocodeAsync(searchText);
      if (geocoded && geocoded.length > 0) {
        const { latitude, longitude } = geocoded[0];
        setRegion({ latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 });
      } else {
        Alert.alert("Introuvable", "Aucune ville trouvée.");
      }
    } catch (error) {
      Alert.alert("Erreur", "Recherche impossible.");
    } finally {
      setIsSearching(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Désolé', 'Permission requise !');
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.7 });
    if (!result.canceled) setEditingPlace(p => ({ ...p, imageUrl: result.assets[0].uri }));
  };

  const handleSavePlace = async () => {
    if (!baseUrl) return;
    try {
      setIsUploading(true);
      let finalImageUrl = editingPlace.imageUrl;
      if (editingPlace.imageUrl && editingPlace.imageUrl.startsWith('file://')) {
        if (editingPlace.id) {
          finalImageUrl = await uploadPlaceImage(baseUrl, String(editingPlace.id), editingPlace.imageUrl);
        } else {
          finalImageUrl = await uploadRequestImage(baseUrl, editingPlace.imageUrl);
        }
      }

      if (editingPlace.id) {
        const saved = await updatePlace(baseUrl, { ...editingPlace, imageUrl: finalImageUrl } as Place);
        setPlaces(prev => prev.map(p => p.id === saved.id ? saved : p));
        setSelectedPlace(saved);
        Alert.alert("Succès", "Lieu mis à jour !");
      } else {
        const payload = {
          ...editingPlace,
          imageUrl: finalImageUrl,
          lat: editingPlace.lat || region?.latitude || 0,
          lng: editingPlace.lng || region?.longitude || 0
        };
        await suggestPlace(baseUrl, payload as any);
        Alert.alert("Merci !", "Votre suggestion a été envoyée à l'admin.");
      }
      setIsModalVisible(false);
    } catch (e: any) {
      Alert.alert("Erreur d'enregistrement", e.message || "Une erreur inconnue est survenue.");
      console.error("Save Error:", e);
    } finally {
      setIsUploading(false);
    }
  };

  const openAdminPanel = async () => {
    if (!baseUrl) return;
    try {
      console.log("Fetching pending requests from:", baseUrl);
      const requests = await fetchPlaceRequests(baseUrl);
      setPendingRequests(requests);
      setIsAdminPanelVisible(true);
    } catch (e: any) {
      Alert.alert("Erreur Admin", e.message || "Une erreur inconnue est survenue.");
      console.error("Fetch requests error:", e);
    }
  };

  const handleValidate = async (id: number, approve: boolean) => {
    if (!baseUrl) return;
    try {
      await validatePlaceRequest(baseUrl, id, approve);
      setPendingRequests(prev => prev.filter(r => r.id !== id));
      if (approve) fetchPlaces(baseUrl).then(setPlaces);
      Alert.alert("Ok", approve ? "Lieu ajouté !" : "Demande rejetée.");
    } catch (e) {
      Alert.alert("Erreur", "Action impossible.");
    }
  };

  // ✅ Nouvelle fonction pour vérifier un lieu
  const handleVerifyPlace = async (place: Place) => {
    if (!baseUrl || !place.id) return;
    try {
      const updatedPlace = await verifyPlace(baseUrl, place.id);
      setPlaces(prev => prev.map(p => p.id === updatedPlace.id ? updatedPlace : p));
      setSelectedPlace(updatedPlace); // Met à jour le panneau d'infos
      Alert.alert("Santé !", `Merci d'avoir confirmé que l'on sert toujours de l'Orval à ${place.name}.`);
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Impossible de vérifier le lieu.");
    }
  };

  if (isLoadingLocation || !region) {
    return <View style={styles.loader}><ActivityIndicator size="large" color="#ff8c00" /></View>;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <MapView
        style={StyleSheet.absoluteFill}
        region={region}
        onRegionChangeComplete={setRegion}
        onPress={() => { setSelectedPlace(null); Keyboard.dismiss(); }}
        showsUserLocation={true} // ✅ Réactivé
        showsMyLocationButton={false} // 🎯 Supprimé la cible native
        toolbarEnabled={false}
      >
        {places.map((p) => (
          <Marker
            key={`${p.id}-${isThisMyPlace(p)}`}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            pinColor={isThisMyPlace(p) ? "green" : "red"}
            onPress={(e) => { e.stopPropagation(); setSelectedPlace(p); }}
          />
        ))}
      </MapView>

      {/* TOP BAR */}
      <SafeAreaView style={styles.topContainer} pointerEvents="box-none">
        <View style={styles.searchBarContainer}>
          <TextInput style={styles.searchInput} placeholder="Ville..." value={searchText} onChangeText={setSearchText} onSubmitEditing={handleSearchCity} />
          <TouchableOpacity style={styles.iconButton} onPress={handleSearchCity}>
            {isSearching ? (
              <ActivityIndicator size="small" color="#ff8c00" />
            ) : (
              <Ionicons name="search" size={20} color="#666" />
            )}
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.circleButton} onPress={isGuest ? showLogin : logout}>
          <Ionicons name={isGuest ? "person-circle-outline" : "log-out-outline"} size={26} color="#333" />
        </TouchableOpacity>
      </SafeAreaView>

      <View style={styles.sideButtons}>
        {isAdmin && (
          <TouchableOpacity style={[styles.sideBtn, {backgroundColor: 'red'}]} onPress={openAdminPanel}>
            <MaterialIcons name="notifications-active" size={20} color="white" />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.sideBtn} onPress={() => {
          if (isGuest) {
            Alert.alert(
              "Connexion requise",
              "Vous devez être connecté pour suggérer un nouveau café Orval.",
              [{ text: "Plus tard", style: "cancel" }, { text: "Se connecter", onPress: showLogin }]
            );
          } else {
            setEditingPlace({});
            setIsModalVisible(true);
          }
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="add-circle" size={18} color="white" />
            <Text style={{color: 'white', fontWeight: 'bold', marginLeft: 5}}>Suggérer</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* PANEL INFOS */}
      <Animated.View style={[styles.panel, { transform: [{ translateY: slideAnim }] }]}>
        {selectedPlace && (
          <>
            {selectedPlace.imageUrl ? (
              <Image
                source={{ uri: selectedPlace.imageUrl }}
                style={styles.placeImage}
                resizeMode="cover"
                onError={(e) => console.warn("❌ Erreur image:", e.nativeEvent.error)}
              />
            ) : null}

            <View style={styles.panelHeader}>
              <View>
                <Text style={styles.placeTitle}>{selectedPlace.name}</Text>
                {selectedPlace.price && <Text style={styles.priceTag}>🍺 Orval: {selectedPlace.price}€</Text>}
              </View>
              <TouchableOpacity onPress={() => setSelectedPlace(null)}><Ionicons name="close" size={24} color="#999" /></TouchableOpacity>
            </View>
            <Text style={styles.placeCity}>📍 {selectedPlace.city}</Text>
            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.navigateBtn} onPress={() => handleNavigation(selectedPlace)}>
                <Ionicons name="navigate" size={18} color="white" style={{marginRight: 5}} />
                <Text style={styles.actionBtnText}>Y Aller</Text>
              </TouchableOpacity>

              {/* ✅ Bouton Vérifier */}
              {!isGuest && selectedPlace.id && (
                <TouchableOpacity 
                  style={[styles.editBtn, {backgroundColor: '#28a745'}]} 
                  onPress={() => handleVerifyPlace(selectedPlace)}
                >
                  <Ionicons name="checkmark-shield" size={18} color="white" style={{marginRight: 5}} />
                  <Text style={styles.actionBtnText}>Vérifier</Text>
                </TouchableOpacity>
              )}

              {(isAdmin || isThisMyPlace(selectedPlace)) && (
                <TouchableOpacity style={styles.editBtn} onPress={() => { setEditingPlace(selectedPlace); setIsModalVisible(true); }}>
                  <Ionicons name="create" size={18} color="white" style={{marginRight: 5}} />
                  <Text style={styles.actionBtnText}>Editer</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.verificationContainer}>
               <Ionicons name="ribbon-outline" size={16} color="#666" />
               <Text style={styles.verificationText}>
                 Vérifié {selectedPlace.verificationCount || 0} fois. 
                 {selectedPlace.lastVerificationDate ? ` Dernièrement le ${new Date(selectedPlace.lastVerificationDate).toLocaleDateString()}` : " Jamais vérifié."}
               </Text>
            </View>
          </>
        )}
      </Animated.View>

      {/* MODAL SUGGESTION / EDITION */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.bottomSheet}>
            <ScrollView>
              <Text style={styles.modalTitle}>{editingPlace.id ? "Modifier le café" : "Suggérer un café"}</Text>
              {editingPlace.imageUrl && <Image source={{ uri: editingPlace.imageUrl }} style={styles.previewImage} />}
              <TouchableOpacity style={styles.pickImageButton} onPress={pickImage}>
                <Ionicons name="camera" size={20} color="#666" style={{marginRight: 8}} />
                <Text>Photo du lieu</Text>
              </TouchableOpacity>
              <TextInput style={styles.input} value={editingPlace.name} onChangeText={t => setEditingPlace(p => ({...p, name: t}))} placeholder="Nom du café" />
              <TextInput style={styles.input} value={editingPlace.city} onChangeText={t => setEditingPlace(p => ({...p, city: t}))} placeholder="Ville" />
              <TextInput style={styles.input} value={String(editingPlace.price || "")} keyboardType="numeric" onChangeText={t => setEditingPlace(p => ({...p, price: parseFloat(t)}))} placeholder="Prix de l'Orval (€)" />
              <TextInput style={[styles.input, { height: 60 }]} value={editingPlace.description} onChangeText={t => setEditingPlace(p => ({...p, description: t}))} placeholder="Infos (ex: stock, ambiance...)" multiline />

              <TouchableOpacity style={styles.saveButton} onPress={handleSavePlace} disabled={isUploading}>
                {isUploading ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Envoyer</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={{marginTop: 10, alignItems: 'center'}} onPress={() => setIsModalVisible(false)}><Text>Annuler</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL ADMIN PANEL */}
      <Modal visible={isAdminPanelVisible} animationType="fade">
        <SafeAreaView style={{flex: 1, backgroundColor: 'white'}}>
          <View style={{padding: 20, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#eee'}}>
            <Text style={styles.modalTitle}>Demandes en attente</Text>
            <TouchableOpacity onPress={() => setIsAdminPanelVisible(false)}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={pendingRequests}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={{padding: 20}}
            renderItem={({item}) => (
              <View style={styles.requestCard}>
                <Text style={{fontWeight: 'bold', fontSize: 18}}>{item.name}</Text>
                <Text>📍 {item.city}</Text>
                <Text>🍺 Prix Orval: {item.price}€</Text>
                <View style={{flexDirection: 'row', marginTop: 15}}>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => handleValidate(item.id!, true)}><Text style={{color: 'white', fontWeight: 'bold'}}>Valider</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => handleValidate(item.id!, false)}><Text style={{color: 'white', fontWeight: 'bold'}}>Refuser</Text></TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 50, color: '#999'}}>Aucune demande en attente.</Text>}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  topContainer: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", paddingHorizontal: 15, paddingTop: Platform.OS === 'android' ? 40 : 10, zIndex: 10 },
  searchBarContainer: { flex: 1, flexDirection: "row", backgroundColor: "white", borderRadius: 30, padding: 5, alignItems: "center", elevation: 5, marginRight: 10 },
  searchInput: { flex: 1, paddingHorizontal: 15, fontSize: 16 },
  iconButton: { padding: 10 },
  circleButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: "white", justifyContent: "center", alignItems: "center", elevation: 5 },
  sideButtons: { position: 'absolute', right: 20, bottom: 230, zIndex: 10, alignItems: 'flex-end' },
  sideBtn: { backgroundColor: '#ff8c00', padding: 12, borderRadius: 25, marginBottom: 10, elevation: 5 },
  panel: { position: "absolute", bottom: 0, width: "100%", backgroundColor: "white", padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, elevation: 10, zIndex: 20 },
  panelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  placeImage: { width: "100%", height: 150, borderRadius: 10, marginBottom: 15 },
  placeTitle: { fontSize: 22, fontWeight: "bold" },
  priceTag: { color: '#ff8c00', fontWeight: 'bold', fontSize: 16 },
  placeCity: { fontSize: 14, color: "#999", marginBottom: 10 },
  actionsContainer: { flexDirection: "row", marginTop: 15 },
  navigateBtn: { flex: 1, backgroundColor: "#ff8c00", padding: 12, borderRadius: 8, alignItems: "center" },
  editBtn: { flex: 1, backgroundColor: "#666", padding: 12, borderRadius: 8, alignItems: "center", marginLeft: 10 },
  actionBtnText: { color: "white", fontWeight: "bold" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  bottomSheet: { backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "90%" },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#ff8c00", marginBottom: 15 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 10 },
  previewImage: { width: "100%", height: 150, borderRadius: 8, marginBottom: 10 },
  pickImageButton: { backgroundColor: "#eee", padding: 12, borderRadius: 8, flexDirection: 'row', justifyContent: "center", alignItems: "center", marginBottom: 15 },
  saveButton: { backgroundColor: '#ff8c00', padding: 15, borderRadius: 10, alignItems: "center" },
  saveButtonText: { color: "white", fontWeight: "bold" },
  requestCard: { padding: 15, backgroundColor: '#f9f9f9', borderRadius: 10, marginBottom: 15, borderLeftWidth: 5, borderLeftColor: '#ff8c00', elevation: 2 },
  approveBtn: { backgroundColor: 'green', padding: 10, borderRadius: 5, marginRight: 10, flex: 1, alignItems: 'center' },
  rejectBtn: { backgroundColor: 'red', padding: 10, borderRadius: 5, flex: 1, alignItems: 'center' },
  verificationContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 15, padding: 10, backgroundColor: '#f8f9fa', borderRadius: 8 },
  verificationText: { fontSize: 12, color: '#666', marginLeft: 8 },
  actionsContainer: { flexDirection: "row", marginTop: 15, gap: 8 },
  navigateBtn: { flex: 1, backgroundColor: "#ff8c00", padding: 12, borderRadius: 8, alignItems: "center", flexDirection: 'row', justifyContent: 'center' },
  editBtn: { flex: 1, backgroundColor: "#666", padding: 12, borderRadius: 8, alignItems: "center", flexDirection: 'row', justifyContent: 'center' },
});
