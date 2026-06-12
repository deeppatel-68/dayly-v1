import {
  addCoins as addSupabaseCoins,
  getUserProgress,
  spendCoins as spendSupabaseCoins,
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

interface CoinsContextType {
  coins: number;
  addCoins: (amount: number) => Promise<void>;
  spendCoins: (amount: number) => Promise<boolean>;
  refreshCoins: () => Promise<void>;
}

const CoinsContext = createContext<CoinsContextType | undefined>(undefined);

export function CoinsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [coins, setCoins] = useState<number>(100);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setCoins(100);
      setLoaded(false);
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
          setLoaded(true);
        }
      })
      .catch((error) => {
        console.error("Error loading coins:", error);
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user]);

  const refreshCoins = async () => {
    if (!user) return;
    const progress = await getUserProgress(user.id);
    setCoins(progress.coins);
    setLoaded(true);
  };

  const addCoins = async (amount: number) => {
    if (!user || !loaded || amount <= 0) return;
    await addSupabaseCoins(user.id, amount);
  };

  const spendCoins = async (amount: number): Promise<boolean> => {
    if (!user || !loaded) return false;
    return spendSupabaseCoins(user.id, amount);
  };

  const value = {
    coins,
    addCoins,
    spendCoins,
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
