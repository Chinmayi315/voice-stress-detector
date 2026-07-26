import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Button, StyleSheet, Text, View } from "react-native";

export default function ResultsScreen() {
  const { result } = useLocalSearchParams();
  const router = useRouter();

  const data = result ? JSON.parse(result as string) : null;

  if (!data) {
    return (
      <View style={styles.container}>
        <Text>No result data found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.percent}>{data.stress_percent}%</Text>
      <Text style={styles.level}>{data.level}</Text>
      <Text style={styles.confidence}>{data.confidence_label} ({data.confidence_percent}%)</Text>

      <Text style={styles.sectionTitle}>Advice</Text>
      {data.advice.map((item: string, i: number) => (
        <Text key={i} style={styles.adviceItem}>• {item}</Text>
      ))}

      <Text style={styles.sectionTitle}>What drove this result</Text>
      <Text style={styles.breakdownItem}>Vocal tone: {data.feature_breakdown.mfcc_contribution}%</Text>
      <Text style={styles.breakdownItem}>Pitch: {data.feature_breakdown.chroma_contribution}%</Text>
      <Text style={styles.breakdownItem}>Energy: {data.feature_breakdown.mel_contribution}%</Text>

      <View style={{ height: 30 }} />
      <Button title="Record Again" onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  percent: { fontSize: 48, fontWeight: "bold", textAlign: "center" },
  level: { fontSize: 20, textAlign: "center", marginBottom: 20, color: "#555" },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginTop: 20, marginBottom: 8 },
  adviceItem: { fontSize: 14, marginBottom: 4 },
  breakdownItem: { fontSize: 14, marginBottom: 4 },
  confidence: { fontSize: 13, textAlign: "center", marginBottom: 20, color: "#888", fontStyle: "italic" },
});