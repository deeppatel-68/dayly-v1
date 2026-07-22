import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
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

interface GlbJson {
  accessors?: { count?: number }[];
  animations?: unknown[];
  materials?: { name?: string }[];
  meshes?: {
    primitives?: {
      attributes?: Record<string, number>;
      indices?: number;
      mode?: number;
    }[];
  }[];
  nodes?: { children?: number[]; mesh?: number; name?: string }[];
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
});
