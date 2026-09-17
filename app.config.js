try {
  require('dotenv').config();
} catch (e) {}

module.exports = {
  expo: {
    name: "OrvalMaps",
    slug: "OrvalMaps",
    version: "1.0.2",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    scheme: "orvalmaps", // Ajout du scheme pour le deep linking
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.orvalmaps.app",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "OrvalMaps utilise votre position pour afficher les lieux proches et valider vos visites.",
        NSPhotoLibraryUsageDescription: "OrvalMaps accède à vos photos pour ajouter une image à un lieu.",
        ITSAppUsesNonExemptEncryption: false
      }
    },
    plugins: [
      "expo-font",
      [
        "expo-image-picker",
        {
          photosPermission: "OrvalMaps accède à vos photos pour ajouter une image à un lieu.",
          cameraPermission: false,
          microphonePermission: false
        }
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission: "OrvalMaps utilise votre position pour afficher les lieux proches et valider vos visites."
        }
      ]
    ],
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.gmail.orvalmaps",
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY || ""
        }
      }
    },
    extra: {
      eas: {
        projectId: "05e5cfef-83fd-4db5-a354-46790ee4b3b8"
      }
    }
  }
};
