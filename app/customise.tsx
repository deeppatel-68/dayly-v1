import AvatarRenderer from "@/components/avatar/AvatarRenderer";
import BodyColorPicker from "@/components/customise/BodyColorPicker";
import FaceStylePicker from "@/components/customise/FaceStylePicker";
import StudySpacePlaceholder from "@/components/study/StudySpacePlaceholder";
import { RENDERED_EQUIPMENT_IDS } from "@/components/3d/equipment";
import { BorderRadius, Spacing } from "@/constants/Spacing";
import { useCharacter } from "@/context/CharacterContext";
import { useCoins } from "@/context/CoinsContext";
import { useShop } from "@/context/ShopContext";
import { useTheme } from "@/context/ThemeContext";
import { ItemCategory, ShopItem } from "@/types/shop";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  InteractionManager,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const NAME_MAX_LENGTH = 20;
const RENDERED_IDS = new Set(RENDERED_EQUIPMENT_IDS);
const GROUPS: { category: Exclude<ItemCategory, "all">; title: string }[] = [
  { category: "accessory", title: "Accessories" },
];

const RARITY_COLORS = {
  common: "#A5A29A",
  rare: "#6FA8C7",
  epic: "#B792D8",
  legendary: "#D4A27F",
};

export default function CustomiseScreen() {
  const isFocused = useIsFocused();
  const { colors } = useTheme();
  const {
    character,
    updateCharacter,
    loading: characterLoading,
  } = useCharacter();
  const { coins } = useCoins();
  const {
    shopItems,
    loading: shopLoading,
    busyItemId,
    lastError,
    clearShopError,
    isOwned,
    isEquipped,
    equipItem,
    unequipItem,
  } = useShop();
  const [name, setName] = useState(character.companionName ?? "");
  const [showShop, setShowShop] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [rendererReady, setRendererReady] = useState(false);

  useEffect(() => {
    setName(character.companionName ?? "");
  }, [character.companionName]);

  useEffect(() => {
    if (!isFocused || showShop) {
      setSceneReady(false);
      setRendererReady(false);
      return;
    }

    setRendererReady(false);
    let timer: ReturnType<typeof setTimeout> | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => setSceneReady(true), 500);
    });
    return () => {
      task.cancel();
      if (timer) clearTimeout(timer);
    };
  }, [isFocused, showShop]);

  const renderedItems = useMemo(
    () =>
      shopItems.filter(
        (item) =>
          RENDERED_IDS.has(item.id) && item.equipSlot === "wearable:head",
      ),
    [shopItems],
  );

  const saveName = () => {
    const nextName = name.trim();
    setName(nextName);
    updateCharacter({ companionName: nextName || undefined });
  };

  const handleItem = async (item: ShopItem) => {
    if (!isOwned(item.id)) {
      setShowShop(true);
      return;
    }

    Haptics.selectionAsync().catch(() => {});
    if (isEquipped(item.id)) await unequipItem(item.id);
    else await equipItem(item.id);
  };

  const loading = characterLoading || shopLoading;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: "Customise",
          headerRight: () => (
            <View style={[styles.coinBalance, { borderColor: "transparent" }]}>
              <Ionicons name="star" size={14} color="#D4A27F" />
              <Text style={[styles.coinText, { color: colors.text }]}>
                {coins}
              </Text>
            </View>
          ),
        }}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.preview, { borderColor: colors.border }]}>
          {sceneReady ? (
            <AvatarRenderer
              state="idle"
              variant="shop"
              onReady={() => setRendererReady(true)}
            />
          ) : (
            <View style={styles.previewLoading}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          )}
          {sceneReady && !rendererReady && (
            <View style={styles.previewLoading} pointerEvents="none">
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          )}
          <View style={styles.previewNameWrap} pointerEvents="none">
            <Text style={styles.previewName}>
              {name.trim() || "Your companion"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            onBlur={saveName}
            onSubmitEditing={saveName}
            maxLength={NAME_MAX_LENGTH}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            placeholder="Name your companion"
            placeholderTextColor={colors.textTertiary}
            style={[
              styles.nameInput,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Body colour
          </Text>
          <BodyColorPicker
            value={character.bodyColor}
            onChange={(bodyColor) => updateCharacter({ bodyColor })}
            showNames
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Face
          </Text>
          <FaceStylePicker
            value={character.faceStyle}
            onChange={(faceStyle) => updateCharacter({ faceStyle })}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Accessories
            </Text>
            {loading && (
              <ActivityIndicator size="small" color={colors.accent} />
            )}
          </View>

          {lastError && (
            <Pressable
              onPress={clearShopError}
              style={[styles.errorBanner, { borderColor: colors.error }]}
            >
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>
                {lastError}
              </Text>
              <Ionicons name="close" size={16} color={colors.error} />
            </Pressable>
          )}

          {GROUPS.map((group) => (
            <View key={group.category} style={styles.equipmentGroup}>
              <Text
                style={[styles.groupTitle, { color: colors.textSecondary }]}
              >
                {group.title}
              </Text>
              <View style={styles.itemGrid}>
                {renderedItems
                  .filter((item) => item.category === group.category)
                  .map((item) => (
                    <EquipmentItem
                      key={item.id}
                      item={item}
                      owned={isOwned(item.id)}
                      equipped={isEquipped(item.id)}
                      busy={busyItemId === item.id}
                      colors={colors}
                      onPress={() => handleItem(item)}
                    />
                  ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <StudySpacePlaceholder
        visible={showShop}
        onClose={() => setShowShop(false)}
        showTimer={false}
        initialShopOpen
      />
    </View>
  );
}

function EquipmentItem({
  item,
  owned,
  equipped,
  busy,
  colors,
  onPress,
}: {
  item: ShopItem;
  owned: boolean;
  equipped: boolean;
  busy: boolean;
  colors: ReturnType<typeof useTheme>["colors"];
  onPress: () => void;
}) {
  const rarity = item.rarity ?? "common";
  const rarityColor = RARITY_COLORS[rarity];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${
        equipped ? "equipped" : owned ? "owned" : "open in shop"
      }`}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        {
          backgroundColor: colors.card,
          borderColor: equipped ? colors.accent : colors.border,
          opacity: !owned ? 0.55 : pressed ? 0.78 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.itemIcon,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Ionicons name={item.icon as never} size={23} color={rarityColor} />
        )}
      </View>
      <View style={styles.itemCopy}>
        <Text
          numberOfLines={1}
          style={[styles.itemName, { color: colors.text }]}
        >
          {item.name}
        </Text>
        <Text style={[styles.itemState, { color: colors.textSecondary }]}>
          {equipped ? "Equipped" : owned ? "Owned" : `${item.cost} coins`}
        </Text>
      </View>
      <Ionicons
        name={
          equipped
            ? "checkmark-circle"
            : owned
              ? "add-circle-outline"
              : "storefront-outline"
        }
        size={20}
        color={equipped ? colors.accent : colors.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  coinBalance: {
    minWidth: 54,
    height: 32,
    paddingHorizontal: Spacing.xs,
    borderWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  coinText: { fontFamily: "Outfit-SemiBold", fontSize: 14 },
  preview: {
    height: 260,
    backgroundColor: "#181715",
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: Spacing.xl,
  },
  previewNameWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: Spacing.md,
    alignItems: "center",
  },
  previewLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  previewName: {
    fontFamily: "Outfit-Bold",
    fontSize: 18,
    color: "#F7F4ED",
    backgroundColor: "rgba(20, 20, 19, 0.68)",
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  section: { marginBottom: Spacing.xl },
  sectionTitle: {
    fontFamily: "Outfit-Bold",
    fontSize: 18,
    marginBottom: Spacing.md,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nameInput: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontFamily: "Outfit-Medium",
    fontSize: 16,
  },
  errorBanner: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  errorText: { flex: 1, fontFamily: "Outfit-Medium", fontSize: 13 },
  equipmentGroup: { marginBottom: Spacing.lg },
  groupTitle: {
    fontFamily: "Outfit-SemiBold",
    fontSize: 13,
    textTransform: "uppercase",
    marginBottom: Spacing.sm,
  },
  itemGrid: { gap: Spacing.sm },
  item: {
    minHeight: 66,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  itemCopy: { flex: 1, minWidth: 0 },
  itemName: { fontFamily: "Outfit-SemiBold", fontSize: 15 },
  itemState: { fontFamily: "Outfit-Regular", fontSize: 12, marginTop: 2 },
});
