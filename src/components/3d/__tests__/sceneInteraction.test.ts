import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createOrbitRig, createPetTapDetector } from "../sceneInteraction";

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
