import TopBar from "@/components/TopBar";
import { useTheme } from "@/context/ThemeContext";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function MySpaceScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <TopBar />
        <Text style={[styles.title, { color: colors.text }]}>My Space</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Your personal workspace
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100, // Space for tab bar
  },
  title: {
    fontSize: 32,
    fontFamily: "Outfit-Bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Outfit-Regular",
  },
});
