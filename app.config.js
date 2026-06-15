try {
  require('dotenv').config();
} catch (e) {}

module.exports = {
  expo: {
    name: "OrvalMaps",
    slug: "OrvalMaps",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.brantz.pierre.OrvalMaps",
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || ""
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.gmail.orvalmaps", // Assurez-vous que ce nom de package correspond à celui de votre application sur Google Play Console
      // ATTENTION: usesCleartextTraffic: true permet les requêtes HTTP non sécurisées.
      // Pour la production, il est FORTEMENT recommandé d'utiliser HTTPS pour toutes les communications API.
      // Si votre backend n'est pas en HTTPS, cela peut causer des problèmes de sécurité et de fonctionnement sur certains appareils/versions d'Android.
      usesCleartextTraffic: true,
      versionCode: 6, // IMPORTANT: Incrémentez ce nombre à chaque nouvelle version pour le Play Store
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY || ""
        }
      },
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE"
      ]
    },
    extra: {
      eas: {
        projectId: "05e5cfef-83fd-4db5-a354-46790ee4b3b8"
      }
    }
  }
};
