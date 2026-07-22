import * as THREE from "three";

const TWO_PI = Math.PI * 2;

// Dashboard and shop share this authored three-quarter hero composition.
// Keep it separate from room navigation, whose home view has its own camera.
export const HERO_HOME_AZIMUTH = (10 * Math.PI) / 180;

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
  // Wait this many idle seconds before easing back to the home composition.
  easeBackAfter?: number;
  returnDamping?: number;
}

export interface OrbitRig {
  orbitBy: (dxNormalized: number, dyNormalized?: number) => void;
  applyTo: (camera: THREE.PerspectiveCamera, t: number) => void;
}

export type HeroPresentationVariant = "dashboard" | "shop";

/** @internal */
export interface HeroCameraOrbit {
  camera: THREE.PerspectiveCamera;
  orbit: OrbitRig;
  orbitOptions: OrbitRigOptions;
}

// Full-width drag rotates ~200°
const DRAG_SENSITIVITY = Math.PI * 1.1;
const ELEVATION_SENSITIVITY = Math.PI * 0.72;
const DEFAULT_RETURN_DELAY = 0.65;
const DEFAULT_RETURN_DAMPING = 5.5;
const SETTLE_EPSILON = 0.0005;

export function createOrbitRig(options: OrbitRigOptions): OrbitRig {
  const home = options.initialAzimuth ?? 0;
  let azimuth = home;
  let elevation = 0;
  let lastInputT = -Infinity;
  let now = 0;
  let lastFrameT: number | null = null;
  const authoredHeight = options.height - options.target.y;
  const cameraDistance = Math.hypot(options.radius, authoredHeight);
  const authoredElevation = Math.atan2(authoredHeight, options.radius);

  return {
    orbitBy(dxNormalized: number, dyNormalized = 0) {
      azimuth += dxNormalized * DRAG_SENSITIVITY;
      if (options.minAzimuth !== undefined && options.maxAzimuth !== undefined) {
        azimuth = Math.max(options.minAzimuth, Math.min(options.maxAzimuth, azimuth));
      } else {
        azimuth =
          home +
          THREE.MathUtils.euclideanModulo(azimuth - home + Math.PI, TWO_PI) -
          Math.PI;
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
      const deltaTime =
        lastFrameT === null ? 1 / 60 : Math.max(0, Math.min(0.1, t - lastFrameT));
      lastFrameT = t;
      const easeAfter = options.easeBackAfter ?? DEFAULT_RETURN_DELAY;
      if (t - lastInputT > easeAfter) {
        const damping = options.returnDamping ?? DEFAULT_RETURN_DAMPING;
        const alpha = 1 - Math.exp(-damping * deltaTime);
        azimuth = THREE.MathUtils.lerp(azimuth, home, alpha);
        elevation = THREE.MathUtils.lerp(elevation, 0, alpha);
        if (Math.abs(azimuth - home) < SETTLE_EPSILON) azimuth = home;
        if (Math.abs(elevation) < SETTLE_EPSILON) elevation = 0;
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

// Internal presentation factory shared by Avatar3D and its framing tests. The
// full authored model, including the pod, fits the compact portrait/dashboard
// and square/shop safety areas at the home angle.
/** @internal */
export function createHeroCameraOrbit(
  variant: HeroPresentationVariant,
  aspect: number,
): HeroCameraOrbit {
  const shop = variant === "shop";
  const orbitOptions: OrbitRigOptions = {
    target: new THREE.Vector3(0, shop ? 0.5 : 0.55, 0),
    radius: shop ? 2.55 : 2.85,
    height: shop ? 0.9 : 0.94,
    initialAzimuth: HERO_HOME_AZIMUTH,
    ...(shop
      ? {
          minElevation: (-12 * Math.PI) / 180,
          maxElevation: (12 * Math.PI) / 180,
        }
      : {
          minAzimuth: -0.45,
          maxAzimuth: 0.45,
          easeBackAfter: 1.5,
        }),
  };
  const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
  const orbit = createOrbitRig(orbitOptions);
  orbit.applyTo(camera, 0);
  return { camera, orbit, orbitOptions };
}

// Screen-point → "did the user touch the pet?" hit test
export function createPetTapDetector(
  camera: THREE.PerspectiveCamera,
  petGroup: THREE.Object3D
) {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const bounds = new THREE.Box3();
  const intersections: THREE.Intersection[] = [];

  return (x: number, y: number, width: number, height: number): boolean => {
    ndc.set((x / width) * 2 - 1, -(y / height) * 2 + 1);
    petGroup.updateWorldMatrix(true, true);
    raycaster.setFromCamera(ndc, camera);
    intersections.length = 0;
    raycaster.intersectObject(petGroup, true, intersections);
    if (intersections.length > 0) return true;

    // Some exported front-side meshes do not report intersections reliably.
    // Reuse a world-space bound as a conservative fallback without allocating.
    bounds.setFromObject(petGroup);
    return !bounds.isEmpty() && raycaster.ray.intersectsBox(bounds);
  };
}
