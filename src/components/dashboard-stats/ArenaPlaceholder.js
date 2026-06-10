import CharacterScene from "@/components/character/CharacterScene";
import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import { StyleSheet, Pressable } from "react-native";

/**
 * Dashboard arena card showing the 3D avatar
 */
function ArenaPlaceholder({ onPress, state = "idle" }) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <CharacterScene state={state} />
    </Pressable>
  );
}

export default ArenaPlaceholder;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 200,
    marginVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
});
