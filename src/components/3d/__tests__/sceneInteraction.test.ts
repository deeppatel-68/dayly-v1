import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { describe, expect, it, vi } from "vitest";
import { createCompanionInstance } from "../companionModel";
import {
  attachEquipment,
  createEquipmentMaterials,
  disposeEquipment,
} from "../equipment";
import { createPetMotionController } from "../petMotion";
import {
  createHeroCameraOrbit,
  createOrbitRig,
  createPetTapDetector,
  HERO_HOME_AZIMUTH,
} from "../sceneInteraction";

vi.mock("expo-three", () => ({ loadAsync: vi.fn() }));

const MAXIMUM_COMPATIBLE_EQUIPMENT = [
  "focus-cap",
  "cozy-scarf",
  "mini-backpack",
  "halo-orbit-ring",
  "study-plant",
  "neon-lamp",
  "pod-aurora",
] as const;

const LEVEL_UP_KEY_TIMES = [
  0, 0.16, 0.18, 0.39, 0.537165, 0.62, 0.63, 0.7, 0.71, 0.722835, 0.98,
  1.08, 1.8,
] as const;
const LEVEL_UP_SAMPLE_TIMES = [
  ...new Set([
    ...Array.from({ length: 217 }, (_, index) => index / 120),
    ...LEVEL_UP_KEY_TIMES,
  ]),
].sort((left, right) => left - right);
const MINIMUM_NDC_HEADROOM = 0.02;

async function loadAuthoredHero(): Promise<THREE.Group> {
  const bytes = await readFile(
    resolve(process.cwd(), "assets/avatar/dayly-companion.glb"),
  );
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const gltf = await new Promise<{ scene: THREE.Group }>((resolveGltf, reject) => {
    new GLTFLoader().parse(arrayBuffer, "", resolveGltf, reject);
  });

  for (const groupName of [
    "Face_Eve",
    "Face_Screen",
    "Face_Kirby",
    "Face_Joy",
  ]) {
    const group = gltf.scene.getObjectByName(groupName);
    if (group) group.visible = false;
  }
  gltf.scene.updateWorldMatrix(true, true);
  return gltf.scene;
}

function projectHeroBounds(hero: THREE.Group, camera: THREE.PerspectiveCamera) {
  const ndcBounds = new THREE.Box3();
  const vertex = new THREE.Vector3();
  let meshCount = 0;
  let vertexCount = 0;
  const meshNames: string[] = [];

  hero.traverseVisible((node) => {
    if (!(node instanceof THREE.Mesh)) return;

    meshCount += 1;
    meshNames.push(node.name);
    const positions = node.geometry.getAttribute("position");
    for (let index = 0; index < positions.count; index += 1) {
      vertexCount += 1;
      vertex
        .fromBufferAttribute(positions, index)
        .applyMatrix4(node.matrixWorld)
        .project(camera);
      ndcBounds.expandByPoint(vertex);
    }
  });

  return { meshCount, meshNames, ndcBounds, vertexCount };
}

interface RuntimeProjection {
  bounds: THREE.Box3;
  equipmentIds: Set<string>;
  maxDepth: number;
  meshNames: Set<string>;
  minDepth: number;
  objectNames: Set<string>;
  spriteParents: Set<string>;
  sprites: number;
}

function findEquipmentId(node: THREE.Object3D): string | undefined {
  let current: THREE.Object3D | null = node;
  while (current) {
    if (typeof current.userData.equipmentId === "string") {
      return current.userData.equipmentId;
    }
    current = current.parent;
  }
  return undefined;
}

function projectRuntimeEnvelope(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): RuntimeProjection {
  scene.updateWorldMatrix(true, true);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();

  const bounds = new THREE.Box3();
  const equipmentIds = new Set<string>();
  const meshNames = new Set<string>();
  const objectNames = new Set<string>();
  const spriteParents = new Set<string>();
  const world = new THREE.Vector3();
  const view = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const modelView = new THREE.Matrix4();
  let minDepth = Infinity;
  let maxDepth = -Infinity;
  let sprites = 0;

  const includeViewPoint = (point: THREE.Vector3) => {
    const depth = -point.z;
    minDepth = Math.min(minDepth, depth);
    maxDepth = Math.max(maxDepth, depth);
    projected.copy(point).applyMatrix4(camera.projectionMatrix);
    bounds.expandByPoint(projected);
  };

  scene.traverseVisible((node) => {
    objectNames.add(node.name);
    const equipmentId = findEquipmentId(node);
    if (equipmentId) equipmentIds.add(equipmentId);

    if (node instanceof THREE.Mesh) {
      meshNames.add(node.name);
      const positions = node.geometry.getAttribute("position");
      for (let index = 0; index < positions.count; index += 1) {
        world.fromBufferAttribute(positions, index).applyMatrix4(node.matrixWorld);
        view.copy(world).applyMatrix4(camera.matrixWorldInverse);
        includeViewPoint(view);
      }
      return;
    }

    if (!(node instanceof THREE.Sprite)) return;
    sprites += 1;
    spriteParents.add(node.parent?.name ?? "");

    // Match Three's Sprite vertex shader: scale the unit quad by the sprite's
    // model-view axes, rotate around Sprite.center, then project. A static
    // matrix-world point misses the camera-facing billboard's visible area.
    modelView.multiplyMatrices(camera.matrixWorldInverse, node.matrixWorld);
    const elements = modelView.elements;
    const scaleX = Math.hypot(elements[0], elements[1], elements[2]);
    const scaleY = Math.hypot(elements[4], elements[5], elements[6]);
    const rotation = (node.material as THREE.SpriteMaterial).rotation;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    for (const x of [0, 1]) {
      for (const y of [0, 1]) {
        const alignedX = (x - node.center.x) * scaleX;
        const alignedY = (y - node.center.y) * scaleY;
        view.set(
          elements[12] + cos * alignedX - sin * alignedY,
          elements[13] + sin * alignedX + cos * alignedY,
          elements[14],
        );
        includeViewPoint(view);
      }
    }
  });

  return {
    bounds,
    equipmentIds,
    maxDepth,
    meshNames,
    minDepth,
    objectNames,
    spriteParents,
    sprites,
  };
}

function createRuntimeEnvelope(source: THREE.Group) {
  const scene = new THREE.Scene();
  const companion = createCompanionInstance(source, {
    accent: new THREE.Color("#d97757"),
    bodyColor: "#6f8193",
    detail: "hero",
    faceStyle: "classic",
    levelTier: 3,
    streakTier: 3,
  });
  scene.add(companion.root, companion.rig.petGroup);

  const equipmentMaterials = createEquipmentMaterials(
    new THREE.Color("#d97757"),
  );
  const equipment = attachEquipment(
    [...MAXIMUM_COMPATIBLE_EQUIPMENT],
    ["pet", "platform"],
    equipmentMaterials,
    { pet: companion.rig.petGroup, platform: companion.root },
  );

  return {
    companion,
    equipment,
    equipmentMaterials,
    motion: createPetMotionController({ levelTier: 3, streakTier: 3 }),
    scene,
    dispose: () => {
      disposeEquipment(equipment);
      equipmentMaterials.dispose();
      companion.dispose();
    },
  };
}

function expectCompleteRuntimeEnvelope(projection: RuntimeProjection) {
  expect(projection.sprites).toBe(2);
  expect(projection.spriteParents).toEqual(
    new Set(["EnergyCore", "HaloCharm"]),
  );
  expect([...projection.meshNames]).toEqual(
    expect.arrayContaining([
      "Platform",
      "LeftEvolutionFin",
      "RightEvolutionFin",
      "StreakAura",
    ]),
  );
  expect([...projection.objectNames]).toEqual(
    expect.arrayContaining(["CompanionEvolution", "FocusNodeOrbit"]),
  );
  expect(projection.equipmentIds).toEqual(
    new Set(MAXIMUM_COMPATIBLE_EQUIPMENT),
  );
}

describe("scene interaction", () => {
  it("orbits around a stable target without changing radius or height", () => {
    const target = new THREE.Vector3(0, 0.7, 0);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    const orbit = createOrbitRig({ target, radius: 2.5, height: 0.95 });

    orbit.applyTo(camera, 0);
    orbit.orbitBy(0.25);
    orbit.applyTo(camera, 0.1);

    expect(camera.position.y).toBeCloseTo(0.95);
    expect(
      Math.hypot(camera.position.x - target.x, camera.position.z - target.z)
    ).toBeCloseTo(2.5);
    expect(camera.position.x).not.toBeCloseTo(0);
  });

  it("clamps room orbit to its authored viewing arc", () => {
    const target = new THREE.Vector3();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    const orbit = createOrbitRig({
      target,
      radius: 4,
      height: 1.3,
      minAzimuth: -0.6,
      maxAzimuth: 0.6,
    });

    orbit.applyTo(camera, 0);
    orbit.orbitBy(10);
    orbit.applyTo(camera, 0.1);

    expect(camera.position.x).toBeCloseTo(Math.sin(0.6) * 4);
    expect(camera.position.z).toBeCloseTo(Math.cos(0.6) * 4);
  });

  it("supports a free turntable with clamped vertical inspection", () => {
    const target = new THREE.Vector3(0, 0.7, 0);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    const limit = (12 * Math.PI) / 180;
    const orbit = createOrbitRig({
      target,
      radius: 2.5,
      height: 0.95,
      minElevation: -limit,
      maxElevation: limit,
    });

    orbit.applyTo(camera, 0);
    orbit.orbitBy(2, -10);
    orbit.applyTo(camera, 0.1);

    expect(camera.position.x).not.toBeCloseTo(0);
    expect(camera.position.y).toBeGreaterThan(0.95);
    const distance = camera.position.distanceTo(target);
    expect(distance).toBeCloseTo(Math.hypot(2.5, 0.25));
  });

  it("wires Avatar3D through the shared hero camera/orbit factory", async () => {
    expect(createHeroCameraOrbit).toBeTypeOf("function");

    const source = await readFile(
      resolve(process.cwd(), "src/components/avatar/Avatar3D.tsx"),
      "utf8",
    );
    expect(source).toMatch(
      /createHeroCameraOrbit\(\s*variant === "shop" \? "shop" : "dashboard",\s*width \/ height,?\s*\)/,
    );
    expect(source).not.toContain("new THREE.PerspectiveCamera");
  });

  it("starts the dashboard at 10 degrees, retains its clamp, and returns home", () => {
    expect(HERO_HOME_AZIMUTH).toBeCloseTo((10 * Math.PI) / 180);

    const { camera, orbit, orbitOptions } = createHeroCameraOrbit(
      "dashboard",
      1,
    );

    expect(orbitOptions.initialAzimuth).toBeCloseTo(HERO_HOME_AZIMUTH);
    expect(orbitOptions.minAzimuth).toBe(-0.45);
    expect(orbitOptions.maxAzimuth).toBe(0.45);
    expect(orbitOptions.easeBackAfter).toBe(1.5);
    expect(camera.position.x).toBeCloseTo(
      Math.sin(HERO_HOME_AZIMUTH) * orbitOptions.radius,
    );
    expect(camera.position.z).toBeCloseTo(
      Math.cos(HERO_HOME_AZIMUTH) * orbitOptions.radius,
    );

    orbit.orbitBy(10);
    orbit.applyTo(camera, 0.1);
    expect(camera.position.x).toBeCloseTo(
      Math.sin(0.45) * orbitOptions.radius,
    );

    for (let time = 1.7; time <= 4.7; time += 0.1) {
      orbit.applyTo(camera, time);
    }
    expect(camera.position.x).toBeCloseTo(
      Math.sin(HERO_HOME_AZIMUTH) * orbitOptions.radius,
      3,
    );
    expect(camera.position.z).toBeCloseTo(
      Math.cos(HERO_HOME_AZIMUTH) * orbitOptions.radius,
      3,
    );
  });

  it("starts the shop at 10 degrees and keeps its azimuth free", () => {
    const { camera, orbit, orbitOptions } = createHeroCameraOrbit("shop", 1);

    expect(orbitOptions.initialAzimuth).toBeCloseTo(HERO_HOME_AZIMUTH);
    expect(orbitOptions.minAzimuth).toBeUndefined();
    expect(orbitOptions.maxAzimuth).toBeUndefined();
    expect(orbitOptions.minElevation).toBeCloseTo((-12 * Math.PI) / 180);
    expect(orbitOptions.maxElevation).toBeCloseTo((12 * Math.PI) / 180);

    orbit.orbitBy(0.5);
    orbit.applyTo(camera, 0.1);
    const expectedAzimuth = HERO_HOME_AZIMUTH + 0.5 * Math.PI * 1.1;
    expect(camera.position.x).toBeCloseTo(
      Math.sin(expectedAzimuth) * orbitOptions.radius,
    );
    expect(camera.position.z).toBeCloseTo(
      Math.cos(expectedAzimuth) * orbitOptions.radius,
    );
  });

  it.each([
    {
      label: "portrait dashboard",
      aspect: 3 / 4,
      variant: "dashboard" as const,
      safetyLimit: 0.95,
    },
    {
      label: "square shop",
      aspect: 1,
      variant: "shop" as const,
      safetyLimit: 0.85,
    },
  ])(
    "keeps the complete authored hero inside the $label NDC safety margin",
    async ({ aspect, variant, safetyLimit }) => {
      const hero = await loadAuthoredHero();
      const { camera } = createHeroCameraOrbit(variant, aspect);

      camera.updateMatrixWorld();
      camera.updateProjectionMatrix();
      const { meshCount, meshNames, ndcBounds, vertexCount } = projectHeroBounds(
        hero,
        camera,
      );

      expect(meshCount).toBeGreaterThan(0);
      expect(vertexCount).toBeGreaterThan(0);
      expect(meshNames).toEqual(
        expect.arrayContaining([
          "LeftEye",
          "RightEye",
          "VisorLip",
          "Platform",
          "PlatformRing",
          "PlatformInnerRing",
        ]),
      );
      expect(ndcBounds.isEmpty()).toBe(false);
      expect(
        [...ndcBounds.min.toArray(), ...ndcBounds.max.toArray()].every(
          Number.isFinite,
        ),
      ).toBe(true);
      expect(ndcBounds.min.x).toBeGreaterThanOrEqual(-safetyLimit);
      expect(ndcBounds.max.x).toBeLessThanOrEqual(safetyLimit);
      expect(ndcBounds.min.y).toBeGreaterThanOrEqual(-safetyLimit);
      expect(ndcBounds.max.y).toBeLessThanOrEqual(safetyLimit);
      expect(ndcBounds.min.z).toBeGreaterThanOrEqual(-1);
      expect(ndcBounds.max.z).toBeLessThanOrEqual(1);
    },
  );

  it.each([
    {
      label: "portrait dashboard",
      aspect: 3 / 4,
      variant: "dashboard" as const,
      safetyLimit: 0.95,
    },
    {
      label: "square shop",
      aspect: 1,
      variant: "shop" as const,
      safetyLimit: 0.85,
    },
  ])(
    "frames the complete tier-three level-up runtime envelope in the $label",
    async ({ aspect, variant, safetyLimit }) => {
      const source = await loadAuthoredHero();
      const runtime = createRuntimeEnvelope(source);

      try {
        const { camera, orbit } = createHeroCameraOrbit(variant, aspect);
        const sampledBounds = new THREE.Box3();
        let minDepth = Infinity;
        let maxDepth = -Infinity;
        let capAtRest = 0;
        let capAtPeak = 0;
        const cap = runtime.equipment.find(
          (object) => object.userData.equipmentId === "focus-cap",
        );
        if (!cap) throw new Error("focus-cap was not attached");
        const capWorldPosition = new THREE.Vector3();

        for (const time of LEVEL_UP_SAMPLE_TIMES) {
          orbit.applyTo(camera, time);
          runtime.motion.apply(runtime.companion.rig, "levelUp", time);
          const projection = projectRuntimeEnvelope(runtime.scene, camera);
          sampledBounds.union(projection.bounds);
          minDepth = Math.min(minDepth, projection.minDepth);
          maxDepth = Math.max(maxDepth, projection.maxDepth);

          cap.getWorldPosition(capWorldPosition);
          if (time === 0) capAtRest = capWorldPosition.y;
          if (time === 0.39) capAtPeak = capWorldPosition.y;
        }

        expect(capAtPeak - capAtRest).toBeCloseTo(0.19);
        const envelopeLimit = safetyLimit - MINIMUM_NDC_HEADROOM;
        const violations = [
          sampledBounds.min.x < -envelopeLimit ? "min.x" : null,
          sampledBounds.max.x > envelopeLimit ? "max.x" : null,
          sampledBounds.min.y < -envelopeLimit ? "min.y" : null,
          sampledBounds.max.y > envelopeLimit ? "max.y" : null,
          minDepth < camera.near ? "near" : null,
          maxDepth > camera.far ? "far" : null,
        ].filter(Boolean);
        expect(
          violations,
          `NDC [${sampledBounds.min.x}, ${sampledBounds.max.x}] x ` +
            `[${sampledBounds.min.y}, ${sampledBounds.max.y}], ` +
            `depth [${minDepth}, ${maxDepth}]`,
        ).toEqual([]);
      } finally {
        runtime.dispose();
      }
    },
  );

  it("keeps runtime effects and maximum compatible equipment in framing coverage", async () => {
    const source = await loadAuthoredHero();
    const runtime = createRuntimeEnvelope(source);

    try {
      const { camera } = createHeroCameraOrbit("dashboard", 3 / 4);
      runtime.motion.apply(runtime.companion.rig, "levelUp", 0);
      runtime.motion.apply(runtime.companion.rig, "levelUp", 0.39);
      const projection = projectRuntimeEnvelope(runtime.scene, camera);

      expectCompleteRuntimeEnvelope(projection);
    } finally {
      runtime.dispose();
    }
  });

  it("only reports taps whose ray intersects the pet", () => {
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 3);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    const pet = new THREE.Mesh(new THREE.SphereGeometry(0.5));
    pet.updateMatrixWorld();
    const didTapPet = createPetTapDetector(camera, pet);

    expect(didTapPet(50, 50, 100, 100)).toBe(true);
    expect(didTapPet(2, 2, 100, 100)).toBe(false);
  });
});
