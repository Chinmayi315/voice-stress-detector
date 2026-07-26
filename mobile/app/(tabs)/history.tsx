import axios from "axios";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, FlatList, StyleSheet, Text, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
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

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const token = await SecureStore.getItemAsync("token");
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
        <ActivityIndicator size="large" />
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
        <Text style={styles.emptyText}>No recordings yet. Go make one!</Text>
      </View>
    );
  }

  // Chart needs OLDEST-to-NEWEST order (left to right), but the list below
  // stays newest-first. So we reverse just for the chart data.
  const chronological = [...items].reverse();
  const chartData = {
    labels: chronological.map((_, i) => (i + 1).toString()),
    datasets: [{ data: chronological.map((item) => item.stress_percent) }],
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your History</Text>

      {items.length > 1 && (
        <LineChart
          data={chartData}
          width={screenWidth - 40}
          height={180}
          yAxisSuffix="%"
          chartConfig={{
            backgroundColor: "#fff",
            backgroundGradientFrom: "#fff",
            backgroundGradientTo: "#fff",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            propsForDots: { r: "4" },
          }}
          bezier
          style={{ borderRadius: 12, marginBottom: 20 }}
        />
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.cardPercent}>{item.stress_percent}%</Text>
              <Text style={styles.cardLevel}>{item.level}</Text>
            </View>
            <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleString()}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  card: { backgroundColor: "#f5f5f5", borderRadius: 10, padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardPercent: { fontSize: 20, fontWeight: "bold" },
  cardLevel: { fontSize: 14, color: "#555" },
  cardDate: { fontSize: 12, color: "#999", marginTop: 4 },
  error: { color: "red", textAlign: "center" },
  emptyText: { color: "#999", textAlign: "center" },
});