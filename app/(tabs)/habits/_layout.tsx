import { useTheme } from "@/context/ThemeContext";
import { Stack } from "expo-router";

export default function HabitsStackLayout() {
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
      <Stack.Screen name="index" options={{ title: "Habits" }} />
    </Stack>
  );
}
