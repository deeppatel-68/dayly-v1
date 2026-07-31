import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { buildStudyRoom } from "../roomBuilders";

const CLUSTER_COUNTS = {
  FloorSeams: 7,
  WindowStars: 3,
  DeskLegs: 4,
  FloorPlantFoliage: 3,
  StringBulbs: 9,
} as const;

function buildCanonicalRoom() {
  return buildStudyRoom(new THREE.Color(0xf08a3c), {
    levelTier: 2,
    completedHabits: 3,
    totalHabits: 5,
  });
}

function getInstanceClusters(group: THREE.Group) {
  const clusters = new Map<string, THREE.InstancedMesh>();
  group.traverse((child) => {
    if (child instanceof THREE.InstancedMesh) clusters.set(child.name, child);
  });
  return clusters;
}

function decomposeInstance(cluster: THREE.InstancedMesh, index: number) {
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  cluster.getMatrixAt(index, matrix);
  matrix.decompose(position, quaternion, scale);
  return {
    matrix,
    position,
    scale,
  };
}

function expectVectorClose(
  vector: THREE.Vector3,
  expected: [number, number, number],
) {
  expected.forEach((value, index) => {
    expect(vector.getComponent(index)).toBeCloseTo(value);
  });
}

function expectMatrixClose(
  actual: THREE.Matrix4,
  expected: {
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
  },
) {
  const authored = new THREE.Object3D();
  authored.position.set(...expected.position);
  authored.rotation.set(...(expected.rotation ?? [0, 0, 0]));
  authored.scale.set(...(expected.scale ?? [1, 1, 1]));
  authored.updateMatrix();
  authored.matrix.elements.forEach((value, index) => {
    expect(actual.elements[index]).toBeCloseTo(value);
  });
}

describe("study room render budget", () => {
  it("batches only the five exact-repeat decor clusters", () => {
    const room = buildCanonicalRoom();
    const clusters = getInstanceClusters(room.group);

    expect(
      Object.fromEntries(
        [...clusters].map(([name, cluster]) => [name, cluster.count]),
      ),
    ).toEqual(CLUSTER_COUNTS);
    expect(clusters.get("WindowStars")?.material).toBe(room.starMat);
    expect(clusters.get("StringBulbs")?.material).toBe(room.stringMat);
    expect(clusters.get("FloorPlantFoliage")?.parent).toBe(
      room.ambientObjects[2],
    );
    for (const cluster of clusters.values()) {
      expect(cluster.frustumCulled).toBe(true);
      expect(cluster.boundingBox).not.toBeNull();
      expect(cluster.boundingSphere).not.toBeNull();
    }

    room.dispose();
  });

  it("preserves all authored visuals within the physical render budget", () => {
    const room = buildCanonicalRoom();
    let logicalVisuals = 0;
    let physicalRenderables = 0;

    room.group.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      physicalRenderables += 1;
      logicalVisuals +=
        child instanceof THREE.InstancedMesh ? child.count : 1;
    });

    expect(logicalVisuals).toBe(104);
    expect(physicalRenderables).toBeLessThanOrEqual(85);
    expect(physicalRenderables).toBe(83);

    room.dispose();
  });

  it("retains representative authored transforms", () => {
    const room = buildCanonicalRoom();
    const clusters = getInstanceClusters(room.group);
    const bulb = decomposeInstance(clusters.get("StringBulbs")!, 4);
    const star = decomposeInstance(clusters.get("WindowStars")!, 1);
    const foliage = decomposeInstance(
      clusters.get("FloorPlantFoliage")!,
      1,
    );
    const deskLeg = decomposeInstance(clusters.get("DeskLegs")!, 3);

    expectVectorClose(bulb.position, [0, 2.38, -1.94]);
    expectVectorClose(bulb.scale, [1, 1, 1]);
    expectVectorClose(star.position, [-0.16, 0.5, 0.056]);
    expectVectorClose(foliage.position, [
      -0.02499999999999999,
      0.45,
      0.04330127018922194,
    ]);
    expectVectorClose(foliage.scale, [0.9, 1.9, 0.28]);
    expectMatrixClose(foliage.matrix, {
      position: [-0.02499999999999999, 0.45, 0.04330127018922194],
      rotation: [0, (2 * Math.PI) / 3, 0.28],
      scale: [0.9, 1.9, 0.28],
    });
    expectVectorClose(deskLeg.position, [0.72, 0.37, 0]);
    expectMatrixClose(deskLeg.matrix, {
      position: [0.72, 0.37, 0],
      rotation: [0.2, 0, -0.05],
    });

    room.dispose();
  });

  it("disposes instance buffers and deduplicated geometry exactly once", () => {
    const room = buildCanonicalRoom();
    const clusters = [...getInstanceClusters(room.group).values()];
    const geometries = new Set<THREE.BufferGeometry>();
    room.group.traverse((child) => {
      if (child instanceof THREE.Mesh) geometries.add(child.geometry);
    });
    const instanceDisposeSpies = clusters.map((cluster) =>
      vi.spyOn(cluster, "dispose"),
    );
    const geometryDisposeSpies = [...geometries].map((geometry) =>
      vi.spyOn(geometry, "dispose"),
    );

    room.dispose();

    expect(instanceDisposeSpies).toHaveLength(5);
    for (const dispose of instanceDisposeSpies) {
      expect(dispose).toHaveBeenCalledTimes(1);
    }
    for (const dispose of geometryDisposeSpies) {
      expect(dispose).toHaveBeenCalledTimes(1);
    }
  });

  it("does not pass undefined options into Three.js materials", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});

    const room = buildCanonicalRoom();

    expect(warning).not.toHaveBeenCalled();
    room.dispose();
    warning.mockRestore();
  });
});
