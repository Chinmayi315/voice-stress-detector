import axios from "axios";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useState } from "react";
import { Button, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { getErrorMessage } from "../../utils";

const BASE_URL = "https://voice-stress-detector.onrender.com";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleRegister = async () => {
    setError("");
    try {
      const res = await axios.post(`${BASE_URL}/api/auth/register`, { email, password });
      await SecureStore.setItemAsync("token", res.data.access_token);
      router.push("/explore");
    } catch (e: any) {
      console.log("FULL ERROR:", JSON.stringify(e, null, 2));
      setError(getErrorMessage(e));
    }
  };

  const handleLogin = async () => {
    setError("");
    try {
      const res = await axios.post(`${BASE_URL}/api/auth/login`, { email, password });
      await SecureStore.setItemAsync("token", res.data.access_token);
      router.push("/explore");
    } catch (e: any) {
      console.log("FULL ERROR:", JSON.stringify(e, null, 2));
      setError(getErrorMessage(e));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Stress Detector</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <View style={styles.passwordRow}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Text style={styles.toggleText}>{showPassword ? "Hide" : "Show"}</Text>
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Register" onPress={handleRegister} />
      <View style={{ height: 10 }} />
      <Button title="Login" onPress={handleLogin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 30, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, marginBottom: 12 },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 12,
    paddingRight: 12,
  },
  passwordInput: { flex: 1, padding: 12 },
  toggleText: { color: "#007AFF", fontWeight: "600" },
  error: { color: "red", marginBottom: 10 },
});