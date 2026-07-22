import { loadAsync } from "expo-three";
import * as THREE from "three";
import { FaceStyle } from "@/data/faceStyles";
import { createCompanionEvolution } from "./companionEvolution";
import { createGlowSpriteMaterial, createGlowTexture } from "./glow";
import { PetRig } from "./petMotion";

// Fake-bloom sprite sizing, relative to each source mesh's bounding-sphere
// diameter. Halo sprite is parented to the halo mesh, so its world size already
// inherits the levelTier >= 3 1.25x halo scale.
export const CORE_GLOW_SCALE = 2.6;
export const HALO_GLOW_SCALE = 1.4;

// Shared-anatomy node names authored in the Blender source
// (assets/avatar/dayly-companion-build.py). Face nodes (eyes/visor/blush) are
// deliberately NOT listed here: they live inside the per-style Face_* groups
// and travel with the active group in createCompanionInstance, so pruning a
// style hides its whole face instead of leaving name-matched classic eyes
// stranded (and always visible) in petGroup.
export const PET_NODES = [
  "Body",
  "FacePanel",
  "EnergyCore",
  "HaloCharm",
  "LeftFlipper",
  "RightFlipper",
  "LeftFoot",
  "RightFoot",
];

export type CompanionDetail = "hero" | "lite";

// Metro requires literal asset paths. Keep one parsed, immutable source graph
// for each detail tier; instances still own all disposable GPU resources.
const companionSourcePromises: Record<
  CompanionDetail,
  Promise<THREE.Group> | null
> = { hero: null, lite: null };

function parseCompanion(detail: CompanionDetail): Promise<THREE.Group> {
  const asset =
    detail === "lite"
      ? // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("../../../assets/avatar/dayly-companion-lite.glb")
      : // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("../../../assets/avatar/dayly-companion.glb");
  return loadAsync(asset).then((gltf: { scene: THREE.Group }) => gltf.scene);
}

export function loadCompanion(
  detail: CompanionDetail = "hero",
): Promise<THREE.Group> {
  const cached = companionSourcePromises[detail];
  if (cached) return cached;

  const request = parseCompanion(detail).catch((error) => {
    companionSourcePromises[detail] = null;
    throw error;
  });
  companionSourcePromises[detail] = request;
  return request;
}

export interface FaceMotionPose {
  eyeScaleX: number;
  eyeScaleY: number;
  mouthScaleY?: number;
}

export interface FaceMotionProfile {
  blinkScaleY: number | null;
  focus: FaceMotionPose;
  reward: FaceMotionPose;
  levelUp: FaceMotionPose;
}

export interface FaceRigNodes {
  group: string;
  leftEye: string;
  rightEye: string;
  leftPupil?: string;
  rightPupil?: string;
  mouth?: string;
  motion: FaceMotionProfile;
}

export const FACE_RIG_NODES: Record<FaceStyle, FaceRigNodes> = {
  classic: {
    group: "Face_Classic",
    leftEye: "LeftEye",
    rightEye: "RightEye",
    leftPupil: "LeftPupil",
    rightPupil: "RightPupil",
    mouth: "VisorLip",
    motion: {
      blinkScaleY: 0.1,
      focus: { eyeScaleX: 0.9, eyeScaleY: 0.7, mouthScaleY: 0.12 },
      reward: { eyeScaleX: 1, eyeScaleY: 0.84, mouthScaleY: 1 },
      levelUp: {
        eyeScaleX: 1.08,
        eyeScaleY: 1.14,
        mouthScaleY: 1.18,
      },
    },
  },
  eve: {
    group: "Face_Eve",
    leftEye: "EveLeftEye",
    rightEye: "EveRightEye",
    leftPupil: "EveLeftPupil",
    rightPupil: "EveRightPupil",
    motion: {
      blinkScaleY: 0.08,
      focus: { eyeScaleX: 0.96, eyeScaleY: 0.72 },
      reward: { eyeScaleX: 1.04, eyeScaleY: 0.9 },
      levelUp: { eyeScaleX: 1.08, eyeScaleY: 1.1 },
    },
  },
  screen: {
    group: "Face_Screen",
    leftEye: "ScreenLeftEye",
    rightEye: "ScreenRightEye",
    mouth: "ScreenMouth",
    motion: {
      blinkScaleY: 0.12,
      focus: { eyeScaleX: 0.88, eyeScaleY: 0.58, mouthScaleY: 0.45 },
      reward: { eyeScaleX: 1.06, eyeScaleY: 0.78, mouthScaleY: 1.4 },
      levelUp: { eyeScaleX: 1.12, eyeScaleY: 1.18, mouthScaleY: 1.7 },
    },
  },
  kirby: {
    group: "Face_Kirby",
    leftEye: "KirbyLeftEye",
    rightEye: "KirbyRightEye",
    leftPupil: "KirbyLeftPupil",
    rightPupil: "KirbyRightPupil",
    mouth: "KirbyMouth",
    motion: {
      blinkScaleY: 0.08,
      focus: { eyeScaleX: 0.88, eyeScaleY: 0.68, mouthScaleY: 0.3 },
      reward: { eyeScaleX: 1.02, eyeScaleY: 0.88, mouthScaleY: 1.12 },
      levelUp: { eyeScaleX: 1.1, eyeScaleY: 1.12, mouthScaleY: 1.28 },
    },
  },
  joy: {
    group: "Face_Joy",
    leftEye: "JoyLeftEye",
    rightEye: "JoyRightEye",
    mouth: "JoyMouth",
    motion: {
      blinkScaleY: null,
      focus: { eyeScaleX: 0.98, eyeScaleY: 0.82, mouthScaleY: 0.2 },
      reward: { eyeScaleX: 1.04, eyeScaleY: 1.08, mouthScaleY: 1.08 },
      levelUp: { eyeScaleX: 1.08, eyeScaleY: 1.16, mouthScaleY: 1.22 },
    },
  },
};

export interface CompanionOptions {
  accent: THREE.Color;
  bodyColor: string;
  detail?: CompanionDetail;
  faceStyle: FaceStyle;
  levelTier: number;
  streakTier: number;
}

export interface CompanionInstance {
  // Pod + ring stay in `root`; the animated pet lives in `rig.petGroup`
  root: THREE.Group;
  rig: PetRig;
  dispose: () => void;
}

// Expo GL's iOS simulator path can drop lit material passes. The companion is
// texture-free, so preserve its authored colour hierarchy with a reliable
// unlit palette while sprites provide the animated glow response.
function createExpoSafeMaterial(
  source: THREE.Material,
): THREE.MeshBasicMaterial {
  const sourceMaterial = source as THREE.MeshStandardMaterial;
  const sourceBasicMaterial = source as THREE.MeshBasicMaterial;
  const color = sourceMaterial.color?.clone() ?? new THREE.Color(0xffffff);
  if (sourceMaterial.emissive && sourceMaterial.emissive.getHex() !== 0) {
    color.lerp(
      sourceMaterial.emissive,
      Math.min(0.55, 0.08 + sourceMaterial.emissiveIntensity * 0.1),
    );
  }
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: sourceMaterial.transparent,
    opacity: sourceMaterial.opacity,
    depthTest: sourceMaterial.depthTest,
    depthWrite: sourceMaterial.depthWrite,
    side: sourceMaterial.side,
    alphaTest: sourceMaterial.alphaTest,
    blending: sourceMaterial.blending,
    vertexColors: sourceMaterial.vertexColors,
    ...(sourceMaterial.map ? { map: sourceMaterial.map } : {}),
    ...(sourceMaterial.alphaMap ? { alphaMap: sourceMaterial.alphaMap } : {}),
    ...(sourceMaterial.aoMap ? { aoMap: sourceMaterial.aoMap } : {}),
    ...(sourceMaterial.lightMap ? { lightMap: sourceMaterial.lightMap } : {}),
    ...(sourceBasicMaterial.specularMap
      ? { specularMap: sourceBasicMaterial.specularMap }
      : {}),
    ...(sourceMaterial.envMap ? { envMap: sourceMaterial.envMap } : {}),
  });
  material.toneMapped = false;
  material.name = source.name;
  return material;
}

function contractError(faceStyle: FaceStyle, nodeName: string): Error {
  return new Error(
    `Companion model contract violation for "${faceStyle}": missing required node "${nodeName}"`,
  );
}

function saveAuthoredTransform(node?: THREE.Object3D): void {
  if (!node) return;
  node.userData.baseScale = node.scale.clone();
  node.userData.basePosition = node.position.clone();
  node.userData.baseRotation = node.rotation.clone();
  node.userData.baseRotationZ = node.rotation.z;
}

// Clone hierarchy first, discard unused faces while resources still point at
// the immutable source, then clone retained resources with identity maps. This
// preserves sharing inside one instance without crossing GL-context ownership.
export function createCompanionInstance(
  source: THREE.Group,
  {
    accent,
    bodyColor,
    detail = "hero",
    faceStyle,
    levelTier,
    streakTier,
  }: CompanionOptions,
): CompanionInstance {
  const root = source.clone(true);
  root.userData.companionDetail = detail;
  const profile = FACE_RIG_NODES[faceStyle];

  const faceGroups: THREE.Object3D[] = [];
  root.traverse((node) => {
    if (node.name.startsWith("Face_")) faceGroups.push(node);
  });
  const activeFace = faceGroups.find((group) => group.name === profile.group);
  if (!activeFace) throw contractError(faceStyle, profile.group);
  for (const group of faceGroups) {
    if (group !== activeFace) group.removeFromParent();
  }

  const requireNode = (name: string, scope: THREE.Object3D = root) => {
    const node = scope.getObjectByName(name);
    if (!node) throw contractError(faceStyle, name);
    return node;
  };
  const requireMesh = (name: string, scope: THREE.Object3D = root) => {
    const node = requireNode(name, scope);
    if (!(node instanceof THREE.Mesh)) throw contractError(faceStyle, name);
    return node;
  };

  for (const name of PET_NODES) requireNode(name);
  requireNode("Body_Charcoal");
  const leftEye = requireMesh(profile.leftEye, activeFace);
  const rightEye = requireMesh(profile.rightEye, activeFace);
  const leftPupil = profile.leftPupil
    ? requireMesh(profile.leftPupil, activeFace)
    : undefined;
  const rightPupil = profile.rightPupil
    ? requireMesh(profile.rightPupil, activeFace)
    : undefined;
  const mouth = profile.mouth
    ? requireMesh(profile.mouth, activeFace)
    : undefined;
  const core = requireMesh("EnergyCore");
  const halo = requireMesh("HaloCharm");
  const platformRing = requireMesh("PlatformRing");
  const innerRing = requireMesh("PlatformInnerRing");

  const ownedGeometries = new Set<THREE.BufferGeometry>();
  const ownedMaterials = new Set<THREE.Material>();
  const geometryClones = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();
  const materialClones = new Map<THREE.Material, THREE.MeshBasicMaterial>();
  const cloneGeometry = (geometry: THREE.BufferGeometry) => {
    let clone = geometryClones.get(geometry);
    if (!clone) {
      clone = geometry.clone();
      geometryClones.set(geometry, clone);
      ownedGeometries.add(clone);
    }
    return clone;
  };
  const cloneMaterial = (material: THREE.Material) => {
    let clone = materialClones.get(material);
    if (!clone) {
      clone = createExpoSafeMaterial(material);
      materialClones.set(material, clone);
      ownedMaterials.add(clone);
    }
    return clone;
  };

  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    node.geometry = cloneGeometry(node.geometry);
    node.material = Array.isArray(node.material)
      ? node.material.map(cloneMaterial)
      : cloneMaterial(node.material);
  });

  const materialOf = (mesh: THREE.Mesh): THREE.MeshBasicMaterial =>
    (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as
      THREE.MeshBasicMaterial;
  const replaceMaterial = (
    mesh: THREE.Mesh,
    replacement: THREE.MeshBasicMaterial,
    predicate: (material: THREE.Material) => boolean = () => true,
  ) => {
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((material) =>
        predicate(material) ? replacement : material,
      );
    } else if (predicate(mesh.material)) {
      mesh.material = replacement;
    }
  };
  const roleMaterial = (
    name: string,
    sourceMaterial: THREE.MeshBasicMaterial,
    brightness: number,
  ) => {
    const material = sourceMaterial.clone();
    material.name = name;
    material.color.copy(accent).multiplyScalar(brightness);
    material.toneMapped = false;
    ownedMaterials.add(material);
    return material;
  };

  // Body arrays keep their dark base slot. Every charcoal slot shares one
  // context-owned runtime material with the original render flags intact.
  let bodyMat: THREE.MeshBasicMaterial | null = null;
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const materials = Array.isArray(node.material)
      ? node.material
      : [node.material];
    const charcoal = materials.find(
      (material) => material.name === "Body_Charcoal",
    ) as THREE.MeshBasicMaterial | undefined;
    if (!charcoal) return;
    if (!bodyMat) {
      bodyMat = charcoal.clone();
      bodyMat.name = "Body_Charcoal_Runtime";
      bodyMat.color.set(bodyColor);
      bodyMat.toneMapped = false;
      ownedMaterials.add(bodyMat);
    }
    replaceMaterial(
      node,
      bodyMat,
      (material) => material.name === "Body_Charcoal",
    );
  });

  // The hierarchy is intentionally not one shared accent material: each role
  // can respond independently in the animation loop while retaining maps and
  // safe material flags from its authored source.
  const sourceAccentMat = materialOf(platformRing);
  const coreMat = roleMaterial("Core_Accent_Runtime", materialOf(core), 1);
  const orbitMat = roleMaterial(
    "Orbit_Accent_Runtime",
    materialOf(halo),
    0.82,
  );
  const faceMat = roleMaterial(
    "Face_Accent_Runtime",
    sourceAccentMat,
    0.72,
  );
  const platformMat = roleMaterial(
    "Platform_Ring_Runtime",
    sourceAccentMat,
    0.45,
  );
  const innerMat = roleMaterial(
    "Platform_Inner_Runtime",
    materialOf(innerRing),
    0.25,
  );

  replaceMaterial(core, coreMat);
  halo.traverse((node) => {
    if (node instanceof THREE.Mesh) replaceMaterial(node, orbitMat);
  });
  activeFace.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    replaceMaterial(node, faceMat, (material) => material === sourceAccentMat);
  });
  replaceMaterial(platformRing, platformMat);
  replaceMaterial(innerRing, innerMat);

  const petGroup = new THREE.Group();
  petGroup.name = "CompanionPetRig";
  petGroup.userData.faceStyle = faceStyle;
  petGroup.userData.faceMotionProfile = profile.motion;
  const petNodes = PET_NODES.map((name) => requireNode(name));
  petNodes.forEach((node) => petGroup.add(node));
  root.updateWorldMatrix(true, true);
  petGroup.attach(activeFace);

  const leftFlipper = petGroup.getObjectByName("LeftFlipper");
  const rightFlipper = petGroup.getObjectByName("RightFlipper");
  for (const node of [
    leftEye,
    rightEye,
    leftPupil,
    rightPupil,
    mouth,
    leftFlipper,
    rightFlipper,
  ]) {
    saveAuthoredTransform(node);
  }

  if (levelTier >= 3) halo.scale.setScalar(1.25);

  const eyeMat = materialOf(leftEye);
  if (eyeMat !== faceMat) eyeMat.color.set(0xffe3bd);
  const mouthMat = mouth ? materialOf(mouth) : null;

  // Fake-bloom halos: one texture per instance and independent sprite
  // materials so core and orbit opacity can animate without cross-talk.
  const glowTexture = createGlowTexture();
  const glowColor = accent.getHex();
  const attachGlow = (mesh: THREE.Mesh, scaleFactor: number) => {
    const material = createGlowSpriteMaterial(glowTexture, glowColor);
    ownedMaterials.add(material);
    const sprite = new THREE.Sprite(material);
    mesh.geometry.computeBoundingSphere();
    const diameter = (mesh.geometry.boundingSphere?.radius ?? 0.1) * 2;
    sprite.scale.setScalar(diameter * scaleFactor);
    sprite.renderOrder = 10;
    mesh.add(sprite);
    return material;
  };
  const coreGlowMat = attachGlow(core, CORE_GLOW_SCALE);
  const haloGlowMat = attachGlow(halo, HALO_GLOW_SCALE);

  const evolution = createCompanionEvolution({
    accent,
    levelTier,
    streakTier,
  });
  petGroup.add(evolution.root);

  let disposed = false;
  return {
    root,
    rig: {
      petGroup,
      leftEye,
      rightEye,
      leftPupil,
      rightPupil,
      mouth,
      leftFlipper,
      rightFlipper,
      halo,
      leftFin: evolution.leftFin,
      rightFin: evolution.rightFin,
      orbitGroup: evolution.orbitGroup,
      aura: evolution.aura,
      eyeMat,
      mouthMat,
      coreMat,
      accentMat: orbitMat,
      haloGlowMat,
      coreGlowMat,
      evolutionMat: evolution.evolutionMat,
      auraMat: evolution.auraMat,
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      evolution.dispose();
      glowTexture.dispose();
      ownedGeometries.forEach((geometry) => geometry.dispose());
      ownedMaterials.forEach((material) => material.dispose());
    },
  };
}
