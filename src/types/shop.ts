export type ItemRarity = "common" | "rare" | "epic" | "legendary";
export type ItemCategory = "decoration" | "furniture" | "accessory" | "all";

export interface ShopItem {
  id: string;
  name: string;
  icon: string; // Icon name from Ionicons
  cost: number;
  category: "decoration" | "furniture" | "accessory";
  rarity?: ItemRarity;
  description?: string;
}

export interface OwnedItem {
  itemId: string;
  equipped: boolean;
}

