export interface ShopItem {
  id: string;
  name: string;
  icon: string; // Icon name from Ionicons
  cost: number;
  category: "decoration" | "furniture" | "accessory";
}

export interface OwnedItem {
  itemId: string;
  equipped: boolean;
}

