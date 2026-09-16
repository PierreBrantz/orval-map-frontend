import { useLanguage } from "../context/LanguageContext";
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
  FlatList,
  useColorScheme
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { API_BASE_URL } from "../config";
import { fetchPlaces, updatePlace, uploadPlaceImage, uploadRequestImage, suggestPlace, fetchPlaceRequests, validatePlaceRequest, visitPlace, unvisitPlace, deletePlace, clearPlacesCache } from "../api/places";
import { useAuth } from "../context/AuthContext";
import { Place, PlaceRequest } from "../types/Place";
import Map from "../components/Map"; // Importation du composant abstrait
import type { Region } from "react-native-maps";


export default function MapScreen() {
  const { t, errorMessage, language } = useLanguage();
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAdminPanelVisible, setIsAdminPanelVisible] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<PlaceRequest[]>([]);
  const [isProcessingRequest, setIsProcessingRequest] = useState(false);
  const processingRequest = useRef(false);

  const [editingPlace, setEditingPlace] = useState<Partial<Place>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [displayPriceString, setDisplayPriceString] = useState<string>("");

  const [searchText, setSearchText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [region, setRegion] = useState<Region | undefined>(undefined);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [selectedFilterType, setSelectedFilterType] = useState<'BAR' | 'RESTAURANT' | 'BREWERY' | null>(null);

  const slideAnim = useRef(new Animated.Value(300)).current;

  const { roles, username, logout, isGuest, showLogin, visitedPlaceIds, addVisitedPlace, removeVisitedPlace, refreshPassport } = useAuth();

  const colorScheme = useColorScheme();
  const placeholderTextColor = colorScheme === 'dark' ? '#888' : '#bbb';

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

  const isPlaceVisited = (place: Place) => {
    return visitedPlaceIds.has(place.id);
  };

  useEffect(() => {
    if (isModalVisible) {
      setDisplayPriceString(editingPlace.price !== undefined ? String(editingPlace.price).replace('.', ',') : "");
    }
  }, [isModalVisible, editingPlace.price]);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const fetchedPlaces = await fetchPlaces(API_BASE_URL, selectedFilterType);
        if (active) setPlaces(fetchedPlaces);
      } catch (err) {
        console.error("Failed to fetch places:", err);
      }
    };
    loadData();
    return () => { active = false; };
  }, [username, selectedFilterType]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setDefaultRegion();
      return;
    }
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setDefaultRegion();
          return;
        }
        let location = await Location.getLastKnownPositionAsync({});
        if (!location) {
          location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
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
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: Platform.OS !== 'web' }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: Platform.OS !== 'web' }).start();
    }
  }, [selectedPlace]);

  const handleNavigation = (place: Place) => {
    const url = Platform.select({
      ios: `http://maps.apple.com/?daddr=${place.lat},${place.lng}`,
      android: `google.navigation:q=${place.lat},${place.lng}`
    });
    if (url) Linking.openURL(url).catch(() => Alert.alert(t("Erreur"), t("Navigation impossible.")));
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
        Alert.alert(t("Introuvable"), t("Aucune ville trouvée."));
      }
    } catch (error) {
      Alert.alert(t("Erreur"), t("Recherche impossible."));
    } finally {
      setIsSearching(false);
    }
  };

  const handleSuggestPress = async () => {
    if (isGuest) {
      Alert.alert(
        t("Connexion requise"),
        t("Vous devez être connecté pour suggérer un nouveau café Orval."),
        [{ text: t("Plus tard"), style: "cancel" }, { text: t("Se connecter"), onPress: showLogin }]
      );
      return;
    }

    Alert.alert(t("Géolocalisation"), t("Nous allons récupérer votre position actuelle pour plus de précision."));
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      setEditingPlace({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        placeType: 'BAR'
      });
      setIsModalVisible(true);

    } catch (error) {
      Alert.alert(t("Erreur de Géolocalisation"), t("Impossible de récupérer votre position. Veuillez vérifier que le GPS est activé."));
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert(t("Désolé"), t("Permission requise !"));
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7
    });
    if (!result.canceled) setEditingPlace(p => ({ ...p, imageUrl: result.assets[0].uri }));
  };

  const handlePriceInputChange = (text: string) => {
    let cleanedText = text.replace(/[^0-9.,]/g, '').replace(',', '.');
    const parts = cleanedText.split('.');
    if (parts.length > 2) {
      cleanedText = parts[0] + '.' + parts.slice(1).join('');
    }
    setDisplayPriceString(text);
    const numericValue = parseFloat(cleanedText);
    setEditingPlace(p => ({ ...p, price: isNaN(numericValue) ? undefined : numericValue }));
  };

  const handleSavePlace = async () => {
    try {
      setIsUploading(true);
      let finalImageUrl = editingPlace.imageUrl;
      if (editingPlace.imageUrl && editingPlace.imageUrl.startsWith('file://')) {
        if (editingPlace.id) {
          finalImageUrl = await uploadPlaceImage(API_BASE_URL, editingPlace.id, editingPlace.imageUrl);
        } else {
          finalImageUrl = await uploadRequestImage(API_BASE_URL, editingPlace.imageUrl);
        }
      }

      if (editingPlace.id) {
        const saved = await updatePlace(API_BASE_URL, { ...editingPlace, imageUrl: finalImageUrl } as Place);
        setPlaces(prev => prev.map(p => p.id === saved.id ? saved : p));
        setSelectedPlace(saved);
        Alert.alert(t("Succès"), t("Lieu mis à jour !"));
      } else {
        const payload = {
          ...editingPlace,
          imageUrl: finalImageUrl,
        };
        await suggestPlace(API_BASE_URL, payload as any);
        Alert.alert(t("Merci !"), t("Votre suggestion a été envoyée à l'admin."));
      }
      setIsModalVisible(false);
      await clearPlacesCache();
    } catch (e: any) {
      Alert.alert(t("Erreur d'enregistrement"), errorMessage(e, "Une erreur inconnue est survenue."));
    } finally {
      setIsUploading(false);
    }
  };

  const openAdminPanel = async () => {
    try {
      const requests = await fetchPlaceRequests(API_BASE_URL);
      setPendingRequests(requests);
      setIsAdminPanelVisible(true);
    } catch (e: any) {
      Alert.alert(t("Erreur Admin"), errorMessage(e, "Une erreur inconnue est survenue."));
    }
  };

  const handleValidate = async (id: number, approve: boolean) => {
    if (processingRequest.current) return;
    processingRequest.current = true;
    setIsProcessingRequest(true);
    let decisionSaved = false;
    try {
      await validatePlaceRequest(API_BASE_URL, id, approve);
      decisionSaved = true;
      setPendingRequests(prev => prev.filter(r => r.id !== id));
      refreshPassport();
      await Promise.all([
        fetchPlaceRequests(API_BASE_URL).then(setPendingRequests),
        approve ? clearPlacesCache().then(() => fetchPlaces(API_BASE_URL, selectedFilterType)).then(setPlaces) : Promise.resolve(),
      ]);
      Alert.alert(t("Ok"), approve ? t("Lieu ajouté !") : t("Demande rejetée."));
    } catch (e: any) {
      if (e instanceof Error && e.message === 'Cette suggestion a déjà été traitée.') {
        setPendingRequests(prev => prev.filter(r => r.id !== id));
        refreshPassport();
        await fetchPlaceRequests(API_BASE_URL).then(setPendingRequests).catch(() => undefined);
      }
      Alert.alert(t("Erreur"), decisionSaved
        ? t('La décision est enregistrée, mais le rafraîchissement a échoué. Rouvrez la liste pour réessayer.')
        : errorMessage(e, 'Action impossible.'));
    } finally {
      processingRequest.current = false;
      setIsProcessingRequest(false);
    }
  };

  const handleVisitToggle = async (place: Place) => {
    if (!place.id) return;

    if (isPlaceVisited(place)) {
      Alert.alert(t("Retirer la visite"), t("Voulez-vous retirer ce lieu de votre passeport ?"), [
        { text: t("Annuler"), style: "cancel" },
        {
          text: t("Retirer"),
          style: "destructive",
          onPress: async () => {
            try {
              await unvisitPlace(API_BASE_URL, place.id);
              removeVisitedPlace(place.id);
            } catch (e: any) {
              Alert.alert(t("Erreur"), errorMessage(e, "Impossible de retirer la visite."));
            }
          },
        },
      ]);
    } else {
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });
        const coords = { lat: location.coords.latitude, lng: location.coords.longitude };
        await visitPlace(API_BASE_URL, place.id, coords);
        addVisitedPlace(place.id);
        Alert.alert(t("Santé !"), t("{name} a été ajouté à votre passeport.", { name: place.name }));
      } catch (e: any) {
        Alert.alert(t("Erreur"), errorMessage(e, "Impossible d'ajouter la visite. Assurez-vous d'être assez proche du lieu."));
      }
    }
  };

  const handleDeletePlace = async (placeId: number) => {
    Alert.alert(t("Confirmation"), t("Êtes-vous sûr de vouloir supprimer ce café ?"), [
      { text: t("Annuler"), style: "cancel" },
      {
        text: t("Supprimer"), style: "destructive",
        onPress: async () => {
          try {
            await deletePlace(API_BASE_URL, placeId);
            setPlaces(prev => prev.filter(p => p.id !== placeId));
            setSelectedPlace(null);
            await clearPlacesCache();
            Alert.alert(t("Succès"), t("Le café a été supprimé."));
          } catch (e: any) {
            Alert.alert(t("Erreur"), errorMessage(e, "Impossible de supprimer le lieu."));
          }
        },
      },
    ]);
  };

  const getPlaceTypeDisplayName = (placeType: 'BAR' | 'RESTAURANT' | 'BREWERY') => {
    switch (placeType) {
      case 'BAR': return t("Bar");
      case 'RESTAURANT': return t("Restaurant");
      case 'BREWERY': return t("Brasserie");
      default: return '';
    }
  };

  if (isLoadingLocation || !region) {
    return <View style={styles.loader}><ActivityIndicator size="large" color="#ff8c00" /></View>;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Map
        region={region}
        onRegionChangeComplete={setRegion}
        places={places}
        onMapPress={() => { setSelectedPlace(null); Keyboard.dismiss(); }}
        onMarkerPress={setSelectedPlace}
        isThisMyPlace={isThisMyPlace}
        isPlaceVisited={isPlaceVisited}
      />

      <SafeAreaView style={styles.topContainer} pointerEvents="box-none">
        <View style={styles.topControlsRow}>
          <View style={styles.searchBarContainer}>
            <TextInput style={styles.searchInput} placeholder={t("Ville...")} value={searchText} onChangeText={setSearchText} onSubmitEditing={handleSearchCity} placeholderTextColor={placeholderTextColor} />
            <TouchableOpacity style={styles.iconButton} onPress={handleSearchCity}>
              {isSearching ? <ActivityIndicator size="small" color="#ff8c00" /> : <Ionicons name="search" size={20} color="#666" />}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.circleButton} onPress={isGuest ? showLogin : logout}>
            <Ionicons name={isGuest ? "person-circle-outline" : "log-out-outline"} size={26} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.filterButtonsContainer}>
          <TouchableOpacity style={[styles.filterButton, selectedFilterType === null && styles.filterButtonActive]} onPress={() => setSelectedFilterType(null)}>
            <Text style={[styles.filterButtonText, selectedFilterType === null && styles.filterButtonTextActive]}>{t("Tous")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterButton, selectedFilterType === 'BAR' && styles.filterButtonActive]} onPress={() => setSelectedFilterType('BAR')}>
            <Text style={[styles.filterButtonText, selectedFilterType === 'BAR' && styles.filterButtonTextActive]}>{t("Bars")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterButton, selectedFilterType === 'RESTAURANT' && styles.filterButtonActive]} onPress={() => setSelectedFilterType('RESTAURANT')}>
            <Text style={[styles.filterButtonText, selectedFilterType === 'RESTAURANT' && styles.filterButtonTextActive]}>{t("Restaurants")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterButton, selectedFilterType === 'BREWERY' && styles.filterButtonActive]} onPress={() => setSelectedFilterType('BREWERY')}>
            <Text style={[styles.filterButtonText, selectedFilterType === 'BREWERY' && styles.filterButtonTextActive]}>{t("Brasseries")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.sideButtons}>
        {isAdmin && (
          <TouchableOpacity style={[styles.sideBtn, {backgroundColor: 'red'}]} onPress={openAdminPanel}>
            <MaterialIcons name="notifications-active" size={20} color="white" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.sideBtn} onPress={handleSuggestPress}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="add-circle" size={18} color="white" />
            <Text style={{color: 'white', fontWeight: 'bold', marginLeft: 5}}>{t("Suggérer")}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.panel, { transform: [{ translateY: slideAnim }] }]}>
        {selectedPlace && (
          <>
            {selectedPlace.imageUrl && <Image source={{ uri: selectedPlace.imageUrl }} style={styles.placeImage} resizeMode="cover" />}
            <View style={styles.panelHeader}>
              <View>
                <Text style={styles.placeTitle}>{selectedPlace.name}</Text>
                {selectedPlace.price != null && <Text style={styles.priceTag}>🍺 Orval: {new Intl.NumberFormat(language, { style: "currency", currency: "EUR" }).format(selectedPlace.price)}</Text>}
                {selectedPlace.placeType && <Text style={styles.placeTypeTag}>{getPlaceTypeDisplayName(selectedPlace.placeType)}</Text>}
              </View>
              <TouchableOpacity onPress={() => setSelectedPlace(null)}><Ionicons name="close" size={24} color="#999" /></TouchableOpacity>
            </View>
            <Text style={styles.placeCity}>📍 {selectedPlace.city}</Text>
            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.navigateBtn} onPress={() => handleNavigation(selectedPlace)}>
                <Ionicons name="navigate" size={18} color="white" style={{marginRight: 5}} />
                <Text style={styles.actionBtnText}>{t("Y Aller")}</Text>
              </TouchableOpacity>
              {!isGuest && selectedPlace.id && (
                <TouchableOpacity
                  style={[styles.visitBtn, {backgroundColor: isPlaceVisited(selectedPlace) ? '#28a745' : '#ff8c00'}]}
                  onPress={() => handleVisitToggle(selectedPlace)}
                >
                  <Ionicons name={isPlaceVisited(selectedPlace) ? "checkmark-circle" : "beer"} size={18} color="white" style={{marginRight: 5}} />
                  <Text style={styles.actionBtnText}>{isPlaceVisited(selectedPlace) ? t("Déjà visité") : t("Je l'ai visité")}</Text>
                </TouchableOpacity>
              )}
              {(isAdmin || isThisMyPlace(selectedPlace)) && (
                <TouchableOpacity style={styles.editBtn} onPress={() => { setEditingPlace(selectedPlace); setIsModalVisible(true); }}>
                  <Ionicons name="create" size={18} color="white" style={{marginRight: 5}} />
                  <Text style={styles.actionBtnText}>{t("Editer")}</Text>
                </TouchableOpacity>
              )}
              {isAdmin && selectedPlace.id && (
                <TouchableOpacity style={[styles.editBtn, {backgroundColor: '#dc3545'}]} onPress={() => handleDeletePlace(selectedPlace.id!)}>
                  <Ionicons name="trash" size={18} color="white" style={{marginRight: 5}} />
                  <Text style={styles.actionBtnText}>{t("Supprimer")}</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </Animated.View>

      <Modal visible={isModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.bottomSheet}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setIsModalVisible(false)}>
              <Ionicons name="close-circle" size={32} color="#ccc" />
            </TouchableOpacity>
            <ScrollView contentContainerStyle={styles.modalScrollViewContent}>
              <Text style={styles.modalTitle}>{editingPlace.id ? t("Modifier le lieu") : t("Suggérer un lieu")}</Text>
              {!editingPlace.id && <Text style={styles.locationInfoText}>{t("Votre position actuelle sera automatiquement utilisée. Veuillez être dans le lieu.")}</Text>}
              {editingPlace.imageUrl && <Image source={{ uri: editingPlace.imageUrl }} style={styles.previewImage} />}
              <TouchableOpacity style={styles.pickImageButton} onPress={pickImage}>
                <Ionicons name="camera" size={20} color="#666" style={{marginRight: 8}} />
                <Text>{t("Photo du lieu")}</Text>
              </TouchableOpacity>
              <TextInput style={styles.input} value={editingPlace.name} onChangeText={t => setEditingPlace(p => ({...p, name: t}))} placeholder={t("Nom du lieu")} placeholderTextColor={placeholderTextColor} />
              <TextInput style={styles.input} value={editingPlace.city} onChangeText={t => setEditingPlace(p => ({...p, city: t}))} placeholder={t("Ville")} placeholderTextColor={placeholderTextColor} />
              <TextInput style={styles.input} value={displayPriceString} keyboardType="decimal-pad" onChangeText={handlePriceInputChange} placeholder={t("Prix de l'Orval (€)")} placeholderTextColor={placeholderTextColor} />
              <TextInput style={[styles.input, { height: 60 }]} value={editingPlace.description} onChangeText={t => setEditingPlace(p => ({...p, description: t}))} placeholder={t("Infos (ex: stock, ambiance...)")} multiline placeholderTextColor={placeholderTextColor} />
              <View style={styles.placeTypeSelectorContainer}>
                <Text style={styles.placeTypeSelectorLabel}>{t("Type de lieu:")}</Text>
                <View style={styles.placeTypeButtons}>
                  <TouchableOpacity style={[styles.placeTypeButton, editingPlace.placeType === 'BAR' && styles.placeTypeButtonActive]} onPress={() => setEditingPlace(p => ({ ...p, placeType: 'BAR' }))}>
                    <Text style={[styles.placeTypeButtonText, editingPlace.placeType === 'BAR' && styles.placeTypeButtonTextActive]}>{t("Bar")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.placeTypeButton, editingPlace.placeType === 'RESTAURANT' && styles.placeTypeButtonActive]} onPress={() => setEditingPlace(p => ({ ...p, placeType: 'RESTAURANT' }))}>
                    <Text style={[styles.placeTypeButtonText, editingPlace.placeType === 'RESTAURANT' && styles.placeTypeButtonTextActive]}>{t("Restaurant")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.placeTypeButton, editingPlace.placeType === 'BREWERY' && styles.placeTypeButtonActive]} onPress={() => setEditingPlace(p => ({ ...p, placeType: 'BREWERY' }))}>
                    <Text style={[styles.placeTypeButtonText, editingPlace.placeType === 'BREWERY' && styles.placeTypeButtonTextActive]}>{t("Brasserie")}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.contentDisclaimerText}>{t("Les utilisateurs sont responsables du contenu qu'ils publient.")}</Text>
              <Text style={styles.contentDisclaimerText}>{t("OrvalMaps peut supprimer tout contenu inapproprié.")}</Text>
            </ScrollView>
            <View style={styles.modalFixedButtonsContainer}>
              <TouchableOpacity style={styles.saveButton} onPress={handleSavePlace} disabled={isUploading}>
                {isUploading ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>{t("Envoyer")}</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsModalVisible(false)}><Text style={styles.cancelButtonText}>{t("Annuler")}</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={isAdminPanelVisible} animationType="fade">
        <SafeAreaView style={{flex: 1, backgroundColor: 'white'}}>
          <View style={{padding: 20, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#eee'}}>
            <Text style={styles.modalTitle}>{t("Demandes en attente")}</Text>
            <TouchableOpacity onPress={() => setIsAdminPanelVisible(false)}><Ionicons name="close" size={28} color="#333" /></TouchableOpacity>
          </View>
          <FlatList
            data={pendingRequests}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={{padding: 20}}
            renderItem={({item}) => (
              <View style={styles.requestCard}>
                <Text style={{fontWeight: 'bold', fontSize: 18}}>{item.name}</Text>
                <Text>📍 {item.city}</Text>
                <Text>Lat: {item.lat?.toFixed(4)}, Lng: {item.lng?.toFixed(4)}</Text>
                <Text>{t("🍺 Prix Orval:")}{" "}{item.price != null ? new Intl.NumberFormat(language, { style: "currency", currency: "EUR" }).format(item.price) : "—"}</Text>
                {item.placeType && <Text>{t("Type:")}{" "}{getPlaceTypeDisplayName(item.placeType)}</Text>}
                <View style={{flexDirection: 'row', marginTop: 15}}>
                  <TouchableOpacity style={styles.approveBtn} disabled={isProcessingRequest} onPress={() => handleValidate(item.id!, true)}><Text style={{color: 'white', fontWeight: 'bold'}}>{t("Valider")}</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.rejectBtn} disabled={isProcessingRequest} onPress={() => handleValidate(item.id!, false)}><Text style={{color: 'white', fontWeight: 'bold'}}>{t("Refuser")}</Text></TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 50, color: '#999'}}>{t("Aucune demande en attente.")}</Text>}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  topContainer: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "column", paddingHorizontal: 10, paddingTop: Platform.OS === 'android' ? 10 : 5, zIndex: 10 },
  topControlsRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  searchBarContainer: { flex: 1, flexDirection: "row", backgroundColor: "white", borderRadius: 25, padding: 3, alignItems: "center", elevation: 3, marginRight: 8 },
  searchInput: { flex: 1, paddingHorizontal: 12, fontSize: 14 },
  iconButton: { padding: 8 },
  circleButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "white", justifyContent: "center", alignItems: "center", elevation: 3 },
  sideButtons: { position: 'absolute', right: 20, bottom: 100, zIndex: 10, alignItems: 'flex-end' },
  sideBtn: { backgroundColor: '#ff8c00', padding: 12, borderRadius: 25, marginBottom: 10, elevation: 5 },
  panel: { position: "absolute", bottom: 0, width: "100%", backgroundColor: "white", padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, elevation: 10, zIndex: 20 },
  panelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  placeImage: { width: "100%", height: 150, borderRadius: 10, marginBottom: 15 },
  placeTitle: { fontSize: 22, fontWeight: "bold" },
  priceTag: { color: '#ff8c00', fontWeight: 'bold', fontSize: 16 },
  placeTypeTag: { fontSize: 14, color: '#666', marginTop: 5 },
  placeCity: { fontSize: 14, color: "#999", marginBottom: 10 },
  actionsContainer: { flexDirection: "row", flexWrap: "wrap", marginTop: 15, gap: 8 },
  navigateBtn: { flexGrow: 1, flexBasis: "45%", backgroundColor: "#ff8c00", padding: 12, borderRadius: 8, alignItems: "center", flexDirection: 'row', justifyContent: 'center' },
  visitBtn: { flexGrow: 1, flexBasis: "45%", padding: 12, borderRadius: 8, alignItems: "center", flexDirection: 'row', justifyContent: 'center' },
  editBtn: { flexGrow: 1, flexBasis: "45%", backgroundColor: "#666", padding: 12, borderRadius: 8, alignItems: "center", flexDirection: 'row', justifyContent: 'center' },
  actionBtnText: { flexShrink: 1, textAlign: "center", color: "white", fontWeight: "bold" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  bottomSheet: { backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "90%", justifyContent: 'space-between', paddingTop: 20 },
  modalScrollViewContent: { paddingHorizontal: 20, flexGrow: 1, paddingTop: 20 },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#ff8c00", marginBottom: 15, textAlign: 'center' },
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
  contentDisclaimerText: { fontSize: 12, color: '#666', textAlign: 'center', marginTop: 10, marginBottom: 5, marginHorizontal: 10 },
  locationInfoText: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 15, marginHorizontal: 10 },
  modalFixedButtonsContainer: { paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 30 : 20, marginTop: 10 },
  cancelButton: { marginTop: 10, alignItems: 'center', paddingVertical: 10 },
  cancelButtonText: { color: '#999', fontSize: 16, fontWeight: 'bold' },
  filterButtonsContainer: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'white', borderRadius: 15, padding: 3, marginTop: 5, elevation: 3, width: '100%' },
  filterButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 4, borderRadius: 12 },
  filterButtonActive: { backgroundColor: '#ff8c00' },
  filterButtonText: { textAlign: 'center', color: '#666', fontWeight: 'bold', fontSize: 12 },
  filterButtonTextActive: { color: 'white' },
  placeTypeSelectorContainer: { marginTop: 10, marginBottom: 15 },
  placeTypeSelectorLabel: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  placeTypeButtons: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#f0f0f0', borderRadius: 10, padding: 5 },
  placeTypeButton: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  placeTypeButtonActive: { backgroundColor: '#ff8c00' },
  placeTypeButtonText: { textAlign: 'center', color: '#666', fontWeight: 'bold' },
  placeTypeButtonTextActive: { color: 'white' },
  modalCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
});
