import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { describe, expect, it } from "vitest";
import {
  createHeroCameraOrbit,
  createOrbitRig,
  createPetTapDetector,
  HERO_HOME_AZIMUTH,
} from "../sceneInteraction";

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
