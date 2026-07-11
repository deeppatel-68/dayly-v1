import { useTheme } from "@/context/ThemeContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Icon,
  Label,
  NativeTabs,
  VectorIcon,
} from "expo-router/unstable-native-tabs";

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <NativeTabs
      tintColor={colors.accent}
      iconColor={{ default: colors.textSecondary, selected: colors.accent }}
      labelStyle={{
        default: { color: colors.textSecondary, fontFamily: "Outfit-Medium" },
        selected: { color: colors.accent, fontFamily: "Outfit-SemiBold" },
      }}
      backgroundColor={colors.card}
      blurEffect="systemChromeMaterialDark"
      shadowColor={colors.border}
      indicatorColor={colors.completedBackground}
      minimizeBehavior="onScrollDown"
      disableTransparentOnScrollEdge
    >
      <NativeTabs.Trigger name="index">
        <Label>Home</Label>
        <Icon
          sf={{ default: "house", selected: "house.fill" }}
          androidSrc={<VectorIcon family={Ionicons} name="home" />}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="habits">
        <Label>Habits</Label>
        <Icon
          sf={{ default: "checkmark.circle", selected: "checkmark.circle.fill" }}
          androidSrc={<VectorIcon family={Ionicons} name="checkmark-circle" />}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="study">
        <Label>Focus</Label>
        <Icon
          sf={{ default: "timer", selected: "timer.circle.fill" }}
          androidSrc={<VectorIcon family={Ionicons} name="timer" />}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="stats">
        <Label>Progress</Label>
        <Icon
          sf={{ default: "chart.bar", selected: "chart.bar.fill" }}
          androidSrc={<VectorIcon family={Ionicons} name="bar-chart" />}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
