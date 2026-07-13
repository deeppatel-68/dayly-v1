import type { RoomView } from "./roomNavigation";

export const ROOM_DECOR_SLOTS = [
  {
    id: "platform:left",
    label: "Pod light",
    icon: "bulb-outline",
    view: "home",
  },
  {
    id: "platform:right",
    label: "Pod plant",
    icon: "leaf-outline",
    view: "home",
  },
  { id: "room:desk", label: "Desk", icon: "laptop-outline", view: "desk" },
  { id: "room:lamp", label: "Desk lamp", icon: "bulb-outline", view: "desk" },
  {
    id: "room:wall_art",
    label: "Wall",
    icon: "image-outline",
    view: "windowShelf",
  },
  {
    id: "room:window_view",
    label: "Window",
    icon: "albums-outline",
    view: "windowShelf",
  },
  {
    id: "room:floor_prop",
    label: "Corner",
    icon: "library-outline",
    view: "windowShelf",
  },
  { id: "room:rug", label: "Rug", icon: "grid-outline", view: "home" },
  {
    id: "room:shelf",
    label: "Shelf",
    icon: "archive-outline",
    view: "windowShelf",
  },
  {
    id: "room:companion_corner",
    label: "Cushion",
    icon: "bed-outline",
    view: "home",
  },
] as const satisfies readonly {
  id: string;
  label: string;
  icon: string;
  view: RoomView;
}[];

export type RoomDecorSlot = (typeof ROOM_DECOR_SLOTS)[number]["id"];

export function getRoomViewForEquipSlot(equipSlot: string): RoomView {
  return ROOM_DECOR_SLOTS.find((slot) => slot.id === equipSlot)?.view ?? "home";
}

export function isHomeEquipSlot(equipSlot: string): boolean {
  return equipSlot.startsWith("platform:") || equipSlot.startsWith("room:");
}
