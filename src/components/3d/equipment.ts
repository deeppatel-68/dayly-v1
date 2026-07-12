import * as THREE from "three";

// Maps shop item ids to 3D builders. This is the single seam between the
// shop domain (owned/equipped items) and the 3D layer: scenes ask which slot
// an item fills and attach its object; the shop asks RENDERED_EQUIPMENT_IDS
// to decide which items are purchasable (no fake purchases).
//
// Slots:
//   "pet"      — attached to the pet group, positioned pet-local (moves/bobs
//                with the companion): caps, glasses, headphones
//   "platform" — sits around the companion's pod, world-positioned at the
//                pod origin: small desk-side decorations
//   "room"     — only rendered inside the study room scene, placed at a room
//                anchor: wall art, furniture
export type EquipmentSlot = "pet" | "platform" | "room";

// Semantic room bays; each holds at most one equipped item (last wins)
export type RoomAnchor =
  | "desk"
  | "lamp"
  | "wall_art"
  | "window_view"
  | "floor_prop";

export interface EquipmentMaterials {
  dark: THREE.MeshStandardMaterial;
  frame: THREE.MeshStandardMaterial;
  glow: THREE.MeshStandardMaterial;
  leaf: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  screen: THREE.MeshStandardMaterial;
  dispose: () => void;
}

// One set of shared materials per scene; builders reuse them so a scene adds
// at most a handful of programs regardless of how much is equipped.
export function createEquipmentMaterials(
  accent: THREE.Color
): EquipmentMaterials {
  const dark = new THREE.MeshStandardMaterial({
    color: 0x1f1f23,
    roughness: 0.5,
    metalness: 0.1,
  });
  const frame = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.4,
  });
  const glow = new THREE.MeshStandardMaterial({
    color: accent,
    emissive: accent,
    // Retuned ~1.3x hotter for ACES tone mapping (sceneRenderer.ts)
    emissiveIntensity: 1.2,
  });
  const leaf = new THREE.MeshStandardMaterial({
    color: 0x4a7c59,
    flatShading: true,
    roughness: 0.7,
  });
  const wood = new THREE.MeshStandardMaterial({
    color: 0x4a3b2e,
    roughness: 0.75,
  });
  const screen = new THREE.MeshStandardMaterial({
    color: 0x0d0d10,
    emissive: 0x8fb3c7,
    emissiveIntensity: 0.35,
    roughness: 0.3,
  });
  const all = [dark, frame, glow, leaf, wood, screen];
  return {
    dark,
    frame,
    glow,
    leaf,
    wood,
    screen,
    dispose: () => all.forEach((m) => m.dispose()),
  };
}

export interface EquipmentDef {
  slot: EquipmentSlot;
  // Required for slot "room": which bay the item occupies
  anchor?: RoomAnchor;
  build: (m: EquipmentMaterials) => THREE.Object3D;
}

const mesh = (
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0
) => {
  const out = new THREE.Mesh(geometry, material);
  out.position.set(x, y, z);
  return out;
};

// Pet-local frame: body centre y≈0.63, eyes at (±0.165, 0.83, ~0.5),
// body top ≈1.17, pod ring around origin (see dayly-companion-build.py).
export const EQUIPMENT: Record<string, EquipmentDef> = {
  // Dome + brim render-verified against the GLB in headless Blender
  // (primitive stand-ins imported alongside dayly-companion.glb, front +
  // 3/4 + top renders). Original thetaLength (PI/2.8) let the dome's rim
  // clip into the top of the eyes (eye top ≈0.97); PI/3 raises the rim to
  // y=1.0, clearing them. The brim was undersized/mispositioned (sat high
  // on the dome, barely poking past its surface) — moved to the new rim
  // height and pushed forward so it reads as a bill.
  "focus-cap": {
    slot: "pet",
    build: (m) => {
      const group = new THREE.Group();
      const dome = mesh(
        new THREE.SphereGeometry(
          0.54,
          24,
          12,
          0,
          Math.PI * 2,
          0,
          Math.PI / 2.25
        ),
        m.dark,
        0,
        1.02,
        0
      );
      dome.scale.set(0.94, 0.38, 0.92);
      const brim = mesh(
        new THREE.CapsuleGeometry(0.035, 0.34, 4, 10),
        m.dark,
        0,
        1.055,
        0.5
      );
      brim.rotation.z = Math.PI / 2;
      const focusTag = mesh(
        new THREE.BoxGeometry(0.07, 0.035, 0.018),
        m.glow,
        0.18,
        1.085,
        0.545
      );
      group.add(dome, brim, focusTag);
      return group;
    },
  },
  // Lens size/position render-verified: the old radius (0.115) was smaller
  // than the eye's own height (0.283) so it couldn't ring it, and z=0.5 sat
  // behind the eye's front-most point (~0.522), embedding half the ring
  // inside the head. The living-companion visor seats the eyes slightly
  // farther forward, so the frames sit at z=0.595 with a small air gap.
  "study-glasses": {
    slot: "pet",
    build: (m) => {
      const group = new THREE.Group();
      const lensGeo = new THREE.TorusGeometry(0.145, 0.018, 8, 20);
      group.add(
        mesh(lensGeo, m.frame, -0.165, 0.84, 0.595),
        mesh(lensGeo, m.frame, 0.165, 0.84, 0.595),
        mesh(new THREE.BoxGeometry(0.08, 0.016, 0.016), m.frame, 0, 0.84, 0.6)
      );
      return group;
    },
  },
  "neon-headphones": {
    slot: "pet",
    build: (m) => {
      const group = new THREE.Group();
      const band = mesh(
        new THREE.TorusGeometry(0.6, 0.03, 8, 24, Math.PI),
        m.dark,
        0,
        0.65,
        0
      );
      const earGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.07, 14);
      const leftEar = mesh(earGeo, m.glow, -0.6, 0.65, 0);
      leftEar.rotation.z = Math.PI / 2;
      const rightEar = mesh(earGeo, m.glow, 0.6, 0.65, 0);
      rightEar.rotation.z = Math.PI / 2;
      group.add(band, leftEar, rightEar);
      return group;
    },
  },
  // Render-verified against the pod: the pod's raised puck tier (where the
  // pet stands) has radius 0.62, but the old (0.62, _, 0.3) position is
  // radius 0.69 from the pod origin — past the puck edge, so despite y=0.09
  // matching the puck top it floated over the lower base tier instead.
  // Pulled in along the same angle to radius ~0.5 so it actually sits on
  // the puck beside the pet.
  "study-plant": {
    slot: "platform",
    build: (m) => {
      const group = new THREE.Group();
      group.add(
        mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.1, 10), m.dark, 0.46, 0.09, 0.2),
        mesh(new THREE.ConeGeometry(0.09, 0.18, 8), m.leaf, 0.46, 0.23, 0.2),
        mesh(new THREE.ConeGeometry(0.06, 0.12, 8), m.leaf, 0.4, 0.19, 0.26)
      );
      return group;
    },
  },
  // Render-verified: the old position (radius 0.717 from origin + 0.06
  // footprint = 0.777) sat within the pod's 0.80 base radius but only by
  // 0.023 — nudged in slightly for a safer margin against the base edge.
  "neon-lamp": {
    slot: "platform",
    build: (m) => {
      const group = new THREE.Group();
      group.add(
        mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.03, 10), m.dark, -0.64, 0.055, 0.26),
        mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.38, 8), m.dark, -0.64, 0.26, 0.26),
        mesh(new THREE.SphereGeometry(0.05, 12, 10), m.glow, -0.64, 0.48, 0.26)
      );
      return group;
    },
  },
  "motivational-poster": {
    slot: "room",
    anchor: "wall_art",
    build: (m) => {
      const group = new THREE.Group();
      group.add(
        mesh(new THREE.BoxGeometry(0.55, 0.72, 0.03), m.dark),
        mesh(new THREE.BoxGeometry(0.4, 0.05, 0.035), m.glow, 0, 0.16, 0.005),
        mesh(new THREE.BoxGeometry(0.3, 0.035, 0.035), m.frame, 0, 0.02, 0.005),
        mesh(new THREE.BoxGeometry(0.34, 0.035, 0.035), m.frame, 0, -0.08, 0.005)
      );
      return group;
    },
  },
  bookshelf: {
    slot: "room",
    anchor: "floor_prop",
    build: (m) => {
      const group = new THREE.Group();
      const frame = mesh(new THREE.BoxGeometry(0.9, 1.5, 0.28), m.wood, 0, 0.75, 0);
      group.add(frame);
      // Shelf gaps + books
      for (let row = 0; row < 3; row++) {
        const y = 0.35 + row * 0.42;
        group.add(mesh(new THREE.BoxGeometry(0.8, 0.28, 0.22), m.dark, 0, y, 0.02));
        for (let b = 0; b < 4; b++) {
          const book = mesh(
            new THREE.BoxGeometry(0.09, 0.24, 0.16),
            b % 3 === 0 ? m.glow : b % 2 === 0 ? m.leaf : m.frame,
            -0.28 + b * 0.17,
            y,
            0.03
          );
          book.rotation.z = b === 3 ? 0.16 : 0;
          group.add(book);
        }
      }
      return group;
    },
  },
  "gaming-desk": {
    slot: "room",
    anchor: "desk",
    build: (m) => {
      // Upgrade kit for the desk: second monitor + LED strip along the edge
      const group = new THREE.Group();
      const monitor = new THREE.Group();
      monitor.add(
        mesh(new THREE.BoxGeometry(0.5, 0.32, 0.03), m.frame, 0, 0.36, 0),
        mesh(new THREE.BoxGeometry(0.46, 0.28, 0.032), m.screen, 0, 0.36, 0.004),
        mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 8), m.frame, 0, 0.12, 0),
        mesh(new THREE.BoxGeometry(0.2, 0.02, 0.14), m.frame, 0, 0.04, 0)
      );
      monitor.position.set(0.55, 0, -0.08);
      monitor.rotation.y = -0.35;
      const led = mesh(new THREE.BoxGeometry(1.7, 0.02, 0.02), m.glow, 0, -0.045, 0.36);
      group.add(monitor, led);
      return group;
    },
  },
  "floor-plant": {
    slot: "room",
    anchor: "floor_prop",
    build: (m) => {
      const group = new THREE.Group();
      const leafTall = mesh(new THREE.ConeGeometry(0.2, 0.55, 7), m.leaf, 0, 0.55, 0);
      const leafRight = mesh(new THREE.ConeGeometry(0.13, 0.38, 7), m.leaf, 0.12, 0.44, 0.06);
      leafRight.rotation.z = -0.25;
      const leafLeft = mesh(new THREE.ConeGeometry(0.11, 0.32, 7), m.leaf, -0.1, 0.42, -0.05);
      leafLeft.rotation.z = 0.22;
      group.add(
        mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.26, 12), m.wood, 0, 0.13, 0),
        mesh(new THREE.CylinderGeometry(0.17, 0.16, 0.04, 12), m.dark, 0, 0.27, 0),
        leafTall,
        leafRight,
        leafLeft
      );
      return group;
    },
  },
  "fairy-window": {
    slot: "room",
    anchor: "window_view",
    build: (m) => {
      const group = new THREE.Group();
      const bulbGeo = new THREE.SphereGeometry(0.03, 8, 6);
      for (const x of [-0.62, 0.62]) {
        group.add(mesh(new THREE.BoxGeometry(0.015, 1.5, 0.015), m.frame, x, 0.15, 0.04));
        for (const y of [0.55, 0.15, -0.35]) {
          group.add(mesh(bulbGeo, m.glow, x, y, 0.05));
        }
      }
      return group;
    },
  },
};

// Which shop items the 3D layer can actually display. The shop reads this to
// gate purchasing — an item not in this list shows as "Coming Soon".
export const RENDERED_EQUIPMENT_IDS = Object.keys(EQUIPMENT);

// Attach equipped items for a scene. `slots` filters what this scene shows
// (the compact avatar card renders pet+platform; the room renders all).
// Returns the created objects so callers can dispose geometries on teardown.
export function attachEquipment(
  equippedIds: string[],
  slots: EquipmentSlot[],
  materials: EquipmentMaterials,
  targets: {
    pet?: THREE.Object3D;
    platform?: THREE.Object3D;
    room?: (anchor: RoomAnchor, object: THREE.Object3D) => void;
  }
): THREE.Object3D[] {
  const built: THREE.Object3D[] = [];
  // Each room anchor shows at most one item: the last-equipped one wins
  // (equippedIds is in equip order).
  const selectedRoomByAnchor = new Map<RoomAnchor, number>();

  if (slots.includes("room")) {
    equippedIds.forEach((id, index) => {
      const def = EQUIPMENT[id];
      if (def?.slot === "room" && def.anchor) {
        selectedRoomByAnchor.set(def.anchor, index);
      }
    });
  }

  for (let index = 0; index < equippedIds.length; index++) {
    const id = equippedIds[index];
    const def = EQUIPMENT[id];
    if (!def || !slots.includes(def.slot)) continue;
    const roomAnchor = def.slot === "room" ? def.anchor : undefined;
    if (def.slot === "room") {
      if (!roomAnchor || selectedRoomByAnchor.get(roomAnchor) !== index) {
        continue;
      }
    }
    const object = def.build(materials);
    object.userData.equipmentId = id;
    object.userData.equipmentSlot = def.slot;
    if (def.slot === "pet" && targets.pet) targets.pet.add(object);
    else if (def.slot === "platform" && targets.platform)
      targets.platform.add(object);
    else if (def.slot === "room" && targets.room && roomAnchor)
      targets.room(roomAnchor, object);
    else continue;
    built.push(object);
  }
  return built;
}

export function disposeEquipment(built: THREE.Object3D[]) {
  for (const object of built) {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    });
    object.parent?.remove(object);
  }
}
