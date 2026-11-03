import React, { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import AuthLayout, { ErrorBanner } from "../src/features/auth/AuthLayout";
import FormField from "../src/components/FormField";
import Button from "../src/components/Button";
import Pressy from "../src/components/Pressy";
import { colors, fonts } from "../src/theme";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Register() {
  const { signUp } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [loading, setLoading] = useState(false);
  const lock = useRef(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = "Hãy cho PawPrint biết tên của bạn.";
    else if (form.name.trim().length > 100) e.name = "Tên hiển thị tối đa 100 ký tự.";
    if (!EMAIL.test(form.email.trim())) e.email = "Email chưa đúng định dạng, ví dụ: ban@example.com";
    if (form.password.length < 8) e.password = "Mật khẩu cần ít nhất 8 ký tự.";
    else if (form.password.length > 72) e.password = "Mật khẩu tối đa 72 ký tự.";
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function submit() {
    if (lock.current) return; // chặn gửi nhiều lần
    setBanner("");
    if (!validate()) return;
    lock.current = true;
    setLoading(true);
    try {
      await signUp(form.name.trim(), form.email.trim().toLowerCase(), form.password);
      // Thành công: điều hướng tự động sang Trang chủ với lời chào cá nhân hóa.
    } catch (e) {
      if (e.status === 409) setErrors((x) => ({ ...x, email: "Email này đã được đăng ký. Bạn thử đăng nhập nhé." }));
      else if (e.status === 400) setBanner(e.message);
      else setBanner(e.message);
    } finally {
      lock.current = false;
      setLoading(false);
    }
  }

  const strength = form.password.length >= 12 ? 3 : form.password.length >= 8 ? 2 : form.password.length ? 1 : 0;

  return (
    <AuthLayout title="Tạo tài khoản" subtitle="Một nơi nhỏ để lưu những câu chuyện lớn cùng thú cưng.">
      <ErrorBanner message={banner} onRetry={banner ? submit : null} />
      <FormField
        label="Tên hiển thị"
        required
        icon="person-outline"
        placeholder="Ví dụ: Minh Anh"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        value={form.name}
        onChangeText={set("name")}
        error={errors.name}
        maxLength={100}
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        editable={!loading}
      />
      <FormField
        ref={emailRef}
        label="Email"
        required
        icon="mail-outline"
        placeholder="ban@example.com"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        value={form.email}
        onChangeText={set("email")}
        error={errors.email}
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        editable={!loading}
      />
      <FormField
        ref={passwordRef}
        label="Mật khẩu"
        required
        icon="lock-closed-outline"
        placeholder="Ít nhất 8 ký tự"
        password
        autoComplete="new-password"
        textContentType="newPassword"
        value={form.password}
        onChangeText={set("password")}
        error={errors.password}
        hint={!errors.password ? "Dùng 8–72 ký tự, nên kết hợp chữ và số." : undefined}
        returnKeyType="go"
        onSubmitEditing={submit}
        editable={!loading}
      />
      {strength > 0 && !errors.password && (
        <View style={styles.strength} accessibilityLabel={`Độ mạnh mật khẩu: ${["", "yếu", "khá", "tốt"][strength]}`}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={[styles.seg, i <= strength && { backgroundColor: [colors.danger, colors.accent, colors.success][strength - 1] }]} />
          ))}
          <Text style={styles.strengthText}>{["", "Yếu", "Khá", "Tốt"][strength]}</Text>
        </View>
      )}
      <View style={styles.ctaWrap}>
        <Button title="Tạo tài khoản" variant="accent" size="lg" icon="paw" loading={loading} loadingText="Đang tạo tài khoản…" onPress={submit} feedback="medium" full />
      </View>
      <Pressy onPress={() => router.replace("/login")} style={styles.link} accessibilityRole="link" accessibilityLabel="Đã có tài khoản? Đăng nhập">
        <Text style={styles.linkText}>
          Đã có tài khoản? <Text style={styles.linkStrong}>Đăng nhập</Text>
        </Text>
      </Pressy>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  strength: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: -6, marginBottom: 12 },
  seg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.border },
  strengthText: { fontFamily: fonts.heavy, fontSize: 12, color: colors.inkSoft, width: 34, textAlign: "right" },
  ctaWrap: { backgroundColor: colors.primary, borderRadius: 22, padding: 8, marginTop: 6 },
  link: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 10 },
  linkText: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.inkSoft },
  linkStrong: { fontFamily: fonts.heavy, color: colors.primary },
});
