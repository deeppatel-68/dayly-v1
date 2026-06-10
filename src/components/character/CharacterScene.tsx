import { useCharacter } from "@/context/CharacterContext";
import { useHabits } from "@/context/HabitsContext";
import { useShop } from "@/context/ShopContext";
import { useTheme } from "@/context/ThemeContext";
import { useXp } from "@/context/XpContext";
import { shopItems } from "@/data/shopItems";
import { Ionicons } from "@expo/vector-icons";
import { ExpoWebGLRenderingContext, GLView } from "expo-gl";
import { Renderer } from "expo-three";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as THREE from "three";

export type CharacterState = "idle" | "focus" | "reward" | "levelUp";

interface CharacterSceneProps {
  // "preview" pulls the camera in closer for small containers
  variant?: "full" | "preview";
  state?: CharacterState;
}

const TWO_PI = Math.PI * 2;

export default function CharacterScene({
  variant = "full",
  state = "idle",
}: CharacterSceneProps) {
  const { colors, colorScheme } = useTheme();
  const { character } = useCharacter();
  const { isEquipped } = useShop();
  const { level } = useXp();
  const { currentStreak } = useHabits();
  const [failed, setFailed] = useState(false);
  const frameRef = useRef<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // The render loop reads the state through a ref so state changes
  // animate live without recreating the GL context
  const stateRef = useRef<CharacterState>(state);
  stateRef.current = state;

  const equippedIds = useMemo(
    () =>
      shopItems
        .filter(
          (item) =>
            (item.category === "accessory" || item.category === "decoration") &&
            isEquipped(item.id)
        )
        .map((item) => item.id),
    [isEquipped]
  );

  // Progression tiers keep the scene key stable between every XP gain
  const levelTier = Math.min(3, Math.floor((level - 1) / 3));
  const streakTier =
    currentStreak >= 14 ? 3 : currentStreak >= 7 ? 2 : currentStreak >= 3 ? 1 : 0;

  // Recreate the GL context only on customisation/theme/tier changes
  const sceneKey = `${character.color}|${equippedIds.join("+")}|${colorScheme}|L${levelTier}|S${streakTier}`;

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
    try {
      stopAndDispose();

      const width = gl.drawingBufferWidth;
      const height = gl.drawingBufferHeight;

      const renderer = new Renderer({ gl });
      renderer.setSize(width, height);
      renderer.setClearColor(colors.background, 1);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      if (variant === "preview") {
        camera.position.set(0, 0.88, 2.25);
        camera.lookAt(0, 0.7, 0);
      } else {
        // Leaves headroom above the halo so neither wide (dashboard) nor
        // square (study) containers crop the pet
        camera.position.set(0, 0.95, 2.5);
        camera.lookAt(0, 0.66, 0);
      }

      // Character colour is the accent; the body stays dark and premium
      const accent = new THREE.Color(character.color || colors.accent);
      const glowBase = 0.5 + levelTier * 0.12;
      const streakBoost = streakTier / 3;

      // Lights: soft key + dim accent rim, nothing expensive
      const ambient = new THREE.AmbientLight(0xffffff, 0.6);
      const keyLight = new THREE.DirectionalLight(0xfff4e8, 1.0);
      keyLight.position.set(2.5, 4, 4);
      const rimLight = new THREE.PointLight(accent, 0.55 + streakBoost * 0.3, 10);
      rimLight.position.set(-2, 1.5, -2);
      scene.add(ambient, keyLight, rimLight);
      if (levelTier >= 3) {
        const crownLight = new THREE.PointLight(accent, 0.4, 6);
        crownLight.position.set(0, 2.2, 0.5);
        scene.add(crownLight);
      }

      // Materials — smooth matte charcoal body, glossy face screen, warm glows
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x2a2a2f,
        roughness: 0.45,
        metalness: 0.08,
      });
      const faceMat = new THREE.MeshStandardMaterial({
        color: 0x0b0b0e,
        roughness: 0.22,
        metalness: 0.35,
      });
      const eyeMat = new THREE.MeshStandardMaterial({
        color: 0xfff6e8,
        emissive: 0xfff6e8,
        emissiveIntensity: 0.95,
      });
      const glowMat = new THREE.MeshStandardMaterial({
        color: accent,
        emissive: accent,
        emissiveIntensity: glowBase,
      });
      // The core gets its own material so its heartbeat stays subtle while
      // rings/halo can flash on celebrations
      const coreMat = new THREE.MeshStandardMaterial({
        color: accent,
        emissive: accent,
        emissiveIntensity: glowBase * 0.8,
      });
      const darkMat = new THREE.MeshStandardMaterial({
        color: 0x1f1f23,
        roughness: 0.5,
        metalness: 0.1,
      });

      // Digital pet: one rounded compact body — the head IS the body.
      // A darker base hemisphere + seam ring give it a designed,
      // premium-hardware feel instead of a plain egg
      const characterGroup = new THREE.Group();

      const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 28, 22), bodyMat);
      body.scale.set(1, 1.1, 0.95);
      body.position.y = 0.62;

      const base = new THREE.Mesh(
        new THREE.SphereGeometry(0.555, 24, 14, 0, TWO_PI, Math.PI * 0.55, Math.PI * 0.45),
        darkMat
      );
      base.scale.set(1, 1.1, 0.95);
      base.position.y = 0.62;

      const seam = new THREE.Mesh(
        new THREE.TorusGeometry(0.548, 0.008, 8, 48),
        darkMat
      );
      seam.rotation.x = Math.PI / 2;
      seam.scale.set(1, 1, 0.95);
      seam.position.y = 0.525;

      // Glossy inset face screen on the upper front, kept subtle
      const face = new THREE.Mesh(new THREE.SphereGeometry(0.4, 22, 18), faceMat);
      face.scale.set(1, 0.75, 0.45);
      face.position.set(0, 0.78, 0.27);

      // Big expressive oval eyes — the personality carrier
      const eyeGeo = new THREE.SphereGeometry(0.095, 14, 12);
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.scale.set(1, 1.25, 0.5);
      leftEye.position.set(-0.17, 0.8, 0.5);
      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.scale.set(1, 1.25, 0.5);
      rightEye.position.set(0.17, 0.8, 0.5);

      // Energy core: a small framed heart, pulsing quietly
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 12), coreMat);
      core.position.set(0, 0.36, 0.45);
      const coreFrame = new THREE.Mesh(
        new THREE.TorusGeometry(0.085, 0.012, 10, 24),
        darkMat
      );
      coreFrame.position.set(0, 0.36, 0.46);
      coreFrame.rotation.x = -0.25;

      // Soft minimal flippers, tucked close
      const flipperGeo = new THREE.SphereGeometry(0.3, 16, 12);
      const leftFlipper = new THREE.Mesh(flipperGeo, bodyMat);
      leftFlipper.scale.set(0.28, 0.6, 0.4);
      leftFlipper.position.set(-0.54, 0.5, 0);
      leftFlipper.rotation.z = 0.25;
      const rightFlipper = new THREE.Mesh(flipperGeo, bodyMat);
      rightFlipper.scale.set(0.28, 0.6, 0.4);
      rightFlipper.position.set(0.54, 0.5, 0);
      rightFlipper.rotation.z = -0.25;

      // Halo charm: tilted collectible ring hovering above, grows with tier
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.12, 0.018, 10, 28),
        glowMat
      );
      halo.position.set(0, 1.42, 0);
      halo.rotation.x = Math.PI / 2;
      if (levelTier >= 3) halo.scale.setScalar(1.25);

      characterGroup.add(
        body,
        base,
        seam,
        face,
        leftEye,
        rightEye,
        core,
        coreFrame,
        leftFlipper,
        rightFlipper,
        halo
      );

      // Head accessories (equipped shop items), simple primitives only
      if (equippedIds.includes("focus-cap")) {
        const dome = new THREE.Mesh(
          new THREE.SphereGeometry(0.58, 18, 12, 0, TWO_PI, 0, Math.PI / 2.8),
          darkMat
        );
        dome.position.y = 0.72;
        const brim = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.035, 0.3),
          darkMat
        );
        brim.position.set(0, 1.06, 0.5);
        characterGroup.add(dome, brim);
      }

      if (equippedIds.includes("study-glasses")) {
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const lensGeo = new THREE.TorusGeometry(0.115, 0.016, 8, 20);
        const leftLens = new THREE.Mesh(lensGeo, frameMat);
        leftLens.position.set(-0.16, 0.8, 0.53);
        const rightLens = leftLens.clone();
        rightLens.position.x = 0.16;
        const bridge = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.016, 0.016),
          frameMat
        );
        bridge.position.set(0, 0.8, 0.54);
        characterGroup.add(leftLens, rightLens, bridge);
      }

      if (equippedIds.includes("neon-headphones")) {
        const band = new THREE.Mesh(
          new THREE.TorusGeometry(0.58, 0.03, 8, 24, Math.PI),
          darkMat
        );
        band.position.y = 0.66;
        const earGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.07, 14);
        const leftEar = new THREE.Mesh(earGeo, glowMat);
        leftEar.rotation.z = Math.PI / 2;
        leftEar.position.set(-0.58, 0.66, 0);
        const rightEar = leftEar.clone();
        rightEar.position.x = 0.58;
        characterGroup.add(band, leftEar, rightEar);
      }

      scene.add(characterGroup);

      // Pod: thin platform with a glow ring; more rings at higher tiers
      const platform = new THREE.Mesh(
        new THREE.CylinderGeometry(0.74, 0.78, 0.05, 32),
        new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.85 })
      );
      platform.position.y = -0.025;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.76, 0.012, 8, 48),
        glowMat
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.005;
      scene.add(platform, ring);

      if (levelTier >= 1) {
        const outerRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.88, 0.006, 8, 48),
          glowMat
        );
        outerRing.rotation.x = Math.PI / 2;
        outerRing.position.y = 0.005;
        scene.add(outerRing);
      }

      let orbitRing: THREE.Mesh | null = null;
      if (levelTier >= 2) {
        orbitRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.78, 0.008, 8, 48),
          glowMat
        );
        orbitRing.position.y = 0.62;
        orbitRing.rotation.x = 1.25;
        scene.add(orbitRing);
      }

      // Platform decorations (equipped shop items)
      if (equippedIds.includes("study-plant")) {
        const pot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.05, 0.08, 10),
          darkMat
        );
        pot.position.set(0.56, 0.04, 0.3);
        const leaves = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, 0.16, 8),
          new THREE.MeshStandardMaterial({
            color: 0x4a7c59,
            flatShading: true,
            roughness: 0.7,
          })
        );
        leaves.position.set(0.56, 0.16, 0.3);
        scene.add(pot, leaves);
      }

      if (equippedIds.includes("neon-lamp")) {
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.012, 0.012, 0.34, 8),
          darkMat
        );
        pole.position.set(-0.58, 0.17, 0.26);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), glowMat);
        bulb.position.set(-0.58, 0.37, 0.26);
        scene.add(pole, bulb);
      }

      if (equippedIds.includes("motivational-poster")) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.02), darkMat);
        panel.position.set(-0.48, 0.55, -0.42);
        panel.rotation.y = 0.4;
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.022), glowMat);
        stripe.position.set(-0.48, 0.62, -0.418);
        stripe.rotation.y = 0.4;
        scene.add(panel, stripe);
      }

      // Animation loop — driven by stateRef so states change live
      const clock = new THREE.Clock();
      let rewardSpin = 0;
      const animate = () => {
        frameRef.current = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();
        const s = stateRef.current;
        const celebrating = s === "reward" || s === "levelUp";

        // Bounce: springy idle, steadier in focus, bouncy when celebrating
        if (celebrating) {
          characterGroup.position.y = 0.05 + Math.abs(Math.sin(t * 3.2)) * 0.11;
        } else {
          const bobAmp = s === "focus" ? 0.025 : 0.045;
          const bobFreq = s === "focus" ? 2.2 : 1.8;
          characterGroup.position.y = 0.05 + Math.sin(t * bobFreq) * bobAmp;
        }

        // Sway faces mostly forward; celebrations spin, then ease back front
        if (celebrating) {
          rewardSpin += 0.12;
        } else if (rewardSpin % TWO_PI !== 0) {
          const target = Math.round(rewardSpin / TWO_PI) * TWO_PI;
          rewardSpin += (target - rewardSpin) * 0.08;
          if (Math.abs(target - rewardSpin) < 0.001) rewardSpin = target;
        }
        const sway = s === "focus" ? 0 : Math.sin(t * 0.6) * 0.3;
        characterGroup.rotation.y = sway + rewardSpin;
        characterGroup.rotation.x = s === "focus" ? 0.06 : 0;

        // Level-up celebration adds a scale pulse
        const scale = s === "levelUp" ? 1 + Math.sin(t * 6) * 0.05 : 1;
        characterGroup.scale.setScalar(scale);

        // Rings/halo glow: streaks deepen the pulse, rewards flash it
        const pulse =
          Math.sin(t * (s === "focus" ? 3.4 : 1.8)) * (0.1 + streakBoost * 0.15);
        glowMat.emissiveIntensity = glowBase + pulse + (celebrating ? 0.35 : 0);

        // Core heartbeat: quiet, quickens in focus, never dominates
        coreMat.emissiveIntensity =
          glowBase * 0.8 +
          Math.sin(t * (s === "focus" ? 3.4 : 1.6)) * 0.08 +
          (celebrating ? 0.2 : 0);

        // Expressions: soft idle blink, focused squint, wide happy celebration
        if (s === "focus") {
          leftEye.scale.set(1, 0.55, 0.5);
          rightEye.scale.set(1, 0.55, 0.5);
          eyeMat.emissiveIntensity = 1.4;
        } else if (celebrating) {
          leftEye.scale.set(1.15, 1.45, 0.5);
          rightEye.scale.set(1.15, 1.45, 0.5);
          eyeMat.emissiveIntensity = 1.3;
        } else {
          const blink = t % 3.6 < 0.12 ? 0.1 : 1.25;
          leftEye.scale.set(1, blink, 0.5);
          rightEye.scale.set(1, blink, 0.5);
          eyeMat.emissiveIntensity = 0.95;
        }

        // Halo charm: lazy spin, slight tilt wobble, gentle floating lag
        halo.rotation.z = t * 0.7;
        halo.rotation.x = Math.PI / 2 + Math.sin(t * 0.9) * 0.08;
        halo.position.y = 1.42 + Math.sin(t * 1.8 + 0.9) * 0.02;

        if (orbitRing) orbitRing.rotation.z = t * 0.5;

        renderer.render(scene, camera);
        gl.endFrameEXP();
      };
      animate();

      cleanupRef.current = () => {
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            const mats = Array.isArray(obj.material)
              ? obj.material
              : [obj.material];
            mats.forEach((m) => m.dispose());
          }
        });
        renderer.dispose();
      };
    } catch (error) {
      console.error("Error creating 3D character scene:", error);
      setFailed(true);
    }
  };

  if (failed) {
    return (
      <View style={[styles.fallback, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.fallbackAvatar,
            { backgroundColor: character.color || colors.accent },
          ]}
        >
          <Ionicons name="person" size={28} color="#ffffff" />
        </View>
        <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
          Avatar unavailable
        </Text>
      </View>
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
  fallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  fallbackAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
  },
});
