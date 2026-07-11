import { createProceduralCompanion } from "@/components/3d/proceduralCompanion";
import {
  attachEquipment,
  createEquipmentMaterials,
  disposeEquipment,
} from "@/components/3d/equipment";
import { createPetMotionController } from "@/components/3d/petMotion";
import SceneTouchLayer, {
  SceneTapEvent,
} from "@/components/3d/SceneTouchLayer";
import {
  createOrbitRig,
  createPetTapDetector,
  OrbitRig,
} from "@/components/3d/sceneInteraction";
import {
  createContactShadow,
  createPetLightRig,
  createSceneRenderer,
  releaseSceneContext,
} from "@/components/3d/sceneRenderer";
import CharacterScene from "@/components/character/CharacterScene";
import { useTheme } from "@/context/ThemeContext";
import { ExpoWebGLRenderingContext, GLView } from "expo-gl";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import { AppState, StyleSheet } from "react-native";
import * as THREE from "three";
import { AvatarRendererProps, AvatarState } from "./avatarTypes";
import { useAvatarData } from "./useAvatarData";

// Reliable scene-native Dayly companion for compact and customisation
// surfaces. It shares the same motion/evolution/equipment rig as My Space.
export default function Avatar3D(props: AvatarRendererProps) {
  const { variant = "dashboard", state = "idle" } = props;
  const { colors, colorScheme } = useTheme();
  const { accentColor, bodyColor, levelTier, streakTier, equippedItems } =
    useAvatarData(props);
  const [failed, setFailed] = useState(false);
  const frameRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appActiveRef = useRef(AppState.currentState === "active");
  const glRef = useRef<ExpoWebGLRenderingContext | null>(null);
  const setupGenerationRef = useRef(0);
  const cleanupRef = useRef<(() => void) | null>(null);
  const orbitRef = useRef<OrbitRig | null>(null);
  const petTapRef = useRef<
    ((x: number, y: number, width: number, height: number) => boolean) | null
  >(null);
  const pokeRef = useRef<(() => void) | null>(null);

  // The render loop reads state through a ref so transitions animate live
  // without recreating the GL context
  const stateRef = useRef<AvatarState>(state);
  stateRef.current = state;

  // Recreate the GL context only on customisation/theme/tier/equip changes
  const sceneKey = `${accentColor}|${bodyColor}|${colorScheme}|L${levelTier}|S${streakTier}|${equippedItems.join("+")}`;

  const stopAndDispose = () => {
    setupGenerationRef.current += 1;
    if (frameRef.current !== null) {
      clearTimeout(frameRef.current);
      frameRef.current = null;
    }
    cleanupRef.current?.();
    cleanupRef.current = null;
    const gl = glRef.current;
    glRef.current = null;
    if (gl) releaseSceneContext(gl);
  };

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      appActiveRef.current = nextState === "active";
    });
    return () => {
      subscription.remove();
      stopAndDispose();
    };
  }, []);

  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    stopAndDispose();
    glRef.current = gl;
    const generation = setupGenerationRef.current;

    const setup = async () => {
      const width = gl.drawingBufferWidth;
      const height = gl.drawingBufferHeight;

      const renderer = createSceneRenderer({
        gl,
        clearColor: variant === "shop" ? "#181715" : colors.background,
      });

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      const orbitTarget = new THREE.Vector3(0, variant === "shop" ? 0.7 : 0.66, 0);
      if (variant === "shop") {
        camera.position.set(0, 0.9, 2.55);
      } else {
        camera.position.set(0, 0.94, 2.25);
      }
      const orbit = createOrbitRig({
        target: orbitTarget,
        radius: variant === "shop" ? 2.55 : 2.25,
        height: variant === "shop" ? 0.9 : 0.94,
      });
      orbit.applyTo(camera, 0);
      orbitRef.current = orbit;

      const accent = new THREE.Color(accentColor);
      const motion = createPetMotionController({ levelTier, streakTier });

      createPetLightRig(scene, accent, motion.streakBoost);

      const companion = createProceduralCompanion({
        accent,
        bodyColor,
        levelTier,
        streakTier,
      });
      scene.add(companion.rig.petGroup, companion.root);
      petTapRef.current = createPetTapDetector(camera, companion.rig.petGroup);
      pokeRef.current = motion.poke;

      // Equipped shop items: wearables move with the pet, decorations sit
      // around the pod. Room-slot items only render in the study room scene.
      const equipMaterials = createEquipmentMaterials(accent);
      const equipped = attachEquipment(
        equippedItems,
        ["pet", "platform"],
        equipMaterials,
        { pet: companion.rig.petGroup, platform: companion.root }
      );

      // Grounds the floating pet on its pod (puck top sits at y≈0.095)
      const shadow = createContactShadow(0.5);
      shadow.group.position.y = 0.096;
      scene.add(shadow.group);

      const clock = new THREE.Clock();
      const animate = () => {
        frameRef.current = setTimeout(
          animate,
          appActiveRef.current ? 1000 / 30 : 250
        );
        if (!appActiveRef.current) return;
        const t = clock.getElapsedTime();
        orbit.applyTo(camera, t);
        motion.apply(companion.rig, stateRef.current, t);
        shadow.setLift(companion.rig.petGroup.position.y);
        renderer.render(scene, camera);
        gl.endFrameEXP();
      };
      animate();

      cleanupRef.current = () => {
        orbitRef.current = null;
        petTapRef.current = null;
        pokeRef.current = null;
        shadow.dispose();
        disposeEquipment(equipped);
        equipMaterials.dispose();
        companion.dispose();
        renderer.dispose();
      };
    };

    setup().catch((error) => {
      console.error("Error creating Dayly companion scene:", error);
      if (generation === setupGenerationRef.current) setFailed(true);
    });
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

  const handleTap = (event: SceneTapEvent) => {
    if (!petTapRef.current?.(event.x, event.y, event.width, event.height)) return;
    pokeRef.current?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  return (
    <SceneTouchLayer
      onTap={handleTap}
      onDrag={(delta) => orbitRef.current?.orbitBy(delta)}
    >
      <GLView
        key={sceneKey}
        style={styles.glView}
        msaaSamples={4}
        onContextCreate={onContextCreate}
      />
    </SceneTouchLayer>
  );
}

const styles = StyleSheet.create({
  glView: {
    width: "100%",
    height: "100%",
  },
});
