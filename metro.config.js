const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Allow metro to bundle .svg files as static assets so expo-image can render them.
config.resolver.assetExts = [...config.resolver.assetExts.filter(ext => ext !== 'svg'), 'svg'];

module.exports = withNativeWind(config, { input: './src/global.css' });
