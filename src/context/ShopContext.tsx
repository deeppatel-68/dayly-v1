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
  busyItemId: string | null;
  lastError: string | null;
  clearShopError: () => void;
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
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setOwnedItems(starterItems);
      setLoading(false);
      setBusyItemId(null);
      setLastError(null);
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

  const clearShopError = () => setLastError(null);

  const buyItem = async (itemId: string): Promise<boolean> => {
    if (!user || loading || busyItemId) return false;
    if (isOwned(itemId)) {
      setLastError("Item already owned.");
      return false;
    }

    const item = shopItems.find((shopItem) => shopItem.id === itemId);
    if (!item) {
      setLastError("Item is not available.");
      return false;
    }

    try {
      setBusyItemId(itemId);
      setLastError(null);
      const result = await buyShopItem(user.id, item);
      if (!result.success) {
        setLastError(
          result.reason === "insufficient_coins"
            ? "Not enough coins for that item."
            : "Could not buy that item."
        );
        await refreshCoins();
        return false;
      }

      const items = await loadUserShopItems(user.id);
      setOwnedItems(items);
      await refreshCoins();
      return true;
    } catch (error) {
      console.error("Error buying item:", error);
      setLastError("Could not buy that item.");
      return false;
    } finally {
      setBusyItemId(null);
    }
  };

  const equipItem = async (itemId: string) => {
    if (!user || loading || busyItemId) return;

    const item = shopItems.find((shopItem) => shopItem.id === itemId);
    if (!item) {
      setLastError("Item is not available.");
      return;
    }

    try {
      setBusyItemId(itemId);
      setLastError(null);
      const items = await equipShopItem(user.id, item);
      setOwnedItems(items);
    } catch (error) {
      console.error("Error equipping item:", error);
      setLastError("Could not equip that item.");
    } finally {
      setBusyItemId(null);
    }
  };

  const unequipItem = async (itemId: string) => {
    if (!user || loading || busyItemId) return;

    try {
      setBusyItemId(itemId);
      setLastError(null);
      const items = await unequipShopItem(user.id, itemId);
      setOwnedItems(items);
    } catch (error) {
      console.error("Error unequipping item:", error);
      setLastError("Could not unequip that item.");
    } finally {
      setBusyItemId(null);
    }
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
    busyItemId,
    lastError,
    clearShopError,
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
