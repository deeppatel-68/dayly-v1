import { supabase } from "@/lib/supabase";
import { getUserProgress } from "@/services/progressService";
import { OwnedItem } from "@/types/shop";
import { isNetworkRequestError } from "@/utils/supabaseErrors";

export interface ShopPurchaseResult {
  success: boolean;
  reason?: "owned" | "insufficient_coins" | "unavailable" | "unknown";
  coins?: number;
}

const SHOP_COLUMNS =
  "id,user_id,item_id,category,equipped,acquired_at,created_at,updated_at";
const STARTER_ITEM_ID = "study-plant";

function normalizeOwnedItem(row: {
  item_id?: string;
  itemId?: string;
  equipped?: boolean;
}): OwnedItem {
  return {
    itemId: row.item_id ?? row.itemId ?? "",
    equipped: row.equipped ?? false,
  };
}

function normalizeOwnedItems(rows: unknown[] | null): OwnedItem[] {
  return (rows ?? [])
    .map((row) => normalizeOwnedItem(row as Parameters<typeof normalizeOwnedItem>[0]))
    .filter((item) => item.itemId);
}

export async function loadUserShopItems(userId: string): Promise<OwnedItem[]> {
  try {
    const { data, error } = await supabase
      .from("user_shop_items")
      .select(SHOP_COLUMNS)
      .eq("user_id", userId)
      .order("acquired_at", { ascending: true });

    if (error) throw error;
    return normalizeOwnedItems(data);
  } catch (error) {
    if (isNetworkRequestError(error)) {
      return [{ itemId: STARTER_ITEM_ID, equipped: true }];
    }
    throw error;
  }
}

export async function buyShopItem(
  userId: string,
  itemId: string
): Promise<ShopPurchaseResult> {
  const { data, error } = await supabase.rpc("buy_shop_item", {
    p_item_id: itemId,
  });
  if (error) throw error;

  const result = Array.isArray(data) ? data[0] : data;
  await getUserProgress(userId);
  return {
    success: result?.success === true,
    reason: result?.reason ?? undefined,
    coins: result?.coins,
  };
}

export async function equipShopItem(
  _userId: string,
  itemId: string
): Promise<OwnedItem[]> {
  const { data, error } = await supabase.rpc("equip_shop_item", {
    p_item_id: itemId,
  });
  if (error) throw error;
  return normalizeOwnedItems(data as unknown[]);
}
export async function unequipShopItem(
  _userId: string,
  itemId: string
): Promise<OwnedItem[]> {
  const { data, error } = await supabase.rpc("unequip_shop_item", {
    p_item_id: itemId,
  });
  if (error) throw error;
  return normalizeOwnedItems(data as unknown[]);
}
