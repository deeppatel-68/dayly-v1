import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { shopItems as fallbackShopItems } from "@/data/shopItems";
import {
  buyShopItem,
  equipShopItem,
  loadShopCatalog,
  loadUserShopItems,
  unequipShopItem,
} from "@/services/shopService";
import { OwnedItem, ShopItem } from "@/types/shop";
import { logSupabaseError } from "@/utils/supabaseErrors";
import { useAuth } from "./AuthContext";
import { useCoins } from "./CoinsContext";

interface ShopContextType {
  shopItems: ShopItem[];
  ownedItems: OwnedItem[];
  loading: boolean;
  busyItemId: string | null;
  lastError: string | null;
  clearShopError: () => void;
  buyItem: (itemId: string) => Promise<boolean>;
  equipItem: (itemId: string) => Promise<boolean>;
  unequipItem: (itemId: string) => Promise<boolean>;
  isOwned: (itemId: string) => boolean;
  isEquipped: (itemId: string) => boolean;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

const starterItems: OwnedItem[] = [
  {
    itemId: "study-plant",
    category: "decoration",
    equipSlot: "platform:right",
    equipped: true,
  },
];

export function ShopProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { refreshCoins } = useCoins();
  const [shopItems, setShopItems] = useState<ShopItem[]>(fallbackShopItems);
  const [ownedItems, setOwnedItems] = useState<OwnedItem[]>(starterItems);
  const [loading, setLoading] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setShopItems(fallbackShopItems);
      setOwnedItems(starterItems);
      setLoading(false);
      setBusyItemId(null);
      setLastError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.allSettled([loadShopCatalog(), loadUserShopItems(user.id)])
      .then(([catalogResult, ownedResult]) => {
        if (cancelled) return;

        if (catalogResult.status === "fulfilled") {
          setShopItems(catalogResult.value.filter((item) => item.active));
        } else {
          logSupabaseError("Error loading shop catalog:", catalogResult.reason);
        }

        if (ownedResult.status === "fulfilled") {
          setOwnedItems(ownedResult.value);
        } else {
          logSupabaseError("Error loading owned items:", ownedResult.reason);
        }
      })
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

    try {
      setBusyItemId(itemId);
      setLastError(null);
      const result = await buyShopItem(user.id, itemId);
      if (!result.success) {
        setLastError(
          result.reason === "insufficient_coins"
            ? "Not enough coins for that item."
            : result.reason === "owned"
              ? "Item already owned."
              : result.reason === "unavailable"
                ? "Item is not available."
                : "Could not buy that item.",
        );
        await refreshCoins();
        return false;
      }

      const items = await loadUserShopItems(user.id);
      setOwnedItems(items);
      await refreshCoins();
      return true;
    } catch (error) {
      logSupabaseError("Error buying item:", error);
      setLastError("Could not buy that item.");
      return false;
    } finally {
      setBusyItemId(null);
    }
  };

  const equipItem = async (itemId: string) => {
    if (!user || loading || busyItemId) return false;

    try {
      setBusyItemId(itemId);
      setLastError(null);
      const items = await equipShopItem(user.id, itemId);
      setOwnedItems(items);
      return true;
    } catch (error) {
      logSupabaseError("Error equipping item:", error);
      setLastError("Could not equip that item.");
      return false;
    } finally {
      setBusyItemId(null);
    }
  };

  const unequipItem = async (itemId: string) => {
    if (!user || loading || busyItemId) return false;

    try {
      setBusyItemId(itemId);
      setLastError(null);
      const items = await unequipShopItem(user.id, itemId);
      setOwnedItems(items);
      return true;
    } catch (error) {
      logSupabaseError("Error unequipping item:", error);
      setLastError("Could not unequip that item.");
      return false;
    } finally {
      setBusyItemId(null);
    }
  };

  const isOwned = (itemId: string): boolean => {
    return ownedItems.some((item) => item.itemId === itemId);
  };

  const isEquipped = (itemId: string): boolean => {
    return ownedItems.some((item) => item.itemId === itemId && item.equipped);
  };

  const value = {
    shopItems,
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

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const context = useContext(ShopContext);
  if (context === undefined) {
    throw new Error("useShop must be used within a ShopProvider");
  }
  return context;
}
