import * as THREE from "three";
import { createCompanionEvolution } from "./companionEvolution";
import type { CompanionInstance, CompanionOptions } from "./companionModel";

const TWO_PI = Math.PI * 2;

// A scene-native version of the Dayly companion for immersive environments.
// It mirrors the authored GLB silhouette and exposes the same motion rig, but
// avoids parsing a second GLB into another Expo GL context on iOS.
export function createProceduralCompanion({
  accent,
  bodyColor,
  levelTier,
  streakTier,
}: CompanionOptions): CompanionInstance {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();

  const material = (params: THREE.MeshStandardMaterialParameters) => {
    const value = new THREE.MeshStandardMaterial(params);
    materials.add(value);
    return value;
  };
  const mesh = (geometry: THREE.BufferGeometry, mat: THREE.Material) => {
    geometries.add(geometry);
    return new THREE.Mesh(geometry, mat);
  };

  const bodyMat = material({
    color: new THREE.Color(bodyColor),
    roughness: 0.44,
    metalness: 0.08,
  });
  const darkMat = material({ color: 0x17171a, roughness: 0.48, metalness: 0.16 });
  const faceMat = material({ color: 0x08090c, roughness: 0.2, metalness: 0.3 });
  const browMat = material({ color: 0x5d554f, roughness: 0.58, metalness: 0.08 });
  const eyeMat = material({
    color: 0xffe3bd,
    emissive: 0xffbd78,
    emissiveIntensity: 1.05,
    roughness: 0.36,
  });
  const accentMat = material({
    color: accent,
    emissive: accent,
    emissiveIntensity: 1.05,
    roughness: 0.35,
  });
  const coreMat = material({
    color: accent,
    emissive: accent,
    emissiveIntensity: 0.9,
    roughness: 0.3,
  });
  const mouthMat = material({
    color: 0xffd6ad,
    emissive: 0xd97757,
    emissiveIntensity: 0.58,
    roughness: 0.42,
  });
  const podMat = material({ color: 0x202024, roughness: 0.7, metalness: 0.12 });

  const root = new THREE.Group();
  const petGroup = new THREE.Group();

  const body = mesh(new THREE.SphereGeometry(0.55, 26, 20), bodyMat);
  body.scale.set(1, 1.1, 0.95);
  body.position.y = 0.64;

  const lowerBody = mesh(
    new THREE.SphereGeometry(0.555, 24, 14, 0, TWO_PI, Math.PI * 0.54, Math.PI * 0.46),
    darkMat
  );
  lowerBody.scale.set(1, 1.1, 0.95);
  lowerBody.position.y = 0.64;

  const seam = mesh(new THREE.TorusGeometry(0.548, 0.009, 8, 40), darkMat);
  seam.rotation.x = Math.PI / 2;
  seam.scale.z = 0.95;
  seam.position.y = 0.54;

  const face = mesh(new THREE.SphereGeometry(0.405, 22, 16), faceMat);
  face.scale.set(0.96, 0.57, 0.12);
  face.position.set(0, 0.82, 0.5);

  const eyeGeometry = new THREE.SphereGeometry(0.095, 14, 10);
  geometries.add(eyeGeometry);
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMat);
  leftEye.scale.set(1, 1.25, 0.48);
  leftEye.position.set(-0.17, 0.84, 0.535);
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMat);
  rightEye.scale.copy(leftEye.scale);
  rightEye.position.set(0.17, 0.84, 0.535);
  for (const eye of [leftEye, rightEye]) {
    eye.userData.baseScale = eye.scale.clone();
  }

  const pupilGeometry = new THREE.SphereGeometry(0.036, 12, 8);
  geometries.add(pupilGeometry);
  const leftPupil = new THREE.Mesh(pupilGeometry, faceMat);
  leftPupil.scale.set(0.82, 1.08, 0.38);
  leftPupil.position.set(-0.17, 0.84, 0.581);
  const rightPupil = new THREE.Mesh(pupilGeometry, faceMat);
  rightPupil.scale.copy(leftPupil.scale);
  rightPupil.position.set(0.17, 0.84, 0.581);
  for (const pupil of [leftPupil, rightPupil]) {
    pupil.userData.basePosition = pupil.position.clone();
  }

  const browGeometry = new THREE.BoxGeometry(0.115, 0.016, 0.018);
  geometries.add(browGeometry);
  const leftBrow = new THREE.Mesh(browGeometry, browMat);
  leftBrow.position.set(-0.17, 0.965, 0.558);
  leftBrow.rotation.z = 0.04;
  const rightBrow = new THREE.Mesh(browGeometry, browMat);
  rightBrow.position.set(0.17, 0.965, 0.558);
  rightBrow.rotation.z = -0.04;
  for (const brow of [leftBrow, rightBrow]) {
    brow.userData.baseY = brow.position.y;
    brow.userData.baseRotationZ = brow.rotation.z;
  }

  const mouth = mesh(
    new THREE.TorusGeometry(0.075, 0.009, 7, 18, Math.PI),
    mouthMat
  );
  mouth.position.set(0, 0.675, 0.558);
  mouth.rotation.z = Math.PI;
  mouth.scale.set(1, 0.62, 1);
  mouth.userData.baseScale = mouth.scale.clone();

  const core = mesh(new THREE.SphereGeometry(0.064, 14, 10), coreMat);
  core.position.set(0, 0.37, 0.47);
  const coreFrame = mesh(new THREE.TorusGeometry(0.087, 0.012, 8, 24), darkMat);
  coreFrame.position.set(0, 0.37, 0.477);
  coreFrame.rotation.x = -0.22;

  const flipperGeometry = new THREE.SphereGeometry(0.3, 14, 10);
  geometries.add(flipperGeometry);
  const leftFlipper = new THREE.Mesh(flipperGeometry, bodyMat);
  leftFlipper.scale.set(0.28, 0.62, 0.4);
  leftFlipper.position.set(-0.54, 0.52, 0);
  leftFlipper.rotation.z = 0.25;
  leftFlipper.userData.baseRotationZ = leftFlipper.rotation.z;
  const rightFlipper = new THREE.Mesh(flipperGeometry, bodyMat);
  rightFlipper.scale.copy(leftFlipper.scale);
  rightFlipper.position.set(0.54, 0.52, 0);
  rightFlipper.rotation.z = -0.25;
  rightFlipper.userData.baseRotationZ = rightFlipper.rotation.z;

  const leftFoot = mesh(new THREE.SphereGeometry(0.17, 14, 10), darkMat);
  leftFoot.scale.set(1, 0.45, 1.25);
  leftFoot.position.set(-0.22, 0.08, 0.2);
  const rightFoot = mesh(new THREE.SphereGeometry(0.17, 14, 10), darkMat);
  rightFoot.scale.copy(leftFoot.scale);
  rightFoot.position.set(0.22, 0.08, 0.2);

  const halo = mesh(new THREE.TorusGeometry(0.13, 0.019, 9, 28), accentMat);
  halo.position.set(0, 1.43, 0);
  halo.rotation.set(1.05, 0.12, -0.16);
  if (levelTier >= 3) halo.scale.setScalar(1.25);

  // A quiet rear signature makes the 360-degree customisation view feel
  // authored without pushing the companion back toward a generic robot.
  const rearSeam = mesh(new THREE.RingGeometry(0.14, 0.17, 24), darkMat);
  rearSeam.position.set(0, 0.7, -0.526);
  rearSeam.rotation.y = Math.PI;
  const rearEnergy = mesh(new THREE.BoxGeometry(0.17, 0.025, 0.018), accentMat);
  rearEnergy.position.set(0, 0.7, -0.54);
  const haloMount = mesh(
    new THREE.CylinderGeometry(0.045, 0.06, 0.1, 12),
    darkMat
  );
  haloMount.position.set(0, 1.31, -0.03);

  petGroup.add(
    body,
    lowerBody,
    seam,
    face,
    leftEye,
    rightEye,
    leftPupil,
    rightPupil,
    leftBrow,
    rightBrow,
    mouth,
    core,
    coreFrame,
    leftFlipper,
    rightFlipper,
    leftFoot,
    rightFoot,
    halo,
    rearSeam,
    rearEnergy,
    haloMount
  );

  const podBase = mesh(new THREE.CylinderGeometry(0.8, 0.86, 0.08, 28), podMat);
  podBase.position.y = 0.04;
  const podTop = mesh(new THREE.CylinderGeometry(0.63, 0.7, 0.07, 28), darkMat);
  podTop.position.y = 0.105;
  const ring = mesh(new THREE.TorusGeometry(0.7, 0.014, 8, 40), accentMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.142;
  root.add(podBase, podTop, ring);

  const evolution = createCompanionEvolution({ accent, levelTier, streakTier });
  petGroup.add(evolution.root);

  return {
    root,
    rig: {
      petGroup,
      leftEye,
      rightEye,
      leftPupil,
      rightPupil,
      leftBrow,
      rightBrow,
      mouth,
      leftFlipper,
      rightFlipper,
      halo,
      leftFin: evolution.leftFin,
      rightFin: evolution.rightFin,
      orbitGroup: evolution.orbitGroup,
      aura: evolution.aura,
      eyeMat,
      mouthMat,
      coreMat,
      accentMat,
      evolutionMat: evolution.evolutionMat,
      auraMat: evolution.auraMat,
    },
    dispose: () => {
      evolution.dispose();
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((value) => value.dispose());
    },
  };
}
