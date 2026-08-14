// src/screens/PassportScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, FlatList, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { fetchPassportData, fetchVisitedPlaces, PassportData, VisitedPlacesData } from '../api/passport';
import { Ionicons } from '@expo/vector-icons';

const badgeRules = [
  { title: "Badges de Découverte", description: "Basés sur le nombre de lieux différents visités." },
  { name: "Première découverte", condition: "1 lieu visité" },
  { name: "Explorateur", condition: "5 lieux visités" },
  { name: "Aventurier", condition: "10 lieux visités" },
  { name: "Connaisseur", condition: "25 lieux visités" },
  { name: "Grand explorateur", condition: "50 lieux visités" },
  { title: "Badges de Contribution", description: "Basés sur le nombre de vos suggestions de lieux qui ont été validées." },
  { name: "Éclaireur", condition: "1 suggestion validée" },
  { name: "Cartographe", condition: "5 suggestions validées" },
];

export default function PassportScreen() {
  const { isGuest, showLogin, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [passportData, setPassportData] = useState<PassportData | null>(null);
  const [visitedPlaces, setVisitedPlaces] = useState<VisitedPlacesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRulesModalVisible, setIsRulesModalVisible] = useState(false);

  useEffect(() => {
    if (!isGuest) {
      const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
          const passport = await fetchPassportData(API_BASE_URL);
          setPassportData(passport);
        } catch (e) {
          setError("Impossible de charger les données du passeport.");
        }

        try {
          const visits = await fetchVisitedPlaces(API_BASE_URL);
          setVisitedPlaces(visits);
        } catch (e) {
          // Ne pas bloquer l'affichage si seulement cet appel échoue
        }

        setLoading(false);
      };
      loadData();
    }
  }, [isGuest]);

  if (isGuest) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.loginPrompt}>Connectez-vous pour voir votre passeport.</Text>
          <TouchableOpacity style={styles.loginButton} onPress={showLogin}>
            <Text style={styles.loginButtonText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#ff8c00" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !passportData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text>{error || "Impossible de charger les données."}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { nextGoal } = passportData;
  const progress = nextGoal.target > 0 ? (nextGoal.current / nextGoal.target) * 100 : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Mon Passeport Orval</Text>
        <Text style={styles.username}>{user?.username}</Text>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{passportData.visitedPlaces}</Text>
            <Text style={styles.statLabel}>Lieux découverts</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{passportData.visitedCities}</Text>
            <Text style={styles.statLabel}>Villes explorées</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prochain Objectif</Text>
          <Text style={styles.goalText}>Objectif : {nextGoal.name}</Text>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{nextGoal.current} / {nextGoal.target}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Badges</Text>
            <TouchableOpacity onPress={() => setIsRulesModalVisible(true)}>
              <Ionicons name="information-circle-outline" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.badgesContainer}>
            {passportData.badges.map((badge, index) => (
              <View key={index} style={styles.badge}>
                <Ionicons name={badge.unlocked ? "shield-checkmark" : "shield-outline"} size={24} color={badge.unlocked ? "#ff8c00" : "#ccc"} />
                <Text style={[styles.badgeName, !badge.unlocked && styles.badgeNameLocked]}>{badge.name}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mes Contributions</Text>
          <View style={styles.contributions}>
            <Text>Total : {passportData.suggestions.total}</Text>
            <Text style={{color: 'green'}}>✓ {passportData.suggestions.approved} validées</Text>
            <Text style={{color: 'orange'}}>⏳ {passportData.suggestions.pending} en attente</Text>
          </View>
        </View>

        {visitedPlaces && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mes Découvertes ({visitedPlaces.count})</Text>
            <FlatList
              data={visitedPlaces.places}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.placeItem}>
                  <Text style={styles.placeName}>{item.name}</Text>
                  <Text style={styles.placeCity}>{item.city}</Text>
                </View>
              )}
              scrollEnabled={false}
            />
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isRulesModalVisible}
        onRequestClose={() => setIsRulesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Règles des Badges</Text>
            <FlatList
              data={badgeRules}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                item.title ? (
                  <Text style={styles.ruleCategory}>{item.title}</Text>
                ) : (
                  <View style={styles.ruleItem}>
                    <Text style={styles.ruleName}>{item.name}</Text>
                    <Text style={styles.ruleCondition}>{item.condition}</Text>
                  </View>
                )
              )}
            />
            <TouchableOpacity style={styles.closeButton} onPress={() => setIsRulesModalVisible(false)}>
              <Text style={styles.closeButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#333' },
  username: { fontSize: 20, color: '#666', marginBottom: 20 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  statBox: { backgroundColor: 'white', padding: 20, borderRadius: 10, alignItems: 'center', width: '48%', elevation: 2 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#ff8c00' },
  statLabel: { fontSize: 14, color: '#666', marginTop: 5 },
  section: { backgroundColor: 'white', padding: 20, borderRadius: 10, marginBottom: 20, elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold' },
  goalText: { marginBottom: 5 },
  progressBarBackground: { height: 20, backgroundColor: '#e0e0e0', borderRadius: 10, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#ff8c00', borderRadius: 10 },
  progressText: { textAlign: 'right', marginTop: 5, color: '#666' },
  badgesContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  badge: { alignItems: 'center', width: '33%', marginBottom: 15 },
  badgeName: { fontSize: 12, marginTop: 5, textAlign: 'center' }, // Ajout de textAlign: 'center'
  badgeNameLocked: { color: '#ccc' },
  contributions: { gap: 5 },
  placeItem: { borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 15 },
  placeName: { fontSize: 16, fontWeight: 'bold' },
  placeCity: { color: '#666' },
  loginPrompt: { fontSize: 18, color: '#666', textAlign: 'center', marginBottom: 20 },
  loginButton: { backgroundColor: '#ff8c00', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8 },
  loginButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  // Modal Styles
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 10, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  ruleCategory: { fontSize: 18, fontWeight: 'bold', marginTop: 15, marginBottom: 10, color: '#ff8c00' },
  ruleItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  ruleName: { fontSize: 16 },
  ruleCondition: { fontSize: 16, color: '#666' },
  closeButton: { backgroundColor: '#ff8c00', padding: 12, borderRadius: 8, marginTop: 20, alignItems: 'center' },
  closeButtonText: { color: 'white', fontWeight: 'bold' },
});
