import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useCoins } from "@/context/CoinsContext";
import { useShop } from "@/context/ShopContext";
import type { ShopItem } from "@/types/shop";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ROOM_DECOR_SLOTS } from "./roomDecor";

interface RoomDecorSheetProps {
  selectedSlot: string;
  previewItemId: string | null;
  onSelectSlot: (slot: string) => void;
  onPreview: (itemId: string | null) => void;
  onClose: () => void;
}

export default function RoomDecorSheet({
  selectedSlot,
  previewItemId,
  onSelectSlot,
  onPreview,
  onClose,
}: RoomDecorSheetProps) {
  const { coins } = useCoins();
  const {
    shopItems,
    ownedItems,
    loading,
    busyItemId,
    lastError,
    buyItem,
    equipItem,
    unequipItem,
    isOwned,
  } = useShop();

  const compatibleItems = useMemo(
    () =>
      shopItems.filter(
        (item) => item.active && item.equipSlot === selectedSlot,
      ),
    [selectedSlot, shopItems],
  );
  const equippedItem = useMemo(
    () =>
      ownedItems.find(
        (owned) =>
          owned.equipped &&
          shopItems.find((item) => item.id === owned.itemId)?.equipSlot ===
            selectedSlot,
      ),
    [ownedItems, selectedSlot, shopItems],
  );
  const previewItem = shopItems.find((item) => item.id === previewItemId);

  const selectItem = async (item: ShopItem) => {
    if (busyItemId) return;
    if (!isOwned(item.id)) {
      const bought = await buyItem(item.id);
      Haptics.notificationAsync(
        bought
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      ).catch(() => {});
      if (!bought) return;
    } else {
      Haptics.selectionAsync().catch(() => {});
    }
    onPreview(item.id);
  };

  const applyPreview = async () => {
    if (!previewItemId || busyItemId) return;
    const applied = await equipItem(previewItemId);
    if (!applied) return;
    onPreview(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
  };

  const clearSlot = async () => {
    if (!equippedItem || busyItemId) return;
    const cleared = await unequipItem(equippedItem.itemId);
    if (!cleared) return;
    onPreview(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  return (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>DECORATE</Text>
          <Text style={styles.title}>
            {ROOM_DECOR_SLOTS.find((slot) => slot.id === selectedSlot)?.label ??
              "My Space"}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Close decorate mode"
          onPress={onClose}
          style={styles.iconButton}
        >
          <Ionicons name="close" size={20} color="#F0EEE6" />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.slotRow}
      >
        {ROOM_DECOR_SLOTS.map((slot) => {
          const selected = slot.id === selectedSlot;
          return (
            <Pressable
              key={slot.id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={slot.label}
              onPress={() => onSelectSlot(slot.id)}
              style={[styles.slotButton, selected && styles.slotButtonSelected]}
            >
              <Ionicons
                name={slot.icon as never}
                size={17}
                color={selected ? "#171512" : "#D7D2C7"}
              />
              <Text
                style={[styles.slotLabel, selected && styles.slotLabelSelected]}
              >
                {slot.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {lastError ? <Text style={styles.error}>{lastError}</Text> : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.itemRow}
      >
        {compatibleItems.map((item) => {
          const owned = isOwned(item.id);
          const selected = previewItemId === item.id;
          return (
            <Pressable
              key={item.id}
              disabled={loading || Boolean(busyItemId)}
              onPress={() => selectItem(item)}
              style={[styles.item, selected && styles.itemSelected]}
            >
              <View style={styles.itemIcon}>
                {busyItemId === item.id ? (
                  <ActivityIndicator size="small" color="#D97757" />
                ) : (
                  <Ionicons
                    name={item.icon as never}
                    size={22}
                    color="#F0EEE6"
                  />
                )}
              </View>
              <Text numberOfLines={1} style={styles.itemName}>
                {item.name}
              </Text>
              <Text style={styles.itemMeta}>
                {owned ? "Owned" : `${item.cost} coins`}
              </Text>
            </Pressable>
          );
        })}
        {compatibleItems.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No pieces for this space yet</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.balance}>
          <Ionicons name="star" size={14} color="#D4A27F" />
          <Text style={styles.balanceText}>{coins}</Text>
        </View>
        {equippedItem && !previewItem ? (
          <Pressable onPress={clearSlot} style={styles.secondaryButton}>
            <Ionicons name="remove-circle-outline" size={17} color="#F0EEE6" />
            <Text style={styles.secondaryText}>Clear</Text>
          </Pressable>
        ) : null}
        {previewItem ? (
          <>
            <Pressable
              onPress={() => onPreview(null)}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={applyPreview} style={styles.applyButton}>
              <Ionicons name="checkmark" size={18} color="#171512" />
              <Text style={styles.applyText}>Apply</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: Spacing.md,
    paddingBottom: 28,
    backgroundColor: "rgba(22,21,19,0.97)",
    borderTopWidth: 1,
    borderTopColor: "rgba(240,238,230,0.14)",
  },
  header: {
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: { color: "#D97757", fontFamily: "Outfit-Bold", fontSize: 10 },
  title: { color: "#F0EEE6", fontFamily: "Outfit-Bold", fontSize: 20 },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(240,238,230,0.08)",
  },
  slotRow: {
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  slotButton: {
    height: 34,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(240,238,230,0.07)",
  },
  slotButtonSelected: { backgroundColor: "#D97757" },
  slotLabel: { color: "#D7D2C7", fontFamily: "Outfit-SemiBold", fontSize: 11 },
  slotLabelSelected: { color: "#171512" },
  error: { color: "#E7A28D", paddingHorizontal: Spacing.md, fontSize: 12 },
  itemRow: { gap: 8, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  item: {
    width: 116,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(240,238,230,0.12)",
    borderRadius: BorderRadius.sm,
    backgroundColor: "rgba(240,238,230,0.04)",
  },
  itemSelected: {
    borderColor: "#D97757",
    backgroundColor: "rgba(217,119,87,0.1)",
  },
  itemIcon: { height: 30, justifyContent: "center" },
  itemName: { color: "#F0EEE6", fontFamily: "Outfit-SemiBold", fontSize: 12 },
  itemMeta: { color: "#A9A49B", fontFamily: "Outfit-Regular", fontSize: 10 },
  empty: { height: 58, justifyContent: "center" },
  emptyText: { color: "#A9A49B", fontFamily: "Outfit-Regular", fontSize: 12 },
  footer: {
    minHeight: 40,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  balance: {
    marginRight: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  balanceText: {
    color: "#F0EEE6",
    fontFamily: "Outfit-SemiBold",
    fontSize: 13,
  },
  secondaryButton: {
    height: 38,
    paddingHorizontal: 13,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: "rgba(240,238,230,0.14)",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  secondaryText: {
    color: "#F0EEE6",
    fontFamily: "Outfit-SemiBold",
    fontSize: 12,
  },
  applyButton: {
    height: 38,
    paddingHorizontal: 15,
    borderRadius: BorderRadius.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#D97757",
  },
  applyText: { color: "#171512", fontFamily: "Outfit-Bold", fontSize: 12 },
});
