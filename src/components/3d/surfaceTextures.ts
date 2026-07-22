import * as THREE from "three";

// Procedural surface DataTextures for the study room — the same no-image
// pattern as glow.ts. Each texture is near-white with subtle luminance
// variation so it multiplies against the palette colour (assigned as `map`)
// without shifting hue. All generated once per scene, before frame one, so
// expo-gl never sees a mid-loop upload.

// Deterministic value noise (LCG) so renders — and tests — are repeatable.
function createNoise(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function toTexture(
  data: Uint8Array<ArrayBuffer>,
  size: number,
  repeat: number,
): THREE.DataTexture {
  const texture = new THREE.DataTexture(
    data,
    size,
    size,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function fill(
  data: Uint8Array<ArrayBuffer>,
  index: number,
  luminance: number,
): void {
  const value = Math.round(Math.max(0, Math.min(1, luminance)) * 255);
  data[index] = value;
  data[index + 1] = value;
  data[index + 2] = value;
  data[index + 3] = 255;
}

// Wood grain: long stripes along U with a slow sine wobble, ±6% luminance.
export function createWoodGrainTexture(repeat = 2): THREE.DataTexture {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  const rand = createNoise(1137);
  // Per-row grain offsets so stripes drift rather than tile visibly.
  const rowJitter: number[] = [];
  for (let y = 0; y < size; y++) rowJitter.push((rand() - 0.5) * 1.6);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const wave =
        Math.sin(y * 0.55 + Math.sin(x * 0.045) * 2.2 + rowJitter[y]) * 0.5 +
        0.5;
      const fleck = (rand() - 0.5) * 0.025;
      const luminance = 0.94 + wave * 0.06 + fleck;
      fill(data, (y * size + x) * 4, luminance);
    }
  }
  return toTexture(data, size, repeat);
}

// Fabric weave: a soft 2px checker plus noise, ±4% luminance.
export function createFabricWeaveTexture(repeat = 4): THREE.DataTexture {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  const rand = createNoise(2251);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const weave = ((x >> 1) + (y >> 1)) % 2 === 0 ? 0.035 : 0;
      const noise = (rand() - 0.5) * 0.03;
      const luminance = 0.955 + weave + noise;
      fill(data, (y * size + x) * 4, luminance);
    }
  }
  return toTexture(data, size, repeat);
}

// Paper fleck: sparse darker specks over a clean field.
export function createPaperFleckTexture(repeat = 2): THREE.DataTexture {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  const rand = createNoise(3313);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const speck = rand() > 0.985 ? -0.08 : 0;
      const noise = (rand() - 0.5) * 0.015;
      fill(data, (y * size + x) * 4, 0.985 + speck + noise);
    }
  }
  return toTexture(data, size, repeat);
}

// Vertical alpha gradient (opaque at top fading to clear at bottom) for the
// unlit wall-shading panel: rooms lit by a desk lamp go dark toward the
// ceiling, which flat walls can't show without shadow maps.
export function createVerticalGradientTexture(): THREE.DataTexture {
  const size = 64;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    // DataTexture row 0 is the bottom of the UV space.
    const t = y / (size - 1);
    const alpha = Math.round(Math.pow(t, 1.6) * 255);
    for (let x = 0; x < size; x++) {
      const offset = (y * size + x) * 4;
      data[offset] = 255;
      data[offset + 1] = 255;
      data[offset + 2] = 255;
      data[offset + 3] = alpha;
    }
  }

  const texture = new THREE.DataTexture(
    data,
    size,
    size,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}
