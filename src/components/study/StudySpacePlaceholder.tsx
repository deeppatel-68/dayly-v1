import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Text,
  ScrollView,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useCharacter } from "@/context/CharacterContext";
import { useCoins } from "@/context/CoinsContext";
import { useShop } from "@/context/ShopContext";
import { Ionicons } from "@expo/vector-icons";
import FocusTimer from "@/components/study/FocusTimer";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { shopItems } from "@/data/shopItems";

interface StudySpacePlaceholderProps {
  visible: boolean;
  onClose: () => void;
  showTimer?: boolean;
}

export default function StudySpacePlaceholder({
  visible,
  onClose,
  showTimer = true,
}: StudySpacePlaceholderProps) {
  const { colors } = useTheme();
  const [showShop, setShowShop] = useState(false);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Placeholder Study Space */}
        <View style={[styles.placeholderArea, { backgroundColor: colors.card }]}>
          <View
            style={[
              styles.placeholderBox,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <Text
              style={[styles.placeholderText, { color: colors.textSecondary }]}
            >
              3D Study Space
            </Text>
            <Text
              style={[styles.comingSoonText, { color: colors.textSecondary }]}
            >
              Coming Soon
            </Text>
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
              <FocusTimer />
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
  const { coins, spendCoins } = useCoins();
  const { isOwned, isEquipped, buyItem, equipItem } = useShop();

  const handleBuy = (itemId: string, cost: number) => {
    if (spendCoins(cost)) {
      buyItem(itemId);
    }
  };

  const handleEquip = (itemId: string) => {
    equipItem(itemId);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.shopOverlay}>
        <View style={[styles.shopContainer, { backgroundColor: colors.card }]}>
          <View style={styles.shopHeader}>
            <Text style={[styles.shopTitle, { color: colors.text }]}>
              Shop
            </Text>
            <View style={styles.headerRight}>
              <View style={styles.coinDisplay}>
                <Ionicons name="star" size={20} color="#ffd700" />
                <Text style={[styles.coinText, { color: colors.text }]}>
                  {coins}
                </Text>
              </View>
              <Pressable onPress={onClose}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={styles.shopContent}
            showsVerticalScrollIndicator={false}
          >
            {shopItems.map((item) => {
              const owned = isOwned(item.id);
              const equipped = isEquipped(item.id);

              return (
                <View
                  key={item.id}
                  style={[
                    styles.shopItem,
                    { backgroundColor: colors.background, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.itemLeft}>
                    <Ionicons
                      name={item.icon as any}
                      size={32}
                      color={colors.text}
                    />
                    <View style={styles.itemInfo}>
                      <View style={styles.itemNameRow}>
                        <Text style={[styles.itemName, { color: colors.text }]}>
                          {item.name}
                        </Text>
                        {owned && !equipped && (
                          <View
                            style={[
                              styles.ownedBadge,
                              { backgroundColor: colors.accent + "20" },
                            ]}
                          >
                            <Text
                              style={[styles.ownedText, { color: colors.accent }]}
                            >
                              Owned
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.itemCost}>
                        <Ionicons name="star" size={16} color="#ffd700" />
                        <Text
                          style={[styles.costText, { color: colors.textSecondary }]}
                        >
                          {item.cost} coins
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.itemRight}>
                    {owned ? (
                      <>
                        {equipped ? (
                          <View
                            style={[
                              styles.equippedButton,
                              { backgroundColor: colors.border },
                            ]}
                          >
                            <Text
                              style={[
                                styles.buttonText,
                                { color: colors.textSecondary },
                              ]}
                            >
                              Equipped
                            </Text>
                          </View>
                        ) : (
                          <Pressable
                            style={[
                              styles.equipButton,
                              { backgroundColor: colors.accent },
                            ]}
                            onPress={() => handleEquip(item.id)}
                          >
                            <Text
                              style={[
                                styles.buttonText,
                                { color: colors.background },
                              ]}
                            >
                              Equip
                            </Text>
                          </Pressable>
                        )}
                      </>
                    ) : (
                      <Pressable
                        style={[
                          styles.buyButton,
                          {
                            backgroundColor:
                              coins >= item.cost ? colors.accent : colors.border,
                          },
                        ]}
                        onPress={() => handleBuy(item.id, item.cost)}
                        disabled={coins < item.cost}
                      >
                        <Text
                          style={[
                            styles.buttonText,
                            {
                              color:
                                coins >= item.cost
                                  ? colors.background
                                  : colors.textSecondary,
                            },
                          ]}
                        >
                          Buy
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}

            {/* Earn More Coins Section */}
            <View
              style={[
                styles.earnCoinsCard,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <View style={styles.earnCoinsHeader}>
                <Ionicons name="calendar" size={24} color={colors.accent} />
                <Text style={[styles.earnCoinsTitle, { color: colors.text }]}>
                  Earn More Coins
                </Text>
              </View>
              <View style={styles.earnCoinsList}>
                <Text
                  style={[styles.earnCoinsItem, { color: colors.textSecondary }]}
                >
                  • Complete focus sessions (+10 coins/session)
                </Text>
                <Text
                  style={[styles.earnCoinsItem, { color: colors.textSecondary }]}
                >
                  • Finish daily habits (+5 coins/habit)
                </Text>
                <Text
                  style={[styles.earnCoinsItem, { color: colors.textSecondary }]}
                >
                  • Maintain your streak (+20 coins/week)
                </Text>
              </View>
            </View>
          </ScrollView>
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
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 24,
    fontFamily: "Outfit-Bold",
    marginBottom: Spacing.sm,
  },
  comingSoonText: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    opacity: 0.6,
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
  shopOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  shopContainer: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: "70%",
  },
  shopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  shopTitle: {
    fontSize: 24,
    fontFamily: "Outfit-Bold",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  coinDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  coinText: {
    fontSize: 18,
    fontFamily: "Outfit-SemiBold",
  },
  shopContent: {
    flex: 1,
  },
  shopItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  itemInfo: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  itemName: {
    fontSize: 16,
    fontFamily: "Outfit-SemiBold",
  },
  ownedBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  ownedText: {
    fontSize: 12,
    fontFamily: "Outfit-SemiBold",
  },
  itemCost: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  costText: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
  },
  itemRight: {
    marginLeft: Spacing.md,
  },
  buyButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    minWidth: 80,
    alignItems: "center",
  },
  equipButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    minWidth: 80,
    alignItems: "center",
  },
  equippedButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    minWidth: 80,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 14,
    fontFamily: "Outfit-SemiBold",
  },
  earnCoinsCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  earnCoinsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  earnCoinsTitle: {
    fontSize: 18,
    fontFamily: "Outfit-SemiBold",
  },
  earnCoinsList: {
    gap: Spacing.xs,
  },
  earnCoinsItem: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    lineHeight: 20,
  },
});

