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
import { useAvatarData } from "@/components/avatar/useAvatarData";
import CharacterScene from "@/components/character/CharacterScene";
import { ExpoWebGLRenderingContext, GLView } from "expo-gl";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import { AppState, StyleSheet } from "react-native";
import * as THREE from "three";
import { buildStudyRoom, ROOM_PET_POSITION } from "./roomBuilders";

interface StudyRoomSceneProps {
  state?: AvatarState;
}

// The My Space scene: the companion at home in a cozy study nook. Reacts to
// focus/reward/level-up states (pet motion, desk lamp, string lights) and
// renders every equipped shop item — wearables on the pet, decorations by
// the pod, wall art and furniture at room anchors.
export default function StudyRoomScene({ state = "idle" }: StudyRoomSceneProps) {
  const { accentColor, bodyColor, levelTier, streakTier, equippedItems } =
    useAvatarData({});
  const [failed, setFailed] = useState(false);
  const frameRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appActiveRef = useRef(AppState.currentState === "active");
  const setupGenerationRef = useRef(0);
  const cleanupRef = useRef<(() => void) | null>(null);
  const orbitRef = useRef<OrbitRig | null>(null);
  const petTapRef = useRef<
    ((x: number, y: number, width: number, height: number) => boolean) | null
  >(null);
  const pokeRef = useRef<(() => void) | null>(null);

  const stateRef = useRef<AvatarState>(state);
  stateRef.current = state;

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
    });
    return () => {
      subscription.remove();
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
      let companionFrame: ((time: number) => void) | null = null;
      let companionCleanup: (() => void) | null = null;

      const animate = () => {
        frameRef.current = setTimeout(
          animate,
          appActiveRef.current ? 1000 / 30 : 250
        );
        if (!appActiveRef.current) return;
        const t = clock.getElapsedTime();
        const s = stateRef.current;
        const celebrating = s === "reward" || s === "levelUp";

        orbit.applyTo(camera, t);
        companionFrame?.(t);

        const lampTarget = s === "focus" ? 2.15 : celebrating ? 1.55 : 1.2;
        room.lampLight.intensity +=
          (lampTarget - room.lampLight.intensity) * 0.06;
        room.stringMat.emissiveIntensity = celebrating
          ? 1.8 + Math.sin(t * 8) * 0.65
          : 1.1;

        renderer.render(scene, camera);
        gl.endFrameEXP();
      };

      cleanupRef.current = () => {
        orbitRef.current = null;
        petTapRef.current = null;
        pokeRef.current = null;
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
      pokeRef.current = motion.poke;

      // Equipped items: this scene renders every slot, including room decor
      const equipMaterials = createEquipmentMaterials(accent);
      const equipped = attachEquipment(
        equippedItems,
        ["pet", "platform", "room"],
        equipMaterials,
        {
          pet: companion.rig.petGroup,
          platform: companion.root,
          room: (id, object) => {
            const anchor = room.anchorFor(id);
            if (!anchor) return;
            object.position.set(...anchor.position);
            object.rotation.y = anchor.rotationY;
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

      companionFrame = (t) => {
        const s = stateRef.current;
        motion.apply(companion.rig, s, t);
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
    pokeRef.current?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  return (
    <SceneTouchLayer
      onTap={handleTap}
      onDrag={(delta) => orbitRef.current?.orbitBy(delta)}
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
