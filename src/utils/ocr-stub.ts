/**
 * Safe wrapper around expo-text-extractor.
 *
 * Metro statically analyses require() calls and pre-loads every module it
 * finds — including ones that call requireNativeModule() at the top level.
 * In Expo Go that throws before any runtime guard can catch it.
 *
 * This file is the Metro alias for 'expo-text-extractor' (see metro.config.js).
 * It loads the real package at runtime only when the native module is actually
 * registered, so Expo Go gets a safe no-op and a real APK build gets full OCR.
 */

// NativeModules is always safe to import — it's built into every RN runtime.
// In Expo Go, NativeModules.ExpoTextExtractor is absent (the native module
// isn't bundled). In a real build it's present before JS runs.
import { NativeModules } from 'react-native';

const NATIVE_AVAILABLE = 'ExpoTextExtractor' in NativeModules;

export const isSupported: boolean = NATIVE_AVAILABLE;

export async function extractTextFromImage(uri: string): Promise<string[]> {
  if (!NATIVE_AVAILABLE) return [];
  // Use eval so Metro's static analyser doesn't follow this require() and
  // try to pre-load expo-text-extractor during bundling for Expo Go.
  // eslint-disable-next-line no-eval
  const mod = eval("require('expo-text-extractor')") as {
    extractTextFromImage: (uri: string) => Promise<string[]>;
  };
  return mod.extractTextFromImage(uri);
}
