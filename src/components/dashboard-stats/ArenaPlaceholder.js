import AvatarRenderer from "@/components/avatar/AvatarRenderer";
import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useCharacter } from "@/context/CharacterContext";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  InteractionManager,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

/**
 * Dashboard arena card showing the 3D avatar
 */
function ArenaPlaceholder({
  active = true,
  onOpenSpace,
  onCustomise,
  state = "idle",
}) {
  const { colors } = useTheme();
  const { character } = useCharacter();
  const isFocused = useIsFocused();
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    if (!active || !isFocused) {
      setSceneReady(false);
      return;
    }

    let timer = null;
    const task = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => setSceneReady(true), 500);
    });
    return () => {
      task.cancel();
      if (timer) clearTimeout(timer);
    };
  }, [active, isFocused]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.scene}>
        {active && isFocused && sceneReady ? (
          <AvatarRenderer state={state} variant="dashboard" />
        ) : (
          <View style={styles.sceneLoading}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        )}
      </View>
      <View style={styles.dock}>
        <View style={styles.identity}>
          <Text style={styles.identityLabel}>COMPANION</Text>
          <Text numberOfLines={1} style={styles.identityName}>
            {character.companionName || "Your companion"}
          </Text>
        </View>
        <View style={styles.actions}>
          <SceneAction
            icon="home-outline"
            label="My Space"
            onPress={onOpenSpace}
          />
          <SceneAction
            icon="color-palette-outline"
            label="Customise"
            onPress={onCustomise}
          />
        </View>
      </View>
    </View>
  );
}

function SceneAction({ icon, label, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        {
          opacity: pressed ? 0.66 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={19} color="#F0EEE6" />
    </Pressable>
  );
}

export default ArenaPlaceholder;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 220,
    marginVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    overflow: "hidden",
  },
  scene: {
    height: 168,
  },
  sceneLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dock: {
    height: 52,
    paddingHorizontal: Spacing.md,
    backgroundColor: "rgba(24, 23, 21, 0.96)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  identityLabel: {
    color: "#A5A29A",
    fontFamily: "Outfit-SemiBold",
    fontSize: 9,
  },
  identityName: {
    color: "#F0EEE6",
    fontFamily: "Outfit-SemiBold",
    fontSize: 15,
    marginTop: 1,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  action: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: "rgba(240, 238, 230, 0.16)",
    backgroundColor: "rgba(240, 238, 230, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
});
