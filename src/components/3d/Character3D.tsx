import React, { useRef, useEffect } from "react";
import { View, StyleSheet, Dimensions, Pressable } from "react-native";
import { GLView } from "expo-gl";
import { Renderer } from "expo-three";
import * as THREE from "three";
import { useTheme } from "@/context/ThemeContext";
import { useCharacter } from "@/context/CharacterContext";
import { BorderRadius, Spacing } from "@/constants/Spacing";

const { width } = Dimensions.get("window");
const CHARACTER_SIZE = width * 0.75 * 0.8; // 80% of container

interface Character3DProps {
  onPress?: () => void;
}

export default function Character3D({ onPress }: Character3DProps) {
  const { colors } = useTheme();
  const { character } = useCharacter();
  const animationRef = useRef<number | null>(null);

  const onGLContextCreate = async (gl: any) => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      CHARACTER_SIZE / CHARACTER_SIZE,
      0.1,
      1000
    );

    const renderer = new Renderer({ gl });
    renderer.setSize(CHARACTER_SIZE, CHARACTER_SIZE);
    renderer.setClearColor(colors.background || "#000000", 1);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Create character body
    const bodyGeometry = new THREE.BoxGeometry(0.8, 1.5, 0.8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: character.color || colors.accent || "#ff6b35",
    });
    const characterBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
    characterBody.position.y = 0;
    scene.add(characterBody);

    // Add head
    const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: character.color || colors.accent || "#ff6b35",
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.2;
    scene.add(head);

    // Add simple eyes
    const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, 1.3, 0.35);
    scene.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.15, 1.3, 0.35);
    scene.add(rightEye);

    camera.position.z = 3;
    camera.position.y = 1;

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      // Gentle rotation
      characterBody.rotation.y += 0.01;
      head.rotation.y += 0.01;

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    animate();
  };

  useEffect(() => {
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <Pressable onPress={onPress} style={styles.pressable}>
      <View
        style={[
          styles.container,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.arenaArea}>
          <GLView style={styles.glView} onContextCreate={onGLContextCreate} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: "100%",
  },
  container: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: Spacing.xs,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  arenaArea: {
    width: "100%",
    maxWidth: 300,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  glView: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
});

