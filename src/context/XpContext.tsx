import { getLevelProgress } from "@/utils/xp";
import {
  addXp as addSupabaseXp,
  awardXpOnce,
  getUserProgress,
  subscribeToProgress,
} from "@/services/progressService";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./AuthContext";

interface XpContextType {
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progress: number;

  // Awards XP once per habit per date. Returns false if already awarded.
  awardHabitXp: (habitId: string, dateKey: string) => Promise<boolean>;

  // Adds XP unconditionally (e.g. admin adjustments or non-study rewards).
  addXp: (amount: number) => Promise<void>;
}

const XpContext = createContext<XpContextType | undefined>(undefined);

export function XpProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [xp, setXp] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setXp(0);
      setLoaded(false);
      return;
    }

    let cancelled = false;

    const unsubscribe = subscribeToProgress((progress) => {
      if (progress.user_id === user.id) setXp(progress.xp);
    });

    getUserProgress(user.id)
      .then((progress) => {
        if (!cancelled) {
          setXp(progress.xp);
          setLoaded(true);
        }
      })
      .catch((error) => {
        console.error("Error loading XP:", error);
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user]);

  const awardHabitXp = async (habitId: string, dateKey: string): Promise<boolean> => {
    if (!user || !loaded) return false;

    const { awarded } = await awardXpOnce(user.id, {
      sourceType: "habit",
      sourceId: habitId,
      awardDate: dateKey,
    });

    return awarded;
  };

  const addXp = async (amount: number) => {
    if (!user || !loaded || amount <= 0) return;
    await addSupabaseXp(user.id, amount);
  };

  const { level, xpIntoLevel, xpForNextLevel, progress } =
    getLevelProgress(xp);

  const value = {
    xp,
    level,
    xpIntoLevel,
    xpForNextLevel,
    progress,
    awardHabitXp,
    addXp,
  };

  return <XpContext.Provider value={value}>{children}</XpContext.Provider>;
}

export function useXp() {
  const context = useContext(XpContext);
  if (context === undefined) {
    throw new Error("useXp must be used within an XpProvider");
  }
  return context;
}
