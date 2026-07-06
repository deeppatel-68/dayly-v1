import {
  createCompanionInstance,
  loadCompanion,
} from "@/components/3d/companionModel";
import {
  attachEquipment,
  createEquipmentMaterials,
  disposeEquipment,
} from "@/components/3d/equipment";
import { createPetMotionController } from "@/components/3d/petMotion";
import CharacterScene from "@/components/character/CharacterScene";
import { useTheme } from "@/context/ThemeContext";
import { ExpoWebGLRenderingContext, GLView } from "expo-gl";
import { Renderer } from "expo-three";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import * as THREE from "three";
import { AvatarRendererProps, AvatarState } from "./avatarTypes";
import { useAvatarData } from "./useAvatarData";

// Renders the Blender-authored Dayly companion model with equipped shop
// items. Falls back to the primitive CharacterScene if the GLB fails.
export default function AvatarGLB(props: AvatarRendererProps) {
  const { variant = "dashboard", state = "idle" } = props;
  const { colors, colorScheme } = useTheme();
  const { accentColor, bodyColor, levelTier, streakTier, equippedItems } =
    useAvatarData(props);
  const [failed, setFailed] = useState(false);
  const frameRef = useRef<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // The render loop reads state through a ref so transitions animate live
  // without recreating the GL context
  const stateRef = useRef<AvatarState>(state);
  stateRef.current = state;

  // Recreate the GL context only on customisation/theme/tier/equip changes
  const sceneKey = `${accentColor}|${bodyColor}|${colorScheme}|L${levelTier}|S${streakTier}|${equippedItems.join("+")}`;

  const stopAndDispose = () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    cleanupRef.current?.();
    cleanupRef.current = null;
  };

  useEffect(() => stopAndDispose, []);

  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    let cancelled = false;

    const setup = async () => {
      stopAndDispose();

      const width = gl.drawingBufferWidth;
      const height = gl.drawingBufferHeight;

      const renderer = new Renderer({ gl });
      renderer.setSize(width, height);
      renderer.setClearColor(colors.background, 1);
      // expo-gl returns undefined shader logs, which crashes three's debug
      // path ("Cannot read property 'trim' of undefined")
      renderer.debug.checkShaderErrors = false;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      if (variant === "shop") {
        camera.position.set(0, 0.88, 2.2);
        camera.lookAt(0, 0.7, 0);
      } else {
        camera.position.set(0, 0.95, 2.5);
        camera.lookAt(0, 0.66, 0);
      }

      const accent = new THREE.Color(accentColor);
      const motion = createPetMotionController({ levelTier, streakTier });

      const ambient = new THREE.AmbientLight(0xffffff, 0.7);
      const keyLight = new THREE.DirectionalLight(0xfff4e8, 1.2);
      keyLight.position.set(2.5, 4, 4);
      const rimLight = new THREE.PointLight(
        accent,
        0.5 + motion.streakBoost * 0.3,
        10
      );
      rimLight.position.set(-2, 1.5, -2);
      scene.add(ambient, keyLight, rimLight);

      const source = await loadCompanion();
      if (cancelled) return;

      const companion = createCompanionInstance(source, {
        accent,
        bodyColor,
        levelTier,
      });
      scene.add(companion.rig.petGroup, companion.root);

      // Equipped shop items: wearables move with the pet, decorations sit
      // around the pod. Room-slot items only render in the study room scene.
      const equipMaterials = createEquipmentMaterials(accent);
      const equipped = attachEquipment(
        equippedItems,
        ["pet", "platform"],
        equipMaterials,
        { pet: companion.rig.petGroup, platform: companion.root }
      );

      const clock = new THREE.Clock();
      const animate = () => {
        frameRef.current = requestAnimationFrame(animate);
        motion.apply(companion.rig, stateRef.current, clock.getElapsedTime());
        renderer.render(scene, camera);
        gl.endFrameEXP();
      };
      animate();

      cleanupRef.current = () => {
        disposeEquipment(equipped);
        equipMaterials.dispose();
        companion.dispose();
        renderer.dispose();
      };
    };

    setup().catch((error) => {
      console.error("Error loading Dayly companion GLB:", error);
      if (!cancelled) setFailed(true);
    });

    return () => {
      cancelled = true;
    };
  };

  if (failed) {
    // Primitive 3D pet remains the fallback/dev renderer
    return (
      <CharacterScene
        variant={variant === "shop" ? "preview" : "full"}
        state={state}
      />
    );
  }

  return (
    <GLView
      key={sceneKey}
      style={styles.glView}
      onContextCreate={onContextCreate}
    />
  );
}

const styles = StyleSheet.create({
  glView: {
    width: "100%",
    height: "100%",
  },
});
