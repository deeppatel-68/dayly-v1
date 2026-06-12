import { supabase } from "@/lib/supabase";
import { getUserProgress } from "@/services/progressService";
import { ShopItem, OwnedItem } from "@/types/shop";

export interface ShopPurchaseResult {
  success: boolean;
  reason?: "owned" | "insufficient_coins" | "unknown";
  coins?: number;
}

const SHOP_COLUMNS = "id,user_id,item_id,category,equipped,acquired_at,created_at,updated_at";
const STARTER_ITEM: Pick<ShopItem, "id" | "category"> = {
  id: "study-plant",
  category: "decoration",
};

function normalizeOwnedItem(row: { item_id?: string; itemId?: string; equipped?: boolean }): OwnedItem {
  return {
    itemId: row.item_id ?? row.itemId ?? "",
    equipped: row.equipped ?? false,
  };
}

export async function ensureStarterShopItem(userId: string): Promise<void> {
  const { error } = await supabase.from("user_shop_items").upsert(
    {
      user_id: userId,
      item_id: STARTER_ITEM.id,
      category: STARTER_ITEM.category,
      equipped: true,
    },
    { onConflict: "user_id,item_id", ignoreDuplicates: true }
  );

  if (error) throw error;
}

export async function loadUserShopItems(userId: string): Promise<OwnedItem[]> {
  await ensureStarterShopItem(userId);

  const { data, error } = await supabase
    .from("user_shop_items")
    .select(SHOP_COLUMNS)
    .eq("user_id", userId)
    .order("acquired_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map(normalizeOwnedItem).filter((item) => item.itemId);
}

export async function buyShopItem(
  userId: string,
  item: ShopItem
): Promise<ShopPurchaseResult> {
  const { data, error } = await supabase.rpc("buy_shop_item", {
    p_user_id: userId,
    p_item_id: item.id,
    p_category: item.category,
    p_cost: item.cost,
  });

  if (error) throw error;

  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.success) {
    return {
      success: false,
      reason: result?.reason ?? "unknown",
      coins: result?.coins,
    };
  }

  await getUserProgress(userId);
  return { success: true, coins: result.coins };
}

export async function equipShopItem(
  userId: string,
  item: ShopItem
): Promise<OwnedItem[]> {
  const { data: owned, error: ownedError } = await supabase
    .from("user_shop_items")
    .select(SHOP_COLUMNS)
    .eq("user_id", userId)
    .eq("item_id", item.id)
    .maybeSingle();

  if (ownedError) throw ownedError;
  if (!owned) return loadUserShopItems(userId);

  const { error: unequipError } = await supabase
    .from("user_shop_items")
    .update({ equipped: false })
    .eq("user_id", userId)
    .eq("category", item.category);

  if (unequipError) throw unequipError;

  const { error: equipError } = await supabase
    .from("user_shop_items")
    .update({ equipped: true })
    .eq("user_id", userId)
    .eq("item_id", item.id);

  if (equipError) throw equipError;

  return loadUserShopItems(userId);
}

export async function unequipShopItem(
  userId: string,
  itemId: string
): Promise<OwnedItem[]> {
  const { error } = await supabase
    .from("user_shop_items")
    .update({ equipped: false })
    .eq("user_id", userId)
    .eq("item_id", itemId);

  if (error) throw error;

  return loadUserShopItems(userId);
}
