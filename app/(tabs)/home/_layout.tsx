import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { Pressable, StyleSheet } from "react-native";

export default function HomeStackLayout() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerLargeTitle: false,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Home",
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open profile"
              hitSlop={4}
              onPress={() => router.push("/profile")}
              style={({ pressed }) => [styles.profileButton, { opacity: pressed ? 0.72 : 1 }]}
            >
              <Ionicons name="person-circle-outline" size={27} color={colors.text} />
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  profileButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
