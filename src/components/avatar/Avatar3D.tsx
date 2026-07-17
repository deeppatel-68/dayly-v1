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
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { ExpoWebGLRenderingContext, GLView } from "expo-gl";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import { AppState, StyleSheet } from "react-native";
import * as THREE from "three";
import { AvatarRendererProps, AvatarState } from "./avatarTypes";
import type {
  CompanionMood,
  CompanionReaction,
  CompanionReactionToken,
} from "@/components/companion/companionBehavior";
import { useAvatarData } from "./useAvatarData";

// Reliable scene-native Dayly companion for compact and customisation
// surfaces. It shares the same motion/evolution/equipment rig as My Space.
export default function Avatar3D(props: AvatarRendererProps) {
  const {
    variant = "dashboard",
    state = "idle",
    mood = "calm",
    reactionToken = null,
    onInteract,
    onReady,
  } = props;
  const { colors, colorScheme } = useTheme();
  const reducedMotion = useReducedMotion();
  const {
    accentColor,
    bodyColor,
    faceStyle,
    levelTier,
    streakTier,
    equippedItems,
  } = useAvatarData(props);
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
  const reactRef = useRef<((reaction: CompanionReaction) => void) | null>(null);
  const appliedReactionIdRef = useRef(-1);

  // The render loop reads state through a ref so transitions animate live
  // without recreating the GL context
  const stateRef = useRef<AvatarState>(state);
  stateRef.current = state;
  const moodRef = useRef<CompanionMood>(mood);
  moodRef.current = mood;
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  const reactionTokenRef = useRef<CompanionReactionToken | null>(reactionToken);
  reactionTokenRef.current = reactionToken;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    if (failed) onReady?.();
  }, [failed, onReady]);

  useEffect(() => {
    if (!reactionToken || reactionToken.id === appliedReactionIdRef.current) {
      return;
    }
    if (!reactRef.current) return;
    appliedReactionIdRef.current = reactionToken.id;
    reactRef.current(reactionToken.reaction);
  }, [reactionToken]);

  // Recreate the GL context only on customisation/theme/tier/equip changes.
  // faceStyle is part of the key so switching face variants rebuilds the scene
  // and re-prunes to the active Face_* group (companionModel), matching how
  // colour changes work.
  const sceneKey = `${accentColor}|${bodyColor}|${faceStyle}|${colorScheme}|L${levelTier}|S${streakTier}|${equippedItems.join("+")}`;

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

      // Track every disposable as it is created so both normal teardown and a
      // mid-construction throw release exactly what exists (LIFO order).
      const disposables: (() => void)[] = [];
      const teardown = () => {
        orbitRef.current = null;
        petTapRef.current = null;
        reactRef.current = null;
        while (disposables.length) disposables.pop()?.();
      };
      cleanupRef.current = teardown;

      try {
        const renderer = createSceneRenderer({
          gl,
          clearColor: variant === "shop" ? "#181715" : colors.background,
        });
        disposables.push(() => renderer.dispose());

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
          45,
          width / height,
          0.1,
          100,
        );
        const orbitTarget = new THREE.Vector3(
          0,
          variant === "shop" ? 0.7 : 0.66,
          0,
        );
        if (variant === "shop") {
          camera.position.set(0, 0.9, 2.55);
        } else {
          camera.position.set(0, 0.94, 2.25);
        }
        const orbit = createOrbitRig({
          target: orbitTarget,
          radius: variant === "shop" ? 2.55 : 2.25,
          height: variant === "shop" ? 0.9 : 0.94,
          ...(variant === "shop"
            ? {
                minElevation: (-12 * Math.PI) / 180,
                maxElevation: (12 * Math.PI) / 180,
              }
            : {
                minAzimuth: -0.45,
                maxAzimuth: 0.45,
                easeBackAfter: 1.5,
              }),
        });
        orbit.applyTo(camera, 0);
        orbitRef.current = orbit;

        const accent = new THREE.Color(accentColor);
        const motion = createPetMotionController({ levelTier, streakTier });

        createPetLightRig(scene, accent, motion.streakBoost);

        // Load + parse the GLB per scene mount. loadCompanion caches the parsed
        // source graph, but createCompanionInstance deep-clones every geometry
        // and material (the GLB carries no textures), so each GL context owns
        // fully independent resources — no cross-context blanking.
        const source = await loadCompanion();
        if (generation !== setupGenerationRef.current) {
          teardown();
          return;
        }
        const companion = createCompanionInstance(source, {
          accent,
          bodyColor,
          faceStyle,
          levelTier,
          streakTier,
        });
        disposables.push(() => companion.dispose());
        scene.add(companion.rig.petGroup, companion.root);
        petTapRef.current = createPetTapDetector(
          camera,
          companion.rig.petGroup,
        );
        reactRef.current = motion.react;
        const pendingReaction = reactionTokenRef.current;
        if (
          pendingReaction &&
          pendingReaction.id !== appliedReactionIdRef.current
        ) {
          appliedReactionIdRef.current = pendingReaction.id;
          motion.react(pendingReaction.reaction);
        }

        // Equipped shop items: wearables move with the pet, decorations sit
        // around the pod. Room-slot items only render in the study room scene.
        const equipMaterials = createEquipmentMaterials(accent);
        disposables.push(() => equipMaterials.dispose());
        const equipped = attachEquipment(
          equippedItems,
          ["pet", "platform"],
          equipMaterials,
          { pet: companion.rig.petGroup, platform: companion.root },
        );
        disposables.push(() => disposeEquipment(equipped));

        // Grounds the floating pet on its pod; 0.0985 clears the pod's new
        // inner glow ring (tops out at 0.098).
        const shadow = createContactShadow(0.5);
        shadow.group.position.y = 0.0985;
        scene.add(shadow.group);
        disposables.push(() => shadow.dispose());

        const clock = new THREE.Clock();
        let didNotifyReady = false;
        const animate = () => {
          frameRef.current = setTimeout(
            animate,
            appActiveRef.current ? 1000 / 30 : 250,
          );
          if (!appActiveRef.current) return;
          const t = clock.getElapsedTime();
          orbit.applyTo(camera, t);
          motion.apply(companion.rig, stateRef.current, t, moodRef.current, {
            reducedMotion: reducedMotionRef.current,
          });
          shadow.setLift(companion.rig.petGroup.position.y);
          renderer.render(scene, camera);
          gl.endFrameEXP();
          if (!didNotifyReady) {
            didNotifyReady = true;
            onReadyRef.current?.();
          }
        };
        animate();
      } catch (error) {
        // Dispose whatever was constructed before the failure, then rethrow so
        // the outer handler swaps in the fallback renderer.
        teardown();
        throw error;
      }
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
    if (!petTapRef.current?.(event.x, event.y, event.width, event.height))
      return;
    const reaction = onInteract?.() ?? "bounce";
    reactRef.current?.(reaction);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  return (
    <SceneTouchLayer
      accessibilityLabel="Interact with companion"
      onTap={handleTap}
      onDrag={(delta) => orbitRef.current?.orbitBy(delta.x, delta.y)}
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
