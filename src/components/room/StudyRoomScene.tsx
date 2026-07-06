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
import { AvatarState } from "@/components/avatar/avatarTypes";
import { useAvatarData } from "@/components/avatar/useAvatarData";
import CharacterScene from "@/components/character/CharacterScene";
import { useTheme } from "@/context/ThemeContext";
import { ExpoWebGLRenderingContext, GLView } from "expo-gl";
import { Renderer } from "expo-three";
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
  const { colors, colorScheme } = useTheme();
  const { accentColor, bodyColor, levelTier, streakTier, equippedItems } =
    useAvatarData({});
  const [failed, setFailed] = useState(false);
  const frameRef = useRef<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

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

      const renderer = new Renderer({ gl });
      renderer.setSize(width, height);
      renderer.setClearColor(colors.background, 1);
      renderer.debug.checkShaderErrors = false;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
      camera.position.set(0.55, 1.75, 4.3);
      camera.lookAt(0, 0.9, -0.4);

      const accent = new THREE.Color(accentColor);
      const motion = createPetMotionController({ levelTier, streakTier });

      // Room lighting: soft ambient, warm key, desk lamp, accent rim by pet
      const ambient = new THREE.AmbientLight(0xffffff, 0.5);
      const keyLight = new THREE.DirectionalLight(0xfff0dd, 0.75);
      keyLight.position.set(2.5, 4, 3.5);
      const petRim = new THREE.PointLight(
        accent,
        0.45 + motion.streakBoost * 0.3,
        6
      );
      petRim.position.set(2.0, 1.5, 1.5);
      scene.add(ambient, keyLight, petRim);

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

      const clock = new THREE.Clock();
      const animate = () => {
        frameRef.current = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();
        const s = stateRef.current;
        const celebrating = s === "reward" || s === "levelUp";

        motion.apply(companion.rig, s, t);

        // Desk lamp settles brighter while focusing
        const lampTarget = s === "focus" ? 1.5 : celebrating ? 1.1 : 0.85;
        room.lampLight.intensity +=
          (lampTarget - room.lampLight.intensity) * 0.06;

        // String lights shimmer during celebrations
        room.stringMat.emissiveIntensity = celebrating
          ? 1.3 + Math.sin(t * 8) * 0.45
          : 0.8;

        renderer.render(scene, camera);
        gl.endFrameEXP();
      };
      animate();

      cleanupRef.current = () => {
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
