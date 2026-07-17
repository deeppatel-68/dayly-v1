import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useCoins } from "@/context/CoinsContext";
import { useShop } from "@/context/ShopContext";
import { useTheme } from "@/context/ThemeContext";
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
  const { colors } = useTheme();
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
    <View
      style={[
        styles.sheet,
        { backgroundColor: colors.glassFallback, borderTopColor: colors.border },
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>DECORATE</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            {ROOM_DECOR_SLOTS.find((slot) => slot.id === selectedSlot)?.label ??
              "My Space"}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Close decorate mode"
          onPress={onClose}
          style={[styles.iconButton, { backgroundColor: colors.surfaceRaised }]}
        >
          <Ionicons name="close" size={20} color={colors.text} />
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
              style={[
                styles.slotButton,
                { backgroundColor: selected ? colors.accent : colors.surfaceRaised },
              ]}
            >
              <Ionicons
                name={slot.icon as never}
                size={17}
                color={selected ? colors.onAccent : colors.textSecondary}
              />
              <Text
                style={[styles.slotLabel, { color: selected ? colors.onAccent : colors.textSecondary }]}
              >
                {slot.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {lastError ? <Text style={[styles.error, { color: colors.error }]}>{lastError}</Text> : null}

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
              style={[
                styles.item,
                {
                  backgroundColor: selected ? colors.completedBackground : colors.surface,
                  borderColor: selected ? colors.accent : colors.border,
                },
              ]}
            >
              <View style={styles.itemIcon}>
                {busyItemId === item.id ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Ionicons
                    name={item.icon as never}
                    size={22}
                    color={colors.text}
                  />
                )}
              </View>
              <Text numberOfLines={1} style={[styles.itemName, { color: colors.text }]}>
                {item.name}
              </Text>
              <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                {owned ? "Owned" : `${item.cost} coins`}
              </Text>
            </Pressable>
          );
        })}
        {compatibleItems.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No pieces for this space yet</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.balance}>
          <Ionicons name="star" size={14} color={colors.accent} />
          <Text style={[styles.balanceText, { color: colors.text }]}>{coins}</Text>
        </View>
        {equippedItem && !previewItem ? (
          <Pressable onPress={clearSlot} style={[styles.secondaryButton, { borderColor: colors.border }]}>
            <Ionicons name="remove-circle-outline" size={17} color={colors.text} />
            <Text style={[styles.secondaryText, { color: colors.text }]}>Clear</Text>
          </Pressable>
        ) : null}
        {previewItem ? (
          <>
            <Pressable
              onPress={() => onPreview(null)}
              style={[styles.secondaryButton, { borderColor: colors.border }]}
            >
              <Text style={[styles.secondaryText, { color: colors.text }]}>Cancel</Text>
            </Pressable>
            <Pressable onPress={applyPreview} style={[styles.applyButton, { backgroundColor: colors.accent }]}>
              <Ionicons name="checkmark" size={18} color={colors.onAccent} />
              <Text style={[styles.applyText, { color: colors.onAccent }]}>Apply</Text>
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
    borderTopWidth: 1,
  },
  header: {
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  title: { fontSize: 20, fontWeight: "700" },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  slotRow: {
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  slotButton: {
    minHeight: 40,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  slotLabel: { fontWeight: "600", fontSize: 11 },
  error: { paddingHorizontal: Spacing.md, fontSize: 12 },
  itemRow: { gap: 8, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  item: {
    width: 116,
    padding: 10,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
  },
  itemIcon: { height: 30, justifyContent: "center" },
  itemName: { fontWeight: "600", fontSize: 12 },
  itemMeta: { fontSize: 10 },
  empty: { height: 58, justifyContent: "center" },
  emptyText: { fontSize: 12 },
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
  balanceText: { fontWeight: "600", fontSize: 13 },
  secondaryButton: {
    minHeight: 44,
    paddingHorizontal: 13,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  secondaryText: { fontWeight: "600", fontSize: 12 },
  applyButton: {
    minHeight: 44,
    paddingHorizontal: 15,
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  applyText: { fontWeight: "700", fontSize: 12 },
});
