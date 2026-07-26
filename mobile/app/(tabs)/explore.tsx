import axios from "axios";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors, Radius, Spacing } from "../../constants/appTheme";
import { getErrorMessage } from "../../utils";

const BASE_URL = "https://voice-stress-detector.onrender.com";

export default function RecordScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();
  const handleLogout = async () => {
    await SecureStore.deleteItemAsync("token");
    router.replace("/");
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        router.replace("/");
      } else {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  const startRecording = async () => {
    setError("");
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") {
      setError("Microphone permission is required.");
      return;
    }

    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    setRecording(recording);
  };

  const stopRecording = async () => {
    if (!recording) return;
    setLoading(true);
    setError("");

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      const token = await SecureStore.getItemAsync("token");
      const formData = new FormData();
      formData.append("file", {
        uri: uri as string,
        name: "voice.m4a",
        type: "audio/m4a",
      } as any);

      const res = await axios.post(`${BASE_URL}/api/stress/predict`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      router.push({ pathname: "/modal", params: { result: JSON.stringify(res.data) } });
    } catch (e: any) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.circleWrap}>
        <View style={[styles.circle, recording && styles.circleActive]}>
          <Text style={styles.circleEmoji}>{recording ? "🔴" : "🎙️"}</Text>
        </View>
      </View>

      <Text style={styles.title}>
        {recording ? "Recording..." : "Record your voice"}
      </Text>
      <Text style={styles.subtitle}>
        {recording ? "Speak naturally, then tap stop" : "Speak naturally for a few seconds"}
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: Spacing.lg }} />
      ) : recording ? (
        <TouchableOpacity style={[styles.button, styles.stopButton]} onPress={stopRecording}>
          <Text style={styles.buttonText}>Stop Recording</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.button, styles.startButton]} onPress={startRecording}>
          <Text style={styles.buttonText}>Start Recording</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={handleLogout} style={{ marginTop: 24 }}>
        <Text style={{ color: Colors.textSecondary, fontSize: 13 }}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
    backgroundColor: Colors.background,
  },
  circleWrap: { marginBottom: Spacing.lg },
  circle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.card,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  circleActive: { backgroundColor: "#FFECEC" },
  circleEmoji: { fontSize: 56 },
  title: { fontSize: 20, fontWeight: "700", color: Colors.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.lg, textAlign: "center" },
  error: { color: Colors.danger, marginBottom: Spacing.md, textAlign: "center" },
  button: { paddingVertical: 16, paddingHorizontal: 36, borderRadius: Radius.md },
  startButton: { backgroundColor: Colors.primary },
  stopButton: { backgroundColor: Colors.danger },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});