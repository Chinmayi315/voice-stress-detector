import axios from "axios";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Colors, Radius, Spacing } from "../constants/appTheme";
import { getErrorMessage } from "../utils";

const BASE_URL = "https://voice-stress-detector.onrender.com";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkExistingLogin = async () => {
      const token = await SecureStore.getItemAsync("token");
      if (token) {
        router.replace("/(tabs)/explore");
      } else {
        setCheckingSession(false);
      }
    };
    checkExistingLogin();
  }, []);

  const handleRegister = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/auth/register`, { email, password });
      await SecureStore.setItemAsync("token", res.data.access_token);
      router.replace("/(tabs)/explore");
    } catch (e: any) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/auth/login`, { email, password });
      await SecureStore.setItemAsync("token", res.data.access_token);
      router.replace("/(tabs)/explore");
    } catch (e: any) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.container}>
        <Text style={styles.emoji}>🎙️</Text>
        <Text style={styles.title}>Voice Stress Detector</Text>
        <Text style={styles.subtitle}>Log in or create an account to begin</Text>

        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor={Colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.toggleText}>{showPassword ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleLogin} disabled={loading}>
            <Text style={styles.primaryButtonText}>{loading ? "..." : "Login"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleRegister} disabled={loading}>
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background },
  container: { flex: 1, justifyContent: "center", padding: Spacing.lg },
  emoji: { fontSize: 48, textAlign: "center", marginBottom: Spacing.sm },
  title: { fontSize: 26, fontWeight: "700", textAlign: "center", color: Colors.textPrimary },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: "center", marginTop: 6, marginBottom: Spacing.lg },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, padding: 14, marginBottom: Spacing.sm, color: Colors.textPrimary },
  passwordRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, marginBottom: Spacing.md, paddingRight: 14 },
  passwordInput: { flex: 1, padding: 14, color: Colors.textPrimary },
  toggleText: { color: Colors.primary, fontWeight: "600", fontSize: 13 },
  error: { color: Colors.danger, marginBottom: Spacing.sm, fontSize: 13 },
  button: { paddingVertical: 14, borderRadius: Radius.sm, alignItems: "center", marginTop: Spacing.sm },
  primaryButton: { backgroundColor: Colors.primary },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  secondaryButton: { backgroundColor: "transparent" },
  secondaryButtonText: { color: Colors.primary, fontWeight: "600", fontSize: 14 },
});