import React from "react";
import { Text, View } from "react-native";

export const BarChart = ({
  data,
  color = "#00CFFF",
  height = 120,
  showValues = true,
  label = "",
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  showValues?: boolean;
  label?: string;
}) => {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <View>
      {label ? (
        <Text
          className="text-white font-semibold mb-3"
          style={{ color: "white", fontWeight: "600", marginBottom: 12 }}
        >
          {label}
        </Text>
      ) : null}
      <View
        className="flex-row items-end justify-between"
        style={{
          height,
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * height;
          return (
            <View
              key={index}
              className="flex-1 items-center mx-0.5"
              style={{ flex: 1, alignItems: "center", marginHorizontal: 2 }}
            >
              <View
                className="items-center w-full"
                style={{ alignItems: "center", width: "100%" }}
              >
                {showValues && (
                  <Text
                    className="text-white text-xs mb-1"
                    style={{ color: "white", fontSize: 12, marginBottom: 4 }}
                  >
                    {item.value}
                  </Text>
                )}
                <View
                  style={{
                    height: Math.max(barHeight, 2),
                    width: "80%",
                    backgroundColor: color,
                    borderRadius: 4,
                    opacity: 0.9,
                  }}
                />
              </View>
              <Text
                className="text-gray-500 text-xs mt-1"
                style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}
              >
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default BarChart;
