import { Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { StyleSheet, Text, View } from "react-native";

function RoundStat() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <View
        style={[
          styles.badge,
          styles.xpBadge,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: 1,
          },
        ]}
      >
        <FontAwesome5 name="star" size={20} color={colors.text} />
        <Text style={[styles.xpValue, { color: colors.text }]}>100</Text>
        <Text style={[styles.xpTitle, { color: colors.text }]}>XP</Text>
      </View>
      <View
        style={[
          styles.badge,
          styles.coinsBadge,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: 1,
          },
        ]}
      >
        <FontAwesome5 name="coins" size={20} color={colors.text} />
        <Text style={[styles.coinsValue, { color: colors.text }]}>325</Text>
        <Text style={[styles.coinsTitle, { color: colors.text }]}>Coins</Text>
      </View>
      <View
        style={[
          styles.badge,
          styles.streakBadge,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: 1,
          },
        ]}
      >
        <FontAwesome5 name="fire" size={20} color={colors.text} />
        <Text style={[styles.streakValue, { color: colors.text }]}>3</Text>
        <Text style={[styles.streakTitle, { color: colors.text }]}>
          Day Streak
        </Text>
      </View>
    </View>
  );
}

export default RoundStat;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    marginBottom: 10,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 25,
    borderWidth: 2,
    gap: 4,
  },
  xpTitle: {
    fontFamily: "Outfit-SemiBold",
    fontSize: 16,
    color: "#fff",
  },
  xpBadge: {
    backgroundColor: "rgba(0, 212, 255, 0.1)",
    borderColor: "#00d4ff",
  },
  xpValue: {
    fontFamily: "Outfit-Regular",
    fontSize: 16,
    color: "#fff",
  },
  coinsBadge: {
    backgroundColor: "rgba(0, 255, 157, 0.1)",
    borderColor: "#00ff9d",
  },
  coinsValue: {
    fontFamily: "Outfit-Regular",
    fontSize: 16,
    color: "#fff",
  },
  coinsTitle: {
    fontFamily: "Outfit-Regular",
    fontSize: 16,
    color: "#fff",
  },
  streakValue: {
    fontFamily: "Outfit-Regular",
    fontSize: 16,
    color: "#fff",
  },
  streakTitle: {
    fontFamily: "Outfit-Regular",
    fontSize: 16,
    color: "#fff",
  },
  streakBadge: {
    backgroundColor: "rgba(255, 107, 53, 0.1)",
    borderColor: "#ff6b35",
  },
});
