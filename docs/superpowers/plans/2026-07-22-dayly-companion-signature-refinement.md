# Dayly Companion Signature Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver an original, premium, performant Dayly companion with a signature silhouette, responsive five-style face rig, authored one-shot state animation, and verified hero/lite mobile assets.

**Architecture:** The Blender Python generator remains the only editable 3D source and emits hero/lite GLBs plus review renders and an asset manifest. The Three.js layer loads the appropriate detail asset, prunes inactive faces before cloning context-owned resources, resolves semantic face roles, and drives both lit and unlit-compatible motion from the existing avatar state API.

**Tech Stack:** Blender Python/bmesh, glTF 2.0/GLB, Three.js 0.166, expo-three/expo-gl, React Native/Expo 54, TypeScript, Vitest.

## Global Constraints

- No new runtime dependencies or external 3D models.
- Keep `MeshBasicMaterial`/`MeshStandardMaterial` compatibility; do not use physical-material shader features.
- Preserve `LeftEye`, `RightEye`, `VisorLip`, `HaloCharm`, `EnergyCore`, `LeftFlipper`, `RightFlipper`, `Body_Charcoal`, and all five `Face_*` groups.
- Hero active-face geometry is at most 15,000 triangles and 700 KB; lite is at most 7,000 triangles and 450 KB; both contain zero textures, skins, and animation clips.
- Preserve `AvatarRendererProps`, `AvatarState`, equipment IDs, progression calculations, fallback behavior, and valid persisted face IDs.
- Dashboard/shop use hero; study room uses lite. Both share dimensions, origin, rig names, pod footprint, and cosmetic envelope.
- Follow test-first red/green cycles for TypeScript behavior; visual Blender edits require two rebuild-and-review iterations.

---

### Task 1: Portable asset pipeline and signature model

**Files:**
- Modify: `assets/avatar/dayly-companion-build.py`
- Modify: `src/data/faceStyles.ts`
- Create: `src/components/3d/__tests__/companionAssetBudget.test.ts`
- Generate: `assets/avatar/dayly-companion.blend`, `assets/avatar/dayly-companion.glb`, `assets/avatar/dayly-companion-lite.glb`, `assets/avatar/dayly-companion-preview.png`, `assets/avatar/dayly-companion-manifest.json`, `assets/avatar/review/*.png`, `assets/avatar/face-variants/merged-check-*.png`

**Interfaces:**
- Produces two GLBs with identical required-node contracts and a JSON manifest containing per-face active triangles, file bytes, primitive count, required names, and prohibited feature counts.
- Preserves internal face IDs; changes display labels to `Orbit`, `Focus`, `Pixel`, `Spark`, `Rest`; default becomes `classic`.

- [ ] **Step 1: Write the failing asset-contract test**

Create a Vitest test that reads both GLB JSON chunks directly using `readFileSync`, verifies `dayly-companion-lite.glb` exists, collects node names and primitive/index counts, and asserts the exact global budgets and node contract. Also assert `DEFAULT_FACE_STYLE === "classic"` and the five display labels above.

```ts
expect(hero.bytes).toBeLessThanOrEqual(700_000);
expect(lite.bytes).toBeLessThanOrEqual(450_000);
expect(Math.max(...Object.values(hero.activeTriangles))).toBeLessThanOrEqual(15_000);
expect(Math.max(...Object.values(lite.activeTriangles))).toBeLessThanOrEqual(7_000);
expect(hero.textures + hero.skins + hero.animations).toBe(0);
expect(lite.requiredNames).toEqual(expect.arrayContaining(REQUIRED_PET_NODES));
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/components/3d/__tests__/companionAssetBudget.test.ts`

Expected: FAIL because the lite GLB/manifest do not exist, the hero exceeds the budget, and the legacy labels/default remain.

- [ ] **Step 3: Make the generator portable and enforce budgets**

Replace the hard-coded output directory with:

```py
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent
REVIEW_DIR = OUT_DIR / "review"
REVIEW_DIR.mkdir(parents=True, exist_ok=True)
```

Add triangle-count, descendant, active-face, required-name, file-size, and JSON-manifest helpers. Export hero before applying lite-only reductions; export lite from the same in-memory source while excluding sub-pixel blush/secondary-catchlight nodes. Abort the Blender process when any target budget or required name fails.

- [ ] **Step 4: Implement the authored shape language**

Use these locked values:

- Body scale `(1.00, 0.90, 1.02)`, center `z=.62`, forward lean `3°`, seed taper `x=1-.10*t-.02*t*t`, `y=1-.05*t`, flattened lower cap.
- Shallow beveled-squircle `FacePanel` `0.86×0.065×0.42` at `(0,-.476,.82)` and `VisorRim` `0.92×0.055×0.48` at `(0,-.458,.82)`, with 6 bevel segments and `.32` corner falloff; remove the duplicate visible screen panel while retaining the compatibility node.
- Flippers at `(±.54,-.08,.44)`, scale `(.23,.30,.52)`, yaw `±.50`; feet at `(±.25,-.07,.140)`, radius `.145`, scale `(.96,.72,.42)`, yaw `±.12`, with rough dark soles of radius `.120`, center `z=.104`, and scale `(.82,.62,.12)`.
- Broken 318° `HaloCharm` orbit at `z=1.31`, major/minor radii `.155/.010`, 42° right-side gap, endpoint beads `.030/.014`.
- Seed-shaped `EnergyCore`; `BackDial` dark ring and `BackDialTick` accent mark centered on the rear at `(0,+.49,.70)`.
- Platform radii remain `.80/.62`; ring minor radii reduce to `.008/.005`.
- Face feature envelope stays inside `x ±.31`, `z .68–.95`; all styles share eye centers near `x ±.18`, `z .835`, use at most one `.012` primary and one `.005` secondary catchlight, and blush no larger than `.025`.

Keep the `Face_Eve`/`Face_Kirby` internal groups for migration compatibility but remove derivative comments and geometry: Focus uses narrow orbit eyes; Spark uses compact crescent pupils and a micro status mouth rather than tongue/open-anime-mouth geometry.

- [ ] **Step 5: Rebuild visual iteration one and inspect**

Run:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python assets/avatar/dayly-companion-build.py
```

Inspect front, three-quarter, side, rear, silhouette, unlit, and all five face renders. Confirm no visor intersection, z-fighting, blank rear, pod/foot intersection, or accessory-envelope breach.

- [ ] **Step 6: Make a second visual adjustment pass and rebuild**

Correct any silhouette, value hierarchy, face spacing, or clipping issue found in iteration one, rebuild with the same command, and re-inspect every review render at full size and 64 px.

- [ ] **Step 7: Verify GREEN and commit**

Run: `npm test -- src/components/3d/__tests__/companionAssetBudget.test.ts`

Expected: PASS with both assets under budget and every required node present.

Commit: `feat: establish signature companion model assets`

---

### Task 2: Context-safe hero/lite loading and full face rig

**Files:**
- Modify: `src/components/3d/companionModel.ts`
- Modify: `src/components/avatar/Avatar3D.tsx`
- Modify: `src/components/room/StudyRoomScene.tsx`
- Create: `src/components/3d/__tests__/companionModel.test.ts`

**Interfaces:**
- Produces `type CompanionDetail = "hero" | "lite"` and `loadCompanion(detail?: CompanionDetail): Promise<THREE.Group>`.
- Adds `detail: CompanionDetail` to internal `CompanionOptions`; screen-facing avatar interfaces remain unchanged.
- Produces a style-role resolver mapping each `FaceStyle` to eye/pupil/mouth node names and motion-profile values.

- [ ] **Step 1: Write failing model-construction tests**

Build synthetic source graphs containing multi-material `Body`, shared materials/geometries, all five face groups, required shared nodes, and style-specific semantic nodes. Assert:

```ts
expect(instance.rig.leftEye?.name).toBe(profile.leftEye);
expect(instance.rig.leftPupil?.name).toBe(profile.leftPupil);
expect(instance.rig.mouth?.name).toBe(profile.mouth);
expect(bodyMaterials[0].color.getHexString()).toBe(expectedBodyHex);
expect(bodyMaterials[1].color.getHexString()).toBe(sourceDarkHex);
expect(sourceBody.material).toBe(sourceMaterials); // source stays immutable
```

Also assert inactive faces are removed before disposable cloning, two instances do not share disposable geometry/materials, shared resources stay shared within one instance, and missing required semantic nodes throw a descriptive contract error.

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test -- src/components/3d/__tests__/companionModel.test.ts`

Expected: FAIL because detail loading, full role mapping, contract validation, multi-material tinting, and pre-clone pruning are absent.

- [ ] **Step 3: Implement per-detail source caching and pre-clone pruning**

Use separate module promises keyed by detail and static requires for the hero/lite GLBs. Clone the object hierarchy, prune inactive `Face_*` groups, then traverse the retained graph to clone geometry/material resources using source-object maps. Dispose each owned resource exactly once.

- [ ] **Step 4: Implement safe material conversion and hierarchy**

Copy `side`, `alphaTest`, `blending`, `transparent`, `opacity`, `depthTest`, `depthWrite`, and `vertexColors` into `MeshBasicMaterial`; never force `DoubleSide`. Cache source-material conversions so multi-material `Body` arrays keep the dark base and tint every `Body_Charcoal` slot. Create independent cached Basic materials for core, orbit, face marks, platform ring, and inner ring with brightness multipliers `1.00`, `.82`, `.72`, `.45`, `.25`.

- [ ] **Step 5: Resolve all five semantic face rigs**

Add a `FACE_RIG_NODES` record for classic/eve/screen/kirby/joy, resolve the active style after pruning, store base scale/position/rotation in `userData`, and attach motion-profile values for focus/reward/level-up. Joy has no conventional blink; Focus intentionally has no mouth.

- [ ] **Step 6: Wire hero and lite callers plus room render fallback**

Use `loadCompanion("hero")` in `Avatar3D` and `loadCompanion("lite")` in `StudyRoomScene`. Wrap the room render callback with the same `renderFailed` guard/try-catch used by `Avatar3D`, set fallback state on failure, and release constructed resources.

- [ ] **Step 7: Verify GREEN and commit**

Run:

```bash
npm test -- src/components/3d/__tests__/companionModel.test.ts src/components/3d/__tests__/companionAssetBudget.test.ts
npm run typecheck
```

Expected: all selected tests and typecheck PASS.

Commit: `feat: add context-safe companion detail assets`

---

### Task 3: Authored state transitions and unlit-responsive energy

**Files:**
- Modify: `src/components/3d/companionModel.ts`
- Modify: `src/components/3d/petMotion.ts`
- Modify: `src/components/3d/companionEvolution.ts`
- Modify: `src/components/3d/__tests__/companionModel.test.ts`
- Modify: `src/components/3d/__tests__/petMotion.test.ts`
- Modify: `src/components/3d/__tests__/companionEvolution.test.ts`

**Interfaces:**
- Keeps `createPetMotionController`, `PetRig`, and every caller signature unchanged.
- Internally tracks previous state, `stateEnteredAt`, integrated halo/orbit angles, and one-shot clip age.

- [ ] **Step 1: Add failing timeline and material tests**

Add tests proving equal state ages produce equal transforms at absolute times 1 and 101; reward crouches at 80 ms, peaks at 350 ms, lands at 580 ms, rests by 1.10 s, and does not bounce again at 2.6 s; level-up performs one turn and is stable from 1.80–5.00 s; Basic-material colours brighten without material replacement; reduced motion stays within Y `base+.037…base+.045`, rotation `±.01`, scale `.99…1.01`; and every face profile matches the exact authored ratios in Step 5.

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test -- src/components/3d/__tests__/petMotion.test.ts src/components/3d/__tests__/companionEvolution.test.ts`

Expected: FAIL on phase independence, one-shot timelines, Basic-material feedback, and reduced-motion bounds.

- [ ] **Step 3: Implement allocation-free easing and state entry**

Add module-level `smoothstep`, `easeOutCubic`, and `easeInOutCubic`. On state changes record entry time and blend posture without resetting the shared ambient clock. Integrate halo/orbit angles from delta time so speed changes do not snap.

- [ ] **Step 4: Implement locked state clips**

- Idle: hover `.018` over `3.8s`, breath `.008` over `5.2s`, yaw `.055rad` over `8.4s`, settle `720ms`.
- Focus: `400ms` entry with `4%` overshoot and `120ms` settle; hover `.010` over `4.8s`; no yaw/dart; core pulse `1.85s`.
- Reward: `1.10s` clip with `.15` lift and anticipation/landing/rebound timing from Step 1, then proud idle; suppress reaction bounce while the clip owns root motion.
- Level-up: `1.80s` clip with `.19` lift and exactly one `2π` turn from `180–1080ms`, then elevated idle.
- Reduced motion: no spin/jump/squash/dart/settle/nod/wave/fin/orbit motion; use a `160ms` expression/colour transition. Keep root displacement within `.005`, rotation within `.01rad`, and every scale component within `.99…1.01`.

- [ ] **Step 5: Make Basic and Standard materials responsive**

Cache each Basic material's base colour once in `userData` and copy/multiply that stored colour per frame without allocating. Keep emissive-intensity behavior for Standard materials. Apply these profile ratios to authored base transforms:

| Face | Blink Y | Focus eye Y | Reward eye Y | Level-up eye Y | Focus/reward/level-up mouth Y |
|---|---:|---:|---:|---:|---:|
| Orbit / `classic` | `.10` | `.70` | `.84` | `1.14` | preserve current authored profile |
| Focus / `eve` | `.08` | `.72` | `.90` | `1.10` | none |
| Pixel / `screen` | `.12` | `.58` | `.78` | `1.18` | `.45 / 1.40 / 1.70` |
| Spark / `kirby` | `.08` | `.68` | `.88` | `1.12` | `.30 / 1.12 / 1.28` |
| Rest / `joy` | none | `.82` | `1.08` | `1.16` | preserve current authored profile |

- [ ] **Step 6: Strengthen tier-three silhouette**

At tier 3, scale fins `1.15`, move them `.03` outward, keep orbit nodes, scale aura `1.10`, and keep tier-three aura at least `.10` opacity. Streak-only aura below tier 3 stays at `.94` scale and at most `.09` opacity.

- [ ] **Step 7: Verify GREEN and commit**

Run:

```bash
npm test -- src/components/3d/__tests__/petMotion.test.ts src/components/3d/__tests__/companionEvolution.test.ts src/components/3d/__tests__/companionModel.test.ts
npm run typecheck
```

Expected: all selected tests and typecheck PASS.

Commit: `feat: author companion state game feel`

---

### Task 4: Preserve the study-room composition while reducing draw calls

**Files:**
- Modify: `src/components/room/roomBuilders.ts`
- Create: `src/components/room/__tests__/roomPerformance.test.ts`

**Interfaces:**
- Keeps `buildStudyRoom` and every caller unchanged.
- Adds five private, named `THREE.InstancedMesh` clusters for exact-repeat decor only.

- [ ] **Step 1: Write the failing room-performance tests**

Build the canonical tier-two room and assert the five clusters are instanced with counts `7`, `3`, `4`, `3`, and `9`; logical visual count remains exactly `104`; physical renderables are at most `85`; representative bulb, star, foliage, and desk-leg transforms retain their authored positions/scales/rotations; and instance plus geometry resources dispose exactly once.

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/components/room/__tests__/roomPerformance.test.ts`

Expected: FAIL because the current room uses 104 separate meshes and the named instance clusters do not exist.

- [ ] **Step 3: Add an aggregate-bounds-safe instance helper**

Create a private helper that receives geometry, material, stable name, and transforms; fills one `THREE.InstancedMesh` with a reused transform object; marks `instanceMatrix.needsUpdate`; computes aggregate bounding box/sphere; and leaves frustum culling enabled.

- [ ] **Step 4: Batch only exact visual repeats**

Convert floor seams, window stars, desk legs, floor-plant foliage, and string bulbs to stable named clusters. Preserve parent animation for foliage and preserve `starMat`/`stringMat` identity. Do not batch books, pins, steam, or other deliberately varied pieces.

- [ ] **Step 5: Preserve clean setup and teardown**

Conditionally pass only defined `MeshBasicMaterial` options to avoid mount-time warnings. During `room.dispose()`, call `dispose()` on every `InstancedMesh` before the existing deduplicated geometry/material disposal so GPU instance attributes and shared resources are each released exactly once.

- [ ] **Step 6: Verify GREEN and commit**

Run:

```bash
npm test -- src/components/room/__tests__/roomPerformance.test.ts src/components/room/__tests__
npm run typecheck
```

Expected: all room tests and typecheck PASS; canonical room retains `104` logical visuals with at most `85` physical renderables.

Commit: `perf: batch repeated study room decor`

---

### Task 5: Presentation, framing, and whole-branch verification

**Files:**
- Modify: `src/components/avatar/Avatar3D.tsx`
- Modify: `src/components/3d/__tests__/sceneInteraction.test.ts`
- Modify: `docs/avatar-architecture.md`
- Modify generated assets only if final on-device/runtime-parity review exposes a defect.

**Interfaces:**
- Keeps drag/orbit APIs unchanged; hero home composition uses an initial 10° azimuth while remaining user-rotatable.

- [ ] **Step 1: Write the failing home-composition test**

Assert `initialAzimuth = 10°` places the camera at the corresponding X/Z position, returns to that home after interaction, and keeps authored bounds inside portrait/square NDC safety margins.

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/components/3d/__tests__/sceneInteraction.test.ts`

Expected: FAIL until the hero caller supplies the authored initial azimuth and framing assertions are implemented.

- [ ] **Step 3: Apply the presentation framing and document the asset contract**

Set the dashboard/shop hero orbit home to `(10 * Math.PI) / 180`; retain 360° shop drag and dashboard clamps. Document hero/lite selection, required node names, Basic-material conversion, generator command, budget manifest, and visual-review artifact locations.

- [ ] **Step 4: Run complete automated verification**

Run freshly:

```bash
npm test
npm run typecheck
npm run lint
```

Expected: 0 failed tests, type errors, or lint errors.

- [ ] **Step 5: Rebuild and verify generated artifacts**

Run Blender from the branch, confirm fresh hero/lite timestamps, re-run the asset-budget test, inspect front/three-quarter/side/rear/silhouette/unlit renders, and confirm the two visual iterations remain represented by the final source and outputs.

- [ ] **Step 6: Verify the Expo iOS bundle**

Start Expo on port 8090, request the iOS router entry bundle with a 300-second timeout, require HTTP 200, require no `ERROR` lines in the Metro log, and always terminate that server.

- [ ] **Step 7: Review and commit**

Run `git diff --check`, inspect `git status`, review the complete branch diff against the design spec, and commit:

`docs: document refined companion pipeline`
