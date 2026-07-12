import { useReducedMotion } from "@/hooks/useReducedMotion";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import type { CompanionCue } from "./companionBehavior";

interface CompanionDialogueProps {
  cue: CompanionCue | null;
  name: string;
  style?: StyleProp<ViewStyle>;
}

export default function CompanionDialogue({
  cue,
  name,
  style,
}: CompanionDialogueProps) {
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-4)).current;
  const [renderedCue, setRenderedCue] = useState(cue);

  useEffect(() => {
    if (cue) setRenderedCue(cue);
    const duration = reducedMotion ? 0 : cue ? 180 : 140;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: cue ? 1 : 0,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: cue ? 0 : -4,
        duration,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished && !cue) setRenderedCue(null);
    });
  }, [cue, opacity, reducedMotion, translateY]);

  if (!renderedCue) return null;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[
        styles.bubble,
        style,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <Text numberOfLines={1} style={styles.name}>
        {name.toUpperCase()}
      </Text>
      <Text numberOfLines={2} style={styles.line}>
        {renderedCue.line}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: "absolute",
    maxWidth: 210,
    minWidth: 132,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(240, 238, 230, 0.18)",
    backgroundColor: "rgba(24, 23, 21, 0.92)",
  },
  name: {
    color: "#D4A27F",
    fontFamily: "Outfit-SemiBold",
    fontSize: 9,
    marginBottom: 3,
  },
  line: {
    color: "#F0EEE6",
    fontFamily: "Outfit-Medium",
    fontSize: 13,
    lineHeight: 17,
  },
});
