import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createProceduralCompanion } from "../proceduralCompanion";

describe("procedural companion", () => {
  it("exposes the same motion and progression rig as the GLB companion", () => {
    const companion = createProceduralCompanion({
      accent: new THREE.Color("#D97757"),
      bodyColor: "#8F7AA8",
      faceStyle: "classic",
      levelTier: 2,
      streakTier: 1,
    });

    expect(companion.root.children).toHaveLength(3);
    expect(companion.rig.leftEye).toBeInstanceOf(THREE.Mesh);
    expect(companion.rig.mouth).toBeInstanceOf(THREE.Mesh);
    expect(companion.rig.rightFlipper?.userData.baseRotationZ).toBe(-0.45);
    expect(companion.rig.orbitGroup?.children).toHaveLength(3);
    expect(companion.rig.aura).toBeInstanceOf(THREE.Mesh);

    companion.dispose();
  });
});
