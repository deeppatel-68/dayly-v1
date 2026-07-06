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
];

// Parse the GLB once per app session; instances clone the cached graph
// (geometries stay shared, only animated materials are cloned per instance)
let companionPromise: Promise<THREE.Group> | null = null;
export function loadCompanion(): Promise<THREE.Group> {
  if (!companionPromise) {
    companionPromise = loadAsync(
      // Metro resolves bundled assets via static require
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../../../assets/avatar/dayly-companion.glb")
    ).then((gltf: { scene: THREE.Group }) => gltf.scene);
    companionPromise.catch(() => {
      companionPromise = null; // allow retry on next mount
    });
  }
  return companionPromise;
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
  const root = source.clone(true);

  const petGroup = new THREE.Group();
  PET_NODES.forEach((name) => {
    const node = root.getObjectByName(name);
    if (node) petGroup.add(node);
  });

  const leftEye = root.getObjectByName("LeftEye") as THREE.Mesh | undefined;
  const rightEye = root.getObjectByName("RightEye") as THREE.Mesh | undefined;
  const core = root.getObjectByName("EnergyCore") as THREE.Mesh | undefined;
  const halo = root.getObjectByName("HaloCharm") as THREE.Mesh | undefined;
  const ring = root.getObjectByName("PlatformRing") as THREE.Mesh | undefined;

  const cloneMat = (mesh?: THREE.Mesh) => {
    if (!mesh) return null;
    const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
    mesh.material = mat;
    return mat;
  };

  const eyeMat = cloneMat(leftEye);
  if (rightEye && eyeMat) rightEye.material = eyeMat;
  const coreMat = cloneMat(core);
  const accentMat = cloneMat(ring);
  if (halo && accentMat) halo.material = accentMat;

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
  root.traverse((obj) => {
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
    }
    obj.material = bodyMat;
  });

  return {
    root,
    rig: { petGroup, leftEye, rightEye, halo, eyeMat, coreMat, accentMat },
    dispose: () => {
      // Dispose only per-instance clones; geometries are shared with the
      // module-level cache and other mounted instances
      for (const mat of [eyeMat, coreMat, accentMat, bodyMat]) {
        mat?.dispose();
      }
    },
  };
}
