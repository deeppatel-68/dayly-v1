import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { ShopItem, OwnedItem } from "@/types/shop";
import { shopItems } from "@/data/shopItems";

interface ShopContextType {
  ownedItems: OwnedItem[];
  buyItem: (itemId: string) => boolean;
  equipItem: (itemId: string) => void;
  unequipItem: (itemId: string) => void;
  isOwned: (itemId: string) => boolean;
  isEquipped: (itemId: string) => boolean;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

const OWNED_ITEMS_STORAGE_KEY = "@owned_items";

export function ShopProvider({ children }: { children: ReactNode }) {
  // Default: User starts with Study Plant owned and equipped
  const [ownedItems, setOwnedItems] = useState<OwnedItem[]>([
    { itemId: "study-plant", equipped: true },
  ]);

  useEffect(() => {
    loadOwnedItems();
  }, []);

  useEffect(() => {
    saveOwnedItems();
  }, [ownedItems]);

  const loadOwnedItems = async () => {
    try {
      const storedItems = await AsyncStorage.getItem(OWNED_ITEMS_STORAGE_KEY);
      if (storedItems) {
        setOwnedItems(JSON.parse(storedItems));
      }
    } catch (error) {
      console.error("Error loading owned items:", error);
    }
  };

  const saveOwnedItems = async () => {
    try {
      await AsyncStorage.setItem(
        OWNED_ITEMS_STORAGE_KEY,
        JSON.stringify(ownedItems)
      );
    } catch (error) {
      console.error("Error saving owned items:", error);
    }
  };

  const buyItem = (itemId: string): boolean => {
    if (!isOwned(itemId)) {
      setOwnedItems((prev) => [...prev, { itemId, equipped: false }]);
      return true;
    }
    return false;
  };

  const equipItem = (itemId: string) => {
    // Equipping replaces only items of the same category, so e.g. a head
    // accessory and a platform decoration can be worn together
    const category = shopItems.find((i) => i.id === itemId)?.category;
    setOwnedItems((prev) =>
      prev.map((item) => {
        if (item.itemId === itemId) return { ...item, equipped: true };
        const itemCategory = shopItems.find((i) => i.id === item.itemId)?.category;
        return itemCategory === category ? { ...item, equipped: false } : item;
      })
    );
  };

  const unequipItem = (itemId: string) => {
    setOwnedItems((prev) =>
      prev.map((item) =>
        item.itemId === itemId ? { ...item, equipped: false } : item
      )
    );
  };

  const isOwned = (itemId: string): boolean => {
    return ownedItems.some((item) => item.itemId === itemId);
  };

  const isEquipped = (itemId: string): boolean => {
    return ownedItems.some(
      (item) => item.itemId === itemId && item.equipped
    );
  };

  const value = {
    ownedItems,
    buyItem,
    equipItem,
    unequipItem,
    isOwned,
    isEquipped,
  };

  return (
    <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);
  if (context === undefined) {
    throw new Error("useShop must be used within a ShopProvider");
  }
  return context;
}

