import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { palette } from "../src/theme";

function RootNavigation() {
  const { user, ready } = useAuth();
  if (!ready)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.primary },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: palette.background },
      }}
    >
      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ title: "Đăng ký" }} />
      </Stack.Protected>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="index" options={{ title: "PawPrint", headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={user?.role === "owner"}>
        <Stack.Screen name="profile" options={{ title: "Hồ sơ cá nhân" }} />
        <Stack.Screen name="moments" options={{ title: "Khoảnh khắc" }} />
        <Stack.Screen name="care" options={{ title: "Nhật ký chăm sóc" }} />
        <Stack.Screen name="timeline" options={{ title: "Hành trình" }} />
        <Stack.Screen
          name="insights"
          options={{ title: "Nhắc nhở & tổng kết" }}
        />
        <Stack.Screen name="cart" options={{ title: "Giỏ hàng" }} />
        <Stack.Screen name="orders" options={{ title: "Đơn hàng" }} />
        <Stack.Screen
          name="orders/[id]"
          options={{ title: "Chi tiết đơn hàng" }}
        />
        <Stack.Screen name="pets/new" options={{ title: "Thêm thú cưng" }} />
        <Stack.Screen name="pets/[id]" options={{ title: "Hồ sơ thú cưng" }} />
        <Stack.Screen
          name="pets/[id]/settings"
          options={{ title: "Cài đặt thú cưng" }}
        />
      </Stack.Protected>
      <Stack.Protected guard={["owner", "manager", "staff"].includes(user?.role)}>
        <Stack.Screen name="shop" options={{ title: "Pet Shop" }} />
        <Stack.Screen name="products/[id]" options={{ title: "Sản phẩm" }} />
      </Stack.Protected>
      <Stack.Protected guard={user?.role === "admin"}>
        <Stack.Screen name="admin" options={{ title: "Quản lý tài khoản" }} />
      </Stack.Protected>
      <Stack.Protected guard={["manager", "staff"].includes(user?.role)}>
        <Stack.Screen name="manage" options={{ title: "Quản lý cửa hàng" }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigation />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
