// Fixed body-colour palette for the Dayly companion. Free for now; can
// become shop items later.
export interface AvatarBodyColor {
  id: string;
  name: string;
  hex: string;
}

export const AVATAR_BODY_COLORS: AvatarBodyColor[] = [
  { id: "soft-cream", name: "Soft Cream", hex: "#F3E7D3" },
  { id: "mist-blue", name: "Mist Blue", hex: "#AFCBFF" },
  { id: "sage-mint", name: "Sage Mint", hex: "#A8D5BA" },
  { id: "lavender", name: "Lavender", hex: "#C6B6FF" },
  { id: "coral-clay", name: "Coral Clay", hex: "#E7A08A" },
  { id: "charcoal", name: "Charcoal", hex: "#2A2A2E" },
];

export const DEFAULT_BODY_COLOR = AVATAR_BODY_COLORS[0].hex; // Soft Cream
