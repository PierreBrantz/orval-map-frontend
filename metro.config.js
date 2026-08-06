// metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configuration pour react-native-maps sur le web
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-native-maps': require.resolve('react-native-web-maps'),
};

module.exports = config;
