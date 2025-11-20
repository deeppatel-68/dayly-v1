import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface CoinsContextType {
  coins: number;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
}

const CoinsContext = createContext<CoinsContextType | undefined>(undefined);

const COINS_STORAGE_KEY = "@coins";

export function CoinsProvider({ children }: { children: ReactNode }) {
  const [coins, setCoins] = useState<number>(100); // Start with 100 coins

  useEffect(() => {
    loadCoins();
  }, []);

  useEffect(() => {
    saveCoins();
  }, [coins]);

  const loadCoins = async () => {
    try {
      const storedCoins = await AsyncStorage.getItem(COINS_STORAGE_KEY);
      if (storedCoins !== null) {
        setCoins(parseInt(storedCoins, 10));
      }
    } catch (error) {
      console.error("Error loading coins:", error);
    }
  };

  const saveCoins = async () => {
    try {
      await AsyncStorage.setItem(COINS_STORAGE_KEY, coins.toString());
    } catch (error) {
      console.error("Error saving coins:", error);
    }
  };

  const addCoins = (amount: number) => {
    setCoins((prev) => prev + amount);
  };

  const spendCoins = (amount: number): boolean => {
    if (coins >= amount) {
      setCoins((prev) => prev - amount);
      return true;
    }
    return false;
  };

  const value = {
    coins,
    addCoins,
    spendCoins,
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

