import { ExpoWebGLRenderingContext, GLView } from "expo-gl";
import { Renderer } from "expo-three";
import * as THREE from "three";

// Shared renderer/lighting quality for every companion scene. One place for
// tone mapping, colour space, and light-rig decisions so the pet reads the
// same everywhere and retunes happen once.
//
// ACESFilmic tone mapping compresses highlights, so emissive materials need
// to run hotter than they did untone-mapped — the ~1.3x boosts live next to
// the values they affect (petMotion, equipment, roomBuilders).

export interface SceneRendererOptions {
  gl: ExpoWebGLRenderingContext;
  clearColor: string;
  exposure?: number;
}

export function createSceneRenderer({
  gl,
  clearColor,
  exposure = 1.15,
}: SceneRendererOptions): Renderer {
  const renderer = new Renderer({ gl, antialias: true });
  renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
  renderer.setClearColor(clearColor, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // expo-gl returns undefined shader logs, which crashes three's debug path
  renderer.debug.checkShaderErrors = false;
  return renderer;
}

export function releaseSceneContext(gl: ExpoWebGLRenderingContext): void {
  GLView.destroyContextAsync(gl).catch(() => {
    // Native view teardown may have already released this context.
  });
}

// Three-point rig + hemisphere: warm key, cool low fill, accent rim, and a
// warm-sky/charcoal-ground hemisphere instead of a flat ambient wash.
export function createPetLightRig(
  scene: THREE.Scene,
  accent: THREE.Color,
  streakBoost: number
): void {
  const hemi = new THREE.HemisphereLight(0xfff0dd, 0x1f1e1d, 0.55);
  const key = new THREE.DirectionalLight(0xfff4e8, 1.35);
  key.position.set(2.5, 4, 4);
  const fill = new THREE.DirectionalLight(0xdce4f5, 0.35);
  fill.position.set(-3, 2, 2.5);
  const rim = new THREE.PointLight(accent, 0.6 + streakBoost * 0.3, 10);
  rim.position.set(-2, 1.5, -2);
  scene.add(hemi, key, fill, rim);
}

export interface ContactShadow {
  group: THREE.Group;
  // Call each frame with how high the subject is floating (0 = grounded)
  setLift: (lift: number) => void;
  dispose: () => void;
}

// Cheap grounded-ness without shadow maps: two stacked translucent discs
// (soft penumbra fake). Placed flat on whatever surface the subject sits on.
export function createContactShadow(
  radius: number,
  baseOpacity = 0.32
): ContactShadow {
  const group = new THREE.Group();

  const makeDisc = (r: number, opacity: number) => {
    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(r, 28),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity,
        depthWrite: false,
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  };

  const inner = makeDisc(radius * 0.62, baseOpacity);
  const outer = makeDisc(radius, baseOpacity * 0.45);
  outer.position.y = -0.001; // avoid z-fighting between the discs
  group.add(inner, outer);

  const innerMat = inner.material as THREE.MeshBasicMaterial;
  const outerMat = outer.material as THREE.MeshBasicMaterial;

  return {
    group,
    setLift: (lift: number) => {
      // Higher float → lighter, slightly larger shadow
      const fade = Math.max(0.35, 1 - lift * 3);
      innerMat.opacity = baseOpacity * fade;
      outerMat.opacity = baseOpacity * 0.45 * fade;
      const spread = 1 + lift * 1.2;
      group.scale.setScalar(spread);
    },
    dispose: () => {
      inner.geometry.dispose();
      outer.geometry.dispose();
      innerMat.dispose();
      outerMat.dispose();
    },
  };
}
