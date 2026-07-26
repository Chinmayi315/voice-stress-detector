export const Colors = {
  primary: "#5B6EF5",
  primaryDark: "#4353C7",
  danger: "#FF5A5F",
  background: "#F7F8FC",
  card: "#FFFFFF",
  textPrimary: "#1A1B25",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  low: "#34C759",
  mild: "#FFCC00",
  moderate: "#FF9500",
  high: "#FF3B30",
};

export function stressColor(level: string): string {
  if (level === "Low Stress") return Colors.low;
  if (level === "Moderate Stress") return Colors.moderate;
  if (level === "High Stress") return Colors.high;
  return Colors.mild;
}

export const Spacing = { sm: 8, md: 16, lg: 24, xl: 32 };
export const Radius = { sm: 8, md: 14, lg: 20 };