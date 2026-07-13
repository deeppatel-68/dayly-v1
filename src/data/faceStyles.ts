// Fixed face-style options for the Dayly companion. Free for now; can become
// shop items later. Each id maps to a `Face_<PascalCase>` group node authored
// in the companion GLB (one visible at a time); see companionModel.ts.
export type FaceStyle = "classic" | "eve" | "screen" | "kirby" | "joy";

export interface AvatarFaceStyle {
  id: FaceStyle;
  name: string;
}

export const AVATAR_FACE_STYLES: AvatarFaceStyle[] = [
  { id: "classic", name: "Classic" },
  { id: "eve", name: "Eve" },
  { id: "screen", name: "Screen" },
  { id: "kirby", name: "Kirby" },
  { id: "joy", name: "Joy" },
];

export const DEFAULT_FACE_STYLE: FaceStyle = "classic";

const FACE_STYLE_IDS = new Set<string>(AVATAR_FACE_STYLES.map((f) => f.id));

// Coerce an unknown/legacy value to a valid face style (migration-safety for
// existing users whose stored character_data predates this field).
export function normalizeFaceStyle(value: unknown): FaceStyle {
  return typeof value === "string" && FACE_STYLE_IDS.has(value)
    ? (value as FaceStyle)
    : DEFAULT_FACE_STYLE;
}
