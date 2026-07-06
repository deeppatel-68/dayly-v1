import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Animated,
  View,
  StyleSheet,
  Modal,
  Pressable,
  Text,
  ScrollView,
  TextInput,
  FlatList,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useCharacter } from "@/context/CharacterContext";
import { useCoins } from "@/context/CoinsContext";
import { useShop } from "@/context/ShopContext";
import { useXp } from "@/context/XpContext";
import { Ionicons } from "@expo/vector-icons";
import { RENDERED_EQUIPMENT_IDS } from "@/components/3d/equipment";
import AvatarRenderer from "@/components/avatar/AvatarRenderer";
import { AvatarState } from "@/components/avatar/avatarTypes";
import StudyRoomScene from "@/components/room/StudyRoomScene";
import FocusTimer from "@/components/study/FocusTimer";
import { Spacing, BorderRadius, Shadows } from "@/constants/Spacing";
import { AVATAR_BODY_COLORS } from "@/data/avatarColors";
import { shopItems } from "@/data/shopItems";
import * as Haptics from "expo-haptics";
import { ItemCategory, ItemRarity, ShopItem } from "@/types/shop";

interface StudySpacePlaceholderProps {
  visible: boolean;
  onClose: () => void;
  showTimer?: boolean;
}

// Shop item ids the 3D layer actually displays (wearables + pod decorations
// on the companion, wall art + furniture in the study room). Items outside
// this list show as "Coming Soon" and cannot be bought.
const RENDERED_ITEM_IDS = new Set<string>(RENDERED_EQUIPMENT_IDS);
const itemAffectsAvatar = (id: string) => RENDERED_ITEM_IDS.has(id);

// Item Card Component
interface ItemCardProps {
  item: ShopItem;
  owned: boolean;
  equipped: boolean;
  coins: number;
  colors: any;
  rarityColor: string;
  borderWidth: number;
  comingSoon: boolean;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}

function ItemCard({
  item,
  owned,
  equipped,
  coins,
  colors,
  rarityColor,
  borderWidth,
  comingSoon,
  busy,
  disabled,
  onPress,
}: ItemCardProps) {
  const canAfford = coins >= item.cost;
  const locked = comingSoon || disabled || busy;
  const actionLabel = comingSoon
    ? "Preview soon"
    : busy
      ? "Working..."
      : equipped
        ? "Equipped"
        : owned
          ? "Equip"
          : canAfford
            ? "Buy"
            : `Need ${item.cost - coins}`;
  const actionIcon = comingSoon
    ? "construct-outline"
    : equipped
      ? "checkmark"
      : owned
        ? "shirt-outline"
        : canAfford
          ? "bag-add-outline"
          : "lock-closed-outline";
  const actionColor = comingSoon
    ? colors.textSecondary
    : equipped
      ? colors.background
      : owned || canAfford
        ? colors.background
        : colors.textSecondary;
  const actionBackground = comingSoon
    ? colors.border + "30"
    : equipped
      ? colors.accent
      : owned || canAfford
        ? colors.text
        : colors.border + "30";

  return (
    <Pressable
      disabled={locked}
      style={({ pressed }) => [
        styles.itemCard,
        {
          backgroundColor: colors.card,
          borderColor: equipped
            ? colors.accent
            : comingSoon
              ? colors.border
              : rarityColor,
          borderWidth: equipped ? 2 : comingSoon ? 1 : borderWidth,
          opacity: comingSoon ? 0.72 : pressed ? 0.86 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.itemCardTop}>
        <View
          style={[
            styles.itemIconContainer,
            {
              backgroundColor: colors.background,
              borderColor: equipped ? colors.accent : colors.border,
            },
          ]}
        >
          <Ionicons
            name={item.icon as any}
            size={30}
            color={rarityColor !== colors.border ? rarityColor : colors.text}
          />
        </View>

        <View
          style={[
            styles.costChip,
            {
              backgroundColor: colors.background,
              borderColor: canAfford || owned ? colors.border : "#D4A27F",
            },
          ]}
        >
          <Ionicons name="star" size={12} color="#D4A27F" />
          <Text
            style={[
              styles.costChipText,
              { color: canAfford || owned ? colors.text : colors.textSecondary },
            ]}
          >
            {item.cost}
          </Text>
        </View>
      </View>

      <View style={styles.itemCardInfo}>
        <View style={styles.itemCardHeader}>
          <Text
            style={[styles.itemCardName, { color: colors.text }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
        </View>

        <Text
          style={[styles.itemDescription, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {item.description}
        </Text>

        <View style={styles.itemMetaRow}>
          <View
            style={[
              styles.rarityBadge,
              { backgroundColor: rarityColor + "20" },
            ]}
          >
            <Text
              style={[
                styles.rarityBadgeText,
                {
                  color:
                    rarityColor !== colors.border
                      ? rarityColor
                      : colors.textSecondary,
                },
              ]}
            >
              {(item.rarity ?? "common").toUpperCase()}
            </Text>
          </View>
          {owned && (
            <View
              style={[
                styles.ownedBadge,
                {
                  backgroundColor: equipped
                    ? colors.accent + "20"
                    : colors.border + "20",
                },
              ]}
            >
              <Ionicons
                name={equipped ? "checkmark-circle" : "checkmark"}
                size={11}
                color={equipped ? colors.accent : colors.textSecondary}
              />
              <Text
                style={[
                  styles.ownedBadgeText,
                  { color: equipped ? colors.accent : colors.textSecondary },
                ]}
              >
                {equipped ? "On" : "Owned"}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View
        style={[
          styles.actionPill,
          {
            backgroundColor: actionBackground,
            borderColor: comingSoon ? colors.border : actionBackground,
          },
        ]}
      >
        <Ionicons name={actionIcon as any} size={13} color={actionColor} />
        <Text style={[styles.actionPillText, { color: actionColor }]}>
          {actionLabel}
        </Text>
      </View>
    </Pressable>
  );
}

export default function StudySpacePlaceholder({
  visible,
  onClose,
  showTimer = true,
}: StudySpacePlaceholderProps) {
  const { colors } = useTheme();
  const [showShop, setShowShop] = useState(false);
  const [characterState, setCharacterState] = useState<AvatarState>("idle");

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* My Space: the companion at home in its study nook */}
        <View style={styles.roomArea}>
          <StudyRoomScene state={characterState} />
        </View>

        {/* Overlay UI */}
        <View style={styles.overlay}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <Pressable
              style={[styles.iconButton, { backgroundColor: colors.card }]}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
            <Pressable
              style={[styles.iconButton, { backgroundColor: colors.card }]}
              onPress={() => setShowShop(true)}
            >
              <Ionicons name="storefront" size={24} color={colors.text} />
            </Pressable>
          </View>

          {/* Timer in center - only show if showTimer is true */}
          {showTimer && (
            <View style={styles.timerContainer}>
              <FocusTimer onStateChange={setCharacterState} />
            </View>
          )}
        </View>

        {/* Shop Modal */}
        <ShopModal
          visible={showShop}
          onClose={() => setShowShop(false)}
        />
      </View>
    </Modal>
  );
}

// Body colour swatch with a spring when it becomes selected
function ColorSwatch({
  hex,
  name,
  selected,
  accentColor,
  borderColor,
  onSelect,
}: {
  hex: string;
  name: string;
  selected: boolean;
  accentColor: string;
  borderColor: string;
  onSelect: () => void;
}) {
  const scale = useRef(new Animated.Value(selected ? 1.08 : 1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: selected ? 1.08 : 1,
      speed: 24,
      bounciness: 3,
      useNativeDriver: true,
    }).start();
  }, [selected, scale]);

  return (
    <Pressable accessibilityLabel={name} onPress={onSelect}>
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.swatch,
            {
              backgroundColor: hex,
              borderColor: selected ? accentColor : borderColor,
              borderWidth: selected ? 2 : 1,
              opacity: pressed ? 0.8 : 1,
              transform: [{ scale }],
            },
          ]}
        />
      )}
    </Pressable>
  );
}

// Shop Component
function ShopModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { character, updateCharacter } = useCharacter();
  const { coins } = useCoins();
  const { level } = useXp();
  const {
    isOwned,
    isEquipped,
    buyItem,
    equipItem,
    ownedItems,
    loading,
    busyItemId,
    lastError,
    clearShopError,
  } = useShop();
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Verify shopItems is loaded
  if (!shopItems || shopItems.length === 0) {
    console.error("shopItems is not loaded! Check import path: @/data/shopItems");
  }

  // Get equipped accessories
  const equippedAccessories = useMemo(() => {
    return shopItems.filter((item) => {
      return (
        item.category === "accessory" &&
        ownedItems.some(
          (ownedItem) => ownedItem.itemId === item.id && ownedItem.equipped
        )
      );
    });
  }, [ownedItems]);

  // Filter and search items
  const filteredItems = useMemo(() => {
    // Ensure shopItems is available
    const items = shopItems || [];
    if (items.length === 0) {
      return [];
    }
    return items.filter((item) => {
      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;
      const matchesSearch =
        searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Sort by rarity (legendary > epic > rare > common) then by cost
  const sortedItems = useMemo(() => {
    const rarityOrder: Record<ItemRarity, number> = {
      legendary: 4,
      epic: 3,
      rare: 2,
      common: 1,
    };
    return [...filteredItems].sort((a, b) => {
      const aRarity = rarityOrder[a.rarity || "common"];
      const bRarity = rarityOrder[b.rarity || "common"];
      if (aRarity !== bRarity) {
        return bRarity - aRarity;
      }
      return a.cost - b.cost;
    });
  }, [filteredItems]);

  const handleBuy = async (itemId: string) => {
    const bought = await buyItem(itemId);
    Haptics.notificationAsync(
      bought
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning
    );
  };

  const handleEquip = async (itemId: string) => {
    await equipItem(itemId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const getRarityColor = (rarity?: ItemRarity): string => {
    switch (rarity) {
      case "legendary":
        return "#D4A27F"; // Kraft tan
      case "epic":
        return "#9B59B6"; // Purple
      case "rare":
        return "#3498DB"; // Blue
      default:
        return colors.border; // Common - default border
    }
  };

  const getRarityBorderWidth = (rarity?: ItemRarity): number => {
    switch (rarity) {
      case "legendary":
        return 3;
      case "epic":
        return 2;
      case "rare":
        return 2;
      default:
        return 1;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.shopOverlay, { backgroundColor: colors.background }]}>
        <View style={[styles.shopContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.shopHandle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.shopHeader}>
            <View style={styles.shopTitleBlock}>
              <Text style={[styles.shopTitle, { color: colors.text }]}>
                Companion Shop
              </Text>
              <Text
                style={[styles.shopSubtitle, { color: colors.textSecondary }]}
              >
                Spend focus coins on upgrades for your study companion.
              </Text>
            </View>
            <View style={styles.headerRight}>
              <View
                style={[
                  styles.coinDisplay,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons name="star" size={18} color="#D4A27F" />
                <Text style={[styles.coinText, { color: colors.text }]}>
                  {coins}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                style={[
                  styles.closeButton,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>
          </View>

          <View style={styles.shopSummaryRow}>
            <View
              style={[
                styles.summaryPill,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons name="cube-outline" size={13} color={colors.accent} />
              <Text style={[styles.summaryText, { color: colors.text }]}>
                {ownedItems.length} owned
              </Text>
            </View>
            <View
              style={[
                styles.summaryPill,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons name="sparkles" size={13} color="#D4A27F" />
              <Text style={[styles.summaryText, { color: colors.text }]}>
                {equippedAccessories.length} equipped
              </Text>
            </View>
            <View
              style={[
                styles.summaryPill,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons name="flash-outline" size={13} color={colors.accent} />
              <Text style={[styles.summaryText, { color: colors.text }]}>
                Level {level}
              </Text>
            </View>
          </View>

          {lastError && (
            <View
              style={[
                styles.noticeBanner,
                { backgroundColor: "#D4A27F20", borderColor: "#D4A27F55" },
              ]}
            >
              <Ionicons name="alert-circle-outline" size={16} color="#D4A27F" />
              <Text style={[styles.noticeText, { color: colors.text }]}>
                {lastError}
              </Text>
              <Pressable onPress={clearShopError} hitSlop={8}>
                <Ionicons
                  name="close"
                  size={16}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>
          )}

          {/* Main Content - Vertical Layout */}
          <View style={styles.shopMainContent}>
            {/* Top - Character Preview */}
            <View
              style={[
                styles.characterSection,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Companion Setup
                </Text>
                <Text
                  style={[styles.sectionMeta, { color: colors.textSecondary }]}
                >
                  Body colour syncs to your account
                </Text>
              </View>

              <View style={styles.characterContent}>
                {/* 3D Character preview */}
                <View style={styles.characterPreview}>
                  <View
                    style={[
                      styles.character3DPlaceholder,
                      { borderColor: colors.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.character3DPlaceholderInner,
                        { backgroundColor: colors.background },
                      ]}
                    >
                      <AvatarRenderer variant="shop" />
                    </View>
                  </View>
                </View>

                {/* Character Details */}
                <View style={styles.characterDetails}>
                  <Text
                    style={[
                      styles.characterDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Pick a body colour, then equip accessories you unlock from
                    the shop below.
                  </Text>

                  {/* Body colour swatches */}
                  <View style={styles.swatchRow}>
                    {AVATAR_BODY_COLORS.map((swatch) => (
                      <ColorSwatch
                        key={swatch.id}
                        hex={swatch.hex}
                        name={swatch.name}
                        selected={character.bodyColor === swatch.hex}
                        accentColor={colors.accent}
                        borderColor={colors.border}
                        onSelect={() => {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light
                          );
                          updateCharacter({ bodyColor: swatch.hex });
                        }}
                      />
                    ))}
                  </View>

                  <View style={styles.characterStatsRow}>
                    <View
                      style={[
                        styles.statChip,
                        { borderColor: colors.border, backgroundColor: colors.background },
                      ]}
                    >
                      <Ionicons name="star" size={12} color={colors.accent} />
                      <Text style={[styles.statChipText, { color: colors.text }]}>
                        Level {level}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statChip,
                        { borderColor: colors.border, backgroundColor: colors.background },
                      ]}
                    >
                      <Ionicons
                        name="color-palette"
                        size={12}
                        color={colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.statChipText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {AVATAR_BODY_COLORS.find(
                          (c) => c.hex === character.bodyColor
                        )?.name ?? "Custom"}
                      </Text>
                    </View>
                  </View>

                  {equippedAccessories.length > 0 ? (
                    <View style={styles.equippedBadges}>
                      {equippedAccessories.map((item) => (
                        <View
                          key={item.id}
                          style={[
                            styles.equippedBadge,
                            { backgroundColor: colors.accent + "20" },
                          ]}
                        >
                          <Ionicons
                            name={item.icon as any}
                            size={10}
                            color={colors.accent}
                          />
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text
                      style={[
                        styles.emptyAccessoriesText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      More ways to customise your companion are coming soon.
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Bottom - Items Grid */}
            <View style={styles.itemsSection}>
              {/* Search and Filters - Compact Combined Section */}
              <View style={styles.searchFilterSection}>
                <View style={styles.searchRow}>
                  <View
                    style={[
                      styles.searchContainer,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Ionicons
                      name="search"
                      size={16}
                      color={colors.textSecondary}
                      style={styles.searchIcon}
                    />
                    <TextInput
                      style={[styles.searchInput, { color: colors.text }]}
                      placeholder="Search cosmetics..."
                      placeholderTextColor={colors.textSecondary}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                      <Pressable onPress={() => setSearchQuery("")}>
                        <Ionicons
                          name="close-circle"
                          size={16}
                          color={colors.textSecondary}
                        />
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* Category Filters */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoryContainer}
                  contentContainerStyle={styles.categoryContent}
                >
                  {(["all", "decoration", "accessory", "furniture"] as ItemCategory[]).map(
                    (category) => (
                      <Pressable
                        key={category}
                        style={({ pressed }) => [
                          styles.categoryButton,
                          {
                            backgroundColor:
                              selectedCategory === category
                                ? colors.accent
                                : colors.card,
                            borderColor:
                              selectedCategory === category
                                ? colors.accent
                                : colors.border,
                            opacity: pressed ? 0.8 : 1,
                          },
                        ]}
                        onPress={() => setSelectedCategory(category)}
                      >
                        <Text
                          style={[
                            styles.categoryText,
                            {
                              color:
                                selectedCategory === category
                                  ? colors.background
                                  : colors.text,
                            },
                          ]}
                        >
                          {category === "all"
                            ? "All"
                            : category.charAt(0).toUpperCase() + category.slice(1)}
                        </Text>
                      </Pressable>
                    )
                  )}
                </ScrollView>
              </View>

              {/* Items Grid - Using FlatList for Performance */}
              {sortedItems.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="search-outline"
                    size={48}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[styles.emptyText, { color: colors.textSecondary }]}
                  >
                    No items found
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={sortedItems}
                  numColumns={2}
                  key={`flatlist-${selectedCategory}`}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => {
                    const owned = isOwned(item.id);
                    const equipped = isEquipped(item.id);
                    const rarityColor = getRarityColor(item.rarity);
                    const borderWidth = getRarityBorderWidth(item.rarity);
                    // No shop item is rendered on the avatar yet, so none are
                    // purchasable — they show as "Coming Soon" instead of
                    // letting users spend coins on an invisible item
                    const comingSoon = !itemAffectsAvatar(item.id);

                    return (
                      <View style={styles.itemCardWrapper}>
                        <ItemCard
                          item={item}
                          owned={owned}
                          equipped={equipped}
                          coins={coins}
                          colors={colors}
                          rarityColor={rarityColor}
                          borderWidth={borderWidth}
                          comingSoon={comingSoon}
                          busy={busyItemId === item.id}
                          disabled={loading || Boolean(busyItemId)}
                          onPress={() => {
                            if (comingSoon || loading || busyItemId) {
                              return;
                            }
                            if (owned) {
                              handleEquip(item.id);
                            } else {
                              handleBuy(item.id);
                            }
                          }}
                        />
                      </View>
                    );
                  }}
                  contentContainerStyle={styles.itemsGridContent}
                  showsVerticalScrollIndicator={false}
                  columnWrapperStyle={styles.itemsRow}
                />
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  roomArea: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: "box-none",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: Spacing.md,
    paddingTop: 60,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  timerContainer: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  // Shop Styles - New Design
  shopOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  shopContainer: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    maxHeight: "92%",
    flex: 1,
  },
  shopHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing.md,
    opacity: 0.8,
  },
  shopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  shopTitleBlock: {
    flex: 1,
  },
  shopTitle: {
    fontSize: 28,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0,
  },
  shopSubtitle: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    lineHeight: 16,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  coinDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 9,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  coinText: {
    fontSize: 16,
    fontFamily: "Outfit-SemiBold",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  shopSummaryRow: {
    flexDirection: "row",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  summaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  summaryText: {
    fontSize: 11,
    fontFamily: "Outfit-SemiBold",
  },
  noticeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Outfit-SemiBold",
    lineHeight: 16,
  },
  shopMainContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  characterSection: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    alignItems: "stretch",
    minHeight: 154,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.8,
    alignSelf: "flex-start",
    textTransform: "uppercase",
  },
  sectionMeta: {
    flexShrink: 1,
    fontSize: 10,
    fontFamily: "Outfit-Regular",
    textAlign: "right",
  },
  characterContent: {
    width: "100%",
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "center",
  },
  characterPreview: {
    alignItems: "center",
    justifyContent: "center",
  },
  character3DPlaceholder: {
    width: 112,
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
    alignSelf: "center",
    position: "relative",
    overflow: "hidden",
  },
  character3DPlaceholderInner: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  gradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
  },
  characterDetails: {
    flex: 1,
    gap: Spacing.xs,
  },
  characterDescription: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    lineHeight: 16,
  },
  characterStatsRow: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  swatchRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs / 2,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  statChipText: {
    fontSize: 11,
    fontFamily: "Outfit-SemiBold",
  },
  equippedBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: 2,
    justifyContent: "flex-start",
  },
  equippedBadge: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyAccessoriesText: {
    fontSize: 11,
    fontFamily: "Outfit-Regular",
    opacity: 0.8,
  },
  // Items Section (Bottom) - Takes 60-65% of screen
  itemsSection: {
    flex: 1,
  },
  searchFilterSection: {
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    flex: 1,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Outfit-Regular",
  },
  categoryContainer: {
    flexGrow: 0,
  },
  categoryContent: {
    gap: Spacing.xs,
    paddingRight: Spacing.lg,
    paddingVertical: 2,
  },
  categoryButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: "Outfit-SemiBold",
    letterSpacing: 0.5,
  },
  itemsGridContent: {
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.xs,
  },
  itemsRow: {
    justifyContent: "flex-start",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  itemCardWrapper: {
    width: "48.5%",
    maxWidth: "48.5%",
  },
  itemCard: {
    width: "100%",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    minHeight: 204,
    ...Shadows.dark.sm,
  },
  itemCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  itemIconContainer: {
    width: 54,
    height: 54,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  costChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  costChipText: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },
  itemCardInfo: {
    gap: Spacing.sm,
    flex: 1,
  },
  itemCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.xs,
  },
  itemCardName: {
    fontSize: 14,
    fontFamily: "Outfit-SemiBold",
    flex: 1,
    lineHeight: 18,
  },
  itemDescription: {
    fontSize: 11,
    fontFamily: "Outfit-Regular",
    lineHeight: 15,
  },
  itemMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  rarityBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    alignSelf: "flex-start",
  },
  rarityBadgeText: {
    fontSize: 9,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.5,
  },
  ownedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  ownedBadgeText: {
    fontSize: 9,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.4,
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingVertical: 9,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  actionPillText: {
    fontSize: 11,
    fontFamily: "Outfit-SemiBold",
    letterSpacing: 0.3,
  },
  statusBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    alignSelf: "flex-start",
    marginTop: Spacing.xs,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: "Outfit-SemiBold",
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl * 2,
    width: "100%",
    paddingHorizontal: Spacing.lg,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    marginTop: Spacing.md,
    textAlign: "center",
  },
});
