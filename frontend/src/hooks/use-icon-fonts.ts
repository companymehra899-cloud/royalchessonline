// Icon font loader for Expo apps. The MaterialCommunityIcons font is loaded
// from a CDN only under Expo Go (StoreClient) — that's where @expo/vector-icons'
// .ttf files come back as 0 bytes from Metro's asset resolver on Android.
// Native dev/prod builds and web pass an empty map, so useFonts resolves to
// [true, null] immediately via react-native-vector-icons autolinking / web stubs.
// ICON_VECTOR_VERSION must match @expo/vector-icons in package.json.
// Usage: const [loaded, error] = useIconFonts();

import Constants, { ExecutionEnvironment } from "expo-constants";
import { useFonts } from "expo-font";

const ICON_VECTOR_VERSION = "15.1.1";

const cdnUrl = (file: string): string =>
  `https://cdn.jsdelivr.net/npm/@expo/vector-icons@${ICON_VECTOR_VERSION}/build/vendor/react-native-vector-icons/Fonts/${file}.ttf`;

// Only MaterialCommunityIcons is used in this app — loading just that font
// avoids downloading ~4MB of unused icon fonts on Expo Go startup.
const ICON_FONTS: Record<string, string> = {
  "material-community": cdnUrl("MaterialCommunityIcons"),
};

export const useIconFonts = (): readonly [boolean, Error | null] =>
  useFonts(
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
      ? ICON_FONTS
      : {},
  );
