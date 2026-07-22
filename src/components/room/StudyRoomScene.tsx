import {
  createCompanionInstance,
  loadCompanion,
} from "@/components/3d/companionModel";
import {
  attachEquipment,
  createHomeEquipmentPool,
  createEquipmentMaterials,
  disposeEquipment,
  HomeEquipmentPool,
} from "@/components/3d/equipment";
import { createPetMotionController } from "@/components/3d/petMotion";
import SceneTouchLayer, {
  SceneTapEvent,
} from "@/components/3d/SceneTouchLayer";
import { createPetTapDetector } from "@/components/3d/sceneInteraction";
import {
  createSceneRenderer,
  releaseSceneContext,
} from "@/components/3d/sceneRenderer";
import {
  createShadowMaterial,
  createShadowTexture,
} from "@/components/3d/glow";
import { AvatarState } from "@/components/avatar/avatarTypes";
import type {
  CompanionMood,
  CompanionReaction,
  CompanionReactionToken,
} from "@/components/companion/companionBehavior";
import { useAvatarData } from "@/components/avatar/useAvatarData";
import CharacterScene from "@/components/character/CharacterScene";
import { useHabits } from "@/context/HabitsContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { ExpoWebGLRenderingContext, GLView } from "expo-gl";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import { AppState, StyleSheet } from "react-native";
import * as THREE from "three";
import {
  buildStudyRoom,
  getEquipSlotMarkerPosition,
  ROOM_PET_POSITION,
} from "./roomBuilders";
import {
  createEnvironmentProfile,
  EnvironmentProfile,
} from "./environmentProfile";
import {
  createRoomNavigationController,
  RoomNavigationController,
  RoomView,
} from "./roomNavigation";

interface StudyRoomSceneProps {
  state?: AvatarState;
  mood?: CompanionMood;
  reactionToken?: CompanionReactionToken | null;
  onInteract?: () => CompanionReaction | void;
  onReady?: () => void;
  view?: RoomView;
  onViewChange?: (view: RoomView) => void;
  previewItemId?: string | null;
  selectedEquipSlot?: string | null;
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
  view = "home",
  onViewChange,
  previewItemId = null,
  selectedEquipSlot = null,
}: StudyRoomSceneProps) {
  const {
    accentColor,
    bodyColor,
    faceStyle,
    levelTier,
    streakTier,
    equippedItems,
  } = useAvatarData({});
  const [failed, setFailed] = useState(false);
  const { completedCount, totalCount } = useHabits();
  const reducedMotion = useReducedMotion();
  const frameRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appActiveRef = useRef(AppState.currentState === "active");
  const glRef = useRef<ExpoWebGLRenderingContext | null>(null);
  const setupGenerationRef = useRef(0);
  const cleanupRef = useRef<(() => void) | null>(null);
  const navigationRef = useRef<RoomNavigationController | null>(null);
  const homeEquipmentRef = useRef<HomeEquipmentPool | null>(null);
  const parallaxRef = useRef({ x: 0, y: 0 });
  const decorMarkerRef = useRef<THREE.Mesh | null>(null);
  const petTapRef = useRef<
    ((x: number, y: number, width: number, height: number) => boolean) | null
  >(null);
  const reactRef = useRef<((reaction: CompanionReaction) => void) | null>(null);
  const appliedReactionIdRef = useRef(-1);
  const environmentDateRef = useRef(new Date());
  const equippedItemsRef = useRef(equippedItems);
  equippedItemsRef.current = equippedItems;
  const previewItemRef = useRef<string | null>(previewItemId);
  previewItemRef.current = previewItemId;
  const selectedEquipSlotRef = useRef<string | null>(selectedEquipSlot);
  selectedEquipSlotRef.current = selectedEquipSlot;

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

  useEffect(() => {
    navigationRef.current?.setView(view);
  }, [view]);

  useEffect(() => {
    homeEquipmentRef.current?.setSelection(equippedItems, previewItemId);
  }, [equippedItems, previewItemId]);

  useEffect(() => {
    const marker = decorMarkerRef.current;
    const position = selectedEquipSlot
      ? getEquipSlotMarkerPosition(selectedEquipSlot)
      : null;
    if (!marker || !position) {
      if (marker) marker.visible = false;
      return;
    }
    marker.visible = true;
    marker.position.set(...position);
  }, [selectedEquipSlot]);

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
    glRef.current = gl;
    const generation = setupGenerationRef.current;

    const setup = async () => {
      const width = gl.drawingBufferWidth;
      const height = gl.drawingBufferHeight;

      // Track every disposable as it is created so both normal teardown and a
      // mid-construction throw release exactly what exists (LIFO order).
      const disposables: (() => void)[] = [];
      const teardown = () => {
        navigationRef.current = null;
        petTapRef.current = null;
        reactRef.current = null;
        homeEquipmentRef.current = null;
        decorMarkerRef.current = null;
        while (disposables.length) disposables.pop()?.();
      };
      cleanupRef.current = teardown;

      try {
        const renderer = createSceneRenderer({
          gl,
          clearColor: "#171614",
          exposure: 1.24,
        });
        disposables.push(() => renderer.dispose());

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x171614);
        // Portrait framing verified in the iOS simulator. Three's FOV is
        // vertical, so the narrow phone aspect needs a wider FOV and a target
        // close to the companion; the desk remains supporting context and can
        // be inspected with the bounded room orbit.
        const camera = new THREE.PerspectiveCamera(
          58,
          width / height,
          0.1,
          100,
        );
        camera.position.set(0.72, 1.3, 4.8);
        const navigation = createRoomNavigationController({
          initialView: view,
          reducedMotion: reducedMotionRef.current,
        });
        const initialPose = navigation.update(0);
        camera.position.copy(initialPose.position);
        camera.lookAt(initialPose.target);
        camera.fov = initialPose.fov;
        camera.updateProjectionMatrix();
        navigationRef.current = navigation;

        const accent = new THREE.Color(accentColor);
        const motion = createPetMotionController({ levelTier, streakTier });

        // Warm-sky/charcoal-ground hemisphere, warm key and practical desk lamp,
        // plus a cool rim light in the window recess so the night sky reads as
        // a light source against the lamp's warmth (blue/orange contrast).
        const hemi = new THREE.HemisphereLight(0xfff2e8, 0x24211e, 0.72);
        const keyLight = new THREE.DirectionalLight(0xfff0dd, 0.9);
        keyLight.position.set(2.5, 4, 3.5);
        const windowLight = new THREE.PointLight(0x8fa8c9, 0.35, 3, 1.8);
        windowLight.position.set(0.58, 1.72, -1.7);
        scene.add(hemi, keyLight, windowLight);

        const room = buildStudyRoom(accent, {
          levelTier,
          completedHabits: completedCount,
          totalHabits: totalCount,
        });
        scene.add(room.group);
        disposables.push(() => room.dispose());

        // One lifecycle-owned loop drives the complete room and companion.
        const clock = new THREE.Clock();
        let companionFrame:
          ((time: number, environment: EnvironmentProfile) => void) | null =
          null;
        let rewardBlend = 0;
        let previousTime = 0;
        let didNotifyReady = false;

        const animate = () => {
          frameRef.current = setTimeout(
            animate,
            appActiveRef.current ? 1000 / 30 : 250,
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
            rewardBlend,
          );

          navigation.setReducedMotion(reducedMotionRef.current);
          const cameraPose = navigation.update(deltaTime);
          camera.position.copy(cameraPose.position);
          camera.lookAt(cameraPose.target);
          if (Math.abs(camera.fov - cameraPose.fov) > 0.01) {
            camera.fov = cameraPose.fov;
            camera.updateProjectionMatrix();
          }
          companionFrame?.(t, environment);

          hemi.color.setRGB(...environment.hemisphereSky);
          hemi.groundColor.setRGB(...environment.hemisphereGround);
          hemi.intensity = environment.hemisphereIntensity;
          keyLight.color.setRGB(...environment.key);
          keyLight.intensity = environment.keyIntensity;
          windowLight.intensity +=
            (environment.windowIntensity - windowLight.intensity) * 0.06;
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
          room.lampPoolMat.opacity = Math.min(
            0.42,
            0.1 + environment.lampIntensity * 0.1,
          );
          room.wallSpillMat.opacity = Math.min(
            0.2,
            0.05 + environment.lampIntensity * 0.06,
          );
          room.stringMat.emissiveIntensity =
            environment.stringIntensity +
            (celebrating && !reducedMotionRef.current
              ? Math.sin(t * 8) * 0.22
              : 0);

          const localDate = environmentDateRef.current;
          const dayProgress =
            (localDate.getHours() * 60 + localDate.getMinutes()) / (24 * 60);
          room.celestial.position.x = 0.36 - dayProgress * 0.72;
          room.celestial.position.y =
            0.24 + Math.sin(dayProgress * Math.PI) * 0.28;
          const ambientSway = reducedMotionRef.current
            ? 0
            : environment.decorationMotion;
          for (let i = 0; i < room.ambientObjects.length; i++) {
            room.ambientObjects[i].rotation.z =
              Math.sin(t * 0.55 + i * 1.4) * 0.018 * ambientSway;
          }
          // Coffee steam: upward drift with a lateral waver, fading as each
          // wisp rises. Absolute positions off stored bases — no per-frame
          // integration, so amplitude is frame-rate independent.
          const steamRange = 0.14;
          let steamFade = 0;
          for (let i = 0; i < room.steamPlanes.length; i++) {
            const wisp = room.steamPlanes[i];
            const phase = ((t * 0.12 + i * 0.5) % 1 + 1) % 1;
            wisp.position.y = Number(wisp.userData.baseY) + phase * steamRange;
            wisp.position.x =
              Number(wisp.userData.baseX) +
              Math.sin(t * 1.1 + i * 2.1) * 0.008;
            steamFade = Math.max(steamFade, 1 - phase);
          }
          room.steamMat.opacity = 0.02 + 0.09 * steamFade * ambientSway;
          const homeObjects = homeEquipmentRef.current?.objects ?? [];
          for (let i = 0; i < homeObjects.length; i++) {
            const amount = Number(homeObjects[i].userData.ambientSway ?? 0);
            if (amount > 0) {
              homeObjects[i].rotation.z =
                Math.sin(t * 0.48 + i) * amount * ambientSway;
            }
          }
          const decorMarker = decorMarkerRef.current;
          if (decorMarker?.visible) {
            decorMarker.lookAt(camera.position);
            const markerBase =
              selectedEquipSlotRef.current === "room:rug" ? 1.8 : 1;
            decorMarker.scale.setScalar(
              markerBase * (1 + Math.sin(t * 3.2) * 0.045),
            );
          }

          renderer.render(scene, camera);
          gl.endFrameEXP();
          if (!didNotifyReady) {
            didNotifyReady = true;
            onReadyRef.current?.();
          }
        };

        // Load + parse the GLB per scene mount. loadCompanion caches the parsed
        // source graph, but createCompanionInstance deep-clones every geometry
        // and material (the GLB carries no textures), so this GL context owns
        // fully independent resources even while the dashboard scene is mounted.
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
        companion.root.position.copy(ROOM_PET_POSITION);
        companion.rig.petGroup.position.x = ROOM_PET_POSITION.x;
        companion.rig.petGroup.position.z = ROOM_PET_POSITION.z;
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

        // Pet equipment is lightweight and fixed for the current scene.
        const equipMaterials = createEquipmentMaterials(accent);
        disposables.push(() => equipMaterials.dispose());
        const equipped = attachEquipment(
          equippedItems,
          ["pet"],
          equipMaterials,
          {
            pet: companion.rig.petGroup,
          },
        );
        disposables.push(() => disposeEquipment(equipped));
        const homeEquipment = createHomeEquipmentPool(equipMaterials, {
          platform: companion.root,
          room: (anchor, object) => {
            const placement = room.anchorFor(anchor);
            object.position.set(...placement.position);
            object.rotation.y = placement.rotationY;
            scene.add(object);
          },
        });
        homeEquipment.setSelection(
          equippedItemsRef.current,
          previewItemRef.current,
        );
        homeEquipmentRef.current = homeEquipment;
        disposables.push(() => homeEquipment.dispose());

        const decorMarkerGeometry = new THREE.RingGeometry(0.16, 0.2, 24);
        const decorMarkerMaterial = new THREE.MeshBasicMaterial({
          color: 0xd97757,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
          depthTest: false,
        });
        const decorMarker = new THREE.Mesh(
          decorMarkerGeometry,
          decorMarkerMaterial,
        );
        decorMarker.renderOrder = 20;
        const markerPosition = selectedEquipSlotRef.current
          ? getEquipSlotMarkerPosition(selectedEquipSlotRef.current)
          : null;
        decorMarker.visible = Boolean(markerPosition);
        if (markerPosition) decorMarker.position.set(...markerPosition);
        scene.add(decorMarker);
        decorMarkerRef.current = decorMarker;
        disposables.push(() => {
          decorMarkerGeometry.dispose();
          decorMarkerMaterial.dispose();
        });
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

        // Soft radial contact shadow grounding the companion. The art spec
        // targets rug level (y 0.035), but this companion has an opaque pod
        // base spanning y 0–0.08 that would fully enclose a rug-level plane,
        // so it sits on the pod top (≈ y 0.095) where the pet actually casts.
        const shadowTexture = createShadowTexture();
        const shadowMaterial = createShadowMaterial(shadowTexture);
        const shadowGeometry = new THREE.PlaneGeometry(1, 1);
        const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
        shadow.rotation.x = -Math.PI / 2;
        shadow.scale.setScalar(1.15);
        // 0.0985 clears the pod's new inner glow ring (tops out at 0.098).
        shadow.position.set(ROOM_PET_POSITION.x, 0.0985, ROOM_PET_POSITION.z);
        shadow.renderOrder = 1;
        scene.add(shadow);
        disposables.push(() => {
          shadowGeometry.dispose();
          shadowMaterial.dispose();
          shadowTexture.dispose();
        });

        companionFrame = (t, environment) => {
          const s = stateRef.current;
          motion.apply(companion.rig, s, t, moodRef.current, {
            reducedMotion: reducedMotionRef.current,
            environmentWarmth: environment.companionWarmth,
            decorationMotion: environment.decorationMotion,
          });
        };

        // Expo GL can stall if new lit meshes are introduced after the first
        // submitted frame. Assemble the complete scene, then begin one loop.
        animate();
      } catch (error) {
        // Dispose whatever was constructed before the failure, then rethrow so
        // the outer handler swaps in the fallback renderer.
        teardown();
        throw error;
      }
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
    if (petTapRef.current?.(event.x, event.y, event.width, event.height)) {
      const reaction = onInteract?.() ?? "bounce";
      reactRef.current?.(reaction);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      return;
    }

    const nextView: RoomView =
      event.y < event.height * 0.55
        ? "windowShelf"
        : event.x < event.width * 0.52
          ? "desk"
          : "home";
    navigationRef.current?.setView(nextView);
    onViewChange?.(nextView);
  };

  return (
    <SceneTouchLayer
      accessibilityLabel="Interact with companion in My Space"
      onTap={handleTap}
      onDrag={(delta) => {
        parallaxRef.current.x = Math.max(
          -1,
          Math.min(1, parallaxRef.current.x + delta.x * 3),
        );
        parallaxRef.current.y = Math.max(
          -1,
          Math.min(1, parallaxRef.current.y + delta.y * 3),
        );
        navigationRef.current?.setParallax(
          parallaxRef.current.x,
          parallaxRef.current.y,
        );
      }}
      onSwipe={(event) => {
        const nextView = navigationRef.current?.selectFromSwipe(event.x);
        if (nextView) onViewChange?.(nextView);
      }}
      onDragEnd={() => {
        parallaxRef.current.x = 0;
        parallaxRef.current.y = 0;
        navigationRef.current?.resetParallax();
      }}
    >
      {/*
        No customisation remount key here by design: like accent/body colour,
        faceStyle is read on mount and picked up next time the room is entered,
        rather than rebuilding the full room scene mid-session. The GLB
        companion (createCompanionInstance) does vary by faceStyle, but the room
        intentionally defers that pickup to the next mount.
      */}
      <GLView
        style={styles.glView}
        msaaSamples={2}
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
