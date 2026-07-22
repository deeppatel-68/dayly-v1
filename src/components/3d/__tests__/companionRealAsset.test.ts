import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { AVATAR_FACE_STYLES } from "@/data/faceStyles";
import type { FaceStyle } from "@/data/faceStyles";
import {
  createCompanionInstance,
  FACE_RIG_NODES,
} from "../companionModel";
import type { CompanionDetail } from "../companionModel";

vi.mock("expo-three", () => ({ loadAsync: vi.fn() }));

const AVATAR_DIR = resolve(process.cwd(), "assets/avatar");
const DETAILS = ["hero", "lite"] as const satisfies readonly CompanionDetail[];

class NodeProgressEvent {
  readonly type: string;
  readonly lengthComputable: boolean;
  readonly loaded: number;
  readonly total: number;

  constructor(
    type: string,
    init: {
      lengthComputable?: boolean;
      loaded?: number;
      total?: number;
    } = {},
  ) {
    this.type = type;
    this.lengthComputable = init.lengthComputable ?? false;
    this.loaded = init.loaded ?? 0;
    this.total = init.total ?? 0;
  }
}

function installProgressEventPolyfill(): void {
  if (typeof globalThis.ProgressEvent !== "undefined") return;
  Object.defineProperty(globalThis, "ProgressEvent", {
    configurable: true,
    value: NodeProgressEvent,
  });
}

function parseCompanionAsset(detail: CompanionDetail): Promise<THREE.Group> {
  const suffix = detail === "lite" ? "-lite" : "";
  const bytes = readFileSync(
    resolve(AVATAR_DIR, `dayly-companion${suffix}.glb`),
  );
  const data = Uint8Array.from(bytes).buffer;

  return new Promise((resolveAsset, rejectAsset) => {
    new GLTFLoader().parse(
      data,
      "",
      (gltf) => resolveAsset(gltf.scene),
      rejectAsset,
    );
  });
}

describe("real companion GLB integration", () => {
  const sources = {} as Record<CompanionDetail, THREE.Group>;

  beforeAll(async () => {
    installProgressEventPolyfill();
    const [hero, lite] = await Promise.all(
      DETAILS.map((detail) => parseCompanionAsset(detail)),
    );
    sources.hero = hero;
    sources.lite = lite;
  });

  it.each(
    DETAILS.flatMap((detail) =>
      AVATAR_FACE_STYLES.map(({ id }) => [detail, id] as const),
    ),
  )("constructs and disposes the %s %s companion", (detail, faceStyle) => {
    const profile = FACE_RIG_NODES[faceStyle as FaceStyle];
    const instance = createCompanionInstance(sources[detail], {
      accent: new THREE.Color("#d97757"),
      bodyColor: "#6f8193",
      detail,
      faceStyle,
      levelTier: 0,
      streakTier: 0,
    });

    const { coreMat, leftEye, rightEye } = instance.rig;
    if (!coreMat || !leftEye || !rightEye) {
      throw new Error(`${detail} ${faceStyle} is missing its required runtime rig`);
    }

    expect(instance.root.userData.companionDetail).toBe(detail);
    expect(instance.rig.petGroup.getObjectByName(profile.group)).toBeTruthy();
    expect(leftEye.name).toBe(profile.leftEye);
    expect(rightEye.name).toBe(profile.rightEye);
    expect(instance.rig.leftPupil?.name).toBe(profile.leftPupil);
    expect(instance.rig.rightPupil?.name).toBe(profile.rightPupil);
    expect(instance.rig.mouth?.name).toBe(profile.mouth);

    for (const { id } of AVATAR_FACE_STYLES) {
      if (id !== faceStyle) {
        expect(instance.root.getObjectByName(FACE_RIG_NODES[id].group)).toBe(
          undefined,
        );
      }
    }

    const geometryDispose = vi.spyOn(leftEye.geometry, "dispose");
    const materialDispose = vi.spyOn(coreMat, "dispose");
    instance.dispose();
    instance.dispose();
    expect(geometryDispose).toHaveBeenCalledOnce();
    expect(materialDispose).toHaveBeenCalledOnce();
  });
});
