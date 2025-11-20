import React, { useRef, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Pressable,
  Text,
  Modal,
} from "react-native";
import { GLView } from "expo-gl";
import { Renderer } from "expo-three";
import * as THREE from "three";
import { useTheme } from "@/context/ThemeContext";
import { useCharacter } from "@/context/CharacterContext";
import { Ionicons } from "@expo/vector-icons";
import FocusTimer from "@/components/study/FocusTimer";
import { Spacing, BorderRadius } from "@/constants/Spacing";

const { width, height } = Dimensions.get("window");

interface StudySpace3DProps {
  visible: boolean;
  onClose: () => void;
  showTimer?: boolean;
}

export default function StudySpace3D({
  visible,
  onClose,
  showTimer = true,
}: StudySpace3DProps) {
  const { colors } = useTheme();
  const { character } = useCharacter();
  const [showShop, setShowShop] = useState(false);
  const animationRef = useRef<number | null>(null);

  const onGLContextCreate = async (gl: any) => {
    try {
      console.log("GL Context created, setting up 3D scene...");
      const scene = new THREE.Scene();
      // Isometric camera setup
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);

      const renderer = new Renderer({ gl });
      renderer.setSize(width, height);
      renderer.setClearColor(0xf5f0e8, 1); // Light beige background
      console.log("Renderer created with size:", width, height);

      // Warm, soft lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight1 = new THREE.DirectionalLight(0xfff8e1, 0.8);
      directionalLight1.position.set(5, 8, 5);
      scene.add(directionalLight1);

      const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
      directionalLight2.position.set(-3, 4, -3);
      scene.add(directionalLight2);

      // Room colors - warm beige/brown palette
      const wallColor = 0xe8ddd4; // Light beige-brown
      const floorColor = 0xd4c4b0; // Slightly darker beige
      const woodColor = 0x8b6f47; // Medium brown wood
      const terracottaColor = 0xd2691e; // Terracotta orange
      const plantGreen = 0x4a7c59; // Muted green

      // Create room structure - floor
      const floorGeometry = new THREE.PlaneGeometry(10, 10);
      const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: floorColor,
        roughness: 0.8,
      });
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -2;
      scene.add(floor);

      // Back wall
      const backWallGeometry = new THREE.PlaneGeometry(10, 6);
      const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: wallColor,
        roughness: 0.7,
      });
      const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
      backWall.position.set(0, 1, -5);
      scene.add(backWall);

      // Right wall
      const rightWall = new THREE.Mesh(backWallGeometry, wallMaterial);
      rightWall.rotation.y = Math.PI / 2;
      rightWall.position.set(5, 1, 0);
      scene.add(rightWall);

      // Window on right wall
      const windowFrameGeometry = new THREE.BoxGeometry(3, 2.5, 0.2);
      const windowFrameMaterial = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
      const windowFrame = new THREE.Mesh(windowFrameGeometry, windowFrameMaterial);
      windowFrame.position.set(5, 1.5, 0.1);
      scene.add(windowFrame);

      // Window panes with warm glow
      const windowPaneGeometry = new THREE.PlaneGeometry(2.8, 2.3);
      const windowPaneMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xfff8e1,
        emissive: 0xfff8e1,
        emissiveIntensity: 0.5,
      });
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 3; j++) {
          const pane = new THREE.Mesh(windowPaneGeometry, windowPaneMaterial);
          pane.position.set(5, 1.5 + (j - 1) * 0.8, 0.15);
          pane.scale.set(0.32, 0.32, 1);
          scene.add(pane);
        }
      }

      // Wall clock
      const clockGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.05, 32);
      const clockMaterial = new THREE.MeshStandardMaterial({ color: 0xd4c4b0 });
      const clock = new THREE.Mesh(clockGeometry, clockMaterial);
      clock.rotation.z = Math.PI / 2;
      clock.position.set(4.5, 2.5, 0.1);
      scene.add(clock);

      // Clock hands
      const handGeometry = new THREE.BoxGeometry(0.15, 0.02, 0.01);
      const handMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
      const hourHand = new THREE.Mesh(handGeometry, handMaterial);
      hourHand.position.set(4.5, 2.5, 0.12);
      hourHand.rotation.z = -Math.PI / 6;
      scene.add(hourHand);
      const minuteHand = new THREE.Mesh(handGeometry, handMaterial);
      minuteHand.scale.set(1, 1.5, 1);
      minuteHand.position.set(4.5, 2.5, 0.12);
      minuteHand.rotation.z = -Math.PI / 3;
      scene.add(minuteHand);

      // Bookshelf against back wall
      const shelfGeometry = new THREE.BoxGeometry(2, 0.1, 0.8);
      const shelfMaterial = new THREE.MeshStandardMaterial({ color: woodColor });
      for (let i = 0; i < 3; i++) {
        const shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
        shelf.position.set(-2, -0.5 + i * 1.2, -4.5);
        scene.add(shelf);
      }
      // Bookshelf sides
      const sideGeometry = new THREE.BoxGeometry(0.1, 3.5, 0.8);
      const leftSide = new THREE.Mesh(sideGeometry, shelfMaterial);
      leftSide.position.set(-3, 0.5, -4.5);
      scene.add(leftSide);
      const rightSide = new THREE.Mesh(sideGeometry, shelfMaterial);
      rightSide.position.set(-1, 0.5, -4.5);
      scene.add(rightSide);

      // Books on shelf
      const bookColors = [0x5d4037, 0x4a7c59, 0x4a90e2];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const bookGeom = new THREE.BoxGeometry(0.5, 0.8, 0.1);
          const bookMat = new THREE.MeshStandardMaterial({ 
            color: bookColors[j % bookColors.length] 
          });
          const book = new THREE.Mesh(bookGeom, bookMat);
          book.position.set(-2.5 + j * 0.6, -0.5 + i * 1.2, -4.4);
          scene.add(book);
        }
      }

      // Side table next to bookshelf
      const tableTopGeometry = new THREE.BoxGeometry(1, 0.1, 0.6);
      const tableTop = new THREE.Mesh(tableTopGeometry, shelfMaterial);
      tableTop.position.set(-3.5, 0.3, -4);
      scene.add(tableTop);
      const tableLegGeometry = new THREE.BoxGeometry(0.1, 0.6, 0.1);
      for (let i = 0; i < 4; i++) {
        const leg = new THREE.Mesh(tableLegGeometry, shelfMaterial);
        const x = i % 2 === 0 ? -3.95 : -3.05;
        const z = i < 2 ? -4.25 : -3.75;
        leg.position.set(x, 0, z);
        scene.add(leg);
      }

      // Plant on side table
      const potGeometry = new THREE.CylinderGeometry(0.2, 0.15, 0.2, 16);
      const potMaterial = new THREE.MeshStandardMaterial({ color: terracottaColor });
      const pot = new THREE.Mesh(potGeometry, potMaterial);
      pot.position.set(-3.5, 0.5, -4);
      scene.add(pot);
      // Plant leaves
      for (let i = 0; i < 5; i++) {
        const leafGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const leafMaterial = new THREE.MeshStandardMaterial({ color: plantGreen });
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        leaf.position.set(
          -3.5 + (Math.random() - 0.5) * 0.3,
          0.7 + Math.random() * 0.2,
          -4 + (Math.random() - 0.5) * 0.3
        );
        scene.add(leaf);
      }

      // Empty pot next to plant
      const emptyPot = new THREE.Mesh(potGeometry, potMaterial);
      emptyPot.position.set(-3.5, 0.5, -3.5);
      scene.add(emptyPot);

      // Stool under side table
      const stoolGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.3, 16);
      const stool = new THREE.Mesh(stoolGeometry, shelfMaterial);
      stool.position.set(-3.5, -0.85, -3.5);
      scene.add(stool);

      // Wall art above side table
      const artFrameGeometry = new THREE.BoxGeometry(0.8, 0.6, 0.05);
      const artFrameMaterial = new THREE.MeshStandardMaterial({ color: 0x8b6f47 });
      const artFrame = new THREE.Mesh(artFrameGeometry, artFrameMaterial);
      artFrame.position.set(-3.5, 1.5, -4.9);
      scene.add(artFrame);

      // Floor plant in bottom left
      const floorPot = new THREE.Mesh(potGeometry, potMaterial);
      floorPot.position.set(-4, -1.8, -3);
      scene.add(floorPot);
      for (let i = 0; i < 6; i++) {
        const leafGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const leafMaterial = new THREE.MeshStandardMaterial({ color: plantGreen });
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        leaf.position.set(
          -4 + (Math.random() - 0.5) * 0.4,
          -1.5 + Math.random() * 0.3,
          -3 + (Math.random() - 0.5) * 0.4
        );
        scene.add(leaf);
      }

      // Wall plant below clock
      const wallPot = new THREE.Mesh(potGeometry, potMaterial);
      wallPot.position.set(4.5, 0.5, 0.1);
      scene.add(wallPot);
      for (let i = 0; i < 4; i++) {
        const leafGeometry = new THREE.SphereGeometry(0.12, 8, 8);
        const leafMaterial = new THREE.MeshStandardMaterial({ color: plantGreen });
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        leaf.position.set(
          4.5 + (Math.random() - 0.5) * 0.2,
          0.7 + Math.random() * 0.2,
          0.1 + (Math.random() - 0.5) * 0.2
        );
        scene.add(leaf);
      }

      // Floor planter in bottom right
      const planterGeometry = new THREE.BoxGeometry(1, 0.3, 0.5);
      const planter = new THREE.Mesh(planterGeometry, shelfMaterial);
      planter.position.set(3.5, -1.85, -2);
      scene.add(planter);
      for (let i = 0; i < 4; i++) {
        const leafGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const leafMaterial = new THREE.MeshStandardMaterial({ color: plantGreen });
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        leaf.position.set(
          3.5 + (Math.random() - 0.5) * 0.4,
          -1.6 + Math.random() * 0.2,
          -2 + (Math.random() - 0.5) * 0.3
        );
        scene.add(leaf);
      }

      // Desk
      const deskTopGeometry = new THREE.BoxGeometry(3, 0.15, 1.5);
      const deskMaterial = new THREE.MeshStandardMaterial({ 
        color: woodColor,
        roughness: 0.7,
      });
      const deskTop = new THREE.Mesh(deskTopGeometry, deskMaterial);
      deskTop.position.set(0, -0.5, -2);
      scene.add(deskTop);

      // Desk legs
      const legGeometry = new THREE.BoxGeometry(0.15, 1.2, 0.15);
      const legPositions = [
        [-1.4, -1.1, -2.6],
        [1.4, -1.1, -2.6],
        [-1.4, -1.1, -1.4],
        [1.4, -1.1, -1.4],
      ];
      legPositions.forEach((pos) => {
        const leg = new THREE.Mesh(legGeometry, deskMaterial);
        leg.position.set(pos[0], pos[1], pos[2]);
        scene.add(leg);
      });

      // Chair
      const chairSeatGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.8);
      const chairSeat = new THREE.Mesh(chairSeatGeometry, deskMaterial);
      chairSeat.position.set(0, -0.8, -0.5);
      scene.add(chairSeat);
      const chairBackGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.1);
      const chairBack = new THREE.Mesh(chairBackGeometry, deskMaterial);
      chairBack.position.set(0, -0.4, -0.1);
      scene.add(chairBack);
      const chairLegGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8);
      const chairLegPositions = [
        [-0.35, -1.15, -0.85],
        [0.35, -1.15, -0.85],
        [-0.35, -1.15, -0.15],
        [0.35, -1.15, -0.15],
      ];
      chairLegPositions.forEach((pos) => {
        const leg = new THREE.Mesh(chairLegGeometry, deskMaterial);
        leg.position.set(pos[0], pos[1], pos[2]);
        scene.add(leg);
      });

      // Rug under desk
      const rugGeometry = new THREE.CylinderGeometry(1.2, 1.2, 0.05, 32);
      const rugMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xfff8e1,
        roughness: 0.9,
      });
      const rug = new THREE.Mesh(rugGeometry, rugMaterial);
      rug.rotation.x = Math.PI / 2;
      rug.position.set(0, -1.95, -1.5);
      scene.add(rug);
      // Rug pattern (polka dots)
      for (let i = 0; i < 8; i++) {
        const dotGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.06, 16);
        const dotMaterial = new THREE.MeshStandardMaterial({ color: 0xffe082 });
        const dot = new THREE.Mesh(dotGeometry, dotMaterial);
        const angle = (i / 8) * Math.PI * 2;
        dot.position.set(
          0 + Math.cos(angle) * 0.6,
          -1.92,
          -1.5 + Math.sin(angle) * 0.6
        );
        scene.add(dot);
      }

      // Laptop on desk
      const laptopBaseGeometry = new THREE.BoxGeometry(1.2, 0.05, 0.8);
      const laptopMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xc0c0c0,
        metalness: 0.8,
        roughness: 0.2,
      });
      const laptopBase = new THREE.Mesh(laptopBaseGeometry, laptopMaterial);
      laptopBase.position.set(0.3, -0.35, -2);
      scene.add(laptopBase);
      const laptopScreenGeometry = new THREE.BoxGeometry(1.2, 0.8, 0.05);
      const laptopScreen = new THREE.Mesh(laptopScreenGeometry, laptopMaterial);
      laptopScreen.position.set(0.3, 0.05, -1.6);
      laptopScreen.rotation.x = -Math.PI / 6;
      scene.add(laptopScreen);
      const screenGeometry = new THREE.PlaneGeometry(1.1, 0.75);
      const screenMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a1a,
        emissive: 0x2a2a2a,
      });
      const screen = new THREE.Mesh(screenGeometry, screenMaterial);
      screen.position.set(0.3, 0.05, -1.58);
      screen.rotation.x = -Math.PI / 6;
      scene.add(screen);

      // Paper/notebook on desk
      const paperGeometry = new THREE.BoxGeometry(0.4, 0.01, 0.5);
      const paperMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const paper = new THREE.Mesh(paperGeometry, paperMaterial);
      paper.position.set(-0.8, -0.4, -1.8);
      paper.rotation.z = 0.1;
      scene.add(paper);

      // Create character sitting at desk
      const bodyGeometry = new THREE.BoxGeometry(0.6, 1, 0.5);
      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: terracottaColor, // Terracotta shirt
      });
      const characterBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
      characterBody.position.set(0, -0.2, -0.5);
      scene.add(characterBody);

      // Character head
      const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
      const headMaterial = new THREE.MeshStandardMaterial({
        color: 0xf5d5c4, // Peachy beige skin
      });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.set(0, 0.4, -0.5);
      scene.add(head);

      // Glasses
      const glassFrameGeometry = new THREE.TorusGeometry(0.08, 0.01, 8, 16);
      const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
      const leftGlass = new THREE.Mesh(glassFrameGeometry, glassMaterial);
      leftGlass.position.set(-0.08, 0.42, -0.3);
      leftGlass.rotation.y = Math.PI / 2;
      scene.add(leftGlass);
      const rightGlass = new THREE.Mesh(glassFrameGeometry, glassMaterial);
      rightGlass.position.set(0.08, 0.42, -0.3);
      rightGlass.rotation.y = Math.PI / 2;
      scene.add(rightGlass);
      const bridgeGeometry = new THREE.BoxGeometry(0.05, 0.01, 0.01);
      const bridge = new THREE.Mesh(bridgeGeometry, glassMaterial);
      bridge.position.set(0, 0.42, -0.3);
      scene.add(bridge);

      // Character pants
      const pantsGeometry = new THREE.BoxGeometry(0.5, 0.6, 0.4);
      const pantsMaterial = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
      const pants = new THREE.Mesh(pantsGeometry, pantsMaterial);
      pants.position.set(0, -0.7, -0.5);
      scene.add(pants);

      // Isometric camera position
      camera.position.set(4, 3, 4);
      camera.lookAt(0, -1, -2);
      console.log("Scene setup complete, starting animation...");

      // Animation loop
      const animate = () => {
        animationRef.current = requestAnimationFrame(animate);

        // Subtle character animation - slight breathing/idle movement
        const time = Date.now() * 0.001;
        characterBody.position.y = -0.2 + Math.sin(time * 0.5) * 0.02;
        head.position.y = 0.4 + Math.sin(time * 0.5) * 0.02;

        renderer.render(scene, camera);
        gl.endFrameEXP();
      };
      animate();
    } catch (error) {
      console.error("Error creating 3D scene:", error);
    }
  };

  useEffect(() => {
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: "#f5f0e8" }]}>
        {/* 3D Scene */}
        <GLView 
          style={styles.glView} 
          onContextCreate={onGLContextCreate}
          msaaSamples={0}
        />

        {/* Overlay UI */}
        <View style={styles.overlay}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <Pressable
              style={[styles.iconButton, { backgroundColor: colors.card }]}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
            <Pressable
              style={[styles.iconButton, { backgroundColor: colors.card }]}
              onPress={() => setShowShop(true)}
            >
              <Ionicons name="storefront" size={24} color={colors.text} />
            </Pressable>
          </View>

          {/* Timer in center - only show if showTimer is true */}
          {showTimer && (
            <View style={styles.timerContainer}>
              <FocusTimer />
            </View>
          )}
        </View>

        {/* Shop Modal */}
        <ShopModal
          visible={showShop}
          onClose={() => setShowShop(false)}
        />
      </View>
    </Modal>
  );
}

// Shop Component
function ShopModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const { character, updateCharacter } = useCharacter();
  const [selectedColor, setSelectedColor] = useState(character.color || "#ff6b35");

  const availableColors = [
    "#ff6b35",
    "#4a90e2",
    "#50c878",
    "#ffd700",
    "#ff69b4",
    "#9b59b6",
    "#e74c3c",
    "#3498db",
  ];

  const handleApply = () => {
    updateCharacter({ color: selectedColor });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.shopOverlay}>
        <View style={[styles.shopContainer, { backgroundColor: colors.card }]}>
          <View style={styles.shopHeader}>
            <Text style={[styles.shopTitle, { color: colors.text }]}>
              Customize Character
            </Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.shopContent}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Colors
            </Text>
            <View style={styles.colorGrid}>
              {availableColors.map((color) => (
                <Pressable
                  key={color}
                  style={[
                    styles.colorOption,
                    {
                      backgroundColor: color,
                      borderColor:
                        selectedColor === color ? colors.accent : colors.border,
                      borderWidth: selectedColor === color ? 3 : 1,
                    },
                  ]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>

            <Pressable
              style={[styles.buyButton, { backgroundColor: colors.accent }]}
              onPress={handleApply}
            >
              <Text
                style={[styles.buyButtonText, { color: colors.background }]}
              >
                Apply
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  glView: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: "box-none",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: Spacing.md,
    paddingTop: 60,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  timerContainer: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  shopOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  shopContainer: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: "70%",
  },
  shopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  shopTitle: {
    fontSize: 24,
    fontFamily: "Outfit-Bold",
  },
  shopContent: {
    gap: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Outfit-SemiBold",
    marginBottom: Spacing.sm,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  colorOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  buyButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  buyButtonText: {
    fontSize: 16,
    fontFamily: "Outfit-SemiBold",
  },
});

