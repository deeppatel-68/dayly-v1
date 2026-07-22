-- Wave 2 pet-native cosmetics: neck/back wearables, halo style, pod theme.
-- New equip_slot values need seed rows only — the one-equipped-per-slot
-- invariant (user_shop_items_one_equipped_slot_key) covers them unchanged.

insert into public.shop_catalog (
  item_id, category, cost, active, starter, equip_slot
)
values
  ('cozy-scarf', 'accessory', 60, true, false, 'wearable:neck'),
  ('mini-backpack', 'accessory', 120, true, false, 'wearable:back'),
  ('halo-orbit-ring', 'accessory', 180, true, false, 'halo:style'),
  ('pod-aurora', 'decoration', 200, true, false, 'pod:theme')
on conflict (item_id) do update set
  category = excluded.category,
  cost = excluded.cost,
  active = excluded.active,
  starter = excluded.starter,
  equip_slot = excluded.equip_slot,
  updated_at = now();
