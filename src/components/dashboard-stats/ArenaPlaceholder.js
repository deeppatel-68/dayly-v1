import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import { StyleSheet, Text, View, Pressable } from "react-native";

/**
 * Placeholder component for future 3D arena (Clash Royale style)
 * This will be replaced with a 3D scene containing an arena and character
 */
function ArenaPlaceholder({ onPress }) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.arenaArea}>
        {/* Placeholder for 3D Character */}
        <View
          style={[
            styles.arenaBox,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <Text
            style={[styles.placeholderText, { color: colors.textSecondary }]}
          >
            3D Character
          </Text>
          <Text
            style={[styles.comingSoonText, { color: colors.textSecondary }]}
          >
            Coming Soon
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default ArenaPlaceholder;

const styles = StyleSheet.create({
  container: {
    width: "75%",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: Spacing.xs,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  arenaArea: {
    width: "100%",
    maxWidth: 300,
    aspectRatio: 1, // Square aspect ratio for arena
    alignItems: "center",
    justifyContent: "center",
  },
  arenaBox: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 18,
    fontFamily: "Outfit-Bold",
    marginBottom: 4,
  },
  comingSoonText: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    opacity: 0.6,
  },
});
