import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors, Radius, Spacing, stressColor } from "../constants/appTheme";

export default function ResultsScreen() {
  const { result } = useLocalSearchParams();
  const router = useRouter();

  const data = result ? JSON.parse(result as string) : null;

  if (!data) {
    return (
      <View style={styles.center}>
        <Text>No result data found.</Text>
      </View>
    );
  }

  const levelColor = stressColor(data.level);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <View style={[styles.resultCard, { borderColor: levelColor }]}>
        <Text style={[styles.percent, { color: levelColor }]}>{data.stress_percent}%</Text>
        <Text style={styles.level}>{data.level}</Text>
        <Text style={styles.confidence}>
          {data.confidence_label} ({data.confidence_percent}%)
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Advice</Text>
        {data.advice.map((item: string, i: number) => (
          <View key={i} style={styles.adviceRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.adviceItem}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>What drove this result</Text>
        <BreakdownBar label="Vocal tone" value={data.feature_breakdown.mfcc_contribution} />
        <BreakdownBar label="Pitch" value={data.feature_breakdown.chroma_contribution} />
        <BreakdownBar label="Energy" value={data.feature_breakdown.mel_contribution} />
      </View>

      <TouchableOpacity style={styles.button} onPress={() => router.back()}>
        <Text style={styles.buttonText}>Record Again</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function BreakdownBar({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.breakdownRow}>
      <View style={styles.breakdownLabelRow}>
        <Text style={styles.breakdownLabel}>{label}</Text>
        <Text style={styles.breakdownValue}>{value}%</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${value}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.lg, paddingTop: Spacing.xl },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  resultCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 2,
    padding: Spacing.lg,
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  percent: { fontSize: 48, fontWeight: "800" },
  level: { fontSize: 18, fontWeight: "600", color: Colors.textPrimary, marginTop: 4 },
  confidence: { fontSize: 12, color: Colors.textSecondary, marginTop: 6, fontStyle: "italic" },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary, marginBottom: Spacing.sm },
  adviceRow: { flexDirection: "row", marginBottom: 6 },
  bullet: { color: Colors.primary, marginRight: 8, fontSize: 14 },
  adviceItem: { fontSize: 14, color: Colors.textPrimary, flex: 1, lineHeight: 20 },
  breakdownRow: { marginBottom: Spacing.sm },
  breakdownLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  breakdownLabel: { fontSize: 13, color: Colors.textSecondary },
  breakdownValue: { fontSize: 13, color: Colors.textPrimary, fontWeight: "600" },
  barTrack: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: "hidden" },
  barFill: { height: 8, backgroundColor: Colors.primary, borderRadius: 4 },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: Radius.md,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});