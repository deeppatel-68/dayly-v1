import { BorderRadius, Spacing } from "@/constants/Spacing";
import { FontFamilies, FontSizes } from "@/constants/Typography";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

function TopBar() {
  const { colors } = useTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const profileIconRef = useRef(null);
  const [profileIconLayout, setProfileIconLayout] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  // Get user data from auth context
  const userEmail = user?.email || "";
  const userName = user?.email?.split("@")[0] || "User";
  const userInitial = userName.charAt(0).toUpperCase();

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
            } catch {
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const menuItems = [
    {
      icon: "person-outline",
      label: "PROFILE",
      onPress: () => router.push("/(tabs)/profile"),
    },
    {
      icon: "settings-outline",
      label: "SETTINGS",
      onPress: () => router.push("/(tabs)/profile"),
    },
    {
      icon: "help-circle-outline",
      label: "HELP",
      onPress: () => console.log("Help"),
    },
    {
      icon: "log-out-outline",
      label: "LOGOUT",
      onPress: handleSignOut,
      isLogout: true,
    },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.titleContainer}>
        {/* Left side: brand wordmark */}
        <View style={styles.leftSection}>
          <View style={styles.brandText}>
            <Text style={[styles.title, { color: colors.text }]}>dayly</Text>
          </View>
        </View>

        {/* Right side: Profile picture */}
        <TouchableOpacity
          ref={profileIconRef}
          onLayout={() => {
            profileIconRef.current?.measureInWindow(
              (fx, fy, fwidth, fheight) => {
                setProfileIconLayout({
                  x: fx,
                  y: fy,
                  width: fwidth,
                  height: fheight,
                });
              }
            );
          }}
          onPress={() => {
            profileIconRef.current?.measureInWindow((x, y, width, height) => {
              setProfileIconLayout({ x, y, width, height });
              setDropdownVisible(true);
            });
          }}
          style={[
            styles.profileCircle,
            { backgroundColor: colors.accent },
            dropdownVisible && styles.profileCircleActive,
          ]}
        >
          <Text style={styles.profileLetter}>{userInitial}</Text>
        </TouchableOpacity>
      </View>

      {/* Dropdown Modal */}
      <Modal
        visible={dropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setDropdownVisible(false)}
        >
          <View
            style={[
              styles.dropdownContainer,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                top: profileIconLayout.y + profileIconLayout.height + 8,
                right:
                  screenWidth - profileIconLayout.x - profileIconLayout.width,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            {/* User Info Section */}
            <View
              style={[
                styles.userInfoSection,
                { borderBottomColor: colors.border },
              ]}
            >
              <Text style={[styles.userName, { color: colors.text }]}>
                {userName}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                {userEmail}
              </Text>
            </View>

            {/* Menu Items */}
            <View style={styles.menuItemsContainer}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.menuItem,
                    index < menuItems.length - 1 && styles.menuItemBorder,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={() => {
                    item.onPress();
                    setDropdownVisible(false);
                  }}
                >
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={item.isLogout ? colors.accent : colors.text}
                  />
                  <Text
                    style={[
                      styles.menuItemText,
                      {
                        color: item.isLogout ? colors.accent : colors.text,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export default TopBar;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    marginBottom: Spacing.md,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  brandText: {
    flex: 1,
  },
  title: {
    fontFamily: "Outfit-SemiBold",
    fontSize: 32,
    color: "#fff",
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  profileCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D97757",
  },
  profileCircleActive: {
    opacity: 0.8,
  },
  profileLetter: {
    fontSize: 20,
    fontFamily: "Outfit-Bold",
    color: "#ffffff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  dropdownContainer: {
    position: "absolute",
    width: 200,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  userInfoSection: {
    padding: Spacing.sm,
    borderBottomWidth: 1,
  },
  userName: {
    fontFamily: FontFamilies.bold,
    fontSize: FontSizes.sm,
    color: "#ffffff",
    marginBottom: 2,
  },
  userEmail: {
    fontFamily: FontFamilies.regular,
    fontSize: FontSizes.xs,
    color: "#999999",
  },
  menuItemsContainer: {
    paddingVertical: Spacing.xs,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
  },
  menuItemText: {
    fontFamily: FontFamilies.regular,
    fontSize: FontSizes.xs,
    letterSpacing: 0.5,
  },
});
