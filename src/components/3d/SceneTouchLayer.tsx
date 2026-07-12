import React, { useRef } from "react";
import { PanResponder, StyleSheet, View, ViewStyle } from "react-native";

export interface SceneTapEvent {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SceneDragDelta {
  x: number;
  y: number;
}

interface SceneTouchLayerProps {
  children: React.ReactNode;
  // Fired on release when the finger barely moved
  onTap?: (event: SceneTapEvent) => void;
  // Fired continuously while dragging; each axis is normalised to its view
  // dimension (a full-width or full-height swipe is approximately 1.0).
  onDrag?: (delta: SceneDragDelta) => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

const TAP_SLOP = 8;

// Self-contained touch surface for GL scenes (core PanResponder — no
// gesture-handler root required, works inside Modals). Distinguishes taps
// (pet pokes) from horizontal drags (camera orbit).
export default function SceneTouchLayer({
  children,
  onTap,
  onDrag,
  style,
  accessibilityLabel,
}: SceneTouchLayerProps) {
  const size = useRef({ width: 1, height: 1 });
  const moved = useRef(0);
  const lastDx = useRef(0);
  const lastDy = useRef(0);

  // PanResponder is created once; read the latest callbacks through a ref
  const callbacks = useRef({ onTap, onDrag });
  callbacks.current = { onTap, onDrag };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        moved.current = 0;
        lastDx.current = 0;
        lastDy.current = 0;
      },
      onPanResponderMove: (_evt, gesture) => {
        const delta = gesture.dx - lastDx.current;
        const deltaY = gesture.dy - lastDy.current;
        lastDx.current = gesture.dx;
        lastDy.current = gesture.dy;
        moved.current = Math.max(
          moved.current,
          Math.abs(gesture.dx) + Math.abs(gesture.dy)
        );
        if (moved.current > TAP_SLOP) {
          callbacks.current.onDrag?.({
            x: delta / size.current.width,
            y: deltaY / size.current.height,
          });
        }
      },
      onPanResponderRelease: (evt) => {
        if (moved.current <= TAP_SLOP) {
          callbacks.current.onTap?.({
            x: evt.nativeEvent.locationX,
            y: evt.nativeEvent.locationY,
            width: size.current.width,
            height: size.current.height,
          });
        }
      },
    })
  ).current;

  return (
    <View
      accessible={Boolean(onTap)}
      accessibilityRole={onTap ? "button" : undefined}
      accessibilityLabel={accessibilityLabel}
      style={[styles.fill, style]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (width > 0 && height > 0) size.current = { width, height };
      }}
      {...panResponder.panHandlers}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    width: "100%",
    height: "100%",
  },
});
