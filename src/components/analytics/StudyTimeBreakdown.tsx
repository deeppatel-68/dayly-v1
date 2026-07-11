import { FocusSession, getDatesForPeriod } from "@/utils/analytics";
import React from "react";
import StudyBarChart from "./Chart";

export const StudyTimeBreakdown = ({
  sessions,
  period,
}: {
  sessions: FocusSession[];
  period: "day" | "week" | "month" | "3months";
}) => {
  const dates = getDatesForPeriod(period);
  const isToday = period === "day";

  const data = isToday
    ? // Hourly breakdown for today
      Array.from({ length: 24 }, (_, hour) => {
        const startHour = new Date();
        startHour.setHours(hour, 0, 0, 0);
        const endHour = new Date();
        endHour.setHours(hour + 1, 0, 0, 0);

        const minutes = sessions
          .filter((s) => {
            if (!s.endedAt) return false;
            const sessionTime = new Date(s.endedAt);
            return sessionTime >= startHour && sessionTime < endHour;
          })
          .reduce((sum, s) => sum + s.duration / 60, 0);

        return {
          label: hour % 3 === 0 ? `${hour}h` : "",
          value: Math.round(minutes),
        };
      })
    : // Daily breakdown for other periods
      dates.slice(-7).map((date) => {
        const minutes = sessions
          .filter(
            (s) =>
              s.endedAt &&
              new Date(s.endedAt).toDateString() === date.toDateString()
          )
          .reduce((sum, s) => sum + s.duration / 60, 0);

        return {
          label: date.toLocaleDateString("en", { weekday: "short" })[0],
          value: Math.round(minutes),
        };
      });

  return (
    <StudyBarChart
      data={data}
      color="#00CFFF"
      height={100}
      label="📚 Study Time (minutes)"
    />
  );
};

export default StudyTimeBreakdown;
