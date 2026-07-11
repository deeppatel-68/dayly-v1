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
  createSceneRenderer,
} from "@/components/3d/sceneRenderer";
import { AvatarState } from "@/components/avatar/avatarTypes";
import { useAvatarData } from "@/components/avatar/useAvatarData";
import CharacterScene from "@/components/character/CharacterScene";
import { useTheme } from "@/context/ThemeContext";
import { ExpoWebGLRenderingContext, GLView } from "expo-gl";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
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
  const { colorScheme } = useTheme();
  const { accentColor, bodyColor, levelTier, streakTier, equippedItems } =
    useAvatarData({});
  const [failed, setFailed] = useState(false);
  const frameRef = useRef<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const orbitRef = useRef<OrbitRig | null>(null);
  const petTapRef = useRef<
    ((x: number, y: number, width: number, height: number) => boolean) | null
  >(null);
  const pokeRef = useRef<(() => void) | null>(null);

  const stateRef = useRef<AvatarState>(state);
  stateRef.current = state;

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

      const renderer = createSceneRenderer({
        gl,
        clearColor: "#141311",
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

      // Room lighting: warm-sky/charcoal-ground hemisphere (replaces the flat
      // ambient wash — gives walls/floor tonal variation), warm key, desk
      // lamp, accent rim by the pet.
      const hemi = new THREE.HemisphereLight(0xfff2e8, 0x1c1a18, 0.55);
      const keyLight = new THREE.DirectionalLight(0xfff0dd, 0.85);
      keyLight.position.set(2.5, 4, 3.5);
      const petRim = new THREE.PointLight(
        accent,
        0.5 + motion.streakBoost * 0.3,
        6
      );
      petRim.position.set(2.0, 1.5, 1.5);
      scene.add(hemi, keyLight, petRim);

      const room = buildStudyRoom(accent);
      scene.add(room.group);

      const source = await loadCompanion();
      if (cancelled) {
        room.dispose();
        return;
      }

      const companion = createCompanionInstance(source, {
        accent,
        bodyColor,
        levelTier,
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

      // Grounds the floating pet on its pod (puck top ≈ y 0.095)
      const shadow = createContactShadow(0.5);
      shadow.group.position.set(
        ROOM_PET_POSITION.x,
        0.096,
        ROOM_PET_POSITION.z
      );
      scene.add(shadow.group);

      const clock = new THREE.Clock();
      const animate = () => {
        frameRef.current = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();
        const s = stateRef.current;
        const celebrating = s === "reward" || s === "levelUp";

        orbit.applyTo(camera, t);
        motion.apply(companion.rig, s, t);
        shadow.setLift(companion.rig.petGroup.position.y);

        // Desk lamp settles brighter while focusing. Values retuned ~1.3x
        // hotter for ACES tone mapping (see sceneRenderer.ts).
        const lampTarget = s === "focus" ? 2.15 : celebrating ? 1.55 : 1.2;
        room.lampLight.intensity +=
          (lampTarget - room.lampLight.intensity) * 0.06;

        // String lights shimmer during celebrations (tone-mapped retune)
        room.stringMat.emissiveIntensity = celebrating
          ? 1.8 + Math.sin(t * 8) * 0.65
          : 1.1;

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
        room.dispose();
        renderer.dispose();
      };
    };

    setup().catch((error) => {
      console.error("Error creating study room scene:", error);
      if (!cancelled) setFailed(true);
    });

    return () => {
      cancelled = true;
    };
  };

  if (failed) {
    // Keep the space alive with the primitive pet if the room/GLB fails
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
