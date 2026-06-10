import { getLevelProgress, XP_PER_HABIT_COMPLETION } from "@/utils/xp";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
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
  awardHabitXp: (habitId: string, dateKey: string) => boolean;

  // Adds XP unconditionally (e.g. study sessions, which can repeat).
  addXp: (amount: number) => void;
}

interface StoredXp {
  xp: number;
  awards: { [habitIdDateKey: string]: true };
}

const XpContext = createContext<XpContextType | undefined>(undefined);

const storageKey = (userId: string) => `@xp:${userId}`;

export function XpProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [xp, setXp] = useState(0);
  const [awards, setAwards] = useState<StoredXp["awards"]>({});
  const [loaded, setLoaded] = useState(false);
  // Ref mirror so awardHabitXp can check synchronously without stale closures
  const awardsRef = useRef(awards);

  useEffect(() => {
    if (!user) {
      setXp(0);
      awardsRef.current = {};
      setAwards({});
      setLoaded(false);
      return;
    }

    let cancelled = false;

    const loadXp = async () => {
      try {
        const stored = await AsyncStorage.getItem(storageKey(user.id));
        if (cancelled) return;

        const parsed: StoredXp = stored
          ? JSON.parse(stored)
          : { xp: 0, awards: {} };
        setXp(parsed.xp || 0);
        awardsRef.current = parsed.awards || {};
        setAwards(awardsRef.current);
      } catch (error) {
        console.error("Error loading XP:", error);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };

    loadXp();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !loaded) return;

    AsyncStorage.setItem(
      storageKey(user.id),
      JSON.stringify({ xp, awards })
    ).catch((error) => console.error("Error saving XP:", error));
  }, [xp, awards, user, loaded]);

  const awardHabitXp = (habitId: string, dateKey: string): boolean => {
    if (!loaded) return false;

    const key = `${habitId}:${dateKey}`;
    if (awardsRef.current[key]) return false;

    awardsRef.current = { ...awardsRef.current, [key]: true };
    setAwards(awardsRef.current);
    setXp((prev) => prev + XP_PER_HABIT_COMPLETION);
    return true;
  };

  const addXp = (amount: number) => {
    if (!loaded || amount <= 0) return;
    setXp((prev) => prev + amount);
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
