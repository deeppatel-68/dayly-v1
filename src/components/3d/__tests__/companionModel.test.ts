import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { FaceStyle } from "@/data/faceStyles";
import {
  createCompanionInstance,
  FACE_RIG_NODES,
} from "../companionModel";
import type { FaceRigNodes } from "../companionModel";
import { createPetMotionController } from "../petMotion";

vi.mock("expo-three", () => ({ loadAsync: vi.fn() }));

const BODY_COLOR = "#6f8193";
const ACCENT = new THREE.Color("#d97757");
const EXPECTED_FACE_RIG_NODES: Record<FaceStyle, FaceRigNodes> = {
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
      levelUp: { eyeScaleX: 1.08, eyeScaleY: 1.14, mouthScaleY: 1.18 },
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

function standardMaterial(name: string, color: number) {
  const material = new THREE.MeshStandardMaterial({
    color,
    alphaTest: 0.23,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.76,
    depthTest: false,
    depthWrite: false,
    side: THREE.BackSide,
    vertexColors: true,
  });
  material.name = name;
  return material;
}

function mesh(
  name: string,
  material: THREE.Material | THREE.Material[],
  geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1),
) {
  const result = new THREE.Mesh(geometry, material);
  result.name = name;
  return result;
}

function createSyntheticSource() {
  const root = new THREE.Group();
  root.name = "CompanionSource";

  const bodyMaterial = standardMaterial("Body_Charcoal", 0x20242a);
  const darkMaterial = standardMaterial("Base_Black", 0x08090b);
  const sourceBodyMaterials = [bodyMaterial, darkMaterial];
  const body = mesh("Body", sourceBodyMaterials);
  const bodyMarker = new THREE.Group();
  bodyMarker.name = "Body_Charcoal";
  body.add(bodyMarker);

  const facePanel = mesh(
    "FacePanel",
    standardMaterial("Visor_Black", 0x111216),
  );
  const sharedAccent = standardMaterial("Accent_Orange_Emission", 0xd97757);
  const energyCore = mesh("EnergyCore", sharedAccent);
  const halo = mesh("HaloCharm", sharedAccent);
  const platformRing = mesh("PlatformRing", sharedAccent);
  const innerRing = mesh("PlatformInnerRing", sharedAccent);
  (innerRing.material as THREE.Material).name = "Platform_Inner_Glow";
  const leftFlipper = mesh("LeftFlipper", bodyMaterial);
  const rightFlipper = mesh("RightFlipper", bodyMaterial);
  const leftFoot = mesh("LeftFoot", darkMaterial);
  const rightFoot = mesh("RightFoot", darkMaterial);

  root.add(
    body,
    facePanel,
    energyCore,
    halo,
    platformRing,
    innerRing,
    leftFlipper,
    rightFlipper,
    leftFoot,
    rightFoot,
  );

  for (const [style, profile] of Object.entries(EXPECTED_FACE_RIG_NODES) as [
    FaceStyle,
    (typeof EXPECTED_FACE_RIG_NODES)[FaceStyle],
  ][]) {
    const group = new THREE.Group();
    group.name = profile.group;
    const eyeMaterial = standardMaterial(
      `Eye_White_Emission_${style}`,
      0xffe3bd,
    );
    const pupilMaterial = standardMaterial(`Pupil_Dark_${style}`, 0x08090b);
    const faceMarkMaterial = sharedAccent;
    group.add(mesh(profile.leftEye, eyeMaterial));
    group.add(mesh(profile.rightEye, eyeMaterial));
    if (profile.leftPupil) {
      group.add(mesh(profile.leftPupil, pupilMaterial));
    }
    if (profile.rightPupil) {
      group.add(mesh(profile.rightPupil, pupilMaterial));
    }
    if (profile.mouth) {
      group.add(mesh(profile.mouth, faceMarkMaterial));
    }
    root.add(group);
  }

  return {
    root,
    body,
    sourceBodyMaterials,
    sharedAccent,
  };
}

function create(style: FaceStyle, source = createSyntheticSource().root) {
  return createCompanionInstance(source, {
    accent: ACCENT,
    bodyColor: BODY_COLOR,
    detail: "hero",
    faceStyle: style,
    levelTier: 0,
    streakTier: 0,
  });
}

function materialsOf(name: string, instance: ReturnType<typeof create>) {
  const object = instance.root.getObjectByName(name) ??
    instance.rig.petGroup.getObjectByName(name);
  const material = (object as THREE.Mesh).material;
  return Array.isArray(material) ? material : [material];
}

describe("companion model construction", () => {
  it.each(Object.keys(EXPECTED_FACE_RIG_NODES) as FaceStyle[])(
    "resolves the %s semantic face rig and stores authored bases",
    (style) => {
      expect(FACE_RIG_NODES).toEqual(EXPECTED_FACE_RIG_NODES);
      const profile = EXPECTED_FACE_RIG_NODES[style];
      const instance = create(style);

      expect(instance.rig.leftEye?.name).toBe(profile.leftEye);
      expect(instance.rig.rightEye?.name).toBe(profile.rightEye);
      expect(instance.rig.leftPupil?.name).toBe(profile.leftPupil);
      expect(instance.rig.rightPupil?.name).toBe(profile.rightPupil);
      expect(instance.rig.mouth?.name).toBe(profile.mouth);
      expect(instance.rig.petGroup.userData.faceMotionProfile).toEqual(
        profile.motion,
      );
      expect(instance.rig.leftEye?.userData.baseScale).toEqual(
        instance.rig.leftEye?.scale,
      );
      expect(instance.rig.leftPupil?.userData.basePosition).toEqual(
        instance.rig.leftPupil?.position,
      );
      if (instance.rig.mouth) {
        const baseRotation = instance.rig.mouth.userData
          .baseRotation as THREE.Euler;
        expect(baseRotation.toArray()).toEqual(
          instance.rig.mouth.rotation.toArray(),
        );
      }
      if (style === "joy") {
        expect(profile.motion.blinkScaleY).toBeNull();
      } else {
        expect(typeof profile.motion.blinkScaleY).toBe("number");
      }
      if (style === "eve") expect(profile.mouth).toBeUndefined();

      instance.dispose();
    },
  );

  it.each(Object.keys(EXPECTED_FACE_RIG_NODES) as FaceStyle[])(
    "animates the %s face from its authored base transform",
    (style) => {
      const profile = EXPECTED_FACE_RIG_NODES[style];
      const states = ["focus", "reward", "levelUp"] as const;

      for (const state of states) {
        const instance = create(style);
        const eyeBase = instance.rig.leftEye!.userData
          .baseScale as THREE.Vector3;
        const mouthBase = instance.rig.mouth?.userData
          .baseScale as THREE.Vector3 | undefined;
        const motion = createPetMotionController({ levelTier: 0, streakTier: 0 });

        motion.apply(instance.rig, state, 10);

        expect(instance.rig.leftEye!.scale.y).toBeCloseTo(
          eyeBase.y * profile.motion[state].eyeScaleY,
        );
        if (instance.rig.mouth && mouthBase) {
          expect(instance.rig.mouth.scale.y).toBeCloseTo(
            mouthBase.y * profile.motion[state].mouthScaleY!,
          );
        }
        instance.dispose();
      }
    },
  );

  it("prunes inactive faces before cloning disposable resources", () => {
    const source = createSyntheticSource();
    const inactiveGeometry = (
      source.root.getObjectByName("EveLeftEye") as THREE.Mesh
    ).geometry;
    const cloneSpy = vi.spyOn(inactiveGeometry, "clone");

    const instance = create("classic", source.root);

    expect(cloneSpy).not.toHaveBeenCalled();
    expect(instance.root.getObjectByName("Face_Eve")).toBeUndefined();
    expect(instance.rig.petGroup.getObjectByName("Face_Classic")).toBeDefined();
    instance.dispose();
  });

  it("preserves sharing within an instance and isolates disposable resources between instances", () => {
    const source = createSyntheticSource().root;
    const sourceGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const sourceMaterial = standardMaterial("Shared_Detail", 0x443322);
    source.add(
      mesh("SharedA", sourceMaterial, sourceGeometry),
      mesh("SharedB", sourceMaterial, sourceGeometry),
    );

    const first = create("classic", source);
    const second = create("classic", source);
    const firstA = first.root.getObjectByName("SharedA") as THREE.Mesh;
    const firstB = first.root.getObjectByName("SharedB") as THREE.Mesh;
    const secondA = second.root.getObjectByName("SharedA") as THREE.Mesh;

    expect(firstA.geometry).toBe(firstB.geometry);
    expect(firstA.material).toBe(firstB.material);
    expect(firstA.geometry).not.toBe(sourceGeometry);
    expect(firstA.material).not.toBe(sourceMaterial);
    expect(firstA.geometry).not.toBe(secondA.geometry);
    expect(firstA.material).not.toBe(secondA.material);

    first.dispose();
    second.dispose();
  });

  it("tints every charcoal body slot while preserving dark slots and the source graph", () => {
    const source = createSyntheticSource();
    const sourceDarkHex = (
      source.sourceBodyMaterials[1] as THREE.MeshStandardMaterial
    ).color.getHexString();
    const instance = create("classic", source.root);
    const bodyMaterials = materialsOf("Body", instance) as THREE.MeshBasicMaterial[];

    expect(bodyMaterials[0].color.getHexString()).toBe(
      new THREE.Color(BODY_COLOR).getHexString(),
    );
    expect(bodyMaterials[1].color.getHexString()).toBe(sourceDarkHex);
    expect(source.body.material).toBe(source.sourceBodyMaterials);
    expect(source.sourceBodyMaterials[0].name).toBe("Body_Charcoal");

    instance.dispose();
  });

  it("preserves safe material flags and maps without forcing DoubleSide", () => {
    const source = createSyntheticSource().root;
    const map = new THREE.Texture();
    const sourceMaterial = standardMaterial("Mapped_Detail", 0x6688aa);
    sourceMaterial.map = map;
    source.add(mesh("MappedDetail", sourceMaterial));

    const instance = create("classic", source);
    const material = materialsOf(
      "MappedDetail",
      instance,
    )[0] as THREE.MeshBasicMaterial;

    expect(material).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect(material.side).toBe(THREE.BackSide);
    expect(material.alphaTest).toBe(0.23);
    expect(material.blending).toBe(THREE.AdditiveBlending);
    expect(material.transparent).toBe(true);
    expect(material.opacity).toBe(0.76);
    expect(material.depthTest).toBe(false);
    expect(material.depthWrite).toBe(false);
    expect(material.vertexColors).toBe(true);
    expect(material.map).toBe(map);

    instance.dispose();
    map.dispose();
  });

  it("creates independent core, orbit, face, platform, and inner-ring materials", () => {
    const instance = create("classic");
    const materials = [
      materialsOf("EnergyCore", instance)[0],
      materialsOf("HaloCharm", instance)[0],
      materialsOf("VisorLip", instance)[0],
      materialsOf("PlatformRing", instance)[0],
      materialsOf("PlatformInnerRing", instance)[0],
    ] as THREE.MeshBasicMaterial[];

    expect(new Set(materials)).toHaveLength(5);
    expect(materials.map((material) => material.color.getHexString())).toEqual(
      [1, 0.82, 0.72, 0.45, 0.25].map((brightness) =>
        ACCENT.clone().multiplyScalar(brightness).getHexString(),
      ),
    );
    expect(instance.rig.coreMat).toBe(materials[0]);
    expect(instance.rig.accentMat).toBe(materials[1]);
    expect(instance.rig.mouthMat).toBe(materials[2]);

    instance.dispose();
  });

  it("throws a descriptive contract error when a required semantic node is missing", () => {
    const source = createSyntheticSource().root;
    source.getObjectByName("KirbyRightEye")?.removeFromParent();

    expect(() => create("kirby", source)).toThrowError(
      /companion model contract.*kirby.*KirbyRightEye/i,
    );
  });
});
