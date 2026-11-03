import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import {
  Caption,
  ErrorText,
  Page,
  PrimaryButton,
  TextField,
  Title,
} from "../src/components/UI";
import { palette } from "../src/theme";

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Page>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logo}>
            <Text style={styles.logoText}>🐾</Text>
          </View>
          <Title>Chào mừng đến PawPrint</Title>
          <Caption>
            Every Paw Leaves a Story. Lưu lại hành trình bên thú cưng của bạn.
          </Caption>
          <View style={{ marginTop: 28 }}>
            <TextField
              label="Email"
              placeholder="ban@example.com"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
            <TextField
              label="Mật khẩu"
              placeholder="Nhập mật khẩu"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <ErrorText error={error} />
            <PrimaryButton
              title="Đăng nhập"
              loading={loading}
              onPress={submit}
            />
            <PrimaryButton
              title="Chưa có tài khoản? Đăng ký"
              variant="secondary"
              onPress={() => router.push("/register")}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Page>
  );
}
const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: "center", paddingVertical: 40 },
  logo: {
    width: 76,
    height: 76,
    backgroundColor: palette.gold,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  logoText: { fontSize: 37 },
});
