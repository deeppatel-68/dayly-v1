import FloatingBar from "@/components/common/FloatingBar";
import { useTheme } from "@/context/ThemeContext";
import { Tabs } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        paddingTop: insets.top,
        backgroundColor: colors.background,
      }}
    >
      <Tabs
      tabBar={(props) => <FloatingBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          height: 0,
          width: 0,
          opacity: 0,
          pointerEvents: "none",
          elevation: -1,
          zIndex: -1,
        },
        tabBarShowLabel: false,
        tabBarButton: () => null,
      }}
    >
      <Tabs.Screen
        name="stats"
        options={{
          title: "Analytics",
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: "Habits",
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: "Study",
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: "Social",
          href: null,
        }}
      />
      <Tabs.Screen
        name="customise"
        options={{
          title: "Customise",
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          href: null,
        }}
      />
      </Tabs>
    </View>
  );
}
