const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Allow metro to bundle .svg files as static assets so expo-image can render them.
config.resolver.assetExts = [...config.resolver.assetExts.filter(ext => ext !== 'svg'), 'svg'];

// Redirect 'expo-text-extractor' to a safe wrapper that guards the native
// require() behind a NativeModules check. This prevents Expo Go from crashing
// at bundle time when the native module isn't registered. In a real APK build
// NativeModules.ExpoTextExtractor is present and the wrapper loads the real
// package via eval() so Metro's static analyser doesn't follow the require.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'expo-text-extractor': path.resolve(__dirname, 'src/utils/ocr-stub.ts'),
};

module.exports = withNativeWind(config, { input: './src/global.css' });
