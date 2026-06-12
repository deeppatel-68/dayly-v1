import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { shopItems } from "@/data/shopItems";
import {
  buyShopItem,
  equipShopItem,
  loadUserShopItems,
  unequipShopItem,
} from "@/services/shopService";
import { OwnedItem } from "@/types/shop";
import { useAuth } from "./AuthContext";
import { useCoins } from "./CoinsContext";

interface ShopContextType {
  ownedItems: OwnedItem[];
  loading: boolean;
  buyItem: (itemId: string) => Promise<boolean>;
  equipItem: (itemId: string) => Promise<void>;
  unequipItem: (itemId: string) => Promise<void>;
  isOwned: (itemId: string) => boolean;
  isEquipped: (itemId: string) => boolean;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

const starterItems: OwnedItem[] = [{ itemId: "study-plant", equipped: true }];

export function ShopProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { refreshCoins } = useCoins();
  const [ownedItems, setOwnedItems] = useState<OwnedItem[]>(starterItems);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setOwnedItems(starterItems);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    loadUserShopItems(user.id)
      .then((items) => {
        if (!cancelled) setOwnedItems(items);
      })
      .catch((error) => console.error("Error loading owned items:", error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const buyItem = async (itemId: string): Promise<boolean> => {
    if (!user || loading || isOwned(itemId)) return false;

    const item = shopItems.find((shopItem) => shopItem.id === itemId);
    if (!item) return false;

    const result = await buyShopItem(user.id, item);
    if (!result.success) return false;

    const items = await loadUserShopItems(user.id);
    setOwnedItems(items);
    await refreshCoins();
    return true;
  };

  const equipItem = async (itemId: string) => {
    if (!user || loading) return;

    const item = shopItems.find((shopItem) => shopItem.id === itemId);
    if (!item) return;

    const items = await equipShopItem(user.id, item);
    setOwnedItems(items);
  };

  const unequipItem = async (itemId: string) => {
    if (!user || loading) return;

    const items = await unequipShopItem(user.id, itemId);
    setOwnedItems(items);
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
    loading,
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
