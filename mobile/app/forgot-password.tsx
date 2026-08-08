import axios from "axios";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Colors, Radius, Spacing } from "../constants/appTheme";
import { getErrorMessage } from "../utils";

const BASE_URL = "https://voice-stress-detector.onrender.com";

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRequestCode = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/auth/forgot-password`, { email });
      setMessage(res.data.message);
      setStep("reset");
    } catch (e: any) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError("");
    setLoading(true);
    try {
      await axios.post(`${BASE_URL}/api/auth/reset-password`, {
        email,
        code,
        new_password: newPassword,
      });
      router.replace("/");
    } catch (e: any) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.container}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          {step === "request"
            ? "Enter your email and we'll send you a reset code"
            : "Enter the code we emailed you, and your new password"}
        </Text>

        <View style={styles.card}>
          {step === "request" ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={Colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity style={styles.button} onPress={handleRequestCode} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? "..." : "Send Reset Code"}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {message ? <Text style={styles.info}>{message}</Text> : null}
              <TextInput
                style={styles.input}
                placeholder="6-digit code"
                placeholderTextColor={Colors.textSecondary}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TextInput
                style={styles.input}
                placeholder="New password"
                placeholderTextColor={Colors.textSecondary}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? "..." : "Reset Password"}</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={() => router.replace("/")} style={{ marginTop: Spacing.md }}>
            <Text style={styles.backLink}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, justifyContent: "center", padding: Spacing.lg },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center", color: Colors.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: "center", marginBottom: Spacing.lg },
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
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    padding: 14,
    marginBottom: Spacing.sm,
    color: Colors.textPrimary,
  },
  info: { color: Colors.textSecondary, fontSize: 13, marginBottom: Spacing.md, textAlign: "center" },
  error: { color: Colors.danger, marginBottom: Spacing.sm, fontSize: 13 },
  button: { backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: Radius.sm, alignItems: "center", marginTop: Spacing.sm },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  backLink: { color: Colors.primary, textAlign: "center", fontWeight: "600", fontSize: 13 },
});