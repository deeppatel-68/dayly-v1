import React from "react";
import { Pressable, Text, View } from "react-native";

export const PeriodSelector = ({
  selected,
  onSelect,
}: {
  selected: "day" | "week" | "month" | "3months";
  onSelect: (period: "day" | "week" | "month" | "3months") => void;
}) => {
  const periods = [
    { id: "day", label: "Today", icon: "24h" },
    { id: "week", label: "Week", icon: "7d" },
    { id: "month", label: "Month", icon: "30d" },
    { id: "3months", label: "3 Months", icon: "90d" },
  ] as const;

  return (
    <View className="flex-row bg-[#151d23] rounded-2xl p-1 mx-4 mb-4">
      {periods.map((period) => (
        <Pressable
          key={period.id}
          onPress={() => onSelect(period.id as any)}
          className={`flex-1 py-2.5 rounded-xl ${
            selected === period.id ? "bg-cyan-500" : "bg-transparent"
          }`}
          style={
            selected === period.id
              ? { backgroundColor: "#06b6d4" }
              : { backgroundColor: "transparent" }
          }
        >
          <Text
            className={`text-center text-xs font-bold mb-0.5`}
            style={{
              color: selected === period.id ? "#000" : "#6b7280",
              textAlign: "center",
              fontSize: 12,
              fontWeight: "bold",
              marginBottom: 2,
            }}
          >
            {period.icon}
          </Text>
          <Text
            className={`text-center font-semibold text-sm`}
            style={{
              color: selected === period.id ? "#000" : "#9ca3af",
              textAlign: "center",
              fontWeight: "600",
              fontSize: 14,
            }}
          >
            {period.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
};

export default PeriodSelector;
