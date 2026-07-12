import * as THREE from "three";

// Shared fake-bloom + contact-shadow primitives for every companion scene.
// expo-gl has no DOM canvas, so we bake radial-falloff into small
// DataTextures sampled by additive/normal materials — no EffectComposer.

// Fake bloom: shared 64x64 radial-falloff DataTexture sampled by additive
// MeshBasicMaterial planes/sprites.
export function createGlowTexture(): THREE.DataTexture {
  const size = 64;
  const center = (size - 1) / 2;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - center, y - center) / 32;
      const core = Math.max(0, 1 - d / 0.22) ** 2 * 0.55;
      const halo = Math.max(0, 1 - d) ** 2.4;
      const f = Math.min(1, halo + core);
      const value = Math.round(f * 255);
      const offset = (y * size + x) * 4;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = value;
    }
  }

  const texture = new THREE.DataTexture(
    data,
    size,
    size,
    THREE.RGBAFormat,
    THREE.UnsignedByteType
  );
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

export function createGlowMaterial(
  map: THREE.DataTexture,
  color: number
): THREE.MeshBasicMaterial {
  const material = new THREE.MeshBasicMaterial({
    color,
    map,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    opacity: 0,
  });
  // ACES tone mapping would crush the additive halos back to grey
  material.toneMapped = false;
  return material;
}

// Same additive-halo property set as createGlowMaterial, but for a
// camera-facing Sprite (companion auras that must not foreshorten off-axis).
export function createGlowSpriteMaterial(
  map: THREE.DataTexture,
  color: number
): THREE.SpriteMaterial {
  const material = new THREE.SpriteMaterial({
    color,
    map,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    opacity: 0,
  });
  material.toneMapped = false;
  return material;
}

// Contact shadow: same 64x64 radial DataTexture structure as the glow, but a
// softer power curve so it reads as a grounded penumbra rather than a bloom.
export function createShadowTexture(): THREE.DataTexture {
  const size = 64;
  const center = (size - 1) / 2;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - center, y - center) / 32;
      const alpha = Math.max(0, 1 - d) ** 1.8;
      const value = Math.round(alpha * 255);
      const offset = (y * size + x) * 4;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = value;
    }
  }

  const texture = new THREE.DataTexture(
    data,
    size,
    size,
    THREE.RGBAFormat,
    THREE.UnsignedByteType
  );
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

export function createShadowMaterial(
  map: THREE.DataTexture
): THREE.MeshBasicMaterial {
  const material = new THREE.MeshBasicMaterial({
    color: 0x1a1512,
    map,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  // Keep the shadow a flat multiply-like dark disc, not tone-mapped
  material.toneMapped = false;
  return material;
}
