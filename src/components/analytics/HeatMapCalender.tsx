import { Habit } from "@/types/habits";
import { getHabitHeatmapData } from "@/utils/analytics";
import React from "react";
import { ScrollView, Text, View } from "react-native";

export const HeatmapCalendar = ({
  habit,
  weeks = 12,
}: {
  habit: Habit;
  weeks?: number;
}) => {
  const data = getHabitHeatmapData(habit, weeks);
  const days = ["S", "M", "T", "W", "T", "F", "S"];

  const getColor = (intensity: number) => {
    switch (intensity) {
      case 0:
        return "#0d1117";
      case 1:
        return "#0e4429";
      case 2:
        return "#006d32";
      case 3:
        return "#26a641";
      case 4:
        return "#39d353";
      default:
        return "#0d1117";
    }
  };

  // Determine icon - default if not present in Habit type
  const icon = "📝";

  return (
    <View
      className="bg-[#151d23] rounded-2xl p-4 mb-4"
      style={{
        backgroundColor: "#151d23",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <View
        className="flex-row items-center mb-3"
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}
      >
        <Text style={{ fontSize: 24, marginRight: 8 }}>{icon}</Text>
        <Text
          className="text-white font-semibold"
          style={{ color: "white", fontWeight: "600" }}
        >
          {habit.title} Activity
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Day labels */}
          <View className="flex-column mb-1" style={{ marginBottom: 4 }}>
            {days.map((day, i) => (
              <Text
                key={i}
                className="text-gray-500 text-xs"
                style={{
                  height: 15,
                  marginVertical: 1,
                  color: "#6b7280",
                  fontSize: 12,
                }}
              >
                {i % 2 === 0 ? day : " "}
              </Text>
            ))}
          </View>

          {/* Heatmap grid */}
          <View className="flex-row" style={{ flexDirection: "row" }}>
            {data.map((week, weekIndex) => (
              <View
                key={weekIndex}
                className="flex-column mr-1"
                style={{ marginRight: 4 }}
              >
                {week.map((intensity, dayIndex) => (
                  <View
                    key={dayIndex}
                    style={{
                      width: 14,
                      height: 14,
                      backgroundColor: getColor(intensity),
                      marginVertical: 1,
                      borderRadius: 2,
                    }}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Legend */}
      <View
        className="flex-row items-center mt-3"
        style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}
      >
        <Text
          className="text-gray-500 text-xs mr-2"
          style={{ color: "#6b7280", fontSize: 12, marginRight: 8 }}
        >
          Less
        </Text>
        {[0, 1, 2, 3, 4].map((intensity) => (
          <View
            key={intensity}
            style={{
              width: 12,
              height: 12,
              backgroundColor: getColor(intensity),
              marginHorizontal: 2,
              borderRadius: 2,
            }}
          />
        ))}
        <Text
          className="text-gray-500 text-xs ml-2"
          style={{ color: "#6b7280", fontSize: 12, marginLeft: 8 }}
        >
          More
        </Text>
      </View>
    </View>
  );
};

export default HeatmapCalendar;
