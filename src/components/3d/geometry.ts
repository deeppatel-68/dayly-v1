import * as THREE from "three";

// Soft-silhouette geometry helpers for the study room. RoundedBoxGeometry is
// vendored from three/examples/jsm (r166, MIT) because nothing else in the
// app imports from examples/jsm and Metro resolution of that path is
// unproven; vendoring keeps the bundler out of the risk equation.

const _tempNormal = new THREE.Vector3();

function getUv(
  faceDirVector: THREE.Vector3,
  normal: THREE.Vector3,
  uvAxis: "x" | "y" | "z",
  projectionAxis: "x" | "y" | "z",
  radius: number,
  sideLength: number,
): number {
  const totArcLength = (2 * Math.PI * radius) / 4;
  const centerLength = Math.max(sideLength - 2 * radius, 0);
  const halfArc = Math.PI / 4;

  _tempNormal.copy(normal);
  _tempNormal[projectionAxis] = 0;
  _tempNormal.normalize();

  const arcUvRatio = (0.5 * totArcLength) / (totArcLength + centerLength);
  const arcAngleRatio = 1.0 - _tempNormal.angleTo(faceDirVector) / halfArc;

  if (Math.sign(_tempNormal[uvAxis]) === 1) {
    return arcAngleRatio * arcUvRatio;
  }
  const lenUv = centerLength / (totArcLength + centerLength);
  return lenUv + arcUvRatio + arcUvRatio * (1.0 - arcAngleRatio);
}

export class RoundedBoxGeometry extends THREE.BoxGeometry {
  constructor(width = 1, height = 1, depth = 1, segments = 2, radius = 0.1) {
    // ensure segments is odd so we have a plane connecting the rounded corners
    segments = segments * 2 + 1;
    // ensure radius isn't bigger than shortest side
    radius = Math.min(width / 2, height / 2, depth / 2, radius);

    super(1, 1, 1, segments, segments, segments);

    if (segments === 1) return;

    const geometry2 = this.toNonIndexed();

    this.index = null;
    this.attributes.position = geometry2.attributes.position;
    this.attributes.normal = geometry2.attributes.normal;
    this.attributes.uv = geometry2.attributes.uv;

    const position = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const box = new THREE.Vector3(width, height, depth)
      .divideScalar(2)
      .subScalar(radius);

    const positions = this.attributes.position.array as Float32Array;
    const normals = this.attributes.normal.array as Float32Array;
    const uvs = this.attributes.uv.array as Float32Array;

    const faceTris = positions.length / 6;
    const faceDirVector = new THREE.Vector3();
    const halfSegmentSize = 0.5 / segments;

    for (let i = 0, j = 0; i < positions.length; i += 3, j += 2) {
      position.fromArray(positions, i);
      normal.copy(position);
      normal.x -= Math.sign(normal.x) * halfSegmentSize;
      normal.y -= Math.sign(normal.y) * halfSegmentSize;
      normal.z -= Math.sign(normal.z) * halfSegmentSize;
      normal.normalize();

      positions[i + 0] = box.x * Math.sign(position.x) + normal.x * radius;
      positions[i + 1] = box.y * Math.sign(position.y) + normal.y * radius;
      positions[i + 2] = box.z * Math.sign(position.z) + normal.z * radius;

      normals[i + 0] = normal.x;
      normals[i + 1] = normal.y;
      normals[i + 2] = normal.z;

      const side = Math.floor(i / faceTris);

      switch (side) {
        case 0: // right
          faceDirVector.set(1, 0, 0);
          uvs[j + 0] = getUv(faceDirVector, normal, "z", "y", radius, depth);
          uvs[j + 1] =
            1.0 - getUv(faceDirVector, normal, "y", "z", radius, height);
          break;
        case 1: // left
          faceDirVector.set(-1, 0, 0);
          uvs[j + 0] =
            1.0 - getUv(faceDirVector, normal, "z", "y", radius, depth);
          uvs[j + 1] =
            1.0 - getUv(faceDirVector, normal, "y", "z", radius, height);
          break;
        case 2: // top
          faceDirVector.set(0, 1, 0);
          uvs[j + 0] =
            1.0 - getUv(faceDirVector, normal, "x", "z", radius, width);
          uvs[j + 1] = getUv(faceDirVector, normal, "z", "x", radius, depth);
          break;
        case 3: // bottom
          faceDirVector.set(0, -1, 0);
          uvs[j + 0] =
            1.0 - getUv(faceDirVector, normal, "x", "z", radius, width);
          uvs[j + 1] =
            1.0 - getUv(faceDirVector, normal, "z", "x", radius, depth);
          break;
        case 4: // front
          faceDirVector.set(0, 0, 1);
          uvs[j + 0] =
            1.0 - getUv(faceDirVector, normal, "x", "y", radius, width);
          uvs[j + 1] =
            1.0 - getUv(faceDirVector, normal, "y", "x", radius, height);
          break;
        case 5: // back
          faceDirVector.set(0, 0, -1);
          uvs[j + 0] = getUv(faceDirVector, normal, "x", "y", radius, width);
          uvs[j + 1] =
            1.0 - getUv(faceDirVector, normal, "y", "x", radius, height);
          break;
      }
    }
  }
}

// Default segment count: 2 (~150 verts/face pre-dedup) keeps a full room of
// rounded meshes in the low tens of thousands of vertices — GPU-trivial; the
// real mobile budget is programs/draw calls, which these helpers don't add to.
export const ROUNDED_SEGMENTS = 2;

export function createRoundedBoxGeometry(
  width: number,
  height: number,
  depth: number,
  radius: number,
  segments = ROUNDED_SEGMENTS,
): RoundedBoxGeometry {
  return new RoundedBoxGeometry(width, height, depth, segments, radius);
}

// Mesh helper mirroring roomBuilders' box() signature so conversions from
// sharp boxes are mechanical: swap box(...) for roundedBox(..., r).
export function roundedBox(
  material: THREE.Material,
  w: number,
  h: number,
  d: number,
  radius: number,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    createRoundedBoxGeometry(w, h, d, radius),
    material,
  );
  mesh.position.set(x, y, z);
  return mesh;
}

// Lathe helper for turned shapes (mug, pots, lamp shade): profile points are
// [radius, y] pairs from bottom to top.
export function lathe(
  material: THREE.Material,
  profile: [number, number][],
  segments = 16,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const points = profile.map(([r, py]) => new THREE.Vector2(r, py));
  const mesh = new THREE.Mesh(
    new THREE.LatheGeometry(points, segments),
    material,
  );
  mesh.position.set(x, y, z);
  return mesh;
}

// Tube helper for cables: a Catmull-Rom curve through the given points.
export function cable(
  material: THREE.Material,
  points: [number, number, number][],
  radius = 0.008,
  tubularSegments = 24,
): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([px, py, pz]) => new THREE.Vector3(px, py, pz)),
  );
  return new THREE.Mesh(
    new THREE.TubeGeometry(curve, tubularSegments, radius, 6, false),
    material,
  );
}
