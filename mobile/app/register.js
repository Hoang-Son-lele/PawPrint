import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useAuth } from "../src/context/AuthContext";
import {
  Caption,
  ErrorText,
  Page,
  PrimaryButton,
  TextField,
  Title,
} from "../src/components/UI";

export default function Register() {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    setError("");
    if (password.length < 8) return setError("Mật khẩu cần tối thiểu 8 ký tự.");
    setLoading(true);
    try {
      await signUp(name, email, password);
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
          contentContainerStyle={{ paddingVertical: 28 }}
          keyboardShouldPersistTaps="handled"
        >
          <Title>Tạo tài khoản</Title>
          <Caption>
            Một nơi nhỏ để lưu những câu chuyện lớn cùng thú cưng.
          </Caption>
          <View style={{ marginTop: 18 }}>
            <TextField
              label="Tên của bạn"
              placeholder="Tên hiển thị"
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
            />
            <TextField
              label="Email"
              placeholder="ban@example.com"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextField
              label="Mật khẩu"
              placeholder="Ít nhất 8 ký tự"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <ErrorText error={error} />
            <PrimaryButton
              title="Tạo tài khoản"
              loading={loading}
              onPress={submit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Page>
  );
}
