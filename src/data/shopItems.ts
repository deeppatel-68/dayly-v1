import { ShopCatalogItem, ShopItem, ShopItemPresentation } from "@/types/shop";

export const shopItemPresentation: ShopItemPresentation[] = [
  {
    id: "study-plant",
    name: "Study Plant",
    icon: "leaf",
    rarity: "common",
    description: "A classic plant to keep your study space fresh",
  },
  {
    id: "neon-lamp",
    name: "Neon Lamp",
    icon: "bulb",
    rarity: "rare",
    description: "Bright neon light to keep you focused",
  },
  {
    id: "motivational-poster",
    name: "Motivational Poster",
    icon: "image",
    rarity: "common",
    description: "Inspire yourself with daily motivation",
  },
  {
    id: "floor-plant",
    name: "Floor Plant",
    icon: "leaf-outline",
    rarity: "rare",
    description: "A tall leafy friend to green up your corner",
  },
  {
    id: "fairy-window",
    name: "Fairy Window Lights",
    icon: "sparkles-outline",
    rarity: "rare",
    description: "Twinkling lights framing your window view",
  },
  {
    id: "warm-desk-lamp",
    name: "Warm Desk Lamp",
    icon: "bulb-outline",
    rarity: "common",
    description: "A warm pool of light for late focus sessions",
  },
  {
    id: "woven-rug",
    name: "Woven Rug",
    icon: "grid-outline",
    rarity: "common",
    description: "A soft woven rug that grounds your study nook",
  },
  {
    id: "daily-pinboard",
    name: "Daily Pinboard",
    icon: "clipboard-outline",
    rarity: "common",
    description: "Keep small goals and daily wins in view",
  },
  {
    id: "soft-window-curtains",
    name: "Soft Window Curtains",
    icon: "albums-outline",
    rarity: "rare",
    description: "Soft curtains for a calmer window corner",
  },
  {
    id: "shelf-keepsakes",
    name: "Shelf Keepsakes",
    icon: "archive-outline",
    rarity: "common",
    description: "Small keepsakes earned through steady progress",
  },
  {
    id: "companion-cushion",
    name: "Companion Cushion",
    icon: "bed-outline",
    rarity: "rare",
    description: "A cozy cushion beside your companion's pod",
  },
  {
    id: "bookshelf",
    name: "Bookshelf",
    icon: "library-outline",
    rarity: "rare",
    description: "Store all your study materials",
  },
  {
    id: "gaming-desk",
    name: "Gaming Desk",
    icon: "laptop-outline",
    rarity: "epic",
    description: "Premium desk for serious productivity",
  },
  {
    id: "focus-cap",
    name: "Focus Cap",
    icon: "baseball-outline",
    rarity: "common",
    description: "A classic cap for serious study sessions",
  },
  {
    id: "study-glasses",
    name: "Study Glasses",
    icon: "glasses-outline",
    rarity: "common",
    description: "See clearly through your study sessions",
  },
  {
    id: "neon-headphones",
    name: "Neon Headphones",
    icon: "headset-outline",
    rarity: "epic",
    description: "Block out distractions with style",
  },
];

// Bootstrap values keep signed-out/offline presentation stable. Authenticated
// sessions replace every authoritative field with rows loaded from Supabase.
export const fallbackShopCatalog: ShopCatalogItem[] = [
  {
    itemId: "study-plant",
    category: "decoration",
    cost: 30,
    active: true,
    starter: true,
    equipSlot: "platform:right",
  },
  {
    itemId: "neon-lamp",
    category: "decoration",
    cost: 80,
    active: true,
    starter: false,
    equipSlot: "platform:left",
  },
  {
    itemId: "motivational-poster",
    category: "decoration",
    cost: 60,
    active: true,
    starter: false,
    equipSlot: "room:wall_art",
  },
  {
    itemId: "floor-plant",
    category: "decoration",
    cost: 90,
    active: true,
    starter: false,
    equipSlot: "room:floor_prop",
  },
  {
    itemId: "fairy-window",
    category: "decoration",
    cost: 110,
    active: true,
    starter: false,
    equipSlot: "room:window_view",
  },
  {
    itemId: "warm-desk-lamp",
    category: "decoration",
    cost: 75,
    active: true,
    starter: false,
    equipSlot: "room:lamp",
  },
  {
    itemId: "woven-rug",
    category: "furniture",
    cost: 90,
    active: true,
    starter: false,
    equipSlot: "room:rug",
  },
  {
    itemId: "daily-pinboard",
    category: "decoration",
    cost: 80,
    active: true,
    starter: false,
    equipSlot: "room:wall_art",
  },
  {
    itemId: "soft-window-curtains",
    category: "decoration",
    cost: 110,
    active: true,
    starter: false,
    equipSlot: "room:window_view",
  },
  {
    itemId: "shelf-keepsakes",
    category: "decoration",
    cost: 70,
    active: true,
    starter: false,
    equipSlot: "room:shelf",
  },
  {
    itemId: "companion-cushion",
    category: "furniture",
    cost: 100,
    active: true,
    starter: false,
    equipSlot: "room:companion_corner",
  },
  {
    itemId: "bookshelf",
    category: "furniture",
    cost: 120,
    active: true,
    starter: false,
    equipSlot: "room:floor_prop",
  },
  {
    itemId: "gaming-desk",
    category: "furniture",
    cost: 200,
    active: true,
    starter: false,
    equipSlot: "room:desk",
  },
  {
    itemId: "focus-cap",
    category: "accessory",
    cost: 50,
    active: true,
    starter: false,
    equipSlot: "wearable:head",
  },
  {
    itemId: "study-glasses",
    category: "accessory",
    cost: 75,
    active: true,
    starter: false,
    equipSlot: "wearable:head",
  },
  {
    itemId: "neon-headphones",
    category: "accessory",
    cost: 150,
    active: true,
    starter: false,
    equipSlot: "wearable:head",
  },
];

const presentationById = new Map(
  shopItemPresentation.map((presentation) => [presentation.id, presentation]),
);

function fallbackPresentation(itemId: string): ShopItemPresentation {
  return {
    id: itemId,
    name: itemId
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    icon: "cube-outline",
    description: "A collectible upgrade for your Dayly space",
  };
}

export function mergeShopCatalog(catalog: ShopCatalogItem[]): ShopItem[] {
  return catalog.map((row) => ({
    ...(presentationById.get(row.itemId) ?? fallbackPresentation(row.itemId)),
    category: row.category,
    cost: row.cost,
    active: row.active,
    starter: row.starter,
    equipSlot: row.equipSlot,
  }));
}

// Existing imports keep a complete bootstrap catalog. ShopContext exposes the
// server-loaded equivalent for authenticated command and presentation flows.
export const shopItems: ShopItem[] = mergeShopCatalog(fallbackShopCatalog);
