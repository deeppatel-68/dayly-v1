import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Animated,
  ActivityIndicator,
  View,
  StyleSheet,
  Modal,
  Pressable,
  Text,
  ScrollView,
  TextInput,
  FlatList,
  InteractionManager,
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
import RoomDecorSheet from "@/components/room/RoomDecorSheet";
import RoomZoneControls from "@/components/room/RoomZoneControls";
import {
  getRoomViewForEquipSlot,
  isHomeEquipSlot,
} from "@/components/room/roomDecor";
import type { RoomView } from "@/components/room/roomNavigation";
import CompanionDialogue from "@/components/companion/CompanionDialogue";
import { useCompanionPresence } from "@/components/companion/useCompanionPresence";
import FocusTimer from "@/components/study/FocusTimer";
import {
  Spacing,
  BorderRadius,
  Shadows,
  TouchTarget,
} from "@/constants/Spacing";
import { StudioType } from "@/constants/Typography";
import type { ThemeColors } from "@/constants/Colors";
import { AVATAR_BODY_COLORS } from "@/data/avatarColors";
import * as Haptics from "expo-haptics";
import { ItemCategory, ItemRarity, ShopItem } from "@/types/shop";

interface StudySpacePlaceholderProps {
  visible: boolean;
  onClose: () => void;
  showTimer?: boolean;
  initialShopOpen?: boolean;
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
  colors: ThemeColors;
  rarityColor: string;
  borderWidth: number;
  comingSoon: boolean;
  busy: boolean;
  disabled: boolean;
  viewInRoom: boolean;
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
  viewInRoom,
  onPress,
}: ItemCardProps) {
  const canAfford = coins >= item.cost;
  const locked = comingSoon || disabled || busy;
  const actionLabel = viewInRoom
    ? equipped
      ? "In room"
      : "View in room"
    : comingSoon
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
  const actionIcon = viewInRoom
    ? "home-outline"
    : comingSoon
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
      ? colors.onAccent
      : owned || canAfford
        ? colors.onAccent
        : colors.textSecondary;
  const actionBackground = comingSoon
    ? colors.surfaceSelected
    : equipped
      ? colors.accent
      : owned || canAfford
        ? colors.text
        : colors.surfaceSelected;

  return (
    <Pressable
      disabled={locked}
      style={({ pressed }) => [
        styles.itemCard,
        {
          backgroundColor: colors.surface,
          borderColor: equipped
            ? colors.accent
            : comingSoon
              ? colors.separator
              : rarityColor,
          borderWidth: equipped ? 2 : comingSoon ? 1 : borderWidth,
          opacity: comingSoon ? 0.66 : pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${actionLabel}`}
      accessibilityState={{ disabled: locked, selected: equipped }}
    >
      <View style={styles.itemCardTop}>
        <View
          style={[
            styles.itemIconContainer,
            {
              backgroundColor: colors.surfaceRaised,
              borderColor: equipped ? colors.accent : colors.separator,
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
              backgroundColor: colors.surfaceRaised,
              borderColor: canAfford || owned ? colors.separator : colors.error,
            },
          ]}
        >
          <Ionicons name="star" size={12} color={colors.accent} />
          <Text
            style={[
              styles.costChipText,
              {
                color: canAfford || owned ? colors.text : colors.textSecondary,
              },
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
              { backgroundColor: rarityColor + "1F" },
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
                    ? colors.completedBackground
                    : colors.surfaceSelected,
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
        {busy ? (
          <ActivityIndicator size="small" color={actionColor} />
        ) : (
          <Ionicons name={actionIcon as any} size={15} color={actionColor} />
        )}
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
  initialShopOpen = false,
}: StudySpacePlaceholderProps) {
  const { colors } = useTheme();
  const [showShop, setShowShop] = useState(false);
  const [characterState, setCharacterState] = useState<AvatarState>("idle");
  const [roomView, setRoomView] = useState<RoomView>("home");
  const [decorating, setDecorating] = useState(false);
  const [selectedEquipSlot, setSelectedEquipSlot] = useState("room:rug");
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [rendererReady, setRendererReady] = useState(false);
  const presence = useCompanionPresence({
    state: characterState,
    visible: visible && rendererReady,
    suppressAutomatic: characterState === "focus",
  });

  useEffect(() => {
    let task: ReturnType<
      typeof InteractionManager.runAfterInteractions
    > | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (visible) {
      setShowShop(initialShopOpen);
      setCharacterState("idle");
      setRoomView("home");
      setDecorating(false);
      setSelectedEquipSlot("room:rug");
      setPreviewItemId(null);
      setSceneReady(false);
      setRendererReady(false);
      task = InteractionManager.runAfterInteractions(() => {
        timer = setTimeout(() => setSceneReady(true), 1600);
      });
    } else {
      setShowShop(false);
      setDecorating(false);
      setPreviewItemId(null);
      setSceneReady(false);
      setRendererReady(false);
    }
    return () => {
      task?.cancel();
      if (timer) clearTimeout(timer);
    };
  }, [initialShopOpen, visible]);

  const selectDecorSlot = (equipSlot: string) => {
    setSelectedEquipSlot(equipSlot);
    setPreviewItemId(null);
    setRoomView(getRoomViewForEquipSlot(equipSlot));
  };

  const enterDecorateMode = (equipSlot = "room:rug", itemId?: string) => {
    setShowShop(false);
    setDecorating(true);
    setSelectedEquipSlot(equipSlot);
    setPreviewItemId(itemId ?? null);
    setRoomView(getRoomViewForEquipSlot(equipSlot));
  };

  const handleCharacterState = (nextState: AvatarState) => {
    setCharacterState(nextState);
    if (nextState === "focus") setRoomView("desk");
  };

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
          {sceneReady ? (
            <StudyRoomScene
              state={characterState}
              mood={presence.mood}
              reactionToken={presence.reactionToken}
              onInteract={presence.interact}
              onReady={() => setRendererReady(true)}
              view={roomView}
              onViewChange={setRoomView}
              previewItemId={previewItemId}
              selectedEquipSlot={decorating ? selectedEquipSlot : null}
            />
          ) : (
            <ActivityIndicator size="small" color="#D97757" />
          )}
          {sceneReady && !rendererReady && (
            <View style={styles.sceneLoading} pointerEvents="none">
              <ActivityIndicator size="small" color="#D97757" />
            </View>
          )}
        </View>

        {!decorating && (
          <CompanionDialogue
            cue={presence.cue}
            name={presence.companionName}
            style={styles.roomDialogue}
          />
        )}

        {/* Overlay UI */}
        <View style={styles.overlay} pointerEvents="box-none">
          {/* Top Bar */}
          <View style={styles.topBar}>
            <Pressable
              accessibilityLabel="Close My Space"
              style={styles.iconButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={22} color="#F0EEE6" />
            </Pressable>
            <View style={styles.topActions}>
              <Pressable
                accessibilityLabel="Decorate My Space"
                accessibilityState={{ selected: decorating }}
                style={[
                  styles.iconButton,
                  decorating && styles.iconButtonActive,
                ]}
                onPress={() =>
                  decorating
                    ? setDecorating(false)
                    : enterDecorateMode(selectedEquipSlot)
                }
              >
                <Ionicons
                  name="color-palette-outline"
                  size={21}
                  color={decorating ? "#171512" : "#F0EEE6"}
                />
              </Pressable>
              <Pressable
                accessibilityLabel="Open shop"
                style={styles.iconButton}
                onPress={() => setShowShop(true)}
              >
                <Ionicons name="storefront" size={22} color="#F0EEE6" />
              </Pressable>
            </View>
          </View>

          {rendererReady && (
            <RoomZoneControls value={roomView} onChange={setRoomView} />
          )}

          {/* Timer in center - only show if showTimer is true */}
          {showTimer && !decorating && (
            <View style={styles.timerContainer}>
              <FocusTimer
                variant="immersive"
                onStateChange={handleCharacterState}
              />
            </View>
          )}
        </View>

        {decorating && (
          <RoomDecorSheet
            selectedSlot={selectedEquipSlot}
            previewItemId={previewItemId}
            onSelectSlot={selectDecorSlot}
            onPreview={setPreviewItemId}
            onClose={() => {
              setDecorating(false);
              setPreviewItemId(null);
            }}
          />
        )}

        {/* Shop Modal */}
        <ShopModal
          visible={showShop}
          onClose={() => setShowShop(false)}
          onViewInRoom={(item) => enterDecorateMode(item.equipSlot, item.id)}
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
  onViewInRoom,
}: {
  visible: boolean;
  onClose: () => void;
  onViewInRoom: (item: ShopItem) => void;
}) {
  const { colors } = useTheme();
  const { character, updateCharacter } = useCharacter();
  const { coins } = useCoins();
  const { level } = useXp();
  const {
    shopItems,
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
  const [shopSegment, setShopSegment] = useState<"companion" | "home">(
    "companion",
  );

  // Verify shopItems is loaded
  if (!shopItems || shopItems.length === 0) {
    console.error(
      "shopItems is not loaded! Check import path: @/data/shopItems",
    );
  }

  // Get equipped accessories
  const equippedAccessories = useMemo(() => {
    return shopItems.filter((item) => {
      return (
        item.category === "accessory" &&
        ownedItems.some(
          (ownedItem) => ownedItem.itemId === item.id && ownedItem.equipped,
        )
      );
    });
  }, [ownedItems, shopItems]);

  // Filter and search items
  const filteredItems = useMemo(() => {
    // Ensure shopItems is available
    const items = shopItems || [];
    if (items.length === 0) {
      return [];
    }
    return items.filter((item) => {
      const matchesSegment =
        shopSegment === "home"
          ? isHomeEquipSlot(item.equipSlot)
          : item.equipSlot === "wearable:head";
      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;
      const matchesSearch =
        searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSegment && matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery, shopItems, shopSegment]);

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
        : Haptics.NotificationFeedbackType.Warning,
    );
  };

  const handleEquip = async (itemId: string) => {
    await equipItem(itemId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const getRarityColor = (rarity?: ItemRarity): string => {
    switch (rarity) {
      case "legendary":
        return "#D69A5B";
      case "epic":
        return "#B28AD8";
      case "rare":
        return "#6FA9D9";
      default:
        return colors.separator;
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
      <View
        style={[styles.shopOverlay, { backgroundColor: colors.overlay }]}
      >
        <View
          style={[
            styles.shopContainer,
            {
              backgroundColor: colors.surfaceRaised,
              borderColor: colors.separator,
            },
          ]}
        >
          <View
            style={[styles.shopHandle, { backgroundColor: colors.separator }]}
          />

          {/* Header */}
          <View style={styles.shopHeader}>
            <View style={styles.shopTitleBlock}>
              <Text style={[styles.shopTitle, { color: colors.text }]}>
                Studio shop
              </Text>
              <Text
                style={[styles.shopSubtitle, { color: colors.textSecondary }]}
              >
                {shopSegment === "companion"
                  ? "Pieces for Deep, collected as you grow."
                  : "Small details for a room that feels yours."}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <View
                style={[
                  styles.coinDisplay,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.separator,
                  },
                ]}
              >
                <Ionicons name="star" size={17} color={colors.accent} />
                <Text style={[styles.coinText, { color: colors.text }]}>
                  {coins}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                style={[
                  styles.closeButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.separator,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close shop"
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>
          </View>

          <View
            style={[
              styles.shopSegmentControl,
              {
                backgroundColor: colors.surface,
                borderColor: colors.separator,
              },
            ]}
          >
            {(["companion", "home"] as const).map((segment) => {
              const selected = segment === shopSegment;
              return (
                <Pressable
                  key={segment}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setShopSegment(segment);
                    setSelectedCategory("all");
                  }}
                  style={[
                    styles.shopSegmentButton,
                    {
                      backgroundColor: selected
                        ? colors.accent
                        : "transparent",
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      segment === "companion" ? "happy-outline" : "home-outline"
                    }
                    size={17}
                    color={selected ? colors.onAccent : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.shopSegmentText,
                      {
                        color: selected
                          ? colors.onAccent
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {segment === "companion" ? "Companion" : "Home"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.shopSummaryRow}>
            <View
              style={[
                styles.summaryPill,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.separator,
                },
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
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.separator,
                },
              ]}
            >
              <Ionicons name="sparkles" size={13} color={colors.accent} />
              <Text style={[styles.summaryText, { color: colors.text }]}>
                {shopSegment === "home"
                  ? ownedItems.filter(
                      (item) =>
                        item.equipped &&
                        Boolean(
                          item.equipSlot && isHomeEquipSlot(item.equipSlot),
                        ),
                    ).length
                  : equippedAccessories.length}{" "}
                {shopSegment === "home" ? "placed" : "equipped"}
              </Text>
            </View>
            <View
              style={[
                styles.summaryPill,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.separator,
                },
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
                {
                  backgroundColor: `${colors.error}1A`,
                  borderColor: colors.error,
                },
              ]}
            >
              <Ionicons name="alert-circle-outline" size={17} color={colors.error} />
              <Text style={[styles.noticeText, { color: colors.text }]}>
                {lastError}
              </Text>
              <Pressable
                onPress={clearShopError}
                style={styles.noticeDismiss}
                accessibilityRole="button"
                accessibilityLabel="Dismiss shop message"
              >
                <Ionicons name="close" size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
          )}

          {/* Main Content - Vertical Layout */}
          <View style={styles.shopMainContent}>
            {/* Top - Character Preview */}
            {shopSegment === "companion" && (
              <View
                style={[
                  styles.characterSection,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.separator,
                  },
                ]}
              >
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Companion Setup
                  </Text>
                  <Text
                    style={[
                      styles.sectionMeta,
                      { color: colors.textSecondary },
                    ]}
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
                        { borderColor: colors.separator },
                      ]}
                    >
                      <View
                        style={[
                          styles.character3DPlaceholderInner,
                          { backgroundColor: colors.backgroundSecondary },
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
                              Haptics.ImpactFeedbackStyle.Light,
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
                          {
                            borderColor: colors.separator,
                            backgroundColor: colors.surfaceRaised,
                          },
                        ]}
                      >
                        <Ionicons name="star" size={12} color={colors.accent} />
                        <Text
                          style={[styles.statChipText, { color: colors.text }]}
                        >
                          Level {level}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statChip,
                          {
                            borderColor: colors.separator,
                            backgroundColor: colors.surfaceRaised,
                          },
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
                            (c) => c.hex === character.bodyColor,
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
            )}

            {/* Bottom - Items Grid */}
            <View style={styles.itemsSection}>
              {/* Search and Filters - Compact Combined Section */}
              <View style={styles.searchFilterSection}>
                <View style={styles.searchRow}>
                  <View
                    style={[
                      styles.searchContainer,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.separator,
                      },
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
                      placeholder={
                        shopSegment === "companion"
                          ? "Search accessories..."
                          : "Search home pieces..."
                      }
                      placeholderTextColor={colors.textSecondary}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                      <Pressable
                        onPress={() => setSearchQuery("")}
                        style={styles.searchClearButton}
                        accessibilityRole="button"
                        accessibilityLabel="Clear shop search"
                      >
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
                  {(shopSegment === "companion"
                    ? (["all", "accessory"] as ItemCategory[])
                    : (["all", "decoration", "furniture"] as ItemCategory[])
                  ).map((category) => (
                    <Pressable
                      key={category}
                      style={({ pressed }) => [
                        styles.categoryButton,
                        {
                          backgroundColor:
                            selectedCategory === category
                              ? colors.accent
                              : colors.surface,
                          borderColor:
                            selectedCategory === category
                              ? colors.accent
                              : colors.separator,
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
                                ? colors.onAccent
                                : colors.text,
                          },
                        ]}
                      >
                        {category === "all"
                          ? "All"
                          : category.charAt(0).toUpperCase() +
                            category.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Items Grid - Using FlatList for Performance */}
              {loading && !busyItemId ? (
                <View style={styles.emptyState} accessibilityRole="progressbar">
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    Preparing the collection
                  </Text>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    Your pieces and prices are loading.
                  </Text>
                </View>
              ) : sortedItems.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons
                    name={searchQuery ? "search-outline" : "sparkles-outline"}
                    size={32}
                    color={colors.textSecondary}
                  />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    {searchQuery
                      ? "Nothing matches that search"
                      : "The next piece is on its way"}
                  </Text>
                  <Text
                    style={[styles.emptyText, { color: colors.textSecondary }]}
                  >
                    {searchQuery
                      ? "Try a different name or clear the search."
                      : shopSegment === "home"
                        ? "New room details will appear here."
                        : "New companion pieces will appear here."}
                  </Text>
                  {searchQuery ? (
                    <Pressable
                      style={[
                        styles.emptyAction,
                        { backgroundColor: colors.surfaceSelected },
                      ]}
                      onPress={() => setSearchQuery("")}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.emptyActionText, { color: colors.text }]}>
                        Clear search
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <FlatList
                  data={sortedItems}
                  numColumns={2}
                  key={`flatlist-${shopSegment}-${selectedCategory}`}
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
                          viewInRoom={shopSegment === "home" && owned}
                          onPress={() => {
                            if (comingSoon || loading || busyItemId) {
                              return;
                            }
                            if (shopSegment === "home" && owned) {
                              onViewInRoom(item);
                            } else if (owned) {
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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#141311",
  },
  sceneLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  roomDialogue: {
    top: 112,
    left: Spacing.md,
    zIndex: 2,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: Spacing.md,
    paddingTop: 60,
  },
  topActions: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: "rgba(240, 238, 230, 0.16)",
    backgroundColor: "rgba(24, 23, 21, 0.82)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonActive: {
    backgroundColor: "#D97757",
    borderColor: "#D97757",
  },
  timerContainer: {
    position: "absolute",
    bottom: 72,
    left: Spacing.md,
    width: 176,
    alignItems: "flex-start",
  },
  // Shop Styles - New Design
  shopOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  shopContainer: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderTopWidth: 1,
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
    ...StudioType.title,
  },
  shopSubtitle: {
    ...StudioType.detail,
    marginTop: Spacing.xs,
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
    minHeight: TouchTarget,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  coinText: {
    ...StudioType.bodyStrong,
    fontVariant: ["tabular-nums"],
  },
  closeButton: {
    width: TouchTarget,
    height: TouchTarget,
    borderRadius: BorderRadius.lg,
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
  shopSegmentControl: {
    flexDirection: "row",
    padding: 4,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  shopSegmentButton: {
    flex: 1,
    minHeight: TouchTarget,
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  shopSegmentText: {
    ...StudioType.detail,
    fontWeight: "600",
  },
  summaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  summaryText: {
    ...StudioType.detail,
    fontWeight: "600",
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
    ...StudioType.detail,
    fontWeight: "600",
  },
  noticeDismiss: {
    minWidth: TouchTarget,
    minHeight: TouchTarget,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: -Spacing.sm,
    marginRight: -Spacing.sm,
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
    ...StudioType.section,
    alignSelf: "flex-start",
    textTransform: "uppercase",
  },
  sectionMeta: {
    flexShrink: 1,
    ...StudioType.detail,
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
    ...StudioType.detail,
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
    ...StudioType.detail,
    fontWeight: "600",
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
    ...StudioType.detail,
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
    minHeight: TouchTarget,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    flex: 1,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...StudioType.body,
    paddingVertical: 0,
  },
  searchClearButton: {
    minHeight: TouchTarget,
    minWidth: TouchTarget,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: -Spacing.sm,
    marginRight: -Spacing.md,
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
    minHeight: TouchTarget,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  categoryText: {
    ...StudioType.detail,
    fontWeight: "600",
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
    minHeight: 218,
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
    ...StudioType.detail,
    fontWeight: "700",
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
    ...StudioType.detail,
    fontWeight: "600",
    flex: 1,
    lineHeight: 18,
  },
  itemDescription: {
    ...StudioType.detail,
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
    ...StudioType.detail,
    fontSize: 10,
    fontWeight: "700",
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
    ...StudioType.detail,
    fontSize: 10,
    fontWeight: "700",
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    marginTop: Spacing.md,
    minHeight: TouchTarget,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  actionPillText: {
    ...StudioType.detail,
    fontWeight: "600",
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
    paddingVertical: Spacing.xl * 1.5,
    width: "100%",
    paddingHorizontal: Spacing.lg,
  },
  emptyText: {
    ...StudioType.body,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  emptyTitle: {
    ...StudioType.bodyStrong,
    marginTop: Spacing.md,
    textAlign: "center",
  },
  emptyAction: {
    minHeight: TouchTarget,
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  emptyActionText: {
    ...StudioType.detail,
    fontWeight: "600",
  },
});
