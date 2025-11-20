import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

export const StatsCard = ({
  title,
  value,
  subtitle,
  change,
  icon,
  color,
  fullWidth = false,
}: {
  title: string;
  value: string;
  subtitle?: string;
  change?: number;
  icon: string;
  color: string;
  fullWidth?: boolean;
}) => (
  <View
    className={`bg-[#151d23] rounded-2xl p-4 ${
      fullWidth ? "w-full" : "flex-1 mx-1"
    } mb-2`}
    style={{
      backgroundColor: "#151d23",
      borderRadius: 16,
      padding: 16,
      marginBottom: 8,
      width: fullWidth ? "100%" : undefined,
      flex: fullWidth ? undefined : 1,
      marginHorizontal: fullWidth ? 0 : 4,
    }}
  >
    <View
      className="flex-row items-center justify-between mb-2"
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
      }}
    >
      <View
        className="flex-row items-center"
        style={{ flexDirection: "row", alignItems: "center" }}
      >
        <Text style={{ fontSize: 20, marginRight: 8 }}>{icon}</Text>
        <Text
          className="text-gray-400 text-xs"
          style={{ color: "#9ca3af", fontSize: 12 }}
        >
          {title}
        </Text>
      </View>
      {change !== undefined && change !== 0 && (
        <View
          className={`flex-row items-center px-2 py-0.5 rounded-full`}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 9999,
            backgroundColor:
              change >= 0
                ? "rgba(110, 231, 183, 0.2)"
                : "rgba(239, 68, 68, 0.2)",
          }}
        >
          <Ionicons
            name={change >= 0 ? "trending-up" : "trending-down"}
            size={12}
            color={change >= 0 ? "#6EE7B7" : "#EF4444"}
          />
          <Text
            className={`text-xs ml-1 font-semibold`}
            style={{
              fontSize: 12,
              marginLeft: 4,
              fontWeight: "600",
              color: change >= 0 ? "#6EE7B7" : "#EF4444",
            }}
          >
            {Math.abs(Math.round(change))}%
          </Text>
        </View>
      )}
    </View>
    <Text
      className="text-white text-2xl font-bold"
      style={{ color, fontSize: 24, fontWeight: "bold" }}
    >
      {value}
    </Text>
    {subtitle && (
      <Text
        className="text-gray-500 text-xs mt-1"
        style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}
      >
        {subtitle}
      </Text>
    )}
  </View>
);

export default StatsCard;
