import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { AVATAR_FACE_STYLES, DEFAULT_FACE_STYLE } from "@/data/faceStyles";

const AVATAR_DIR = resolve(process.cwd(), "assets/avatar");
const FACE_GROUPS = [
  "Face_Classic",
  "Face_Eve",
  "Face_Screen",
  "Face_Kirby",
  "Face_Joy",
] as const;

export const REQUIRED_PET_NODES = [
  "Body",
  "Body_Charcoal",
  "FacePanel",
  "VisorRim",
  "LeftEye",
  "RightEye",
  "VisorLip",
  "HaloCharm",
  "EnergyCore",
  "LeftFlipper",
  "RightFlipper",
  ...FACE_GROUPS,
] as const;

const ENVELOPE_NODES = [
  "Body",
  "FacePanel",
  "VisorRim",
  "HaloCharm",
  "EnergyCore",
  "LeftFlipper",
  "RightFlipper",
  "LeftFoot",
  "RightFoot",
  "LeftSole",
  "RightSole",
  "Platform",
  "PlatformRing",
  "PlatformInnerRing",
  "BackDial",
  "BackDialTick",
] as const;

const TRANSFORM_PARITY_NODES = [...REQUIRED_PET_NODES, ...ENVELOPE_NODES] as const;
const POD_NODES = ["Platform", "PlatformRing", "PlatformInnerRing"] as const;
const BOUNDS_TOLERANCE = 0.0001;

interface GlbJson {
  accessors?: { count?: number; max?: number[]; min?: number[] }[];
  animations?: unknown[];
  materials?: { name?: string }[];
  meshes?: {
    primitives?: {
      attributes?: Record<string, number>;
      indices?: number;
      mode?: number;
    }[];
  }[];
  nodes?: {
    children?: number[];
    matrix?: number[];
    mesh?: number;
    name?: string;
    rotation?: number[];
    scale?: number[];
    translation?: number[];
  }[];
  skins?: unknown[];
  textures?: unknown[];
}

interface AssetFacts {
  activeTriangles: Record<string, number>;
  animations: number;
  bytes: number;
  indexCount: number;
  primitiveCount: number;
  requiredNames: string[];
  skins: number;
  textures: number;
}

interface AssetManifest {
  hero: AssetFacts;
  lite: AssetFacts;
}

function parseGlbJson(path: string): GlbJson {
  const bytes = readFileSync(path);
  expect(bytes.toString("utf8", 0, 4)).toBe("glTF");
  expect(bytes.readUInt32LE(4)).toBe(2);

  const jsonLength = bytes.readUInt32LE(12);
  const jsonChunkType = bytes.toString("utf8", 16, 20);
  expect(jsonChunkType).toBe("JSON");

  return JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength)) as GlbJson;
}

function descendants(json: GlbJson, rootIndex: number): Set<number> {
  const found = new Set<number>();
  const visit = (index: number) => {
    if (found.has(index)) return;
    found.add(index);
    for (const child of json.nodes?.[index]?.children ?? []) visit(child);
  };
  visit(rootIndex);
  return found;
}

function trianglesForNodes(json: GlbJson, nodeIndexes: Set<number>): number {
  let triangles = 0;
  for (const nodeIndex of nodeIndexes) {
    const meshIndex = json.nodes?.[nodeIndex]?.mesh;
    if (meshIndex === undefined) continue;
    for (const primitive of json.meshes?.[meshIndex]?.primitives ?? []) {
      expect(primitive.mode ?? 4).toBe(4);
      const accessorIndex = primitive.indices ?? primitive.attributes?.POSITION;
      const count =
        accessorIndex === undefined ? 0 : (json.accessors?.[accessorIndex]?.count ?? 0);
      triangles += Math.floor(count / 3);
    }
  }
  return triangles;
}

function nodeIndex(json: GlbJson, name: string): number {
  const index = (json.nodes ?? []).findIndex((node) => node.name === name);
  expect(index, `GLB must contain ${name}`).toBeGreaterThanOrEqual(0);
  return index;
}

function localMatrix(json: GlbJson, index: number): THREE.Matrix4 {
  const node = json.nodes?.[index];
  if (!node) throw new Error(`Missing node ${index}`);
  if (node.matrix) return new THREE.Matrix4().fromArray(node.matrix);

  return new THREE.Matrix4().compose(
    new THREE.Vector3(...((node.translation ?? [0, 0, 0]) as [number, number, number])),
    new THREE.Quaternion(
      ...((node.rotation ?? [0, 0, 0, 1]) as [number, number, number, number]),
    ),
    new THREE.Vector3(...((node.scale ?? [1, 1, 1]) as [number, number, number])),
  );
}

function worldMatrices(json: GlbJson): THREE.Matrix4[] {
  const nodes = json.nodes ?? [];
  const parents = new Map<number, number>();
  nodes.forEach((node, parentIndex) => {
    for (const child of node.children ?? []) parents.set(child, parentIndex);
  });
  const cache = new Map<number, THREE.Matrix4>();

  const resolveWorld = (index: number): THREE.Matrix4 => {
    const cached = cache.get(index);
    if (cached) return cached;
    const local = localMatrix(json, index);
    const parent = parents.get(index);
    const world = parent === undefined ? local : resolveWorld(parent).clone().multiply(local);
    cache.set(index, world);
    return world;
  };

  return nodes.map((_, index) => resolveWorld(index));
}

function boundsForNodes(
  json: GlbJson,
  indexes: Iterable<number>,
  matrices = worldMatrices(json),
): THREE.Box3 {
  const bounds = new THREE.Box3().makeEmpty();
  const meshes = json.meshes ?? [];
  const accessors = json.accessors ?? [];

  for (const index of indexes) {
    const meshIndex = json.nodes?.[index]?.mesh;
    if (meshIndex === undefined) continue;
    for (const primitive of meshes[meshIndex]?.primitives ?? []) {
      const positionIndex = primitive.attributes?.POSITION;
      if (positionIndex === undefined) continue;
      const accessor = accessors[positionIndex];
      if (!accessor?.min || !accessor.max) {
        throw new Error(`POSITION accessor ${positionIndex} must expose min/max`);
      }
      const local = new THREE.Box3(
        new THREE.Vector3(...(accessor.min as [number, number, number])),
        new THREE.Vector3(...(accessor.max as [number, number, number])),
      );
      const min = local.min;
      const max = local.max;
      for (const x of [min.x, max.x]) {
        for (const y of [min.y, max.y]) {
          for (const z of [min.z, max.z]) {
            bounds.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(matrices[index]));
          }
        }
      }
    }
  }

  expect(bounds.isEmpty(), "requested GLB nodes must include geometry").toBe(false);
  return bounds;
}

function expectVectorClose(
  actual: THREE.Vector3,
  expected: THREE.Vector3,
  label: string,
  tolerance = BOUNDS_TOLERANCE,
) {
  for (const axis of ["x", "y", "z"] as const) {
    expect(
      Math.abs(actual[axis] - expected[axis]),
      `${label}.${axis}: hero=${expected[axis]}, lite=${actual[axis]}`,
    ).toBeLessThanOrEqual(tolerance);
  }
}

function expectBoundsClose(actual: THREE.Box3, expected: THREE.Box3, label: string) {
  expectVectorClose(actual.min, expected.min, `${label}.min`);
  expectVectorClose(actual.max, expected.max, `${label}.max`);
  expectVectorClose(
    actual.getCenter(new THREE.Vector3()),
    expected.getCenter(new THREE.Vector3()),
    `${label}.center`,
  );
}

function activeFaceNodes(json: GlbJson, groupName: string): Set<number> {
  const allFaceNodes = new Set<number>();
  for (const faceGroup of FACE_GROUPS) {
    descendants(json, nodeIndex(json, faceGroup)).forEach((index) => allFaceNodes.add(index));
  }
  const active = descendants(json, nodeIndex(json, groupName));
  (json.nodes ?? []).forEach((_, index) => {
    if (!allFaceNodes.has(index)) active.add(index);
  });
  return active;
}

function inspectGlb(filename: string): AssetFacts {
  const path = resolve(AVATAR_DIR, filename);
  expect(existsSync(path), `${filename} must be generated`).toBe(true);
  const json = parseGlbJson(path);
  const nodes = json.nodes ?? [];
  const nodeNames = nodes.map((node) => node.name).filter(Boolean) as string[];
  const faceDescendants = new Set<number>();
  const faceNodes = new Map<string, Set<number>>();

  for (const groupName of FACE_GROUPS) {
    const rootIndex = nodes.findIndex((node) => node.name === groupName);
    expect(rootIndex, `${filename} must contain ${groupName}`).toBeGreaterThanOrEqual(0);
    const groupDescendants = descendants(json, rootIndex);
    faceNodes.set(groupName, groupDescendants);
    groupDescendants.forEach((index) => faceDescendants.add(index));
  }

  const sharedNodes = new Set(
    nodes.map((_, index) => index).filter((index) => !faceDescendants.has(index)),
  );
  const sharedTriangles = trianglesForNodes(json, sharedNodes);
  const activeTriangles = Object.fromEntries(
    FACE_GROUPS.map((groupName) => [
      groupName,
      sharedTriangles + trianglesForNodes(json, faceNodes.get(groupName)!),
    ]),
  );

  let primitiveCount = 0;
  let indexCount = 0;
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      primitiveCount += 1;
      if (primitive.indices !== undefined) {
        indexCount += json.accessors?.[primitive.indices]?.count ?? 0;
      }
    }
  }

  return {
    activeTriangles,
    animations: json.animations?.length ?? 0,
    bytes: statSync(path).size,
    indexCount,
    primitiveCount,
    requiredNames: REQUIRED_PET_NODES.filter((name) => nodeNames.includes(name)),
    skins: json.skins?.length ?? 0,
    textures: json.textures?.length ?? 0,
  };
}

describe("generated companion asset contract", () => {
  it("ships hero and lite GLBs within the mobile geometry budgets", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(AVATAR_DIR, "dayly-companion-manifest.json"), "utf8"),
    ) as AssetManifest;
    const hero = inspectGlb("dayly-companion.glb");
    const lite = inspectGlb("dayly-companion-lite.glb");

    expect(hero.bytes).toBeLessThanOrEqual(700_000);
    expect(lite.bytes).toBeLessThanOrEqual(450_000);
    expect(Math.max(...Object.values(hero.activeTriangles))).toBeLessThanOrEqual(15_000);
    expect(Math.max(...Object.values(lite.activeTriangles))).toBeLessThanOrEqual(7_000);
    expect(hero.textures + hero.skins + hero.animations).toBe(0);
    expect(lite.textures + lite.skins + lite.animations).toBe(0);
    expect(hero.requiredNames).toEqual(expect.arrayContaining([...REQUIRED_PET_NODES]));
    expect(lite.requiredNames).toEqual(expect.arrayContaining([...REQUIRED_PET_NODES]));
    expect(manifest.hero).toEqual(hero);
    expect(manifest.lite).toEqual(lite);
  });

  it("uses the approved portable face IDs, labels, and default", () => {
    expect(DEFAULT_FACE_STYLE).toBe("classic");
    expect(AVATAR_FACE_STYLES).toEqual([
      { id: "classic", name: "Orbit" },
      { id: "eve", name: "Focus" },
      { id: "screen", name: "Pixel" },
      { id: "kirby", name: "Spark" },
      { id: "joy", name: "Rest" },
    ]);
  });

  it.each(["dayly-companion.glb", "dayly-companion-lite.glb"])(
    "%s keeps the rear signature attached to Body",
    (filename) => {
      const json = parseGlbJson(resolve(AVATAR_DIR, filename));
      const nodes = json.nodes ?? [];
      const bodyIndex = nodes.findIndex((node) => node.name === "Body");
      const bodyDescendants = descendants(json, bodyIndex);

      for (const name of ["BackDial", "BackDialTick"]) {
        const nodeIndex = nodes.findIndex((node) => node.name === name);
        expect(nodeIndex, `${filename} must contain ${name}`).toBeGreaterThanOrEqual(0);
        expect(bodyDescendants, `${name} must follow Body motion`).toContain(nodeIndex);
      }
    },
  );

  it.each(["dayly-companion.glb", "dayly-companion-lite.glb"])(
    "%s preserves the runtime eye-material prefix",
    (filename) => {
      const json = parseGlbJson(resolve(AVATAR_DIR, filename));
      const materialNames = (json.materials ?? []).map((material) => material.name ?? "");

      expect(materialNames.some((name) => name.startsWith("Eye_White_Emission"))).toBe(
        true,
      );
    },
  );

  it("keeps lite node transforms and world-space envelopes identical to hero", () => {
    const hero = parseGlbJson(resolve(AVATAR_DIR, "dayly-companion.glb"));
    const lite = parseGlbJson(resolve(AVATAR_DIR, "dayly-companion-lite.glb"));
    const heroWorld = worldMatrices(hero);
    const liteWorld = worldMatrices(lite);

    for (const name of new Set(TRANSFORM_PARITY_NODES)) {
      const heroIndex = nodeIndex(hero, name);
      const liteIndex = nodeIndex(lite, name);
      const heroTransform = localMatrix(hero, heroIndex).toArray();
      const liteTransform = localMatrix(lite, liteIndex).toArray();
      liteTransform.forEach((value, index) => {
        expect(
          Math.abs(value - heroTransform[index]),
          `${name} local transform[${index}] drifted`,
        ).toBeLessThanOrEqual(0.000001);
      });
    }

    for (const name of ENVELOPE_NODES) {
      expectBoundsClose(
        boundsForNodes(lite, [nodeIndex(lite, name)], liteWorld),
        boundsForNodes(hero, [nodeIndex(hero, name)], heroWorld),
        name,
      );
    }

    expectBoundsClose(
      boundsForNodes(lite, (lite.nodes ?? []).keys(), liteWorld),
      boundsForNodes(hero, (hero.nodes ?? []).keys(), heroWorld),
      "overall model",
    );
    expectBoundsClose(
      boundsForNodes(lite, POD_NODES.map((name) => nodeIndex(lite, name)), liteWorld),
      boundsForNodes(hero, POD_NODES.map((name) => nodeIndex(hero, name)), heroWorld),
      "pod footprint",
    );

    for (const groupName of FACE_GROUPS) {
      expectBoundsClose(
        boundsForNodes(lite, activeFaceNodes(lite, groupName), liteWorld),
        boundsForNodes(hero, activeFaceNodes(hero, groupName), heroWorld),
        `${groupName} active envelope`,
      );
    }
  });
});
