import type { RoomAnchor } from "@/components/3d/equipment";
import {
  cable,
  lathe,
  roundedBox,
} from "@/components/3d/geometry";
import {
  createGlowTexture,
  createShadowMaterial,
  createShadowTexture,
} from "@/components/3d/glow";
import {
  createFabricWeaveTexture,
  createPaperFleckTexture,
  createVerticalGradientTexture,
  createWoodGrainTexture,
} from "@/components/3d/surfaceTextures";
import * as THREE from "three";

// Builders for the cozy study-nook scene: a stylised desk corner, not a
// world. Shared materials, mobile-safe budget (~105 renderables before the
// companion/equipment — verified against the 30fps loop). Silhouette-visible
// furniture uses rounded boxes / lathes for soft premium edges; walls, floor
// and window recesses stay sharp BoxGeometry (reads as millwork).
// Coordinate frame: floor at y=0, back wall z≈-2, side wall x≈-2.6; the
// companion's pod sits front-right at the ROOM_PET_POSITION.
// Fake-bloom glow primitives live in components/3d/glow.ts; procedural
// surface grain lives in components/3d/surfaceTextures.ts.

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
  rug: { position: [1.0, 0.038, 0.2], rotationY: 0 },
  shelf: { position: [-2.48, 1.48, -0.6], rotationY: Math.PI / 2 },
  companion_corner: { position: [1.95, 0.04, 0.72], rotationY: -0.35 },
};

export function getEquipSlotMarkerPosition(
  equipSlot: string,
): [number, number, number] | null {
  if (equipSlot === "platform:left") {
    return [ROOM_PET_POSITION.x - 0.64, 0.38, ROOM_PET_POSITION.z + 0.26];
  }
  if (equipSlot === "platform:right") {
    return [ROOM_PET_POSITION.x + 0.46, 0.3, ROOM_PET_POSITION.z + 0.2];
  }
  if (!equipSlot.startsWith("room:")) return null;
  const anchor = equipSlot.slice(5) as RoomAnchor;
  return ROOM_ANCHORS[anchor]?.position ?? null;
}

interface RoomPalette {
  wall: THREE.MeshBasicMaterial;
  floor: THREE.MeshBasicMaterial;
  rug: THREE.MeshBasicMaterial;
  wood: THREE.MeshBasicMaterial;
  darkWood: THREE.MeshBasicMaterial;
  fabric: THREE.MeshBasicMaterial;
  clay: THREE.MeshBasicMaterial;
  ceramic: THREE.MeshBasicMaterial;
  metal: THREE.MeshBasicMaterial;
  paper: THREE.MeshBasicMaterial;
  leaf: THREE.MeshBasicMaterial;
  screen: THREE.MeshBasicMaterial;
  night: THREE.MeshBasicMaterial;
  moon: THREE.MeshBasicMaterial;
  stars: THREE.MeshBasicMaterial;
  string: THREE.MeshBasicMaterial;
  lampGlow: THREE.MeshBasicMaterial;
  accentGlow: THREE.MeshBasicMaterial;
}

interface RoomTextures {
  wood: THREE.DataTexture;
  fabric: THREE.DataTexture;
  rugWeave: THREE.DataTexture;
  paper: THREE.DataTexture;
  glow: THREE.DataTexture;
  shadow: THREE.DataTexture;
  gradient: THREE.DataTexture;
}

function createTextures(): RoomTextures {
  return {
    wood: createWoodGrainTexture(2),
    fabric: createFabricWeaveTexture(4),
    rugWeave: createFabricWeaveTexture(7),
    paper: createPaperFleckTexture(2),
    glow: createGlowTexture(),
    shadow: createShadowTexture(),
    gradient: createVerticalGradientTexture(),
  };
}

function createPalette(accent: THREE.Color, tex: RoomTextures): RoomPalette {
  const std = (
    color: number | THREE.Color,
    _roughness = 0.85,
    extra: Partial<THREE.MeshStandardMaterialParameters> = {},
  ) => {
    const resolvedColor = new THREE.Color(color);
    if (extra.emissive) {
      resolvedColor.lerp(new THREE.Color(extra.emissive), 0.35);
    }
    const material = new THREE.MeshBasicMaterial({
      color: resolvedColor,
      map: extra.map,
      transparent: extra.transparent,
      opacity: extra.opacity,
      depthTest: extra.depthTest,
      depthWrite: extra.depthWrite,
      side: extra.side,
    });
    material.toneMapped = false;
    material.userData.baseColor = material.color.clone();
    return material;
  };

  // Wall/floor/rug pulled to sit near the app's own dark-theme tokens
  // (Colors.dark.background #1F1E1D, backgroundSecondary #30302E, card
  // #262624 -- src/constants/Colors.ts) so the room reads as an extension
  // of the app chrome rather than an unrelated 3D scene, with floor darkest
  // (grounding, close to #1F1E1D) and rug lightest (close to #30302E) for
  // depth. Grain maps are near-white DataTextures that multiply the palette
  // colour, so hue stays owned here. `clay` is the one non-accent chroma in
  // the room (muted terracotta) so the accent orange isn't the lone colour.
  return {
    wall: std(0x35302a, 0.95),
    floor: std(0x24211e, 0.9),
    rug: std(0x3b3732, 0.95, { map: tex.rugWeave }),
    wood: std(0x684b37, 0.62, { map: tex.wood }),
    darkWood: std(0x3b2f26, 0.72, { map: tex.wood }),
    fabric: std(0x433d35, 0.9, { map: tex.fabric }),
    clay: std(0x9c6b52, 0.85, { map: tex.fabric }),
    // Glazed terracotta for the mug: same hue family as clay but smooth —
    // ceramic must not carry the textile weave.
    ceramic: std(0x9c6b52, 0.55),
    metal: std(0x1f1f23, 0.45, { metalness: 0.3 }),
    paper: std(0xe8dcc8, 0.9, { map: tex.paper }),
    // Muted olive-sage: saturated green was competing with the orange accent
    // as a third chroma once repeated across four plants/props.
    leaf: std(0x4f6f57, 0.75, { flatShading: true }),
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
  z = 0,
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
  segments = 14,
) => {
  const out = new THREE.Mesh(
    new THREE.CylinderGeometry(rTop, rBottom, h, segments),
    m,
  );
  out.position.set(x, y, z);
  return out;
};

// Soft elliptical contact shadow (unlit, cheap) — grounds furniture without
// shadow maps, which expo-gl can't afford.
const contactShadow = (
  material: THREE.MeshBasicMaterial,
  scaleX: number,
  scaleZ: number,
  x: number,
  z: number,
  y = 0.0105,
) => {
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(x, y, z);
  shadow.scale.set(scaleX, scaleZ, 1);
  // Project convention: shadows render at 1, additive glows at 10.
  shadow.renderOrder = 1;
  return shadow;
};

function buildShell(p: RoomPalette): {
  group: THREE.Group;
  celestial: THREE.Mesh;
} {
  const shell = new THREE.Group();
  shell.add(
    box(p.floor, 7, 0.1, 6, 0.4, -0.05, 0.6), // floor
    box(p.wall, 7, 3.4, 0.12, 0.4, 1.7, -2.06), // back wall
    box(p.wall, 0.12, 3.4, 6, -2.66, 1.7, 0.6), // side wall
    box(p.darkWood, 7, 0.14, 0.05, 0.4, 0.07, -1.99), // baseboards
    box(p.darkWood, 0.05, 0.14, 6, -2.59, 0.07, 0.6),
    box(p.darkWood, 7, 0.06, 0.12, 0.4, 3.32, -1.98),
    box(p.darkWood, 0.12, 0.06, 6, -2.58, 3.32, 0.6),
  );

  // Shallow floor seams give the studio scale without adding textures.
  for (let z = -1.55; z <= 2.4; z += 0.65) {
    shell.add(box(p.darkWood, 6.75, 0.008, 0.018, 0.4, 0.006, z));
  }

  // Rug under the companion
  const rug = cylinder(p.rug, 1.25, 1.25, 0.03, 1.0, 0.015, 0.2, 40);
  shell.add(rug);

  // Recessed night window: moon, tiny skyline and a real sill create depth
  // without textures or transparency. Outer trim is rounded (touchable
  // millwork); the recess itself stays sharp.
  const win = new THREE.Group();
  const moon = new THREE.Mesh(new THREE.CircleGeometry(0.12, 20), p.moon);
  moon.position.set(0.25, 0.35, 0.055);
  win.add(
    box(p.darkWood, 1.15, 1.45, 0.06, 0, 0, 0),
    box(p.night, 1.0, 1.3, 0.04, 0, 0, 0.02),
    box(p.darkWood, 1.0, 0.05, 0.05, 0, 0, 0.035),
    box(p.darkWood, 0.05, 1.3, 0.05, 0, 0, 0.035),
    roundedBox(p.wood, 1.28, 0.08, 0.18, 0.015, 0, -0.77, 0.08),
    roundedBox(p.wood, 0.08, 1.58, 0.12, 0.015, -0.62, 0, 0.04),
    roundedBox(p.wood, 0.08, 1.58, 0.12, 0.015, 0.62, 0, 0.04),
    roundedBox(p.wood, 1.32, 0.08, 0.12, 0.015, 0, 0.77, 0.04),
    moon,
    box(p.metal, 0.16, 0.3, 0.04, -0.38, -0.48, 0.05),
    box(p.metal, 0.22, 0.2, 0.04, -0.15, -0.53, 0.05),
    box(p.metal, 0.13, 0.38, 0.04, 0.08, -0.44, 0.05),
    box(p.metal, 0.25, 0.24, 0.04, 0.34, -0.51, 0.05),
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

  return { group: shell, celestial: moon };
}

function buildDesk(p: RoomPalette): {
  group: THREE.Group;
  plant: THREE.Mesh;
  steamPlanes: THREE.Mesh[];
} {
  const desk = new THREE.Group();
  const topY = 0.74;

  // Scandi trestle: eased-edge top on two A-frame leg pairs + stretcher.
  // Each end gets two legs tilted front/back so the desk reads structurally
  // supported, not balanced on posts.
  desk.add(roundedBox(p.wood, 1.7, 0.06, 0.7, 0.025, 0, topY, 0));
  for (const side of [-1, 1]) {
    for (const tilt of [-1, 1]) {
      const leg = cylinder(
        p.wood,
        0.022,
        0.028,
        topY,
        side * 0.72,
        topY / 2,
        0,
      );
      leg.rotation.x = tilt * 0.2;
      leg.rotation.z = side * -0.05;
      desk.add(leg);
    }
  }
  desk.add(roundedBox(p.wood, 1.34, 0.05, 0.05, 0.02, 0, 0.22, 0));

  // Laptop
  const laptop = new THREE.Group();
  laptop.add(roundedBox(p.metal, 0.52, 0.02, 0.36, 0.008, 0, 0.01, 0));
  const lid = new THREE.Group();
  lid.add(
    roundedBox(p.metal, 0.52, 0.34, 0.015, 0.008, 0, 0.17, 0),
    box(p.screen, 0.47, 0.29, 0.017, 0, 0.17, 0.002),
    box(p.accentGlow, 0.25, 0.018, 0.01, -0.06, 0.21, 0.014),
    box(p.paper, 0.16, 0.012, 0.01, -0.105, 0.16, 0.014),
    box(p.leaf, 0.1, 0.012, 0.01, -0.135, 0.12, 0.014),
  );
  lid.position.set(0, 0.02, -0.17);
  lid.rotation.x = 0.28;
  laptop.add(lid);
  laptop.position.set(-0.25, topY + 0.03, 0.05);
  laptop.rotation.y = 0.12;
  desk.add(laptop);

  // Charging cable trailing off the back edge — quiet lived-in detail.
  desk.add(
    cable(p.metal, [
      [-0.08, topY + 0.035, -0.08],
      [0.06, topY + 0.02, -0.26],
      [0.16, topY - 0.04, -0.36],
      [0.2, 0.32, -0.37],
      [0.16, 0.008, -0.3],
      [0.08, 0.008, -0.24],
    ]),
  );

  // Ceramic mug (turned profile + handle) with drifting steam.
  const mug = lathe(
    p.ceramic,
    [
      [0.03, 0],
      [0.048, 0.006],
      [0.05, 0.035],
      [0.046, 0.08],
      [0.05, 0.09],
    ],
    16,
    0.28,
    topY + 0.03,
    0.16,
  );
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.026, 0.007, 6, 12),
    p.ceramic,
  );
  handle.position.set(0.332, topY + 0.078, 0.16);
  desk.add(mug, handle);
  const steamPlanes: THREE.Mesh[] = [];
  for (let i = 0; i < 2; i++) {
    const steam = new THREE.Mesh(new THREE.PlaneGeometry(0.045, 0.09));
    steam.position.set(0.275 + i * 0.012, topY + 0.17 + i * 0.05, 0.16);
    steam.rotation.y = 0.25;
    steam.renderOrder = 10;
    steamPlanes.push(steam);
    desk.add(steam);
  }

  // Notebook + pencil, stacked books, desk plant
  const notebook = roundedBox(
    p.paper,
    0.16,
    0.014,
    0.22,
    0.005,
    0.0,
    topY + 0.04,
    0.22,
  );
  notebook.rotation.y = -0.18;
  const pencil = cylinder(p.accentGlow, 0.0045, 0.0045, 0.13, 0.03, topY + 0.055, 0.2, 6);
  pencil.rotation.z = Math.PI / 2;
  pencil.rotation.y = 0.35;
  desk.add(notebook, pencil);

  const bookA = roundedBox(p.paper, 0.3, 0.02, 0.22, 0.006, 0.25, topY + 0.045, -0.16);
  const bookB = roundedBox(p.clay, 0.26, 0.035, 0.18, 0.008, 0.5, topY + 0.05, -0.12);
  const bookC = roundedBox(p.leaf, 0.2, 0.03, 0.15, 0.008, 0.51, topY + 0.083, -0.11);
  bookC.rotation.y = 0.08;
  desk.add(
    bookA,
    box(p.accentGlow, 0.14, 0.009, 0.012, 0.2, topY + 0.057, -0.15),
    bookB,
    bookC,
    cylinder(p.darkWood, 0.045, 0.038, 0.07, 0.7, topY + 0.065, 0.14, 10),
  );

  // Headphones resting on the book stack — the premium-setup nod.
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.055, 0.011, 6, 14, Math.PI),
    p.metal,
  );
  band.position.set(0.5, topY + 0.108, -0.11);
  band.rotation.z = 0;
  const cupL = roundedBox(p.fabric, 0.032, 0.045, 0.04, 0.012, 0.445, topY + 0.108, -0.11);
  const cupR = roundedBox(p.fabric, 0.032, 0.045, 0.04, 0.012, 0.555, topY + 0.108, -0.11);
  desk.add(band, cupL, cupR);

  const deskPlant = new THREE.Mesh(
    new THREE.ConeGeometry(0.07, 0.14, 8),
    p.leaf,
  );
  deskPlant.position.set(0.7, topY + 0.17, 0.14);
  desk.add(deskPlant);

  return { group: desk, plant: deskPlant, steamPlanes };
}

// Desk lamp with a real light the scene can dim/brighten by focus state
function buildDeskLamp(p: RoomPalette): {
  group: THREE.Group;
  light: THREE.PointLight;
} {
  const group = new THREE.Group();
  group.add(
    cylinder(p.metal, 0.07, 0.09, 0.03, 0, 0.015, 0),
    cylinder(p.metal, 0.015, 0.015, 0.34, 0, 0.19, 0),
  );
  const arm = box(p.metal, 0.02, 0.02, 0.22, 0, 0.37, 0.09);
  arm.rotation.x = 0.35;
  // Turned shade (open bottom) instead of a raw cone
  const head = lathe(
    p.metal,
    [
      [0.075, 0],
      [0.07, 0.015],
      [0.038, 0.085],
      [0.028, 0.1],
      [0.02, 0.1],
    ],
    16,
    0,
    0.37,
    0.23,
  );
  head.rotation.x = 2.5 - Math.PI; // lathe opens down; tilt like the old cone
  head.position.set(0, 0.42, 0.2);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.032, 10, 8),
    p.lampGlow,
  );
  bulb.position.set(0, 0.4, 0.21);
  const light = new THREE.PointLight(0xf5d9a8, 0.9, 4.5, 1.6);
  light.position.set(0, 0.38, 0.24);
  group.add(arm, head, bulb, light);
  return { group, light };
}

function buildChair(p: RoomPalette): THREE.Group {
  const chair = new THREE.Group();
  // Rounded cushions on a turned pedestal — reads as a real task chair.
  const seat = roundedBox(p.fabric, 0.46, 0.11, 0.44, 0.04, 0, 0.47, 0);
  const back = roundedBox(p.fabric, 0.44, 0.5, 0.09, 0.04, 0, 0.82, -0.21);
  back.rotation.x = -0.14;
  // One turned base: wide floor disc flowing into the stem, so nothing
  // floats detached (and it's one mesh instead of pedestal + four feet).
  const pedestal = lathe(
    p.metal,
    [
      [0.02, 0],
      [0.19, 0.004],
      [0.2, 0.016],
      [0.07, 0.03],
      [0.032, 0.055],
      [0.026, 0.42],
    ],
    16,
  );
  chair.add(seat, back, pedestal);
  // Throw blanket draped over the backrest corner — warm secondary colour.
  const blanketTop = roundedBox(p.clay, 0.24, 0.035, 0.2, 0.014, 0.1, 1.02, -0.22);
  blanketTop.rotation.x = -0.14;
  blanketTop.rotation.y = 0.08;
  const blanketDrop = roundedBox(p.clay, 0.24, 0.3, 0.03, 0.014, 0.1, 0.87, -0.135);
  blanketDrop.rotation.x = -0.16;
  blanketDrop.rotation.y = 0.08;
  chair.add(blanketTop, blanketDrop);
  return chair;
}

function buildShelf(
  p: RoomPalette,
  levelTier: number,
  completedHabits: number,
  totalHabits: number,
): { group: THREE.Group; plant: THREE.Mesh } {
  const shelf = new THREE.Group();
  for (const y of [1.45, 1.85]) {
    shelf.add(roundedBox(p.wood, 0.06, 0.04, 1.1, 0.012, 0, y, 0));
  }
  // Books + trophy on top plank, plant below
  const bookMats = [p.fabric, p.leaf, p.paper, p.clay];
  for (let i = 0; i < 4; i++) {
    const book = roundedBox(
      bookMats[i % bookMats.length],
      0.045,
      0.2 + (i % 2) * 0.018,
      0.14,
      0.006,
      0.02,
      1.97 + (i % 2) * 0.009,
      -0.38 + i * 0.13,
    );
    if (i === 3) book.rotation.x = -0.18;
    shelf.add(book);
  }
  // Trophy sits ON the plank (top face y=1.87) at every tier height.
  shelf.add(
    cylinder(
      p.accentGlow,
      0.035 + levelTier * 0.008,
      0.05 + levelTier * 0.008,
      0.11 + levelTier * 0.025,
      0.02,
      1.87 + (0.11 + levelTier * 0.025) / 2,
      0.32,
      10,
    ),
    cylinder(p.darkWood, 0.05, 0.045, 0.08, 0.02, 1.51, 0.25, 10),
  );
  const shelfPlant = new THREE.Mesh(
    new THREE.ConeGeometry(0.08, 0.16, 8),
    p.leaf,
  );
  shelfPlant.position.set(0.02, 1.63, 0.25);
  shelf.add(shelfPlant);

  // A text-free daily progress rail: lit pins mirror completed habits.
  const markerCount = Math.max(1, Math.min(5, totalHabits || 5));
  for (let i = 0; i < markerCount; i++) {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 8, 6),
      i < completedHabits ? p.accentGlow : p.metal,
    );
    marker.position.set(0.025, 1.68, -0.28 + i * 0.13);
    shelf.add(marker);
  }
  return { group: shelf, plant: shelfPlant };
}

// Potted floor plant by the window: frames the right edge of the home view
// and gives the back corner a soft organic silhouette.
function buildFloorPlant(p: RoomPalette): {
  group: THREE.Group;
  sway: THREE.Object3D;
} {
  const plant = new THREE.Group();
  plant.add(
    lathe(
      p.darkWood,
      [
        [0.065, 0],
        [0.1, 0.02],
        [0.115, 0.17],
        [0.1, 0.19],
      ],
      14,
    ),
  );
  const foliage = new THREE.Group();
  const leafGeo = new THREE.SphereGeometry(0.11, 7, 5);
  for (let i = 0; i < 3; i++) {
    const leafBlade = new THREE.Mesh(leafGeo, p.leaf);
    const angle = (i / 3) * Math.PI * 2;
    leafBlade.position.set(Math.cos(angle) * 0.05, 0.36 + i * 0.09, Math.sin(angle) * 0.05);
    leafBlade.scale.set(0.9, 1.9, 0.28);
    leafBlade.rotation.y = angle;
    leafBlade.rotation.z = 0.28;
    foliage.add(leafBlade);
  }
  plant.add(foliage);
  return { group: plant, sway: foliage };
}

// Warm string lights along the back wall; the scene flashes them on rewards
function buildStringLights(p: RoomPalette): THREE.Group {
  const lights = new THREE.Group();
  const bulbGeo = new THREE.SphereGeometry(0.024, 8, 6);
  const wirePoints: [number, number, number][] = [];
  for (let i = 0; i < 9; i++) {
    const x = -2.2 + i * 0.55;
    // Single gravity sag between the two end anchors — an S-wave reads as
    // decorative oscillation, not a hanging wire.
    const droop = -Math.sin((i / 8) * Math.PI) * 0.12;
    const y = 2.5 + droop;
    const bulb = new THREE.Mesh(bulbGeo, p.string);
    bulb.position.set(x, y, -1.94);
    lights.add(bulb);
    wirePoints.push([x, y + 0.02, -1.945]);
  }
  // The wire the bulbs hang from — without it they read as floating dots.
  lights.add(cable(p.metal, wirePoints, 0.004, 32));
  return lights;
}

export interface StudyRoom {
  group: THREE.Group;
  lampLight: THREE.PointLight;
  stringMat: THREE.MeshBasicMaterial;
  skyMat: THREE.MeshBasicMaterial;
  celestialMat: THREE.MeshBasicMaterial;
  starMat: THREE.MeshBasicMaterial;
  screenMat: THREE.MeshBasicMaterial;
  lampGlowMat: THREE.MeshBasicMaterial;
  celestial: THREE.Mesh;
  ambientObjects: THREE.Object3D[];
  lampPoolMat: THREE.MeshBasicMaterial;
  wallSpillMat: THREE.MeshBasicMaterial;
  steamMat: THREE.MeshBasicMaterial;
  steamPlanes: THREE.Mesh[];
  anchorFor: (anchor: RoomAnchor) => {
    position: [number, number, number];
    rotationY: number;
  };
  dispose: () => void;
}

export function buildStudyRoom(
  accent: THREE.Color,
  options: {
    levelTier?: number;
    completedHabits?: number;
    totalHabits?: number;
  } = {},
): StudyRoom {
  const tex = createTextures();
  const p = createPalette(accent, tex);
  const group = new THREE.Group();
  const lampPoolMat = new THREE.MeshBasicMaterial({
    color: 0xf1bd82,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  lampPoolMat.toneMapped = false;

  const shell = buildShell(p);
  const desk = buildDesk(p);
  desk.group.position.set(-0.85, 0, -1.45);
  const lamp = buildDeskLamp(p);
  lamp.group.position.set(-0.15, 0.77, -1.55);
  lamp.group.rotation.y = -0.5;
  const chair = buildChair(p);
  chair.position.set(-0.9, 0, -0.7);
  chair.rotation.y = 0.35;
  const shelf = buildShelf(
    p,
    options.levelTier ?? 0,
    options.completedHabits ?? 0,
    options.totalHabits ?? 0,
  );
  shelf.group.position.set(-2.56, 0, -0.6);
  // x=2.15 keeps the plant inside the home view at true portrait aspect
  // (fov is vertical; 19.5:9 phones only see ~±14° horizontally).
  const floorPlant = buildFloorPlant(p);
  floorPlant.group.position.set(2.15, 0, -1.4);
  const strings = buildStringLights(p);

  const lampPool = new THREE.Mesh(
    new THREE.CircleGeometry(0.82, 28),
    lampPoolMat,
  );
  lampPool.rotation.x = -Math.PI / 2;
  lampPool.position.set(-0.25, 0.012, -1.1);
  lampPool.scale.set(1.3, 0.72, 1);
  lampPoolMat.opacity = 0.22;
  lampPool.renderOrder = 1;

  // Contact shadows ground the furniture; one shared unlit material.
  const shadowMat = createShadowMaterial(tex.shadow);
  shadowMat.opacity = 0.3;
  const shadows = [
    contactShadow(shadowMat, 2.1, 1.05, -0.85, -1.45),
    contactShadow(shadowMat, 0.85, 0.85, -0.9, -0.7),
    contactShadow(shadowMat, 0.55, 0.55, 2.15, -1.4),
  ];

  // Wall shading: dark falloff toward the ceiling (a lamp-lit room is
  // darkest up high) + a warm additive spill behind the desk lamp. Both
  // unlit planes — the closest expo-gl gets to baked lighting.
  const wallShadeMat = new THREE.MeshBasicMaterial({
    color: 0x0b0908,
    map: tex.gradient,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });
  wallShadeMat.toneMapped = false;
  // Span tucked under the crown moulding (top ≤3.33 vs crown top 3.35).
  const backWallShade = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 1.86),
    wallShadeMat,
  );
  backWallShade.position.set(0.4, 2.4, -1.988);
  backWallShade.renderOrder = 1;
  const sideWallShade = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 1.86),
    wallShadeMat,
  );
  sideWallShade.position.set(-2.592, 2.4, 0.6);
  sideWallShade.rotation.y = Math.PI / 2;
  sideWallShade.renderOrder = 1;

  const wallSpillMat = new THREE.MeshBasicMaterial({
    color: 0xf1bd82,
    map: tex.glow,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  });
  wallSpillMat.toneMapped = false;
  const wallSpill = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 24),
    wallSpillMat,
  );
  wallSpill.position.set(-0.15, 1.32, -1.986);
  wallSpill.scale.set(1.25, 1, 1);
  wallSpill.renderOrder = 10;

  // Coffee steam: two additive wisps drifting above the mug (animated by
  // the scene loop via steamPlanes/steamMat).
  const steamMat = new THREE.MeshBasicMaterial({
    color: 0xfff3e2,
    map: tex.glow,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
  });
  steamMat.toneMapped = false;
  for (const steam of desk.steamPlanes) {
    steam.material = steamMat;
    steam.userData.baseY = steam.position.y;
    steam.userData.baseX = steam.position.x;
  }

  group.add(
    shell.group,
    desk.group,
    lamp.group,
    chair,
    shelf.group,
    floorPlant.group,
    strings,
    lampPool,
    ...shadows,
    backWallShade,
    sideWallShade,
    wallSpill,
  );
  return {
    group,
    lampLight: lamp.light,
    stringMat: p.string,
    skyMat: p.night,
    celestialMat: p.moon,
    starMat: p.stars,
    screenMat: p.screen,
    lampGlowMat: p.lampGlow,
    celestial: shell.celestial,
    ambientObjects: [desk.plant, shelf.plant, floorPlant.sway],
    lampPoolMat,
    wallSpillMat,
    steamMat,
    steamPlanes: desk.steamPlanes,
    anchorFor: (anchor) => ROOM_ANCHORS[anchor],
    dispose: () => {
      const geometries = new Set<THREE.BufferGeometry>();
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) geometries.add(child.geometry);
      });
      geometries.forEach((geometry) => geometry.dispose());
      Object.values(p).forEach((mat) => mat.dispose());
      lampPoolMat.dispose();
      shadowMat.dispose();
      wallShadeMat.dispose();
      wallSpillMat.dispose();
      steamMat.dispose();
      Object.values(tex).forEach((texture) => texture.dispose());
    },
  };
}
