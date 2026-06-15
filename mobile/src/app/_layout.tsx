import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
} from "@expo-google-fonts/figtree";
import {
  NotoSans_400Regular,
  NotoSans_500Medium,
  NotoSans_600SemiBold,
} from "@expo-google-fonts/noto-sans";
import { colors } from "@/lib/theme";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
    NotoSans_400Regular,
    NotoSans_500Medium,
    NotoSans_600SemiBold,
  });

  // Hold on the native splash until the type system is ready, so the UI never
  // flashes in a fallback font.
  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor={colors.bg} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: "slide_from_right",
          }}
        />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
