import * as THREE from "three";

export interface CompanionEvolutionOptions {
  accent: THREE.Color;
  levelTier: number;
  streakTier: number;
}

export interface CompanionEvolution {
  root: THREE.Group;
  leftFin?: THREE.Mesh;
  rightFin?: THREE.Mesh;
  orbitGroup?: THREE.Group;
  aura?: THREE.Mesh;
  evolutionMat: THREE.MeshStandardMaterial;
  auraMat?: THREE.MeshBasicMaterial;
  dispose: () => void;
}

export function createCompanionEvolution({
  accent,
  levelTier,
  streakTier,
}: CompanionEvolutionOptions): CompanionEvolution {
  const root = new THREE.Group();
  root.name = "CompanionEvolution";
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();

  const evolutionMat = new THREE.MeshStandardMaterial({
    color: accent.clone().multiplyScalar(0.92),
    emissive: accent,
    emissiveIntensity: 0.58,
    metalness: 0.18,
    roughness: 0.32,
  });
  evolutionMat.name = "Evolution_Accent_Runtime";
  materials.add(evolutionMat);

  let leftFin: THREE.Mesh | undefined;
  let rightFin: THREE.Mesh | undefined;
  let orbitGroup: THREE.Group | undefined;
  let aura: THREE.Mesh | undefined;
  let auraMat: THREE.MeshBasicMaterial | undefined;

  if (levelTier >= 1) {
    const finGeometry = new THREE.ConeGeometry(0.05, 0.24, 4);
    geometries.add(finGeometry);
    leftFin = new THREE.Mesh(finGeometry, evolutionMat);
    rightFin = new THREE.Mesh(finGeometry, evolutionMat);
    leftFin.name = "LeftEvolutionFin";
    rightFin.name = "RightEvolutionFin";
    leftFin.position.set(-0.5, 0.74, -0.08);
    rightFin.position.set(0.5, 0.74, -0.08);
    leftFin.rotation.set(0, 0, -0.9);
    rightFin.rotation.set(0, 0, 0.9);
    root.add(leftFin, rightFin);
  }

  if (levelTier >= 2) {
    orbitGroup = new THREE.Group();
    orbitGroup.name = "FocusNodeOrbit";
    orbitGroup.position.set(0, 0.78, -0.2);
    const nodeGeometry = new THREE.BoxGeometry(0.1, 0.024, 0.024);
    geometries.add(nodeGeometry);
    for (let index = 0; index < 3; index += 1) {
      const angle = (index / 3) * Math.PI * 2;
      const node = new THREE.Mesh(nodeGeometry, evolutionMat);
      node.position.set(Math.cos(angle) * 0.7, Math.sin(angle) * 0.7, 0);
      node.rotation.z = angle + Math.PI / 2;
      orbitGroup.add(node);
    }
    root.add(orbitGroup);
  }

  if (streakTier >= 1 || levelTier >= 3) {
    auraMat = new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      toneMapped: false,
    });
    auraMat.name = "Streak_Aura_Runtime";
    materials.add(auraMat);
    const auraGeometry = new THREE.TorusGeometry(
      0.73,
      0.012,
      6,
      36,
      Math.PI * 1.15
    );
    geometries.add(auraGeometry);
    aura = new THREE.Mesh(auraGeometry, auraMat);
    aura.name = "StreakAura";
    aura.position.set(0, 0.78, -0.18);
    root.add(aura);
  }

  return {
    root,
    leftFin,
    rightFin,
    orbitGroup,
    aura,
    evolutionMat,
    auraMat,
    dispose: () => {
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
    },
  };
}
