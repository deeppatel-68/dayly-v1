# 3D / expo-gl gotchas

- MeshStandardMaterial only — clearcoat/MeshPhysicalMaterial shaders fail on expo-gl
- Keep `renderer.debug.checkShaderErrors = false` (expo-gl returns undefined shader logs → three crashes on `.trim()`)
- Load the GLB per scene mount; sharing a parsed graph across GL contexts blanks later scenes
- three.js `fov` is VERTICAL: portrait GLViews get only ~fov×aspect horizontal — check framing at portrait aspect
- Blender→three coords: blender (x, y, z) → three (x, z, −y)
- Screens import only AvatarRenderer, never a concrete renderer (docs/avatar-architecture.md)
