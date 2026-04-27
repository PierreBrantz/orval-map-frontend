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
import MapView, { Marker, Region, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Importation des icônes Expo
import { MaterialIcons, Ionicons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";

import { fetchPlaces, updatePlace, uploadImage, suggestPlace, fetchPlaceRequests, validatePlaceRequest, verifyPlace } from "../api/places";
import { useApiBaseUrl } from "../hooks/useApiBaseUrl";
import { useAuth } from "../context/AuthContext";
import { Place, PlaceRequest } from "../types/Place";

const MAP_PROVIDER_KEY = "orval_maps_provider_choice";

export default function MapScreen() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [mapProvider, setMapProvider] = useState<string>(PROVIDER_DEFAULT);

  // Modals
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAdminPanelVisible, setIsAdminPanelVisible] = useState(false);
  const [isMoreMenuVisible, setIsMoreMenuVisible] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<PlaceRequest[]>([]);

  // Formulaire
  const [editingPlace, setEditingPlace] = useState<Partial<Place>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Recherche & Localisation
  const [searchText, setSearchText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [region, setRegion] = useState<Region | undefined>(undefined);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  const slideAnim = useRef(new Animated.Value(300)).current;

  const { baseUrl } = useApiBaseUrl();
  const { roles, username, logout, isGuest, showLogin } = useAuth();

  const isAdmin = roles.includes("ROLE_ADMIN") || roles.includes("ADMIN");

  // Charger le choix du fournisseur de carte (iOS seulement)
  useEffect(() => {
    if (Platform.OS === 'ios') {
      AsyncStorage.getItem(MAP_PROVIDER_KEY).then(val => {
        if (val) setMapProvider(val);
      });
    }
  }, []);

  useEffect(() => {
    if (!baseUrl) return;
    fetchPlaces(baseUrl).then(setPlaces).catch(err => console.error("Fetch places error:", err));
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

  const toggleMapProvider = async () => {
    const newProvider = mapProvider === PROVIDER_DEFAULT ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;
    setMapProvider(newProvider);
    await AsyncStorage.setItem(MAP_PROVIDER_KEY, newProvider);
    Alert.alert("Carte mise à jour", "Le nouveau fond de carte sera appliqué au redémarrage.");
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
        finalImageUrl = await uploadImage(baseUrl, editingPlace.id || "request", editingPlace.imageUrl);
      }

      if (editingPlace.id) {
        // Mise à jour d'un lieu existant
        const saved = await updatePlace(baseUrl, { ...editingPlace, imageUrl: finalImageUrl } as Place);
        setPlaces(prev => prev.map(p => p.id === saved.id ? saved : p));
        setSelectedPlace(saved);
        Alert.alert("Succès", "Lieu mis à jour !");
      } else {
        // Suggestion d'un nouveau lieu -> On récupère la position GPS réelle PRÉCISE
        let currentLat = region?.latitude || 0;
        let currentLng = region?.longitude || 0;

        try {
          const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          currentLat = location.coords.latitude;
          currentLng = location.coords.longitude;
        } catch (err) {
          console.warn("Impossible de récupérer la position précise, utilisation du centre de la carte.");
        }

        const payload = {
          ...editingPlace,
          imageUrl: finalImageUrl,
          lat: currentLat,
          lng: currentLng
        };
        await suggestPlace(baseUrl, payload as any);
        Alert.alert("Merci !", "Votre suggestion a été envoyée à l'admin avec votre position GPS précise.");
      }
      setIsModalVisible(false);
    } catch (e: any) {
      Alert.alert("Erreur d'enregistrement", e.message || "Une erreur inconnue est survenue.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleVerify = async () => {
    if (!baseUrl || !selectedPlace) return;
    if (isGuest) {
      Alert.alert(
        "Connexion requise",
        "Vous devez être connecté pour confirmer la présence d'Orval dans cet établissement.",
        [
          { text: "Plus tard", style: "cancel" },
          { text: "Se connecter", onPress: showLogin }
        ]
      );
      return;
    }
    try {
      setIsVerifying(true);
      const updated = await verifyPlace(baseUrl, selectedPlace.id);
      setPlaces(prev => prev.map(p => p.id === updated.id ? updated : p));
      setSelectedPlace(updated);
      Alert.alert("Merci !", "Votre vérification a été enregistrée.");
    } catch (e: any) {
      Alert.alert("Erreur", "Impossible de vérifier ce lieu.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAddPlacePress = () => {
    if (isGuest) {
      Alert.alert(
        "Connexion requise",
        "Pour suggérer un nouveau café, vous devez d'abord créer un compte ou vous connecter.",
        [
          { text: "Plus tard", style: "cancel" },
          { text: "Se connecter", onPress: showLogin }
        ]
      );
    } else {
      setEditingPlace({});
      setIsModalVisible(true);
    }
  };

  const openAdminPanel = async () => {
    if (!baseUrl) return;
    try {
      setIsMoreMenuVisible(false);
      const requests = await fetchPlaceRequests(baseUrl);
      setPendingRequests(requests);
      setIsAdminPanelVisible(true);
    } catch (e: any) {
      Alert.alert("Erreur Admin", "Impossible de charger les demandes.");
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

  const isThisMyPlace = (place: Place) => {
    if (!username || !place) return false;
    const ownerName = place.ownerUsername || (place as any).owner?.username;
    return ownerName && ownerName.toLowerCase().trim() === username.toLowerCase().trim();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Jamais";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateStr;
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
        showsUserLocation={true}
        showsMyLocationButton={false}
        provider={Platform.OS === 'ios' ? (mapProvider as any) : PROVIDER_GOOGLE}
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
          <TextInput style={styles.searchInput} placeholder="Chercher une ville..." value={searchText} onChangeText={setSearchText} onSubmitEditing={handleSearchCity} />
          <TouchableOpacity style={styles.iconButton} onPress={handleSearchCity}>
            {isSearching ? <ActivityIndicator size="small" color="#ff8c00" /> : <MaterialIcons name="search" size={24} color="#666" />}
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.circleButton} onPress={() => setIsMoreMenuVisible(true)}>
          <Ionicons name="information-circle-outline" size={24} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.circleButton} onPress={isGuest ? showLogin : logout}>
          <MaterialIcons name={isGuest ? "login" : "logout"} size={24} color={isGuest ? "#ff8c00" : "#d32f2f"} />
        </TouchableOpacity>
      </SafeAreaView>

      {/* FAB (Visible pour tous) */}
      <TouchableOpacity style={styles.fab} onPress={handleAddPlacePress}>
        <MaterialIcons name="add" size={32} color="white" />
      </TouchableOpacity>

      {/* INFO PANEL */}
      <Animated.View style={[styles.panel, { transform: [{ translateY: slideAnim }] }]}>
        {selectedPlace && (
          <>
            {selectedPlace.imageUrl ? (
              <Image source={{ uri: selectedPlace.imageUrl }} style={styles.placeImage} resizeMode="cover" />
            ) : null}
            <View style={styles.panelHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.placeTitle}>{selectedPlace.name}</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.priceTag}>🍺 {selectedPlace.price ? `${selectedPlace.price}€` : "N/C"}</Text>
                  <View style={styles.divider} />
                  <MaterialCommunityIcons name="shield-check" size={16} color="#4caf50" style={{marginLeft: 8}} />
                  <Text style={styles.verificationText}>{selectedPlace.verificationCount || 0} vérif.</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedPlace(null)}><MaterialIcons name="close" size={28} color="#999" /></TouchableOpacity>
            </View>

            <View style={styles.detailsRow}>
              <Text style={styles.placeCity}>📍 {selectedPlace.city}</Text>
              <Text style={styles.lastVerify}>Vérifié le: {formatDate(selectedPlace.lastVerificationDate)}</Text>
            </View>

            {selectedPlace.description ? (
              <Text style={styles.descriptionText} numberOfLines={2}>{selectedPlace.description}</Text>
            ) : null}

            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.navigateBtn} onPress={() => handleNavigation(selectedPlace)}>
                <Text style={styles.actionBtnText}>🚀 Y Aller</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.verifyBtn, isGuest && { opacity: 0.7 }]}
                onPress={handleVerify}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <ActivityIndicator color="#4caf50" size="small" />
                ) : (
                  <Text style={styles.verifyBtnText}>✅ Ça correspond</Text>
                )}
              </TouchableOpacity>

              {(isAdmin || isThisMyPlace(selectedPlace)) && (
                <TouchableOpacity style={styles.editBtnSmall} onPress={() => { setEditingPlace(selectedPlace); setIsModalVisible(true); }}>
                  <MaterialIcons name="edit" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </Animated.View>

      {/* MORE MENU */}
      <Modal visible={isMoreMenuVisible} animationType="slide" transparent={true}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsMoreMenuVisible(false)}>
          <View style={styles.bottomSheetMenu}>
            <View style={styles.sheetHandle} />
            <Text style={styles.menuTitle}>Orval Maps</Text>

            {Platform.OS === 'ios' && (
              <TouchableOpacity style={styles.menuItem} onPress={toggleMapProvider}>
                <View style={[styles.menuIconContainer, {backgroundColor: '#f5f5f5'}]}>
                  <MaterialIcons name="map" size={20} color="#333" />
                </View>
                <Text style={styles.menuItemText}>{mapProvider === PROVIDER_DEFAULT ? "Utiliser Google Maps" : "Utiliser Apple Maps"}</Text>
              </TouchableOpacity>
            )}

            {isAdmin && (
              <TouchableOpacity style={styles.menuItem} onPress={openAdminPanel}>
                <View style={[styles.menuIconContainer, {backgroundColor: '#ffebee'}]}>
                  <MaterialIcons name="notifications-active" size={20} color="#d32f2f" />
                </View>
                <Text style={styles.menuItemText}>Demandes en attente</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMoreMenuVisible(false); Linking.openURL("https://buymeacoffee.com/orvalmaps"); }}>
              <View style={[styles.menuIconContainer, {backgroundColor: '#fffde7'}]}>
                <FontAwesome5 name="beer" size={18} color="#fbc02d" />
              </View>
              <Text style={styles.menuItemText}>Offrir un Orval (Support)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMoreMenuVisible(false); Linking.openURL("mailto:orvalmaps@gmail.com?subject=Contact"); }}>
              <View style={[styles.menuIconContainer, {backgroundColor: '#e3f2fd'}]}>
                <MaterialIcons name="email" size={20} color="#1976d2" />
              </View>
              <Text style={styles.menuItemText}>Nous contacter</Text>
            </TouchableOpacity>

            <View style={styles.menuFooter}>
              <Text style={styles.footerText}>Version 1.0.3 • Fait avec passion 🍺</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL SUGGESTION / EDITION */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.bottomSheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editingPlace.id ? "Modifier le café" : "Suggérer un café"}</Text>

              {!editingPlace.id && (
                <View style={styles.infoBanner}>
                  <MaterialIcons name="gps-fixed" size={18} color="#ff8c00" />
                  <Text style={styles.infoBannerText}>
                    L'application récupère votre position GPS précise au moment de l'envoi.
                  </Text>
                </View>
              )}

              {editingPlace.imageUrl && <Image source={{ uri: editingPlace.imageUrl }} style={styles.previewImage} />}
              <TouchableOpacity style={styles.pickImageButton} onPress={pickImage}>
                <MaterialIcons name="add-a-photo" size={24} color="#666" />
                <Text style={{marginTop: 5, color: '#666'}}>Photo du lieu</Text>
              </TouchableOpacity>
              <TextInput style={styles.input} value={editingPlace.name} onChangeText={t => setEditingPlace(p => ({...p, name: t}))} placeholder="Nom du café" placeholderTextColor="#999" />
              <TextInput style={styles.input} value={editingPlace.city} onChangeText={t => setEditingPlace(p => ({...p, city: t}))} placeholder="Ville" placeholderTextColor="#999" />
              <TextInput style={styles.input} value={String(editingPlace.price || "")} keyboardType="numeric" onChangeText={t => setEditingPlace(p => ({...p, price: parseFloat(t)}))} placeholder="Prix de l'Orval (€)" placeholderTextColor="#999" />
              <TextInput style={[styles.input, { height: 80 }]} value={editingPlace.description} onChangeText={t => setEditingPlace(p => ({...p, description: t}))} placeholder="Infos (ex: stock, ambiance...)" placeholderTextColor="#999" multiline />
              <TouchableOpacity style={styles.saveButton} onPress={handleSavePlace} disabled={isUploading}>
                {isUploading ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Envoyer la suggestion</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={{marginTop: 20, marginBottom: 20, alignItems: 'center'}} onPress={() => setIsModalVisible(false)}><Text style={{color: '#999'}}>Annuler</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={isAdminPanelVisible} animationType="slide">
        <SafeAreaView style={{flex: 1, backgroundColor: 'white'}}>
          <View style={styles.adminHeader}>
            <Text style={styles.modalTitle}>Demandes ({pendingRequests.length})</Text>
            <TouchableOpacity onPress={() => setIsAdminPanelVisible(false)}><MaterialIcons name="close" size={28} color="#999" /></TouchableOpacity>
          </View>
          <FlatList
            data={pendingRequests}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={{padding: 20}}
            renderItem={({item}) => (
              <View style={styles.requestCard}>
                <Text style={{fontWeight: 'bold', fontSize: 18}}>{item.name}</Text>
                <Text style={{color: '#666', marginTop: 3}}>📍 {item.city}</Text>
                <Text style={{color: '#999', fontSize: 12}}>GPS: {item.lat.toFixed(3)}, {item.lng.toFixed(3)}</Text>
                <Text style={{marginTop: 5, color: '#ff8c00', fontWeight: 'bold'}}>🍺 Prix: {item.price}€</Text>
                <View style={{flexDirection: 'row', marginTop: 15}}>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => handleValidate(item.id!, true)}><Text style={{color: 'white', fontWeight: 'bold'}}>Valider</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => handleValidate(item.id!, false)}><Text style={{color: 'white', fontWeight: 'bold'}}>Refuser</Text></TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>Aucune demande en attente.</Text>}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Top Bar
  topContainer: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", paddingHorizontal: 15, paddingTop: Platform.OS === 'android' ? 40 : 10, zIndex: 10 },
  searchBarContainer: { flex: 1, flexDirection: "row", backgroundColor: "white", borderRadius: 12, padding: 5, alignItems: "center", elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 5, marginRight: 8 },
  searchInput: { flex: 1, paddingHorizontal: 15, fontSize: 16, height: 40, color: '#333' },
  iconButton: { padding: 10 },
  circleButton: { width: 45, height: 45, borderRadius: 12, backgroundColor: "white", justifyContent: "center", alignItems: "center", elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 5, marginLeft: 8 },

  // FAB
  fab: { position: 'absolute', right: 20, bottom: 40, width: 60, height: 60, borderRadius: 30, backgroundColor: '#ff8c00', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, zIndex: 15 },

  // Panel Details
  panel: { position: "absolute", bottom: 0, width: "100%", backgroundColor: "white", padding: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10, zIndex: 20 },
  panelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  placeImage: { width: "100%", height: 180, borderRadius: 20, marginBottom: 15 },
  placeTitle: { fontSize: 24, fontWeight: "bold", color: '#333' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  priceTag: { color: '#ff8c00', fontWeight: 'bold', fontSize: 18 },
  divider: { width: 1, height: 15, backgroundColor: '#ddd', marginLeft: 10 },
  verificationText: { fontSize: 14, color: '#4caf50', fontWeight: '600', marginLeft: 4 },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  placeCity: { fontSize: 16, color: "#666" },
  lastVerify: { fontSize: 12, color: "#999", fontStyle: 'italic' },
  descriptionText: { fontSize: 14, color: '#777', marginBottom: 15, lineHeight: 20 },
  actionsContainer: { flexDirection: "row", marginTop: 5, alignItems: 'center' },
  navigateBtn: { flex: 2, backgroundColor: "#ff8c00", padding: 16, borderRadius: 15, alignItems: "center" },
  verifyBtn: { flex: 2, backgroundColor: "#e8f5e9", padding: 16, borderRadius: 15, alignItems: "center", marginLeft: 10, borderWidth: 1, borderColor: '#c8e6c9' },
  verifyBtnText: { color: "#2e7d32", fontWeight: "bold", fontSize: 15 },
  editBtnSmall: { width: 50, height: 50, backgroundColor: "#f5f5f5", borderRadius: 15, justifyContent: "center", alignItems: "center", marginLeft: 10 },
  actionBtnText: { color: "white", fontWeight: "bold", fontSize: 16 },

  // Modals
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  bottomSheet: { backgroundColor: "white", borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: "90%" },

  // Menu "Plus"
  bottomSheetMenu: { backgroundColor: "white", borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 50 },
  sheetHandle: { width: 40, height: 5, backgroundColor: '#e0e0e0', borderRadius: 3, alignSelf: 'center', marginBottom: 25 },
  menuTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#f9f9f9' },
  menuIconContainer: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuItemText: { fontSize: 17, color: '#333', fontWeight: '500' },
  menuFooter: { marginTop: 40, alignItems: 'center' },
  footerText: { color: '#bbb', fontSize: 13 },

  // Admin & Forms
  adminHeader: { padding: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 24, fontWeight: "bold", color: "#333", marginBottom: 15 },
  infoBanner: { flexDirection: 'row', backgroundColor: '#fff3e0', padding: 12, borderRadius: 12, marginBottom: 20, alignItems: 'center' },
  infoBannerText: { flex: 1, color: '#e65100', fontSize: 13, marginLeft: 10, lineHeight: 18 },
  input: { backgroundColor: '#f5f5f5', borderRadius: 15, padding: 16, fontSize: 16, marginBottom: 15, color: '#333' },
  previewImage: { width: "100%", height: 200, borderRadius: 20, marginBottom: 15 },
  pickImageButton: { backgroundColor: "#f5f5f5", padding: 20, borderRadius: 20, alignItems: "center", marginBottom: 25, borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc' },
  saveButton: { backgroundColor: "#ff8c00", padding: 20, borderRadius: 18, alignItems: "center", elevation: 4, shadowColor: '#ff8c00', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  saveButtonText: { color: "white", fontWeight: "bold", fontSize: 18 },
  requestCard: { padding: 20, backgroundColor: '#fff', borderRadius: 20, marginBottom: 15, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, borderLeftWidth: 6, borderLeftColor: '#ff8c00' },
  approveBtn: { backgroundColor: '#2e7d32', padding: 14, borderRadius: 12, marginRight: 10, flex: 1, alignItems: 'center' },
  rejectBtn: { backgroundColor: '#c62828', padding: 14, borderRadius: 12, flex: 1, alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 120, color: '#bbb', fontSize: 16 },
});
