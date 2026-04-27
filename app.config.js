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
      package: "com.brantz.pierre.OrvalMaps",
      usesCleartextTraffic: true,
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
