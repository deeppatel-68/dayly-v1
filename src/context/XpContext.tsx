import { getLevelProgress } from "@/utils/xp";
import {
  getUserProgress,
  subscribeToProgress,
} from "@/services/progressService";
import { logSupabaseError } from "@/utils/supabaseErrors";
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
}

const XpContext = createContext<XpContextType | undefined>(undefined);

export function XpProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [xp, setXp] = useState(0);

  useEffect(() => {
    if (!user) {
      setXp(0);
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
        }
      })
      .catch((error) => {
        logSupabaseError("Error loading XP:", error);
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user]);

  const { level, xpIntoLevel, xpForNextLevel, progress } =
    getLevelProgress(xp);

  const value = {
    xp,
    level,
    xpIntoLevel,
    xpForNextLevel,
    progress,
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
