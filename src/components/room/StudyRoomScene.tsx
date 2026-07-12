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
  createSceneRenderer,
} from "@/components/3d/sceneRenderer";
import { AvatarState } from "@/components/avatar/avatarTypes";
import type {
  CompanionMood,
  CompanionReaction,
  CompanionReactionToken,
} from "@/components/companion/companionBehavior";
import { useAvatarData } from "@/components/avatar/useAvatarData";
import CharacterScene from "@/components/character/CharacterScene";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { ExpoWebGLRenderingContext, GLView } from "expo-gl";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import { AppState, StyleSheet } from "react-native";
import * as THREE from "three";
import { buildStudyRoom, ROOM_PET_POSITION } from "./roomBuilders";
import {
  createEnvironmentProfile,
  EnvironmentProfile,
} from "./environmentProfile";

interface StudyRoomSceneProps {
  state?: AvatarState;
  mood?: CompanionMood;
  reactionToken?: CompanionReactionToken | null;
  onInteract?: () => CompanionReaction | void;
  onReady?: () => void;
}

// The My Space scene: the companion at home in a cozy study nook. Reacts to
// focus/reward/level-up states (pet motion, desk lamp, string lights) and
// renders every equipped shop item — wearables on the pet, decorations by
// the pod, wall art and furniture at room anchors.
export default function StudyRoomScene({
  state = "idle",
  mood = "calm",
  reactionToken = null,
  onInteract,
  onReady,
}: StudyRoomSceneProps) {
  const { accentColor, bodyColor, levelTier, streakTier, equippedItems } =
    useAvatarData({});
  const [failed, setFailed] = useState(false);
  const reducedMotion = useReducedMotion();
  const frameRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appActiveRef = useRef(AppState.currentState === "active");
  const setupGenerationRef = useRef(0);
  const cleanupRef = useRef<(() => void) | null>(null);
  const orbitRef = useRef<OrbitRig | null>(null);
  const petTapRef = useRef<
    ((x: number, y: number, width: number, height: number) => boolean) | null
  >(null);
  const reactRef = useRef<((reaction: CompanionReaction) => void) | null>(null);
  const appliedReactionIdRef = useRef(-1);
  const environmentDateRef = useRef(new Date());

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

  const stopAndDispose = () => {
    setupGenerationRef.current += 1;
    if (frameRef.current !== null) {
      clearTimeout(frameRef.current);
      frameRef.current = null;
    }
    cleanupRef.current?.();
    cleanupRef.current = null;
  };

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      appActiveRef.current = nextState === "active";
      if (nextState === "active") environmentDateRef.current = new Date();
    });
    const environmentTimer = setInterval(() => {
      environmentDateRef.current = new Date();
    }, 30_000);
    return () => {
      subscription.remove();
      clearInterval(environmentTimer);
      stopAndDispose();
    };
  }, []);

  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    stopAndDispose();
    const generation = setupGenerationRef.current;

    const setup = async () => {
      const width = gl.drawingBufferWidth;
      const height = gl.drawingBufferHeight;

      const renderer = createSceneRenderer({
        gl,
        clearColor: "#141311",
        exposure: 1.24,
      });

      const scene = new THREE.Scene();
      // Portrait framing verified in the iOS simulator. Three's FOV is
      // vertical, so the narrow phone aspect needs a wider FOV and a target
      // close to the companion; the desk remains supporting context and can
      // be inspected with the bounded room orbit.
      const camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 100);
      camera.position.set(0.72, 1.3, 4.8);
      const orbitTarget = new THREE.Vector3(0.72, 0.82, -0.48);
      const homeOffset = camera.position.clone().sub(orbitTarget);
      const homeAzimuth = Math.atan2(homeOffset.x, homeOffset.z);
      const orbit = createOrbitRig({
        target: orbitTarget,
        radius: Math.hypot(homeOffset.x, homeOffset.z),
        height: camera.position.y,
        initialAzimuth: homeAzimuth,
        minAzimuth: homeAzimuth - 0.6,
        maxAzimuth: homeAzimuth + 0.6,
        easeBackAfter: 2.5,
      });
      orbit.applyTo(camera, 0);
      orbitRef.current = orbit;

      const accent = new THREE.Color(accentColor);
      const motion = createPetMotionController({ levelTier, streakTier });

      // Warm-sky/charcoal-ground hemisphere, warm key and practical desk lamp.
      const hemi = new THREE.HemisphereLight(0xfff2e8, 0x24211e, 0.72);
      const keyLight = new THREE.DirectionalLight(0xfff0dd, 1.05);
      keyLight.position.set(2.5, 4, 3.5);
      scene.add(hemi, keyLight);

      const room = buildStudyRoom(accent);
      scene.add(room.group);

      // One lifecycle-owned loop drives the complete room and companion.
      const clock = new THREE.Clock();
      let companionFrame:
        | ((time: number, environment: EnvironmentProfile) => void)
        | null = null;
      let companionCleanup: (() => void) | null = null;
      let rewardBlend = 0;
      let previousTime = 0;
      let didNotifyReady = false;

      const animate = () => {
        frameRef.current = setTimeout(
          animate,
          appActiveRef.current ? 1000 / 30 : 250
        );
        if (!appActiveRef.current) return;
        const t = clock.getElapsedTime();
        const deltaTime = Math.max(0, Math.min(0.1, t - previousTime));
        previousTime = t;
        const s = stateRef.current;
        const celebrating = s === "reward" || s === "levelUp";
        rewardBlend = celebrating
          ? Math.min(1, rewardBlend + deltaTime / 1.2)
          : Math.max(0, rewardBlend - deltaTime / 3);
        const environment = createEnvironmentProfile(
          environmentDateRef.current,
          s,
          rewardBlend
        );

        orbit.applyTo(camera, t);
        companionFrame?.(t, environment);

        hemi.color.setRGB(...environment.hemisphereSky);
        hemi.groundColor.setRGB(...environment.hemisphereGround);
        hemi.intensity = environment.hemisphereIntensity;
        keyLight.color.setRGB(...environment.key);
        keyLight.intensity = environment.keyIntensity;
        room.skyMat.color.setRGB(...environment.sky);
        room.skyMat.emissive.setRGB(...environment.sky);
        room.skyMat.emissiveIntensity = environment.skyIntensity;
        room.celestialMat.color.setRGB(...environment.celestial);
        room.celestialMat.emissive.setRGB(...environment.celestial);
        room.celestialMat.emissiveIntensity = environment.celestialIntensity;
        room.starMat.opacity = environment.starOpacity;
        room.screenMat.emissiveIntensity = environment.screenIntensity;
        room.lampGlowMat.emissiveIntensity =
          0.85 + environment.lampIntensity * 0.48;
        room.lampLight.intensity +=
          (environment.lampIntensity - room.lampLight.intensity) * 0.06;
        room.stringMat.emissiveIntensity =
          environment.stringIntensity +
          (celebrating && !reducedMotionRef.current
            ? Math.sin(t * 8) * 0.22
            : 0);

        // Fake-bloom halos track the same environment drivers as the
        // emissives; reward/levelUp throbs them in phase with the flash.
        const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
        const pulse =
          celebrating && !reducedMotionRef.current
            ? Math.sin(t * 8) * 0.5 + 0.5
            : 0;
        room.stringGlowMat.opacity = clamp01(
          environment.stringIntensity * 0.32 + rewardBlend * 0.18 * pulse
        );
        room.lampHaloMat.opacity = clamp01(
          environment.lampIntensity * 0.26 + rewardBlend * 0.1 * pulse
        );
        room.moonGlowMat.opacity = clamp01(
          environment.celestialIntensity * 0.2 * environment.starOpacity
        );
        const glowScale = 1 + rewardBlend * (0.25 + 0.1 * pulse);
        room.glowPulseGroup.children.forEach((c) =>
          c.scale.setScalar(0.16 * glowScale)
        );

        renderer.render(scene, camera);
        gl.endFrameEXP();
        if (!didNotifyReady) {
          didNotifyReady = true;
          onReadyRef.current?.();
        }
      };

      cleanupRef.current = () => {
        orbitRef.current = null;
        petTapRef.current = null;
        reactRef.current = null;
        companionCleanup?.();
        room.dispose();
        renderer.dispose();
      };
      const companion = createProceduralCompanion({
        accent,
        bodyColor,
        levelTier,
        streakTier,
      });
      companion.root.position.copy(ROOM_PET_POSITION);
      companion.rig.petGroup.position.x = ROOM_PET_POSITION.x;
      companion.rig.petGroup.position.z = ROOM_PET_POSITION.z;
      scene.add(companion.rig.petGroup, companion.root);
      petTapRef.current = createPetTapDetector(camera, companion.rig.petGroup);
      reactRef.current = motion.react;
      const pendingReaction = reactionTokenRef.current;
      if (
        pendingReaction &&
        pendingReaction.id !== appliedReactionIdRef.current
      ) {
        appliedReactionIdRef.current = pendingReaction.id;
        motion.react(pendingReaction.reaction);
      }

      // Equipped items: this scene renders every slot, including room decor
      const equipMaterials = createEquipmentMaterials(accent);
      const equipped = attachEquipment(
        equippedItems,
        ["pet", "platform", "room"],
        equipMaterials,
        {
          pet: companion.rig.petGroup,
          platform: companion.root,
          room: (anchor, object) => {
            const placement = room.anchorFor(anchor);
            object.position.set(...placement.position);
            object.rotation.y = placement.rotationY;
            scene.add(object);
          },
        }
      );
      equipped.forEach((object) => {
        if (object.parent !== companion.rig.petGroup) return;
        const itemId = String(object.userData.equipmentId ?? "");
        if (itemId === "focus-cap") {
          object.scale.setScalar(0.9);
          object.position.y = 0.19;
        } else if (itemId === "neon-headphones") {
          object.scale.setScalar(0.9);
        } else if (itemId === "study-glasses") {
          object.scale.setScalar(0.96);
        }
      });

      // Grounds the floating pet on its pod (puck top ≈ y 0.095)
      const shadow = createContactShadow(0.5);
      shadow.group.position.set(
        ROOM_PET_POSITION.x,
        0.096,
        ROOM_PET_POSITION.z
      );
      scene.add(shadow.group);

      companionFrame = (t, environment) => {
        const s = stateRef.current;
        motion.apply(companion.rig, s, t, moodRef.current, {
          reducedMotion: reducedMotionRef.current,
          environmentWarmth: environment.companionWarmth,
          decorationMotion: environment.decorationMotion,
        });
        shadow.setLift(companion.rig.petGroup.position.y);
      };

      companionCleanup = () => {
        shadow.dispose();
        disposeEquipment(equipped);
        equipMaterials.dispose();
        companion.dispose();
      };

      // Expo GL can stall if new lit meshes are introduced after the first
      // submitted frame. Assemble the complete scene, then begin one loop.
      animate();
    };

    setup().catch((error) => {
      console.error("Error creating study room scene:", error);
      if (generation === setupGenerationRef.current) setFailed(true);
    });
  };

  if (failed) {
    // Keep the space alive with the legacy fallback if scene setup fails.
    return <CharacterScene variant="full" state={state} />;
  }

  const handleTap = (event: SceneTapEvent) => {
    if (!petTapRef.current?.(event.x, event.y, event.width, event.height)) return;
    const reaction = onInteract?.() ?? "bounce";
    reactRef.current?.(reaction);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  return (
    <SceneTouchLayer
      accessibilityLabel="Interact with companion in My Space"
      onTap={handleTap}
      onDrag={(delta) => orbitRef.current?.orbitBy(delta.x, delta.y)}
    >
      <GLView
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
