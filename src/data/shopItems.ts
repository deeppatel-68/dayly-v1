import { ShopItem } from "@/types/shop";

export const shopItems: ShopItem[] = [
  // Decoration Items
  {
    id: "study-plant",
    name: "Study Plant",
    icon: "leaf",
    cost: 30,
    category: "decoration",
    rarity: "common",
    description: "A classic plant to keep your study space fresh",
  },
  {
    id: "neon-lamp",
    name: "Neon Lamp",
    icon: "bulb",
    cost: 80,
    category: "decoration",
    rarity: "rare",
    description: "Bright neon light to keep you focused",
  },
  {
    id: "motivational-poster",
    name: "Motivational Poster",
    icon: "image",
    cost: 60,
    category: "decoration",
    rarity: "common",
    description: "Inspire yourself with daily motivation",
  },
  // Furniture Items
  {
    id: "bookshelf",
    name: "Bookshelf",
    icon: "library-outline",
    cost: 120,
    category: "furniture",
    rarity: "rare",
    description: "Store all your study materials",
  },
  {
    id: "gaming-desk",
    name: "Gaming Desk",
    icon: "laptop-outline",
    cost: 200,
    category: "furniture",
    rarity: "epic",
    description: "Premium desk for serious productivity",
  },
  // Accessory Items (Avatar)
  {
    id: "focus-cap",
    name: "Focus Cap",
    icon: "baseball-outline",
    cost: 50,
    category: "accessory",
    rarity: "common",
    description: "A classic cap for serious study sessions",
  },
  {
    id: "study-glasses",
    name: "Study Glasses",
    icon: "glasses-outline",
    cost: 75,
    category: "accessory",
    rarity: "common",
    description: "See clearly through your study sessions",
  },
  {
    id: "neon-headphones",
    name: "Neon Headphones",
    icon: "headset-outline",
    cost: 150,
    category: "accessory",
    rarity: "epic",
    description: "Block out distractions with style",
  },
];

