import { describe, expect, it } from "vitest";
import { fallbackShopCatalog, mergeShopCatalog, shopItems } from "../shopItems";

describe("shop catalog presentation", () => {
  it("uses server catalog fields as the authoritative values", () => {
    const [item] = mergeShopCatalog([
      {
        itemId: "woven-rug",
        category: "decoration",
        cost: 321,
        active: false,
        starter: true,
        equipSlot: "room:rug",
      },
    ]);

    expect(item.name).toBe("Woven Rug");
    expect(item.cost).toBe(321);
    expect(item.category).toBe("decoration");
    expect(item.active).toBe(false);
    expect(item.starter).toBe(true);
    expect(item.equipSlot).toBe("room:rug");
  });

  it("keeps a usable presentation for server-defined future items", () => {
    const [item] = mergeShopCatalog([
      {
        itemId: "quiet-clock",
        category: "decoration",
        cost: 40,
        active: true,
        starter: false,
        equipSlot: "legacy_item:quiet-clock",
      },
    ]);

    expect(item.name).toBe("Quiet Clock");
    expect(item.icon).toBe("cube-outline");
  });

  it("ships a complete unique fallback catalog", () => {
    expect(fallbackShopCatalog).toHaveLength(16);
    expect(new Set(shopItems.map((item) => item.id)).size).toBe(16);
    expect(
      shopItems.find((item) => item.id === "companion-cushion"),
    ).toMatchObject({
      cost: 100,
      equipSlot: "room:companion_corner",
    });
  });
});
