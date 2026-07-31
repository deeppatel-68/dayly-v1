import AvatarRenderer from "@/components/avatar/AvatarRenderer";
import CompanionDialogue from "@/components/companion/CompanionDialogue";
import { useCompanionPresence } from "@/components/companion/useCompanionPresence";
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
  const [rendererReady, setRendererReady] = useState(false);
  const presence = useCompanionPresence({
    state,
    visible: active && isFocused && rendererReady,
    suppressAutomatic: state === "focus",
  });

  useEffect(() => {
    if (!active || !isFocused) {
      setSceneReady(false);
      setRendererReady(false);
      return;
    }

    setRendererReady(false);
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
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.scene}>
        {active && isFocused && sceneReady ? (
          <AvatarRenderer
            state={state}
            variant="dashboard"
            mood={presence.mood}
            reactionToken={presence.reactionToken}
            onInteract={presence.interact}
            onReady={() => setRendererReady(true)}
          />
        ) : (
          <View style={styles.sceneLoading}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        )}
        {sceneReady && !rendererReady && (
          <View style={styles.sceneLoading} pointerEvents="none">
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        )}
      </View>
      <View style={[styles.dock, { backgroundColor: colors.glassFallback }]}>
        <View style={styles.identity}>
          <View style={{ opacity: presence.cue ? 0 : 1 }}>
            <Text style={[styles.identityLabel, { color: colors.textSecondary }]}>COMPANION</Text>
            <Text numberOfLines={1} style={[styles.identityName, { color: colors.text }]}>
              {character.companionName || "Your companion"}
            </Text>
          </View>
          <CompanionDialogue
            cue={presence.cue}
            name={presence.companionName}
            style={styles.dockDialogue}
          />
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
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        {
          borderColor: colors.border,
          backgroundColor: colors.surfaceRaised,
          opacity: pressed ? 0.66 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={19} color={colors.text} />
    </Pressable>
  );
}

export default ArenaPlaceholder;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 336,
    marginVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  scene: {
    height: 276,
    overflow: "hidden",
  },
  sceneLoading: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dock: {
    height: 60,
    position: "relative",
    zIndex: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  identity: {
    flex: 1,
    minWidth: 0,
    height: 40,
    justifyContent: "center",
  },
  dockDialogue: {
    top: 0,
    left: 0,
    minWidth: 0,
    maxWidth: 245,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  identityLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  identityName: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 1,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  action: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
