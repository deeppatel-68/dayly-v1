import { loadAsync } from "expo-three";
import * as THREE from "three";
import { PetRig } from "./petMotion";

// Node names authored in the Blender source (assets/avatar/dayly-companion-build.py)
export const PET_NODES = [
  "Body",
  "FacePanel",
  "LeftEye",
  "RightEye",
  "EnergyCore",
  "HaloCharm",
  "LeftFlipper",
  "RightFlipper",
  "LeftFoot",
  "RightFoot",
  "VisorLip",
];

// Parse the tiny bundled GLB per scene mount. Expo GL resources can retain
// native-context state across renderer disposal, so sharing a parsed graph
// made later previews intermittently clear to an empty canvas.
export function loadCompanion(): Promise<THREE.Group> {
  return loadAsync(
    // Metro resolves bundled assets via static require
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../../../assets/avatar/dayly-companion.glb")
  ).then((gltf: { scene: THREE.Group }) => gltf.scene);
}

export interface CompanionOptions {
  accent: THREE.Color;
  bodyColor: string;
  levelTier: number;
}

export interface CompanionInstance {
  // Pod + ring stay in `root`; the animated pet lives in `rig.petGroup`
  root: THREE.Group;
  rig: PetRig;
  dispose: () => void;
}

// Clone the cached companion for one scene: pet nodes reparented into a group
// (so bob/sway/celebration move the pet while the pod stays grounded), and
// per-instance materials cloned + tinted so scenes never cross-talk.
export function createCompanionInstance(
  source: THREE.Group,
  { accent, bodyColor, levelTier }: CompanionOptions
): CompanionInstance {
  // expo-three may internally cache the parsed scene. Treat that source as
  // immutable and deep-clone all disposable resources for this GL context.
  const root = source.clone(true);
  const ownedGeometries = new Set<THREE.BufferGeometry>();
  const ownedMaterials = new Set<THREE.Material>();

  // Track imported resources so scene teardown is complete and deterministic.
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.geometry = obj.geometry.clone();
    ownedGeometries.add(obj.geometry);
    if (Array.isArray(obj.material)) {
      obj.material = obj.material.map((material: THREE.Material) =>
        material.clone()
      );
      obj.material.forEach((material: THREE.Material) =>
        ownedMaterials.add(material)
      );
    } else {
      obj.material = obj.material.clone();
      ownedMaterials.add(obj.material);
    }
  });

  const petGroup = new THREE.Group();
  const petNodes = PET_NODES.map((name) => root.getObjectByName(name)).filter(
    (node): node is THREE.Object3D => Boolean(node)
  );
  petNodes.forEach((node) => petGroup.add(node));

  const leftEye = petGroup.getObjectByName("LeftEye") as THREE.Mesh | undefined;
  const rightEye = petGroup.getObjectByName("RightEye") as THREE.Mesh | undefined;
  const core = petGroup.getObjectByName("EnergyCore") as THREE.Mesh | undefined;
  const halo = petGroup.getObjectByName("HaloCharm") as THREE.Mesh | undefined;
  const visorLip = petGroup.getObjectByName("VisorLip") as THREE.Mesh | undefined;
  const ring = root.getObjectByName("PlatformRing") as THREE.Mesh | undefined;

  const materialOf = (mesh?: THREE.Mesh) =>
    mesh && !Array.isArray(mesh.material)
      ? (mesh.material as THREE.MeshStandardMaterial)
      : null;

  const eyeMat = materialOf(leftEye);
  if (rightEye && eyeMat) rightEye.material = eyeMat;
  const coreMat = materialOf(core);
  const accentMat = materialOf(ring);
  if (halo && accentMat) halo.material = accentMat;
  if (visorLip && accentMat) visorLip.material = accentMat;

  if (eyeMat) {
    eyeMat.color.set(0xffe3bd);
    eyeMat.emissive.set(0xffbd78);
    eyeMat.roughness = 0.42;
  }

  // Tint accent parts with the user's customisation colour
  for (const mat of [coreMat, accentMat]) {
    if (!mat) continue;
    mat.color.set(accent);
    mat.emissive.set(accent);
  }
  if (levelTier >= 3 && halo) halo.scale.setScalar(1.25);

  // Tint the charcoal body parts (Body upper + flippers) with the user's
  // body colour. Matching by material name keeps Base_Black, the pod, eyes,
  // and accent parts untouched. The GLB's Body_Charcoal carries a clearcoat
  // (MeshPhysicalMaterial) whose shader fails on expo-gl, so swap in a plain
  // standard material rather than cloning it.
  let bodyMat: THREE.MeshStandardMaterial | null = null;
  petGroup.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mat = obj.material as THREE.MeshStandardMaterial;
    if (mat?.name !== "Body_Charcoal") return;
    if (!bodyMat) {
      bodyMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(bodyColor),
        roughness: 0.45,
        metalness: 0.08,
      });
      bodyMat.name = "Body_Charcoal_Runtime";
      ownedMaterials.add(bodyMat);
    }
    obj.material = bodyMat;
  });

  return {
    root,
    rig: { petGroup, leftEye, rightEye, halo, eyeMat, coreMat, accentMat },
    dispose: () => {
      ownedGeometries.forEach((geometry) => geometry.dispose());
      ownedMaterials.forEach((material) => material.dispose());
    },
  };
}
