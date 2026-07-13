import {
  getEquipmentSlot,
  HOME_EQUIPMENT_IDS,
  RENDERED_EQUIPMENT_IDS,
} from "@/components/3d/equipment";
import { fallbackShopCatalog } from "@/data/shopItems";
import { describe, expect, it } from "vitest";
import {
  getRoomViewForEquipSlot,
  isHomeEquipSlot,
  ROOM_DECOR_SLOTS,
} from "../roomDecor";

describe("room decoration slots", () => {
  it("maps authored slots to the camera view that frames them", () => {
    expect(getRoomViewForEquipSlot("room:desk")).toBe("desk");
    expect(getRoomViewForEquipSlot("room:window_view")).toBe("windowShelf");
    expect(getRoomViewForEquipSlot("room:rug")).toBe("home");
  });

  it("covers every active home catalog slot in the decorate rail", () => {
    const visibleSlots = new Set<string>(
      ROOM_DECOR_SLOTS.map((slot) => slot.id),
    );
    const catalogSlots = fallbackShopCatalog
      .map((item) => item.equipSlot)
      .filter(isHomeEquipSlot);

    for (const slot of catalogSlots) expect(visibleSlots.has(slot)).toBe(true);
  });

  it("keeps renderer definitions aligned with the server catalog", () => {
    expect(RENDERED_EQUIPMENT_IDS).toHaveLength(fallbackShopCatalog.length);
    expect(HOME_EQUIPMENT_IDS).toContain("woven-rug");
    for (const item of fallbackShopCatalog) {
      expect(getEquipmentSlot(item.itemId)).toBe(item.equipSlot);
    }
  });
});
