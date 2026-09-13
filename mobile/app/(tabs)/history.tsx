import axios from "axios";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { ActivityIndicator, Animated, Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Path, Circle, Line as SvgLine, Text as SvgText } from "react-native-svg";
import { Colors, Radius, Spacing, stressColor } from "../../constants/appTheme";
import { getErrorMessage } from "../../utils";

const BASE_URL = "https://voice-stress-detector.onrender.com";
const screenWidth = Dimensions.get("window").width;

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircleComp = Animated.createAnimatedComponent(Circle);

type HistoryItem = {
  id: number;
  stress_percent: number;
  level: string;
  created_at: string;
};

type MonthGroup = {
  key: string;
  label: string;
  items: HistoryItem[]; // chronological ascending
};

function groupByMonth(items: HistoryItem[]): MonthGroup[] {
  const map: Record<string, HistoryItem[]> = {};
  items.forEach((item) => {
    const d = new Date(item.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map[key]) map[key] = [];
    map[key].push(item);
  });

  return Object.entries(map)
    .map(([key, monthItems]) => {
      const [year, month] = key.split("-");
      const label = new Date(Number(year), Number(month) - 1).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      const sorted = [...monthItems].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      return { key, label, items: sorted };
    })
    .sort((a, b) => (a.key > b.key ? 1 : -1));
}

function AnimatedCurve({ items, monthKey }: { items: HistoryItem[]; monthKey: string }) {
  const dashOffset = useRef(new Animated.Value(1)).current;
  const dotOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    dashOffset.setValue(1);
    dotOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(dashOffset, { toValue: 0, duration: 1200, useNativeDriver: false }),
      Animated.timing(dotOpacity, { toValue: 1, duration: 250, useNativeDriver: false }),
    ]).start();
  }, [monthKey, items.length]);

  const chartH = 220;
  const padL = 34, padR: number = 16, padT = 16, padB = 16;
  const innerW = screenWidth - Spacing.lg * 2 - Spacing.sm * 2 - padL - padR;
  const innerH = chartH - padT - padB;

  const coords = items.map((it, i) => {
    const x = padL + (items.length === 1 ? innerW / 2 : (innerW * i) / (items.length - 1));
    const y = padT + innerH - (it.stress_percent / 100) * innerH;
    return { ...it, x, y };
  });

  const pathD = coords.length
    ? coords.reduce((acc, c, i) => acc + (i === 0 ? `M ${c.x} ${c.y}` : ` L ${c.x} ${c.y}`), "")
    : "";

  const PATH_LENGTH = 3000;
  const strokeDashoffset = dashOffset.interpolate({ inputRange: [0, 1], outputRange: [0, PATH_LENGTH] });
  const gridYs = [0, 25, 50, 75, 100];

  return (
    <Svg width="100%" height={chartH}>
      {gridYs.map((g) => {
        const y = padT + innerH - (g / 100) * innerH;
        return (
          <React.Fragment key={g}>
            <SvgLine x1={padL} y1={y} x2={screenWidth - Spacing.lg * 2 - Spacing.sm * 2 - padR} y2={y} stroke="#EEEEEE" strokeWidth={1} />
            <SvgText x={2} y={y + 4} fontSize={9} fill={Colors.textSecondary}>{g}%</SvgText>
          </React.Fragment>
        );
      })}

      {pathD ? (
        <AnimatedPath
          d={pathD}
          stroke={Colors.primary}
          strokeWidth={3}
          fill="none"
          strokeDasharray={[PATH_LENGTH, PATH_LENGTH]}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      {coords.map((c) => (
        <AnimatedCircleComp
          key={c.id}
          cx={c.x}
          cy={c.y}
          r={5}
          fill={stressColor(c.level)}
          opacity={dotOpacity}
        />
      ))}
    </Svg>
  );
}

export default function HistoryScreen() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadHistory = async () => {
        setLoading(true);
        setError("");
        const token = await SecureStore.getItemAsync("token");
        if (!token) {
          router.replace("/");
          return;
        }
        try {
          const res = await axios.get(`${BASE_URL}/api/stress/history`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (active) setItems(res.data);
        } catch (e: any) {
          if (e.response?.status === 401) {
            await SecureStore.deleteItemAsync("token");
            router.replace("/");
            return;
          }
          if (active) setError(getErrorMessage(e));
        } finally {
          if (active) setLoading(false);
        }
      };
      loadHistory();
      return () => {
        active = false;
      };
    }, [])
  );

  const monthGroups = useMemo(() => groupByMonth(items), [items]);

  useEffect(() => {
    if (monthGroups.length > 0 && !selectedMonthKey) {
      setSelectedMonthKey(monthGroups[monthGroups.length - 1].key);
    }
  }, [monthGroups]);

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

  const selectedMonth = monthGroups.find((m) => m.key === selectedMonthKey);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your History</Text>

      <View style={styles.monthTabs}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={monthGroups}
          keyExtractor={(m) => m.key}
          renderItem={({ item: m }) => (
            <TouchableOpacity
              onPress={() => setSelectedMonthKey(m.key)}
              style={[styles.monthTab, m.key === selectedMonthKey && styles.monthTabActive]}
            >
              <Text style={[styles.monthTabText, m.key === selectedMonthKey && styles.monthTabTextActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {selectedMonth && (
        <View style={styles.chartCard}>
          <Text style={styles.chartLabel}>{selectedMonth.label} \u2014 all readings, in order</Text>
          <AnimatedCurve items={selectedMonth.items} monthKey={selectedMonth.key} />
        </View>
      )}

      {selectedMonth && (
        <FlatList
          data={[...selectedMonth.items].reverse()}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 20 }}
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.lg, paddingTop: 60, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.lg, backgroundColor: Colors.background },
  title: { fontSize: 22, fontWeight: "700", color: Colors.textPrimary, marginBottom: Spacing.md },
  monthTabs: { marginBottom: Spacing.sm },
  monthTab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: Colors.card, marginRight: 8 },
  monthTabActive: { backgroundColor: Colors.primary },
  monthTabText: { fontSize: 13, color: Colors.textSecondary, fontWeight: "600" },
  monthTabTextActive: { color: "#fff" },
  chartCard: { backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.sm },
  chartLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4, marginLeft: 4 },
  card: { backgroundColor: Colors.card, borderRadius: Radius.sm, padding: 14, marginBottom: Spacing.sm, flexDirection: "row", alignItems: "center" },
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