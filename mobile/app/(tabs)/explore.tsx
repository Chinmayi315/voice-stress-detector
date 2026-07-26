import axios from "axios";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getErrorMessage } from "../../utils";

const BASE_URL = "https://voice-stress-detector.onrender.com";

export default function RecordScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

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
      console.log("PREDICT ERROR:", JSON.stringify(e, null, 2));
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Record your voice</Text>
      <Text style={styles.subtitle}>Speak naturally for a few seconds</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 30 }} />
      ) : recording ? (
        <TouchableOpacity style={[styles.button, styles.stopButton]} onPress={stopRecording}>
          <Text style={styles.buttonText}>Stop Recording</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.button} onPress={startRecording}>
          <Text style={styles.buttonText}>Start Recording</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 30 },
  button: { backgroundColor: "#007AFF", paddingVertical: 14, paddingHorizontal: 30, borderRadius: 10 },
  stopButton: { backgroundColor: "#FF3B30" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  error: { color: "red", marginBottom: 15, textAlign: "center" },
});