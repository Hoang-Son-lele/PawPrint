import React from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from "@expo-google-fonts/nunito";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { PetsProvider } from "../src/context/PetsContext";
import { ToastProvider } from "../src/components/Toast";
import { colors } from "../src/theme";
import BottomNav from "../src/components/BottomNav";
import { Logo, PawLoader } from "../src/components/Decor";
import { useReducedMotion } from "../src/hooks/useReducedMotion";

function Splash() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background, gap: 18 }}>
      <Logo size={72} />
      <PawLoader label="Đang mở PawPrint" />
    </View>
  );
}

function RootNavigation() {
  const { user, ready } = useAuth();
  const reduced = useReducedMotion();
  if (!ready) return <Splash />;
  const role = user?.role;
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: reduced ? "none" : "slide_from_right",
          animationDuration: 260,
          gestureEnabled: true,
        }}
      >
        <Stack.Protected guard={!user}>
          <Stack.Screen name="login" options={{ animation: reduced ? "none" : "fade" }} />
          <Stack.Screen name="register" />
        </Stack.Protected>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="index" options={{ animation: reduced ? "none" : "fade" }} />
        </Stack.Protected>
        <Stack.Protected guard={role === "owner"}>
          <Stack.Screen name="profile" options={{ animation: reduced ? "none" : "fade" }} />
          <Stack.Screen name="profile-edit" />
          <Stack.Screen name="moments" options={{ animation: reduced ? "none" : "fade" }} />
          <Stack.Screen name="care" options={{ animation: reduced ? "none" : "fade" }} />
          <Stack.Screen name="timeline" />
          <Stack.Screen name="insights" />
          <Stack.Screen name="cart" />
          <Stack.Screen name="checkout" />
          <Stack.Screen name="orders" />
          <Stack.Screen name="orders/[id]" />
          <Stack.Screen name="pets/new" options={{ animation: reduced ? "none" : "slide_from_bottom" }} />
          <Stack.Screen name="pets/[id]" />
          <Stack.Screen name="pets/[id]/settings" />
        </Stack.Protected>
        <Stack.Protected guard={["owner", "manager", "staff"].includes(role)}>
          <Stack.Screen name="shop" options={{ animation: reduced ? "none" : "fade" }} />
          <Stack.Screen name="products/[id]" />
        </Stack.Protected>
        <Stack.Protected guard={role === "admin"}>
          <Stack.Screen name="admin" />
        </Stack.Protected>
        <Stack.Protected guard={["manager", "staff"].includes(role)}>
          <Stack.Screen name="manage" />
        </Stack.Protected>
      </Stack>
      {role === "owner" && <BottomNav />}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {!fontsLoaded && !fontError ? (
        <Splash />
      ) : (
        <AuthProvider>
          <PetsProvider>
            <ToastProvider>
              <RootNavigation />
            </ToastProvider>
          </PetsProvider>
        </AuthProvider>
      )}
    </SafeAreaProvider>
  );
}
