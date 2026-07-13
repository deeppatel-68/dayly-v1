export type ItemRarity = "common" | "rare" | "epic" | "legendary";
export type ItemCategory = "decoration" | "furniture" | "accessory" | "all";
export type ShopItemCategory = Exclude<ItemCategory, "all">;

export type EquipSlot =
  | "wearable:head"
  | "platform:left"
  | "platform:right"
  | "room:wall_art"
  | "room:floor_prop"
  | "room:desk"
  | "room:window_view"
  | "room:lamp"
  | "room:rug"
  | "room:shelf"
  | "room:companion_corner"
  | `legacy_item:${string}`;

export interface ShopCatalogItem {
  itemId: string;
  category: ShopItemCategory;
  cost: number;
  active: boolean;
  starter: boolean;
  equipSlot: EquipSlot;
}

export interface ShopItemPresentation {
  id: string;
  name: string;
  icon: string;
  rarity?: ItemRarity;
  description?: string;
}

export interface ShopItem extends ShopItemPresentation {
  category: ShopItemCategory;
  cost: number;
  active: boolean;
  starter: boolean;
  equipSlot: EquipSlot;
}

export interface OwnedItem {
  itemId: string;
  equipped: boolean;
  category?: ShopItemCategory;
  equipSlot?: EquipSlot;
  acquiredAt?: string;
  updatedAt?: string;
}
