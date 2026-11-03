import React, { useRef, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import AuthLayout, { ErrorBanner } from "../src/features/auth/AuthLayout";
import FormField from "../src/components/FormField";
import Button from "../src/components/Button";
import Pressy from "../src/components/Pressy";
import { colors, fonts } from "../src/theme";

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [loading, setLoading] = useState(false);
  const lock = useRef(false);
  const passwordRef = useRef(null);

  async function submit() {
    if (lock.current) return;
    setBanner("");
    const e = {};
    if (!email.trim()) e.email = "Nhập email bạn đã đăng ký.";
    if (!password) e.password = "Nhập mật khẩu.";
    setErrors(e);
    if (Object.keys(e).length) return;
    lock.current = true;
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (err) {
      // Giữ nguyên email đã nhập; chỉ báo lỗi ở đúng chỗ.
      if (err.status === 401) {
        setErrors({ password: "Email hoặc mật khẩu chưa đúng. Kiểm tra lại giúp mình nhé." });
        passwordRef.current?.focus();
      } else if (err.status === 400) setErrors({ email: err.message });
      else setBanner(err.message);
    } finally {
      lock.current = false;
      setLoading(false);
    }
  }

  return (
    <AuthLayout compact title="Chào mừng trở lại!" subtitle="Các bé đang chờ bạn viết tiếp câu chuyện hôm nay.">
      <ErrorBanner message={banner} onRetry={banner ? submit : null} />
      <FormField
        label="Email"
        icon="mail-outline"
        placeholder="ban@example.com"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (errors.email) setErrors((x) => ({ ...x, email: "" }));
        }}
        error={errors.email}
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        editable={!loading}
      />
      <FormField
        ref={passwordRef}
        label="Mật khẩu"
        icon="lock-closed-outline"
        placeholder="Nhập mật khẩu"
        password
        autoComplete="current-password"
        textContentType="password"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          if (errors.password) setErrors((x) => ({ ...x, password: "" }));
        }}
        error={errors.password}
        returnKeyType="go"
        onSubmitEditing={submit}
        editable={!loading}
      />
      <Button title="Đăng nhập" size="lg" icon="log-in-outline" loading={loading} loadingText="Đang đăng nhập…" onPress={submit} feedback="medium" full style={{ marginTop: 4 }} />
      <Pressy onPress={() => router.push("/register")} style={styles.link} accessibilityRole="link" accessibilityLabel="Chưa có tài khoản? Đăng ký">
        <Text style={styles.linkText}>
          Chưa có tài khoản? <Text style={styles.linkStrong}>Đăng ký ngay</Text>
        </Text>
      </Pressy>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  link: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 10 },
  linkText: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.inkSoft },
  linkStrong: { fontFamily: fonts.heavy, color: colors.primary },
});
