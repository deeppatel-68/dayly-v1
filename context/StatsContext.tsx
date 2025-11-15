import { createContext, ReactNode, useState } from "react";

type Stats = {
  id: number;
  title: string;
  value: number;
  change: number;
  percentage: number;
};

type StatsContextValue = {
  stats: Stats[];
};

const StatsContext = createContext<StatsContextValue | undefined>(undefined);

export function StatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<Stats[]>([
    { id: 1, title: "xp", value: 100, change: 10, percentage: 10 },
    { id: 2, title: "coins", value: 325, change: 10, percentage: 10 },
    { id: 3, title: "streak", value: 3, change: 1, percentage: 10 },
  ]);

  return (
    <StatsContext.Provider value={{ stats }}>{children}</StatsContext.Provider>
  );
}
