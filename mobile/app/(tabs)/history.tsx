import axios from "axios";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, FlatList, StyleSheet, Text, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Colors, Radius, Spacing, stressColor } from "../../constants/appTheme";
import { getErrorMessage } from "../../utils";

const BASE_URL = "https://voice-stress-detector.onrender.com";
const screenWidth = Dimensions.get("window").width;

type HistoryItem = {
  id: number;
  stress_percent: number;
  level: string;
  created_at: string;
};

export default function HistoryScreen() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const loadHistory = async () => {
      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        router.replace("/");
        return;
      }
      try {
        const res = await axios.get(`${BASE_URL}/api/stress/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setItems(res.data);
      } catch (e: any) {
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyEmoji}>📊</Text>
        <Text style={styles.emptyText}>No recordings yet.{"\n"}Go make one!</Text>
      </View>
    );
  }

  const chronological = [...items].reverse();
  const chartData = {
    labels: chronological.map((_, i) => (i + 1).toString()),
    datasets: [{ data: chronological.map((item) => item.stress_percent) }],
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your History</Text>

      {items.length > 1 && (
        <View style={styles.chartCard}>
          <LineChart
            data={chartData}
            width={screenWidth - 72}
            height={160}
            yAxisSuffix="%"
            chartConfig={{
              backgroundColor: Colors.card,
              backgroundGradientFrom: Colors.card,
              backgroundGradientTo: Colors.card,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(91, 110, 245, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
              propsForDots: { r: "4" },
            }}
            bezier
            style={{ borderRadius: Radius.md }}
          />
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={[styles.dot, { backgroundColor: stressColor(item.level) }]} />
            <View style={styles.cardTextWrap}>
              <View style={styles.cardRow}>
                <Text style={styles.cardPercent}>{item.stress_percent}%</Text>
                <Text style={styles.cardLevel}>{item.level}</Text>
              </View>
              <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleString()}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.lg, paddingTop: 60, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.lg, backgroundColor: Colors.background },
  title: { fontSize: 22, fontWeight: "700", color: Colors.textPrimary, marginBottom: Spacing.md },
  chartCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    alignItems: "center",
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.sm,
    padding: 14,
    marginBottom: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  cardTextWrap: { flex: 1 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardPercent: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary },
  cardLevel: { fontSize: 13, color: Colors.textSecondary },
  cardDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  error: { color: Colors.danger, textAlign: "center" },
  emptyEmoji: { fontSize: 40, marginBottom: Spacing.sm },
  emptyText: { color: Colors.textSecondary, textAlign: "center", fontSize: 15 },
});