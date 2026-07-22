# Task 1 Report: Portable asset pipeline and signature model

## Outcome

Implemented a location-independent Blender asset generator, rebuilt the Dayly companion's authored shape language, generated hero and lite GLBs from one in-memory source, added a machine-readable asset manifest, and added a direct GLB contract/budget test. Internal face IDs remain stable while the display names are now Orbit, Focus, Pixel, Spark, and Rest; the default is `classic`.

## Files changed

- `assets/avatar/dayly-companion-build.py`
  - Uses `Path(__file__).resolve().parent` and creates output folders relative to the script.
  - Authors the seed/pear body, recessed rounded visor, tapered flippers, subdued feet/soles, broken Dayly Orbit, seed energy core, rear dial, and two-ring pod.
  - Retains all five `Face_*` groups and the required compatibility nodes, including an empty `ScreenPanel` rather than a duplicate visible panel.
  - Exports hero first, then applies lite-only decimation and excludes blush/secondary-catchlight nodes before exporting lite.
  - Parses each GLB JSON chunk after export, calculates active-face triangle counts and primitive/index totals, validates required nodes/file size/prohibited features, aborts on failure, and writes the manifest only after validation.
  - Produces front, three-quarter, side, rear, silhouette, unlit, and five face-style verification renders.
- `src/data/faceStyles.ts`
  - Preserves IDs and renames labels to Orbit, Focus, Pixel, Spark, and Rest.
  - Changes the default face from `joy` to `classic`.
- `src/components/3d/__tests__/companionAssetBudget.test.ts`
  - Reads GLB headers and JSON chunks directly with `readFileSync`.
  - Walks node descendants and accessors to calculate active-face triangle counts, primitive count, and index count.
  - Checks both assets against exact budgets, required nodes, zero prohibited features, and the generated manifest.
  - Checks the face labels and default.
- Generated/updated:
  - `assets/avatar/dayly-companion.blend`
  - `assets/avatar/dayly-companion.glb`
  - `assets/avatar/dayly-companion-lite.glb`
  - `assets/avatar/dayly-companion-preview.png`
  - `assets/avatar/dayly-companion-manifest.json`
  - `assets/avatar/review/front.png`
  - `assets/avatar/review/three-quarter.png`
  - `assets/avatar/review/side.png`
  - `assets/avatar/review/rear.png`
  - `assets/avatar/review/silhouette.png`
  - `assets/avatar/review/unlit.png`
  - `assets/avatar/face-variants/merged-check-{classic,eve,screen,kirby,joy}.png`

No runtime model loader or motion files were edited.

## TDD evidence

### RED

Command:

```text
npm test -- src/components/3d/__tests__/companionAssetBudget.test.ts
```

Result: exit 1, 1 failed file, 2 failed tests. The failures were expected and requirement-specific:

- missing `assets/avatar/dayly-companion-manifest.json`/lite asset pipeline;
- `DEFAULT_FACE_STYLE` was `joy` instead of `classic` (legacy labels were also still present).

### GREEN

Command:

```text
npm test -- src/components/3d/__tests__/companionAssetBudget.test.ts
```

Result: exit 0, 1 passed file, 2 passed tests.

## Blender rebuild and visual review

All rebuilds used:

```text
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python assets/avatar/dayly-companion-build.py
```

### Iteration 1

Build completed and budgets passed at 394,304 hero bytes / 10,224 max active hero triangles and 245,720 lite bytes / 6,298 max active lite triangles.

Full-size review of front, three-quarter, side, rear, silhouette, unlit, and all five faces found that world-authored child transforms were being interpreted locally. The visible symptoms were a detached visor rim, floating catchlights/beads, absent pupils, displaced soles, and an incorrect bezel. The body mass, rear dial, flipper taper, platform footprint, and broken orbit concept were otherwise readable.

### Iteration 2

Changed parenting to preserve world transforms and improved the unlit render by temporarily mapping each production material's base colour into emission. The rebuild completed at 395,984 hero bytes and 245,464 lite bytes.

The detached shared masses were fixed. Face review then revealed a Blender dependency-graph edge case: manually linked curves and rounded boxes had stale matrices at parenting time. Focus lost its narrow scale; Pixel/Spark geometry fell back toward identity transforms. This was not accepted as a visual pass.

### Iteration 3

Forced a dependency-graph update before every world-preserving parent operation. The rebuild completed at 399,360 hero bytes and 248,408 lite bytes. Full-size review confirmed pupils/catchlights, Focus eye scale, Pixel tiles, Spark crescents, Rest arcs, bezel, rim, soles, and orbit beads were correctly placed.

Reviewer feedback then identified that the visor still read too wide/planar and the feet/soles looked too much like shiny shoes. The reviewer explicitly requested a smaller, softer, deeper visor and smaller/flatter/darker feet, superseding those first-pass visible proportions.

### Iteration 4 (final)

Reduced the visible face panel to `0.86 × 0.065 × 0.42` at `y=-0.476`, the rim to `0.92 × 0.055 × 0.48` at `y=-0.458`, increased both to six bevel segments with stronger corner falloff, and pulled all face marks back to the new shallow surface. Reduced the feet to radius `0.145`, flattened their scale to `(0.96, 0.72, 0.42)`, and changed the smaller soles to the rough platform material.

The final full-size review confirmed:

- the pear body frames the visor on the top, bottom, and sides;
- the three-quarter/side profile has a shallow curved visor transition rather than a detached slab;
- the feet are low-contrast grounding shapes rather than shoes;
- no visible visor intersection, z-fighting, blank rear, pod/foot clipping artifact, or accessory-envelope breach;
- every face render retains the same orbit, core, and two platform rings. In particular, the final `merged-check-eve.png` regenerated after the dependency-graph fix and contains all shared accents;
- Focus remains mouthless with narrow orbit eyes; Spark has compact crescent pupils and a micro status mouth with no tongue/open-mouth geometry;
- the silhouette, rear dial, face marks, and orbit remain legible in separately generated 64 × 64 inspection copies.

## Final asset budgets

| Asset | Bytes | Primitive count | Index count | Max active-face triangles | Textures | Skins | Animations |
|---|---:|---:|---:|---:|---:|---:|---:|
| Hero | 402,564 / 700,000 | 66 | 47,388 | 10,544 / 15,000 | 0 | 0 | 0 |
| Lite | 249,176 / 450,000 | 50 | 27,564 | 6,482 / 7,000 | 0 | 0 | 0 |

Hero active triangles by face:

- Classic: 10,212
- Eve: 10,036
- Screen: 9,704
- Kirby: 10,544
- Joy: 9,716

Lite active triangles by face:

- Classic: 6,132
- Eve: 5,956
- Screen: 5,862
- Kirby: 6,482
- Joy: 6,116

Both GLBs contain every required name: `Body`, `Body_Charcoal`, `FacePanel`, `VisorRim`, `LeftEye`, `RightEye`, `VisorLip`, `HaloCharm`, `EnergyCore`, `LeftFlipper`, `RightFlipper`, and all five `Face_*` groups.

## Final verification

- `npm run typecheck`: exit 0.
- `npm run lint`: exit 0, no warnings.
- `npm test`: exit 0, 19 test files and 84 tests passed.
- Final Blender rebuild: exit 0; all 12 render outputs, `.blend`, both GLBs, and manifest regenerated; budget validation passed inside Blender.
- Targeted asset test: exit 0, 2/2 tests passed.

## Self-review

- Confirmed only Task 1 source, generated assets, face display metadata, and contract test were changed.
- Confirmed no derivative character comments or `KirbyTongue` geometry remain in the generator/GLBs.
- Confirmed the duplicate Screen panel is now an empty compatibility node.
- Confirmed hero export happens before any lite mutation.
- Confirmed lite removes all names containing `Blush` or `Catchlight2` while preserving the required rig contract.
- Confirmed required names and metrics are independently recalculated by both the Blender generator and Vitest rather than trusting the manifest.
- Confirmed final GLB file sizes are less than half of their original 974,376-byte hero predecessor and comfortably inside the requested budgets.

## Concerns / notes

- The final visible visor and foot proportions intentionally differ from the originally locked first-pass dimensions because the reviewer explicitly requested a smaller/recessed face and smaller/flatter feet after inspecting the generated renders. All names, face envelope constraints, asset contracts, body/orbit/platform measurements, and performance budgets remain intact.
- Blender 5.1 prints deprecation warnings for `Material.use_nodes` and `World.use_nodes`; these are warnings only, the process exits 0, and the APIs remain functional in the installed Blender version.
