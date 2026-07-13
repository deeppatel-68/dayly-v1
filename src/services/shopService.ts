import { supabase } from "@/lib/supabase";
import { mergeShopCatalog } from "@/data/shopItems";
import { getUserProgress } from "@/services/progressService";
import {
  EquipSlot,
  OwnedItem,
  ShopCatalogItem,
  ShopItem,
  ShopItemCategory,
} from "@/types/shop";
import { isNetworkRequestError } from "@/utils/supabaseErrors";

export interface ShopPurchaseResult {
  success: boolean;
  reason?: "owned" | "insufficient_coins" | "unavailable" | "unknown";
  coins?: number;
}

const SHOP_COLUMNS =
  "id,user_id,item_id,category,equip_slot,equipped,acquired_at,created_at,updated_at";
const CATALOG_COLUMNS = "item_id,category,cost,active,starter,equip_slot";
const STARTER_ITEM_ID = "study-plant";
const STARTER_EQUIP_SLOT = "platform:right";
const EQUIP_SLOTS = new Set<EquipSlot>([
  "wearable:head",
  "platform:left",
  "platform:right",
  "room:wall_art",
  "room:floor_prop",
  "room:desk",
  "room:window_view",
  "room:lamp",
  "room:rug",
  "room:shelf",
  "room:companion_corner",
]);

function isShopItemCategory(value: unknown): value is ShopItemCategory {
  return (
    value === "decoration" || value === "furniture" || value === "accessory"
  );
}

function isEquipSlot(value: unknown): value is EquipSlot {
  return (
    typeof value === "string" &&
    (EQUIP_SLOTS.has(value as EquipSlot) || value.startsWith("legacy_item:"))
  );
}

function normalizeCatalogItem(
  row: Record<string, unknown>,
): ShopCatalogItem | null {
  if (
    typeof row.item_id !== "string" ||
    !isShopItemCategory(row.category) ||
    typeof row.cost !== "number" ||
    typeof row.active !== "boolean" ||
    typeof row.starter !== "boolean" ||
    !isEquipSlot(row.equip_slot)
  ) {
    return null;
  }

  return {
    itemId: row.item_id,
    category: row.category,
    cost: row.cost,
    active: row.active,
    starter: row.starter,
    equipSlot: row.equip_slot,
  };
}

function normalizeOwnedItem(row: {
  item_id?: string;
  itemId?: string;
  category?: unknown;
  equip_slot?: string;
  equipSlot?: string;
  equipped?: boolean;
  acquired_at?: string;
  acquiredAt?: string;
  updated_at?: string;
  updatedAt?: string;
}): OwnedItem {
  return {
    itemId: row.item_id ?? row.itemId ?? "",
    equipped: row.equipped ?? false,
    category: isShopItemCategory(row.category) ? row.category : undefined,
    equipSlot: isEquipSlot(row.equip_slot)
      ? row.equip_slot
      : isEquipSlot(row.equipSlot)
        ? row.equipSlot
        : undefined,
    acquiredAt: row.acquired_at ?? row.acquiredAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  };
}

function normalizeOwnedItems(rows: unknown[] | null): OwnedItem[] {
  return (rows ?? [])
    .map((row) =>
      normalizeOwnedItem(row as Parameters<typeof normalizeOwnedItem>[0]),
    )
    .filter((item) => item.itemId);
}

export async function loadShopCatalog(): Promise<ShopItem[]> {
  const { data, error } = await supabase
    .from("shop_catalog")
    .select(CATALOG_COLUMNS)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const catalog = ((data ?? []) as Record<string, unknown>[])
    .map(normalizeCatalogItem)
    .filter((item): item is ShopCatalogItem => item !== null);
  return mergeShopCatalog(catalog);
}

export async function loadUserShopItems(userId: string): Promise<OwnedItem[]> {
  try {
    const { data, error } = await supabase
      .from("user_shop_items")
      .select(SHOP_COLUMNS)
      .eq("user_id", userId)
      .order("updated_at", { ascending: true });

    if (error) throw error;
    return normalizeOwnedItems(data);
  } catch (error) {
    if (isNetworkRequestError(error)) {
      return [
        {
          itemId: STARTER_ITEM_ID,
          category: "decoration",
          equipSlot: STARTER_EQUIP_SLOT,
          equipped: true,
        },
      ];
    }
    throw error;
  }
}

export async function buyShopItem(
  userId: string,
  itemId: string,
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
  itemId: string,
): Promise<OwnedItem[]> {
  const { data, error } = await supabase.rpc("equip_shop_item", {
    p_item_id: itemId,
  });
  if (error) throw error;
  return normalizeOwnedItems(data as unknown[]);
}
export async function unequipShopItem(
  _userId: string,
  itemId: string,
): Promise<OwnedItem[]> {
  const { data, error } = await supabase.rpc("unequip_shop_item", {
    p_item_id: itemId,
  });
  if (error) throw error;
  return normalizeOwnedItems(data as unknown[]);
}
