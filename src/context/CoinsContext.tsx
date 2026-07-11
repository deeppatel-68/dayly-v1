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

interface CoinsContextType {
  coins: number;
  refreshCoins: () => Promise<void>;
}

const CoinsContext = createContext<CoinsContextType | undefined>(undefined);

export function CoinsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [coins, setCoins] = useState<number>(100);

  useEffect(() => {
    if (!user) {
      setCoins(100);
      return;
    }

    let cancelled = false;

    const unsubscribe = subscribeToProgress((progress) => {
      if (progress.user_id === user.id) setCoins(progress.coins);
    });

    getUserProgress(user.id)
      .then((progress) => {
        if (!cancelled) {
          setCoins(progress.coins);
        }
      })
      .catch((error) => {
        logSupabaseError("Error loading coins:", error);
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user]);

  const refreshCoins = async () => {
    if (!user) return;
    try {
      const progress = await getUserProgress(user.id);
      setCoins(progress.coins);
    } catch (error) {
      logSupabaseError("Error refreshing coins:", error);
    }
  };

  const value = {
    coins,
    refreshCoins,
  };

  return (
    <CoinsContext.Provider value={value}>{children}</CoinsContext.Provider>
  );
}

export function useCoins() {
  const context = useContext(CoinsContext);
  if (context === undefined) {
    throw new Error("useCoins must be used within a CoinsProvider");
  }
  return context;
}
