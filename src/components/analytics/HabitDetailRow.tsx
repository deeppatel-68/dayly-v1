import { HabitStats } from "@/utils/analytics";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";
import CircularProgress from "./ProgressRing";

// Note: Habit type here is the raw habit from store, HabitStats is calculated
import { Habit } from "@/types/habits";

export const HabitDetailRow = ({
  habit,
  stats,
  onPress,
}: {
  habit: Habit;
  stats: HabitStats;
  onPress?: () => void;
}) => (
  <Pressable
    onPress={onPress}
    className="bg-[#151d23] rounded-xl p-4 mb-2 flex-row items-center justify-between"
    style={{
      backgroundColor: "#151d23",
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    }}
  >
    <View className="flex-row items-center flex-1" style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
      <Text style={{ fontSize: 28, marginRight: 12 }}>{stats.icon}</Text>
      <View className="flex-1" style={{ flex: 1 }}>
        <Text className="text-white font-semibold" style={{ color: "white", fontWeight: "600" }}>
          {habit.title}
        </Text>
        <View className="flex-row items-center mt-1" style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
          <View className="flex-row items-center mr-4" style={{ flexDirection: "row", alignItems: "center", marginRight: 16 }}>
            <Ionicons name="checkmark-circle" size={12} color="#6EE7B7" />
            <Text className="text-gray-400 text-xs ml-1" style={{ color: "#9ca3af", fontSize: 12, marginLeft: 4 }}>
              {stats.totalCompletions} done
            </Text>
          </View>
          <View className="flex-row items-center" style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="flame" size={12} color="#FF912B" />
            <Text className="text-gray-400 text-xs ml-1" style={{ color: "#9ca3af", fontSize: 12, marginLeft: 4 }}>
              {stats.currentStreak}d streak
            </Text>
          </View>
        </View>
      </View>
      <CircularProgress
        progress={stats.completionRate}
        size={50}
        strokeWidth={5}
        color={
          stats.completionRate > 70
            ? "#6EE7B7"
            : stats.completionRate > 40
            ? "#FFB800"
            : "#EF4444"
        }
      />
    </View>
  </Pressable>
);

export default HabitDetailRow;

