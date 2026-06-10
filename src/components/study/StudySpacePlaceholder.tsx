import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Text,
  ScrollView,
  TextInput,
  Dimensions,
  FlatList,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useCharacter } from "@/context/CharacterContext";
import { useCoins } from "@/context/CoinsContext";
import { useShop } from "@/context/ShopContext";
import { Ionicons } from "@expo/vector-icons";
import CharacterScene, {
  CharacterState,
} from "@/components/character/CharacterScene";
import FocusTimer from "@/components/study/FocusTimer";
import { Spacing, BorderRadius, Shadows } from "@/constants/Spacing";
import { shopItems } from "@/data/shopItems";
import { ItemCategory, ItemRarity, ShopItem } from "@/types/shop";

interface StudySpacePlaceholderProps {
  visible: boolean;
  onClose: () => void;
  showTimer?: boolean;
}

// Item Card Component
interface ItemCardProps {
  item: ShopItem;
  owned: boolean;
  equipped: boolean;
  coins: number;
  colors: any;
  rarityColor: string;
  borderWidth: number;
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
  onPress,
}: ItemCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.itemCard,
        {
          backgroundColor: colors.card,
          borderColor: rarityColor,
          borderWidth: borderWidth,
          opacity: pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      onPress={onPress}
    >
      {/* Item Icon */}
      <View
        style={[
          styles.itemIconContainer,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons
          name={item.icon as any}
          size={32}
          color={rarityColor !== colors.border ? rarityColor : colors.text}
        />
      </View>

      {/* Item Info */}
      <View style={styles.itemCardInfo}>
        <View style={styles.itemCardHeader}>
          <Text
            style={[styles.itemCardName, { color: colors.text }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {item.rarity && item.rarity !== "common" && (
            <View
              style={[
                styles.rarityBadgeSmall,
                { backgroundColor: rarityColor + "20" },
              ]}
            >
              <Text
                style={[styles.rarityTextSmall, { color: rarityColor }]}
              >
                {item.rarity.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Cost */}
        <View style={styles.itemCardCost}>
          <Ionicons name="star" size={14} color="#ffd700" />
          <Text
            style={[
              styles.itemCardCostText,
              {
                color: coins >= item.cost ? colors.text : colors.textSecondary,
              },
            ]}
          >
            {item.cost}
          </Text>
        </View>

        {/* Status Badge */}
        {owned && (
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: equipped
                  ? colors.accent + "20"
                  : colors.border + "20",
              },
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                {
                  color: equipped ? colors.accent : colors.textSecondary,
                },
              ]}
            >
              {equipped ? "Equipped" : "Owned"}
            </Text>
          </View>
        )}
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
  const [characterState, setCharacterState] = useState<CharacterState>("idle");

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Study Space avatar scene */}
        <View style={[styles.placeholderArea, { backgroundColor: colors.card }]}>
          <View
            style={[
              styles.placeholderBox,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <CharacterScene state={characterState} />
          </View>
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

// Shop Component
function ShopModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { character } = useCharacter();
  const { coins, spendCoins } = useCoins();
  const { isOwned, isEquipped, buyItem, equipItem, ownedItems } = useShop();
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Verify shopItems is loaded
  if (!shopItems || shopItems.length === 0) {
    console.error("shopItems is not loaded! Check import path: @/data/shopItems");
  }

  // Get equipped accessories
  const equippedAccessories = useMemo(() => {
    return shopItems.filter((item) => {
      return item.category === "accessory" && isEquipped(item.id);
    });
  }, [ownedItems, shopItems, isEquipped]);

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
  }, [selectedCategory, searchQuery, shopItems]);

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

  const handleBuy = (itemId: string, cost: number) => {
    if (spendCoins(cost)) {
      buyItem(itemId);
    }
  };

  const handleEquip = (itemId: string) => {
    equipItem(itemId);
  };

  const getRarityColor = (rarity?: ItemRarity): string => {
    switch (rarity) {
      case "legendary":
        return "#FFD700"; // Gold
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
          {/* Header */}
          <View style={styles.shopHeader}>
            <Text style={[styles.shopTitle, { color: colors.text }]}>
              Shop
            </Text>
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
                <Ionicons name="star" size={18} color="#ffd700" />
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

          {/* Main Content - Vertical Layout */}
          <View style={styles.shopMainContent}>
            {/* Top - Character Preview */}
            <View
              style={[
                styles.characterSection,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Character
              </Text>

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
                      <CharacterScene variant="preview" />
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
                    Customize your study buddy soon. Unlock accessories by
                    staying focused.
                  </Text>

                  <View style={styles.characterStatsRow}>
                    <View
                      style={[
                        styles.statChip,
                        { borderColor: colors.border, backgroundColor: colors.background },
                      ]}
                    >
                      <Ionicons name="star" size={12} color={colors.accent} />
                      <Text style={[styles.statChipText, { color: colors.text }]}>
                        Lv.1
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
                        {character.color}
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
                      Equip accessories from the shop to personalize your avatar.
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
                      placeholder="Search items..."
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
                  <Pressable
                    style={({ pressed }) => [
                      styles.filterButton,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Ionicons name="options-outline" size={16} color={colors.text} />
                  </Pressable>
                </View>

                {/* Category Filters */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoryContainer}
                  contentContainerStyle={styles.categoryContent}
                >
                  {(["all", "decoration", "furniture", "accessory"] as ItemCategory[]).map(
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
                  renderItem={({ item, index }) => {
                    const owned = isOwned(item.id);
                    const equipped = isEquipped(item.id);
                    const rarityColor = getRarityColor(item.rarity);
                    const borderWidth = getRarityBorderWidth(item.rarity);

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
                          onPress={() => {
                            if (owned) {
                              handleEquip(item.id);
                            } else if (coins >= item.cost) {
                              handleBuy(item.id, item.cost);
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
  placeholderArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  placeholderBox: {
    width: "100%",
    maxWidth: 400,
    aspectRatio: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  placeholderText: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
    marginBottom: 4,
    zIndex: 1,
  },
  comingSoonText: {
    fontSize: 10,
    fontFamily: "Outfit-Regular",
    opacity: 0.8,
    zIndex: 1,
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
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    maxHeight: "90%",
    flex: 1,
  },
  shopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  shopTitle: {
    fontSize: 32,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.5,
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
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
  shopMainContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  // Character Section (Top) - Max 25% of screen
  characterSection: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    alignItems: "center",
    maxHeight: "25%",
    minHeight: 120,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
    marginBottom: Spacing.xs,
    letterSpacing: 0.5,
    alignSelf: "flex-start",
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
    width: 120,
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
    minHeight: "60%",
  },
  searchFilterSection: {
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
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
    paddingVertical: Spacing.xs,
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
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryContainer: {
    maxHeight: 36,
  },
  categoryContent: {
    gap: Spacing.xs,
    paddingRight: Spacing.md,
  },
  categoryButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
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
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  itemCardWrapper: {
    width: "48%",
    maxWidth: "48%",
  },
  itemCard: {
    width: "100%",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    minHeight: 150,
    ...Shadows.dark.sm,
  },
  itemIconContainer: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: Spacing.sm,
    alignSelf: "center",
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
    marginBottom: Spacing.xs,
  },
  itemCardName: {
    fontSize: 13,
    fontFamily: "Outfit-SemiBold",
    flex: 1,
    lineHeight: 16,
  },
  rarityBadgeSmall: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  rarityTextSmall: {
    fontSize: 10,
    fontFamily: "Outfit-Bold",
  },
  itemCardCost: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  itemCardCostText: {
    fontSize: 13,
    fontFamily: "Outfit-SemiBold",
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

