import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  cable,
  createRoundedBoxGeometry,
  lathe,
  roundedBox,
} from "../geometry";

describe("createRoundedBoxGeometry", () => {
  it("stays within the mobile vertex budget at default segments", () => {
    const geometry = createRoundedBoxGeometry(1, 1, 1, 0.05);
    const vertexCount = geometry.attributes.position.count;
    // segments=2 → (2*2+1)^2 grid per face, non-indexed; keep it well under
    // budget so a full room of rounded meshes stays GPU-trivial.
    expect(vertexCount).toBeGreaterThan(0);
    expect(vertexCount).toBeLessThan(1200);
  });

  it("clamps the radius to the shortest half-side", () => {
    // radius bigger than the thinnest dimension must not blow up the shape:
    // every vertex stays inside the requested bounds.
    const geometry = createRoundedBoxGeometry(1, 0.02, 1, 0.5);
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox!;
    expect(bounds.max.y).toBeLessThanOrEqual(0.011);
    expect(bounds.min.y).toBeGreaterThanOrEqual(-0.011);
    expect(bounds.max.x).toBeLessThanOrEqual(0.501);
  });

  it("produces the requested dimensions", () => {
    const geometry = createRoundedBoxGeometry(2, 0.5, 1, 0.05);
    geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    geometry.boundingBox!.getSize(size);
    expect(size.x).toBeCloseTo(2, 1);
    expect(size.y).toBeCloseTo(0.5, 1);
    expect(size.z).toBeCloseTo(1, 1);
  });
});

describe("mesh helpers", () => {
  const material = new THREE.MeshStandardMaterial();

  it("roundedBox positions the mesh like box()", () => {
    const mesh = roundedBox(material, 1, 1, 1, 0.03, 1.5, 0.7, -2);
    expect(mesh.position.toArray()).toEqual([1.5, 0.7, -2]);
  });

  it("lathe builds a closed revolve from a profile", () => {
    const mesh = lathe(
      material,
      [
        [0.03, 0],
        [0.05, 0.03],
        [0.05, 0.09],
      ],
      12,
      0.2,
      0.74,
      0.1,
    );
    expect(mesh.geometry).toBeInstanceOf(THREE.LatheGeometry);
    expect(mesh.position.y).toBeCloseTo(0.74);
  });

  it("cable follows its control points within tube radius", () => {
    const mesh = cable(
      material,
      [
        [0, 1, 0],
        [0.2, 0.5, -0.3],
        [0.2, 0, -0.3],
      ],
      0.01,
    );
    mesh.geometry.computeBoundingBox();
    const bounds = mesh.geometry.boundingBox!;
    expect(bounds.min.y).toBeGreaterThanOrEqual(-0.02);
    expect(bounds.max.y).toBeLessThanOrEqual(1.02);
  });
});
