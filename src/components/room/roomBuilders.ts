import type { RoomAnchor } from "@/components/3d/equipment";
import { createGlowMaterial, createGlowTexture } from "@/components/3d/glow";
import * as THREE from "three";

// Builders for the cozy study-nook scene: a stylised desk corner, not a
// world. All primitives, shared materials, mobile-safe mesh budget (~70).
// Coordinate frame: floor at y=0, back wall z≈-2, side wall x≈-2.6; the
// companion's pod sits front-right at the ROOM_PET_POSITION.
// Fake-bloom glow primitives live in components/3d/glow.ts.

export const ROOM_PET_POSITION = new THREE.Vector3(1.08, 0, -0.08);

// Semantic room anchors for "room"-slot equipment: one equipped item per
// anchor (see components/3d/equipment.ts for the item→anchor mapping).
export const ROOM_ANCHORS: Record<
  RoomAnchor,
  { position: [number, number, number]; rotationY: number }
> = {
  desk: { position: [-0.85, 0.77, -1.45], rotationY: 0 },
  lamp: { position: [-0.15, 0.77, -1.55], rotationY: -0.5 },
  wall_art: { position: [0.05, 1.62, -1.96], rotationY: 0 },
  window_view: { position: [0.58, 1.72, -1.9], rotationY: 0 },
  floor_prop: { position: [-2.42, 0, 0.75], rotationY: Math.PI / 2 },
};

interface RoomPalette {
  wall: THREE.MeshStandardMaterial;
  floor: THREE.MeshStandardMaterial;
  rug: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  darkWood: THREE.MeshStandardMaterial;
  fabric: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  paper: THREE.MeshStandardMaterial;
  leaf: THREE.MeshStandardMaterial;
  screen: THREE.MeshStandardMaterial;
  night: THREE.MeshStandardMaterial;
  moon: THREE.MeshStandardMaterial;
  stars: THREE.MeshStandardMaterial;
  string: THREE.MeshStandardMaterial;
  lampGlow: THREE.MeshStandardMaterial;
  accentGlow: THREE.MeshStandardMaterial;
}

function createPalette(accent: THREE.Color): RoomPalette {
  const std = (
    color: number | THREE.Color,
    roughness = 0.85,
    extra: Partial<THREE.MeshStandardMaterialParameters> = {}
  ) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });

  // Wall/floor/rug pulled to sit near the app's own dark-theme tokens
  // (Colors.dark.background #1F1E1D, backgroundSecondary #30302E, card
  // #262624 -- src/constants/Colors.ts) so the room reads as an extension
  // of the app chrome rather than an unrelated 3D scene, with floor darkest
  // (grounding, close to #1F1E1D) and rug lightest (close to #30302E) for depth.
  return {
    wall: std(0x312d29, 0.95),
    floor: std(0x24211e, 0.9),
    rug: std(0x3b3732, 0.95),
    wood: std(0x684b37, 0.7),
    darkWood: std(0x3b2f26, 0.75),
    fabric: std(0x433d35, 0.9),
    metal: std(0x1f1f23, 0.45, { metalness: 0.3 }),
    paper: std(0xe8dcc8, 0.9),
    leaf: std(0x4a7c59, 0.75, { flatShading: true }),
    // Emissives retuned ~1.3x hotter for ACES tone mapping (sceneRenderer.ts)
    screen: std(0x0d0d10, 0.3, {
      emissive: 0x9db8c9,
      emissiveIntensity: 0.5,
    }),
    night: std(0x0e1420, 0.6, {
      emissive: 0x24344d,
      emissiveIntensity: 1.05,
    }),
    moon: std(0xffe8b8, 0.75, {
      emissive: 0xffd995,
      emissiveIntensity: 1.35,
    }),
    stars: std(0xffe8b8, 0.75, {
      emissive: 0xffd995,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 1,
    }),
    string: std(0xf0b36a, 0.5, {
      emissive: 0xf0b36a,
      emissiveIntensity: 1.05,
    }),
    lampGlow: std(0xf5d9a8, 0.5, {
      emissive: 0xf5d9a8,
      emissiveIntensity: 1.45,
    }),
    accentGlow: std(accent, 0.5, {
      emissive: accent,
      emissiveIntensity: 1.2,
    }),
  };
}

const box = (
  m: THREE.Material,
  w: number,
  h: number,
  d: number,
  x = 0,
  y = 0,
  z = 0
) => {
  const out = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  out.position.set(x, y, z);
  return out;
};

const cylinder = (
  m: THREE.Material,
  rTop: number,
  rBottom: number,
  h: number,
  x = 0,
  y = 0,
  z = 0,
  segments = 14
) => {
  const out = new THREE.Mesh(
    new THREE.CylinderGeometry(rTop, rBottom, h, segments),
    m
  );
  out.position.set(x, y, z);
  return out;
};

function buildShell(
  p: RoomPalette,
  glowPlaneGeo: THREE.PlaneGeometry,
  moonGlowMat: THREE.MeshBasicMaterial
): THREE.Group {
  const shell = new THREE.Group();
  shell.add(
    box(p.floor, 7, 0.1, 6, 0.4, -0.05, 0.6), // floor
    box(p.wall, 7, 3.4, 0.12, 0.4, 1.7, -2.06), // back wall
    box(p.wall, 0.12, 3.4, 6, -2.66, 1.7, 0.6), // side wall
    box(p.darkWood, 7, 0.14, 0.05, 0.4, 0.07, -1.99), // baseboards
    box(p.darkWood, 0.05, 0.14, 6, -2.59, 0.07, 0.6)
  );

  // Rug under the companion
  const rug = cylinder(p.rug, 1.25, 1.25, 0.03, 1.0, 0.015, 0.2, 28);
  shell.add(rug);

  // Recessed night window: moon, tiny skyline and a real sill create depth
  // without textures or transparency.
  const win = new THREE.Group();
  const moon = new THREE.Mesh(new THREE.CircleGeometry(0.12, 20), p.moon);
  moon.position.set(0.25, 0.35, 0.055);
  const moonGlow = new THREE.Mesh(glowPlaneGeo, moonGlowMat);
  moonGlow.position.set(0.25, 0.35, 0.09);
  moonGlow.scale.setScalar(0.42);
  moonGlow.renderOrder = 10;
  win.add(
    box(p.darkWood, 1.15, 1.45, 0.06, 0, 0, 0),
    box(p.night, 1.0, 1.3, 0.04, 0, 0, 0.02),
    box(p.darkWood, 1.0, 0.05, 0.05, 0, 0, 0.035),
    box(p.darkWood, 0.05, 1.3, 0.05, 0, 0, 0.035),
    box(p.wood, 1.28, 0.08, 0.18, 0, -0.77, 0.08),
    moonGlow,
    moon,
    box(p.metal, 0.16, 0.3, 0.04, -0.38, -0.48, 0.05),
    box(p.metal, 0.22, 0.2, 0.04, -0.15, -0.53, 0.05),
    box(p.metal, 0.13, 0.38, 0.04, 0.08, -0.44, 0.05),
    box(p.metal, 0.25, 0.24, 0.04, 0.34, -0.51, 0.05)
  );
  for (const [x, y] of [
    [-0.34, 0.34],
    [-0.16, 0.5],
    [0.05, 0.18],
  ]) {
    const star = new THREE.Mesh(new THREE.CircleGeometry(0.018, 8), p.stars);
    star.position.set(x, y, 0.056);
    win.add(star);
  }
  win.position.set(0.58, 1.72, -2.0);
  shell.add(win);

  return shell;
}

function buildDesk(p: RoomPalette): THREE.Group {
  const desk = new THREE.Group();
  const topY = 0.74;

  desk.add(box(p.wood, 1.7, 0.06, 0.7, 0, topY, 0));
  for (const [lx, lz] of [
    [-0.78, -0.28],
    [0.78, -0.28],
    [-0.78, 0.28],
    [0.78, 0.28],
  ]) {
    desk.add(box(p.metal, 0.05, topY, 0.05, lx, topY / 2, lz));
  }

  // Laptop
  const laptop = new THREE.Group();
  laptop.add(box(p.metal, 0.52, 0.02, 0.36, 0, 0.01, 0));
  const lid = new THREE.Group();
  lid.add(
    box(p.metal, 0.52, 0.34, 0.015, 0, 0.17, 0),
    box(p.screen, 0.47, 0.29, 0.017, 0, 0.17, 0.002),
    box(p.accentGlow, 0.25, 0.018, 0.01, -0.06, 0.21, 0.014),
    box(p.paper, 0.16, 0.012, 0.01, -0.105, 0.16, 0.014),
    box(p.leaf, 0.1, 0.012, 0.01, -0.135, 0.12, 0.014)
  );
  lid.position.set(0, 0.02, -0.17);
  lid.rotation.x = 0.28;
  laptop.add(lid);
  laptop.position.set(-0.25, topY + 0.03, 0.05);
  laptop.rotation.y = 0.12;
  desk.add(laptop);

  // Mug, stacked books, desk plant
  desk.add(
    cylinder(p.paper, 0.05, 0.045, 0.09, 0.28, topY + 0.075, 0.16),
    box(p.fabric, 0.24, 0.035, 0.17, 0.5, topY + 0.05, -0.12),
    box(p.leaf, 0.2, 0.03, 0.15, 0.51, topY + 0.082, -0.11),
    cylinder(p.darkWood, 0.045, 0.038, 0.07, 0.7, topY + 0.065, 0.14, 10)
  );
  const deskPlant = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 8), p.leaf);
  deskPlant.position.set(0.7, topY + 0.17, 0.14);
  desk.add(deskPlant);

  return desk;
}

// Desk lamp with a real light the scene can dim/brighten by focus state
function buildDeskLamp(
  p: RoomPalette,
  glowPlaneGeo: THREE.PlaneGeometry,
  lampHaloMat: THREE.MeshBasicMaterial
): {
  group: THREE.Group;
  light: THREE.PointLight;
  halo: THREE.Mesh;
} {
  const group = new THREE.Group();
  group.add(
    cylinder(p.metal, 0.07, 0.09, 0.03, 0, 0.015, 0),
    cylinder(p.metal, 0.015, 0.015, 0.34, 0, 0.19, 0)
  );
  const arm = box(p.metal, 0.02, 0.02, 0.22, 0, 0.37, 0.09);
  arm.rotation.x = 0.35;
  const head = new THREE.Mesh(
    new THREE.ConeGeometry(0.07, 0.1, 12, 1, true),
    p.metal
  );
  head.position.set(0, 0.42, 0.2);
  head.rotation.x = 2.5;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), p.lampGlow);
  bulb.position.set(0, 0.4, 0.21);
  const halo = new THREE.Mesh(glowPlaneGeo, lampHaloMat);
  halo.position.set(0, 0.4, 0.24);
  halo.scale.setScalar(0.34);
  halo.renderOrder = 10;
  const light = new THREE.PointLight(0xf5d9a8, 0.9, 4.5, 1.6);
  light.position.set(0, 0.38, 0.24);
  group.add(arm, head, bulb, halo, light);
  return { group, light, halo };
}

function buildChair(p: RoomPalette): THREE.Group {
  const chair = new THREE.Group();
  chair.add(
    box(p.fabric, 0.46, 0.07, 0.44, 0, 0.46, 0),
    box(p.fabric, 0.44, 0.52, 0.07, 0, 0.78, -0.2),
    cylinder(p.metal, 0.03, 0.03, 0.42, 0, 0.24, 0),
    cylinder(p.metal, 0.24, 0.26, 0.03, 0, 0.03, 0, 10)
  );
  return chair;
}

function buildShelf(p: RoomPalette): THREE.Group {
  const shelf = new THREE.Group();
  for (const y of [1.45, 1.85]) {
    shelf.add(box(p.wood, 0.06, 0.04, 1.1, 0, y, 0));
  }
  // Books + trophy on top plank, plant below
  const bookMats = [p.fabric, p.leaf, p.paper, p.darkWood];
  for (let i = 0; i < 4; i++) {
    const book = box(bookMats[i % bookMats.length], 0.045, 0.2, 0.14, 0.02, 1.97, -0.38 + i * 0.13);
    if (i === 3) book.rotation.x = -0.18;
    shelf.add(book);
  }
  shelf.add(
    cylinder(p.accentGlow, 0.03, 0.045, 0.1, 0.02, 1.94, 0.32, 10),
    cylinder(p.darkWood, 0.05, 0.045, 0.08, 0.02, 1.51, 0.25, 10)
  );
  const shelfPlant = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 8), p.leaf);
  shelfPlant.position.set(0.02, 1.63, 0.25);
  shelf.add(shelfPlant);
  return shelf;
}

// Warm string lights along the back wall; the scene flashes them on rewards
function buildStringLights(
  p: RoomPalette,
  glowPlaneGeo: THREE.PlaneGeometry,
  stringGlowMat: THREE.MeshBasicMaterial
): { group: THREE.Group; glowPulseGroup: THREE.Group } {
  const lights = new THREE.Group();
  const glowPulseGroup = new THREE.Group();
  const bulbGeo = new THREE.SphereGeometry(0.024, 8, 6);
  for (let i = 0; i < 9; i++) {
    const x = -2.2 + i * 0.55;
    const droop = Math.sin((i / 8) * Math.PI * 2) * 0.06;
    const y = 2.45 + droop;
    const bulb = new THREE.Mesh(bulbGeo, p.string);
    bulb.position.set(x, y, -1.94);
    const glow = new THREE.Mesh(glowPlaneGeo, stringGlowMat);
    glow.position.set(x, y, -1.91);
    glow.scale.setScalar(0.16);
    glow.renderOrder = 10;
    lights.add(bulb);
    glowPulseGroup.add(glow);
  }
  lights.add(glowPulseGroup);
  return { group: lights, glowPulseGroup };
}

export interface StudyRoom {
  group: THREE.Group;
  lampLight: THREE.PointLight;
  stringMat: THREE.MeshStandardMaterial;
  skyMat: THREE.MeshStandardMaterial;
  celestialMat: THREE.MeshStandardMaterial;
  starMat: THREE.MeshStandardMaterial;
  screenMat: THREE.MeshStandardMaterial;
  lampGlowMat: THREE.MeshStandardMaterial;
  stringGlowMat: THREE.MeshBasicMaterial;
  lampHaloMat: THREE.MeshBasicMaterial;
  moonGlowMat: THREE.MeshBasicMaterial;
  glowPulseGroup: THREE.Group;
  anchorFor: (anchor: RoomAnchor) => {
    position: [number, number, number];
    rotationY: number;
  };
  dispose: () => void;
}

export function buildStudyRoom(accent: THREE.Color): StudyRoom {
  const p = createPalette(accent);
  const group = new THREE.Group();
  const glowTexture = createGlowTexture();
  const glowPlaneGeo = new THREE.PlaneGeometry(1, 1);
  const stringGlowMat = createGlowMaterial(glowTexture, 0xf0b36a);
  const lampHaloMat = createGlowMaterial(glowTexture, 0xf5d9a8);
  const moonGlowMat = createGlowMaterial(glowTexture, 0xffd995);

  const shell = buildShell(p, glowPlaneGeo, moonGlowMat);
  const desk = buildDesk(p);
  desk.position.set(-0.85, 0, -1.45);
  const lamp = buildDeskLamp(p, glowPlaneGeo, lampHaloMat);
  lamp.group.position.set(-0.15, 0.77, -1.55);
  lamp.group.rotation.y = -0.5;
  const chair = buildChair(p);
  chair.position.set(-0.9, 0, -0.7);
  chair.rotation.y = 0.35;
  const shelf = buildShelf(p);
  shelf.position.set(-2.56, 0, -0.6);
  const strings = buildStringLights(p, glowPlaneGeo, stringGlowMat);

  group.add(shell, desk, lamp.group, chair, shelf, strings.group);
  // Face the lamp halo toward the home camera once; the bounded orbit
  // (±0.6 rad) keeps off-axis foreshortening of the blob invisible.
  group.updateMatrixWorld(true);
  lamp.halo.lookAt(0.72, 1.3, 4.8);

  return {
    group,
    lampLight: lamp.light,
    stringMat: p.string,
    skyMat: p.night,
    celestialMat: p.moon,
    starMat: p.stars,
    screenMat: p.screen,
    lampGlowMat: p.lampGlow,
    stringGlowMat,
    lampHaloMat,
    moonGlowMat,
    glowPulseGroup: strings.glowPulseGroup,
    anchorFor: (anchor) => ROOM_ANCHORS[anchor],
    dispose: () => {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry !== glowPlaneGeo) {
          child.geometry.dispose();
        }
      });
      glowPlaneGeo.dispose();
      Object.values(p).forEach((mat) => mat.dispose());
      stringGlowMat.dispose();
      lampHaloMat.dispose();
      moonGlowMat.dispose();
      glowTexture.dispose();
    },
  };
}
