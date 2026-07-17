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

// Parse the bundled GLB once. Scene instances deep-clone every geometry and
// material below, so the cached source remains immutable and carries no
// renderer/context ownership. Re-running expo-three's asset resolve + GLTF
// parse for a second GL context can hang during dashboard-to-room handoff.
let companionSourcePromise: Promise<THREE.Group> | null = null;

function parseCompanion(): Promise<THREE.Group> {
  return loadAsync(
    // Metro resolves bundled assets via static require
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../../../assets/avatar/dayly-companion.glb"),
  ).then((gltf: { scene: THREE.Group }) => gltf.scene);
}

export function loadCompanion(): Promise<THREE.Group> {
  if (!companionSourcePromise) {
    companionSourcePromise = parseCompanion().catch((error) => {
      companionSourcePromise = null;
      throw error;
    });
  }
  return companionSourcePromise;
}

export interface CompanionOptions {
  accent: THREE.Color;
  bodyColor: string;
  faceStyle: FaceStyle;
  levelTier: number;
  streakTier: number;
}

// "classic" -> "Face_Classic". The shipped GLB will hold one Face_* group per
// style with a single one visible; older/current GLBs have no Face_* nodes.
function faceGroupName(faceStyle: FaceStyle): string {
  return `Face_${faceStyle.charAt(0).toUpperCase()}${faceStyle.slice(1)}`;
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
  { accent, bodyColor, faceStyle, levelTier, streakTier }: CompanionOptions,
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
        material.clone(),
      );
      obj.material.forEach((material: THREE.Material) =>
        ownedMaterials.add(material),
      );
    } else {
      obj.material = obj.material.clone();
      ownedMaterials.add(obj.material);
    }
  });

  // Keep only the active face style. The clone-traverse above already gave
  // every mesh its OWN geometry/material, so disposing the four unused Face_*
  // groups frees this instance's clones (never the shared source graph) and
  // avoids retaining ~4 hidden faces per scene. The active group is reparented
  // into petGroup below so it bobs/spins with the body.
  const activeFaceName = faceGroupName(faceStyle);
  let activeFace: THREE.Object3D | null = null;
  const faceGroups: THREE.Object3D[] = [];
  root.traverse((node) => {
    if (node.name.startsWith("Face_")) faceGroups.push(node);
  });
  for (const group of faceGroups) {
    if (group.name === activeFaceName) {
      activeFace = group;
      continue;
    }
    group.parent?.remove(group);
    group.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      ownedGeometries.delete(obj.geometry);
      obj.geometry.dispose();
      (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(
        (material: THREE.Material) => {
          ownedMaterials.delete(material);
          material.dispose();
        },
      );
    });
  }

  const petGroup = new THREE.Group();
  const petNodes = PET_NODES.map((name) => root.getObjectByName(name)).filter(
    (node): node is THREE.Object3D => Boolean(node),
  );
  petNodes.forEach((node) => petGroup.add(node));

  // The active face follows the pet body (idle bob, sway, celebration spin).
  // attach() preserves world transform across the reparent so the face keeps
  // its authored placement relative to the head.
  if (activeFace) {
    root.updateWorldMatrix(true, true);
    petGroup.attach(activeFace);
  }

  // Meshes of the active face (any style), used to bind + tint the eye glow
  // and accent materials generically rather than by classic-only node names.
  const faceMeshes: THREE.Mesh[] = [];
  activeFace?.traverse((obj) => {
    if (obj instanceof THREE.Mesh) faceMeshes.push(obj);
  });

  // Only the classic style authors the canonical LeftEye/RightEye names the
  // geometry-level rig scales for blink/expression; prefixed variant faces
  // resolve to undefined here, so petMotion's eye squash simply no-ops on them
  // (all lookups are null-guarded). Their emissive pulse still tracks via the
  // shared eyeMat below.
  const leftEye = petGroup.getObjectByName("LeftEye") as THREE.Mesh | undefined;
  const rightEye = petGroup.getObjectByName("RightEye") as
    THREE.Mesh | undefined;
  const core = petGroup.getObjectByName("EnergyCore") as THREE.Mesh | undefined;
  const halo = petGroup.getObjectByName("HaloCharm") as THREE.Mesh | undefined;
  const leftFlipper = petGroup.getObjectByName("LeftFlipper");
  const rightFlipper = petGroup.getObjectByName("RightFlipper");
  const ring = root.getObjectByName("PlatformRing") as THREE.Mesh | undefined;

  const materialOf = (mesh?: THREE.Mesh) =>
    mesh && !Array.isArray(mesh.material)
      ? (mesh.material as THREE.MeshStandardMaterial)
      : null;

  // Eye glow: the active face's warm eye-white material (Eye_White_Emission,
  // suffixed on Eve/Joy). Screen has no eye-white mesh, so this stays null.
  const eyeMesh = faceMeshes.find(
    (mesh) =>
      !Array.isArray(mesh.material) &&
      (mesh.material as THREE.Material).name.startsWith("Eye_White_Emission"),
  );
  const eyeMat = eyeMesh
    ? (eyeMesh.material as THREE.MeshStandardMaterial)
    : null;
  const coreMat = materialOf(core);
  const accentMat = materialOf(ring);
  if (halo && accentMat) halo.material = accentMat;

  // Share the tinted eye + accent materials across every matching mesh of the
  // active face so all eyes glow together and accent parts (incl. the classic
  // VisorLip curve) track the user's customisation on any style.
  for (const obj of faceMeshes) {
    if (Array.isArray(obj.material)) continue;
    const matName = (obj.material as THREE.Material).name;
    if (eyeMat && matName.startsWith("Eye_White_Emission")) {
      obj.material = eyeMat;
    } else if (
      accentMat &&
      (matName === "Accent_Orange_Emission" || matName === "LED_Coral_Emission")
    ) {
      obj.material = accentMat;
    }
  }

  if (eyeMat) {
    eyeMat.color.set(0xffe3bd);
    eyeMat.emissive.set(0xffbd78);
    eyeMat.roughness = 0.3;
    eyeMat.metalness = 0;
    eyeMat.emissiveIntensity = 0.35;
    eyeMat.envMapIntensity = 0.4;
  }

  // Tint accent parts with the user's customisation colour
  for (const mat of [coreMat, accentMat]) {
    if (!mat) continue;
    mat.color.set(accent);
    mat.emissive.set(accent);
    mat.roughness = 0.6;
    mat.metalness = 0;
    mat.emissiveIntensity = 0.12;
    mat.envMapIntensity = 0.25;
  }

  // Shared (non-face) accent parts — halo beads, pod inner ring — must track
  // the same customisation colour or they keep the GLB's baked orange. The
  // EnergyCore is excluded: its material stays independent so the heartbeat
  // pulse can run at its own intensity.
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh) || Array.isArray(obj.material)) return;
    if (obj === core) return;
    const matName = (obj.material as THREE.Material).name;
    if (accentMat && matName === "Accent_Orange_Emission") {
      obj.material = accentMat;
    } else if (matName.startsWith("Platform_Inner_Glow")) {
      const innerMat = obj.material as THREE.MeshStandardMaterial;
      innerMat.color.set(accent);
      innerMat.emissive.set(accent);
      innerMat.emissiveIntensity = 0.08;
    }
  });

  if (levelTier >= 3 && halo) halo.scale.setScalar(1.25);

  if (leftFlipper) leftFlipper.userData.baseRotationZ = leftFlipper.rotation.z;
  if (rightFlipper)
    rightFlipper.userData.baseRotationZ = rightFlipper.rotation.z;

  // Fake-bloom halos: one glow texture per instance (per-GL-context rule), two
  // additive sprites parented to the halo + chest core so they track position.
  const glowTexture = createGlowTexture();
  const glowColor = accent.getHex();
  const attachGlow = (mesh: THREE.Mesh, scaleFactor: number) => {
    const mat = createGlowSpriteMaterial(glowTexture, glowColor);
    ownedMaterials.add(mat);
    const sprite = new THREE.Sprite(mat);
    mesh.geometry.computeBoundingSphere();
    const diameter = (mesh.geometry.boundingSphere?.radius ?? 0.1) * 2;
    sprite.scale.setScalar(diameter * scaleFactor);
    sprite.renderOrder = 10;
    mesh.add(sprite);
    return mat;
  };
  // EnergyCore is the chest dot; HaloCharm is the ring above the head.
  const coreGlowMat = core ? attachGlow(core, CORE_GLOW_SCALE) : null;
  const haloGlowMat = halo ? attachGlow(halo, HALO_GLOW_SCALE) : null;

  const evolution = createCompanionEvolution({
    accent,
    levelTier,
    streakTier,
  });
  petGroup.add(evolution.root);

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
        roughness: 0.92,
        metalness: 0.0,
        emissive: new THREE.Color(bodyColor).multiplyScalar(0.5),
        emissiveIntensity: 0.06,
        envMapIntensity: 0.15,
      });
      bodyMat.name = "Body_Charcoal_Runtime";
      ownedMaterials.add(bodyMat);
    }
    obj.material = bodyMat;
  });

  return {
    root,
    rig: {
      petGroup,
      leftEye,
      rightEye,
      leftFlipper,
      rightFlipper,
      halo,
      leftFin: evolution.leftFin,
      rightFin: evolution.rightFin,
      orbitGroup: evolution.orbitGroup,
      aura: evolution.aura,
      eyeMat,
      coreMat,
      accentMat,
      haloGlowMat,
      coreGlowMat,
      evolutionMat: evolution.evolutionMat,
      auraMat: evolution.auraMat,
    },
    dispose: () => {
      evolution.dispose();
      glowTexture.dispose();
      ownedGeometries.forEach((geometry) => geometry.dispose());
      ownedMaterials.forEach((material) => material.dispose());
    },
  };
}
