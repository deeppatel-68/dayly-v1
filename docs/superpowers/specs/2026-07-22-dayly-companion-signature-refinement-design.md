# Dayly Companion Signature Refinement Design

## Summary

Refine the latest generated Dayly companion into an original, premium game mascot whose silhouette, expression, progression, and mobile presentation remain legible without relying on Blender-only reflections. The work keeps the existing lightweight Blender → GLB → Three.js/Expo GL pipeline, all avatar states, cosmetics, progression tiers, reduced-motion support, and fallback behavior.

The refinement is an evolution of `feat/friends-leaderboard`, not a new character system. The generated source remains `assets/avatar/dayly-companion-build.py`; generated `.blend`, `.glb`, preview, turnaround, and budget-manifest artifacts are rebuilt from that script.

## Art Direction

- Strengthen the body into a soft seed/pear silhouette with a weighted lower mass, subtly flattened base, gentle forward intent, and recognizable side/rear views.
- Recess the visor into the body, reduce its projection, and integrate the rim as a moulded transition rather than a second bubble. The render-reviewed final panel is `0.86 × 0.065 × 0.42` at `(0, -0.476, 0.82)` and its rim is `0.92 × 0.055 × 0.48` at `(0, -0.458, 0.82)`, using six bevel segments and `0.32` corner falloff.
- Blend tapered flippers into the body and reduce/reposition the feet so they read as planted appendages instead of pod geometry. The render-reviewed final feet use radius `0.145`, center `(±0.25, -0.07, 0.140)`, scale `(0.96, 0.72, 0.42)`, and yaw `±0.12`; their rough dark soles use radius `0.120`, center `z=0.104`, and scale `(0.82, 0.62, 0.12)`.
- Replace the complete circular halo with an asymmetric broken `Dayly Orbit`: a tilted arc with unequal endpoint beads and a deliberate gap that remains recognizable during animation.
- Turn the chest light into a vertical seed/energy mark with a restrained bezel. Add a quiet rear energy signature that makes the 360-degree shop view authored without competing with the face.
- Use a strict light hierarchy: energy core brightest, orbit secondary, pod channel tertiary. Body surfaces stay matte and the visor stays the only glossy mass in Blender previews.
- Preserve the internal face IDs and `Face_*` nodes for stored-user and rig compatibility, but rename the user-facing styles to `Orbit`, `Focus`, `Pixel`, `Spark`, and `Rest`. Redesign the five styles as one family sharing scale, spacing, glow, and state readability; remove the open-mouth/tongue and oversized anime-eye cues that make variants feel borrowed.

## Runtime and Interaction Design

- Generate separate `hero` and `lite` GLBs from the same Blender source and expose `detail: "hero" | "lite"` through the internal companion loader/options. Hero is used for dashboard/shop presentation; lite is used when the companion is small inside the study room. Both assets retain identical origin, dimensions, face groups, rig names, equipment envelope, pod footprint, and active state behavior.
- Lite removes sub-pixel blush/secondary catchlight details and uses reduced geometry rather than retaining a hidden hero mesh. Hero and lite both retain the active face, body silhouette, core, orbit, rear signature, progression geometry, and cosmetics.
- Reorder instance construction so unused face groups are removed before disposable resources are cloned. Preserve shared geometry/material relationships within an instance while keeping every GL context isolated and the cached parsed GLBs immutable.
- Bind semantic eye, pupil, and mouth roles for every face style so focus, reward, level-up, blinking, and mood motion do not silently degrade outside the classic style.
- Preserve multi-material meshes during Expo-safe conversion, including tinting the body material slot without altering the stable dark base. Retain material side/depth/alpha/vertex-colour properties and keep texture count at zero.
- Give core, orbit, face marks, platform ring, and inner ring independent runtime Basic materials. Animate cached Basic-material colours and glow-sprite opacity allocation-free so the visual hierarchy still responds after PBR conversion.
- Preserve `AvatarRendererProps`, `AvatarState`, progression calculations, equipment IDs, and screen-level APIs. The only new internal interface is the detail option.
- Keep the render loop allocation-free, 30 fps capped, context-safe, texture-light, and compatible with `MeshBasicMaterial`/`MeshStandardMaterial` only.

## Motion and Progression

- Idle emphasizes grounded breathing and occasional weight transfer rather than constant weightless hovering. Orbit lag, eye darts, and rare settles provide secondary life.
- Focus uses a lower, steadier pose, tucked flippers, forward-aligned orbit, narrowed eyes, and a controlled quicker core pulse.
- Reward is a one-shot 1.10-second anticipation → hop → landing → rebound → settle sequence; it must not loop continuously while the state remains active. Root lift peaks at 0.15 and then holds a proud idle.
- Level-up is a one-shot 1.80-second charge → 0.19 lift → exactly one revolution → landing → settle sequence. It expands the silhouette through fins/orbit elements, peaks the aura, and returns front-facing even if the state remains active.
- Progression tiers remain cumulative and silhouette-led: fins at tier 1, focus-node orbit at tier 2, expanded orbit/aura treatment at tier 3. Glow supports those changes instead of substituting for them.
- Reduced motion retains expression, colour, and restrained scale feedback while removing spins, high hops, and rapid decorative motion.

## Budgets and Acceptance Criteria

- No new runtime dependencies or external 3D models.
- Preserve rig-critical nodes: `LeftEye`, `RightEye`, `VisorLip`, `HaloCharm`, `EnergyCore`, `LeftFlipper`, `RightFlipper`, `Body_Charcoal`, and all `Face_*` groups.
- Hero active-face geometry must be at most 15,000 triangles and the hero GLB at most 700 KB. Lite active-face geometry must be at most 7,000 triangles and the lite GLB at most 450 KB. Both assets must contain zero textures, skins, or authored animation clips.
- The build script must be location-independent and write into its own directory, including when run from a Git worktree.
- Generated review views must include front, three-quarter, side, rear, silhouette, and unlit/runtime-parity framing. The silhouette must remain readable at 64 px.
- Each face style must show distinct idle, focus, reward, and level-up behavior through its semantic rig roles; missing required roles fail fast during model construction rather than silently degrading.
- Existing unit tests remain green; new tests cover detail pruning, per-face rig binding, one-shot reward motion, reduced motion, asset budgets, and generator portability.
- Typecheck, lint, Expo/Metro iOS bundle, Blender rebuild, GLB timestamp/budget checks, and visual inspection of two iterative render passes must all pass before completion.

## Compatibility and Defaults

- New or missing face selections default to internal `classic`/user-facing `Orbit`; persisted valid selections, including `joy`, remain unchanged.
- Unknown or legacy face values continue to normalize safely.
- Dashboard and shop default to hero detail; the study-room companion defaults to lite detail.
- If GLB setup fails, the existing procedural `CharacterScene` fallback remains available and receives no new dependency.
