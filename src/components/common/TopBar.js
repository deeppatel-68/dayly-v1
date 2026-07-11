import { Spacing } from "@/constants/Spacing";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Link } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

function TopBar({ eyebrow, title, subtitle }) {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const userName = profile?.username || user?.email?.split("@")[0] || "You";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <View style={styles.wordmarkRow}>
          <View style={[styles.mark, { backgroundColor: colors.accent }]} />
          <Text style={[styles.wordmark, { color: colors.text }]}>dayly</Text>
        </View>
        {eyebrow ? (
          <Text style={[styles.eyebrow, { color: colors.accent }]}>
            {eyebrow}
          </Text>
        ) : null}
        {title ? (
          <Text selectable style={[styles.title, { color: colors.text }]}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <Link href="/profile" asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          style={({ pressed }) => [
            styles.profileButton,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: pressed ? 0.68 : 1,
            },
          ]}
        >
          <Text style={[styles.profileLetter, { color: colors.text }]}>
            {userInitial}
          </Text>
          <View style={[styles.status, { backgroundColor: colors.success }]} />
        </Pressable>
      </Link>
    </View>
  );
}

export default TopBar;

const styles = StyleSheet.create({
  container: {
    minHeight: 76,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  copy: { flex: 1, minWidth: 0 },
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    minHeight: 40,
  },
  mark: { width: 8, height: 8, borderRadius: 4 },
  wordmark: {
    fontFamily: "Outfit-SemiBold",
    fontSize: 24,
  },
  eyebrow: {
    marginTop: Spacing.sm,
    fontFamily: "Outfit-SemiBold",
    fontSize: 11,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 2,
    fontFamily: "Outfit-Bold",
    fontSize: 27,
    lineHeight: 32,
  },
  subtitle: {
    marginTop: Spacing.xs,
    fontFamily: "Outfit-Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  profileLetter: { fontFamily: "Outfit-Bold", fontSize: 16 },
  status: {
    position: "absolute",
    right: 1,
    bottom: 1,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#262624",
  },
});
