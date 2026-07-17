import { useTheme } from "@/context/ThemeContext";
import { Stack } from "expo-router";

export default function ProgressStackLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Progress" }} />
    </Stack>
  );
}
