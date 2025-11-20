import FloatingBar from "@/components/common/FloatingBar";
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
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
        }}
      />
    </Tabs>
  );
}
