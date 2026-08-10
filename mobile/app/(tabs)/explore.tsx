import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors, Radius, Spacing } from "../../constants/appTheme";
import { getErrorMessage } from "../../utils";

const BASE_URL = "https://voice-stress-detector.onrender.com";
const RECORDING_SECONDS = 10;

export default function RecordScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RECORDING_SECONDS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const checkAuth = async () => {
        const token = await SecureStore.getItemAsync("token");
        if (!token) {
          router.replace("/");
        } else if (active) {
          setCheckingAuth(false);
        }
      };
      setCheckingAuth(true);
      checkAuth();
      return () => {
        active = false;
      };
    }, [])
  );

  const handleLogout = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    await SecureStore.deleteItemAsync("token");
    router.replace("/");
  };

  const startRecording = async () => {
    setError("");

    try {
      // Defensive cleanup: if a previous recording object is still lingering
      // (this is what causes the "second recording never starts" bug),
      // force it to stop and release the microphone before starting a new one.
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (cleanupErr) {
          // ignore - it may already be stopped/unloaded
        }
        recordingRef.current = null;
      }

      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        setError("Microphone permission is required.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = newRecording;
      setRecording(newRecording);
      setSecondsLeft(RECORDING_SECONDS);

      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            finishRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (e: any) {
      setError("Could not start recording. Please try again. (" + (e.message || "unknown error") + ")");
    }
  };

  const finishRecording = async () => {
    const activeRecording = recordingRef.current;
    if (!activeRecording) return;

    setLoading(true);
    setError("");
    setRecording(null);
    recordingRef.current = null;

    try {
      await activeRecording.stopAndUnloadAsync();

      // IMPORTANT: release the microphone session explicitly. Without this,
      // some Android devices silently refuse to start a second recording.
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const uri = activeRecording.getURI();

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
        {recording ? `Recording... ${secondsLeft}s` : "Record your voice"}
      </Text>
      <Text style={styles.subtitle}>
        {recording ? "Stays on for 10 seconds, then stops automatically" : "Tap start and speak naturally"}
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: Spacing.lg }} />
      ) : recording ? (
        <View style={[styles.button, styles.recordingIndicator]}>
          <Text style={styles.buttonText}>Recording...</Text>
        </View>
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
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.lg, backgroundColor: Colors.background },
  circleWrap: { marginBottom: Spacing.lg },
  circle: {
    width: 140, height: 140, borderRadius: 70, backgroundColor: Colors.card,
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  circleActive: { backgroundColor: "#FFECEC" },
  circleEmoji: { fontSize: 56 },
  title: { fontSize: 20, fontWeight: "700", color: Colors.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.lg, textAlign: "center" },
  error: { color: Colors.danger, marginBottom: Spacing.md, textAlign: "center" },
  button: { paddingVertical: 16, paddingHorizontal: 36, borderRadius: Radius.md },
  startButton: { backgroundColor: Colors.primary },
  recordingIndicator: { backgroundColor: Colors.danger, opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});