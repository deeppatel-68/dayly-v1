import { useTheme } from "@/context/ThemeContext";
import { Stack } from "expo-router";

export default function FocusStackLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerLargeTitle: false,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Focus" }} />
    </Stack>
  );
}
