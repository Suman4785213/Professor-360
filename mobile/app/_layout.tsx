import { useEffect } from "react";
import { Stack } from "expo-router";
import { QueryClientProvider, focusManager } from "@tanstack/react-query";
import { AppState } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useSession } from "../src/store/session";
import { Screen, Brand, Loading, ErrorState } from "../src/components/ui";
import { queryClient, restore, offlineQa } from "../src/services/runtime";
void SplashScreen.preventAutoHideAsync().catch(() => {});
export default function Layout() {
  const ready = useSession((s) => s.ready);
  useEffect(() => {
    if (offlineQa) {
      void SplashScreen.hideAsync().catch(() => {});
      return;
    }
    void restore()
      .finally(() => SplashScreen.hideAsync())
      .catch(() => {});
    const sub = AppState.addEventListener("change", (s) =>
      focusManager.setFocused(s === "active"),
    );
    return () => sub.remove();
  }, []);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        {offlineQa ? (
          <Screen>
            <Brand />
            <ErrorState message="QA release build: an authorized HTTPS backend is not configured. Login and live workflows are unavailable. Rebuild with the authorized endpoint to continue validation." />
          </Screen>
        ) : ready ? (
          <Stack screenOptions={{ headerShown: false }} />
        ) : (
          <Screen>
            <Brand />
            <Loading />
          </Screen>
        )}
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
