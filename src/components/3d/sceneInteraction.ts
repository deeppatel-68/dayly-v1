import * as THREE from "three";

// Camera orbit + pet hit-testing shared by the interactive scenes. The rig
// owns the azimuth; scenes feed it drag deltas from SceneTouchLayer and call
// applyTo(camera, t) every frame, so interaction never recreates a GL
// context — it only mutates values the render loop already reads.

export interface OrbitRigOptions {
  // Point the camera circles and looks at
  target: THREE.Vector3;
  // Horizontal distance from target (derived from the scene's tuned framing)
  radius: number;
  // Fixed camera height
  height: number;
  initialAzimuth?: number;
  // Clamp range (radians). Omit for a free 360° orbit.
  minAzimuth?: number;
  maxAzimuth?: number;
  // Elevation offsets from the authored camera position. Omit to lock the
  // vertical composition; pass limits for an inspectable turntable.
  minElevation?: number;
  maxElevation?: number;
  // Drift back to initialAzimuth after this many idle seconds (0 = never)
  easeBackAfter?: number;
}

export interface OrbitRig {
  orbitBy: (dxNormalized: number, dyNormalized?: number) => void;
  applyTo: (camera: THREE.PerspectiveCamera, t: number) => void;
}

// Full-width drag rotates ~200°
const DRAG_SENSITIVITY = Math.PI * 1.1;
const ELEVATION_SENSITIVITY = Math.PI * 0.72;

export function createOrbitRig(options: OrbitRigOptions): OrbitRig {
  const home = options.initialAzimuth ?? 0;
  let azimuth = home;
  let elevation = 0;
  let lastInputT = -Infinity;
  let now = 0;
  const authoredHeight = options.height - options.target.y;
  const cameraDistance = Math.hypot(options.radius, authoredHeight);
  const authoredElevation = Math.atan2(authoredHeight, options.radius);

  return {
    orbitBy(dxNormalized: number, dyNormalized = 0) {
      azimuth += dxNormalized * DRAG_SENSITIVITY;
      if (options.minAzimuth !== undefined && options.maxAzimuth !== undefined) {
        azimuth = Math.max(options.minAzimuth, Math.min(options.maxAzimuth, azimuth));
      }
      elevation -= dyNormalized * ELEVATION_SENSITIVITY;
      if (
        options.minElevation !== undefined &&
        options.maxElevation !== undefined
      ) {
        elevation = Math.max(
          options.minElevation,
          Math.min(options.maxElevation, elevation)
        );
      } else {
        elevation = 0;
      }
      lastInputT = now;
    },
    applyTo(camera: THREE.PerspectiveCamera, t: number) {
      now = t;
      const easeAfter = options.easeBackAfter ?? 0;
      if (easeAfter > 0 && t - lastInputT > easeAfter && azimuth !== home) {
        azimuth += (home - azimuth) * 0.02;
        if (Math.abs(azimuth - home) < 0.001) azimuth = home;
      }
      if (easeAfter > 0 && t - lastInputT > easeAfter && elevation !== 0) {
        elevation += (0 - elevation) * 0.02;
        if (Math.abs(elevation) < 0.001) elevation = 0;
      }
      const verticalAngle = authoredElevation + elevation;
      const horizontalRadius = Math.cos(verticalAngle) * cameraDistance;
      camera.position.set(
        options.target.x + Math.sin(azimuth) * horizontalRadius,
        options.target.y + Math.sin(verticalAngle) * cameraDistance,
        options.target.z + Math.cos(azimuth) * horizontalRadius
      );
      camera.lookAt(options.target);
    },
  };
}

// Screen-point → "did the user touch the pet?" hit test
export function createPetTapDetector(
  camera: THREE.PerspectiveCamera,
  petGroup: THREE.Object3D
) {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const bounds = new THREE.Box3();

  return (x: number, y: number, width: number, height: number): boolean => {
    ndc.set((x / width) * 2 - 1, -(y / height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.intersectObject(petGroup, true).length > 0) return true;

    // GLB face winding and material-side settings can make a valid mesh hit
    // disappear on some exporters. A fresh world-space pet bound is a robust
    // fallback and still rejects taps outside the companion silhouette area.
    petGroup.updateWorldMatrix(true, true);
    bounds.setFromObject(petGroup);
    return !bounds.isEmpty() && raycaster.ray.intersectsBox(bounds);
  };
}
