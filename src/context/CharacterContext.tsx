import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getUserCharacterData,
  setUserCharacterData,
} from "@/services/settingsService";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";

export interface CharacterData {
  color: string; // accent/glow colour
  bodyColor: string; // companion body colour
  accessories: string[];
  model?: string;
}

interface CharacterContextType {
  character: CharacterData;
  updateCharacter: (updates: Partial<CharacterData>) => void;
  resetCharacter: () => void;
  loading: boolean;
}

const defaultCharacter: CharacterData = {
  color: "#D97757", // Claude terracotta accent/glow
  bodyColor: "#F3E7D3", // Soft Cream
  accessories: [],
};

const CharacterContext = createContext<CharacterContextType | undefined>(
  undefined
);

const CHARACTER_STORAGE_KEY = "@character_data";

// Accent values from the old neon palette; migrated one-time to terracotta.
// Only these exact known values are migrated — user-picked colours are kept.
const LEGACY_ACCENT_COLORS = ["#ff6b35", "#ff8a3d"];

const normalizeCharacterData = (value: unknown): CharacterData => {
  const parsed =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Partial<CharacterData>)
      : {};
  const nextCharacter: CharacterData = {
    ...defaultCharacter,
    ...parsed,
    accessories: Array.isArray(parsed.accessories)
      ? parsed.accessories.filter((item): item is string => typeof item === "string")
      : defaultCharacter.accessories,
  };

  if (
    typeof nextCharacter.color === "string" &&
    LEGACY_ACCENT_COLORS.includes(nextCharacter.color.toLowerCase())
  ) {
    nextCharacter.color = defaultCharacter.color;
  }

  return nextCharacter;
};

const toCharacterRecord = (characterData: CharacterData) => ({
  color: characterData.color,
  bodyColor: characterData.bodyColor,
  accessories: characterData.accessories,
  ...(characterData.model ? { model: characterData.model } : {}),
});

export function CharacterProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [character, setCharacter] = useState<CharacterData>(defaultCharacter);
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      loadedRef.current = false;
      setCharacter(defaultCharacter);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    loadedRef.current = false;

    const loadCharacter = async () => {
      try {
        const [remoteCharacter, storedCharacter] = await Promise.all([
          getUserCharacterData(user.id),
          AsyncStorage.getItem(CHARACTER_STORAGE_KEY),
        ]);

        if (cancelled) return;

        const cachedCharacter = storedCharacter
          ? JSON.parse(storedCharacter)
          : null;
        const nextCharacter = normalizeCharacterData(
          remoteCharacter ?? cachedCharacter
        );

        setCharacter(nextCharacter);
        await AsyncStorage.setItem(
          CHARACTER_STORAGE_KEY,
          JSON.stringify(nextCharacter)
        );
        if (!remoteCharacter) {
          await setUserCharacterData(user.id, toCharacterRecord(nextCharacter));
        }
      } catch (error) {
        console.error("Error loading character:", error);
      } finally {
        if (!cancelled) {
          loadedRef.current = true;
          setLoading(false);
        }
      }
    };

    loadCharacter();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const persistCharacter = (nextCharacter: CharacterData) => {
    AsyncStorage.setItem(
      CHARACTER_STORAGE_KEY,
      JSON.stringify(nextCharacter)
    ).catch((error) => console.error("Error caching character:", error));

    if (!user || !loadedRef.current) return;

    setUserCharacterData(user.id, toCharacterRecord(nextCharacter)).catch(
      (error) => console.error("Error saving character:", error)
    );
  };

  const updateCharacter = (updates: Partial<CharacterData>) => {
    setCharacter((prev) => {
      const nextCharacter = normalizeCharacterData({ ...prev, ...updates });
      persistCharacter(nextCharacter);
      return nextCharacter;
    });
  };

  const resetCharacter = () => {
    setCharacter(defaultCharacter);
    persistCharacter(defaultCharacter);
  };

  const value = {
    character,
    updateCharacter,
    resetCharacter,
    loading,
  };

  return (
    <CharacterContext.Provider value={value}>{children}</CharacterContext.Provider>
  );
}

export function useCharacter() {
  const context = useContext(CharacterContext);
  if (context === undefined) {
    throw new Error("useCharacter must be used within a CharacterProvider");
  }
  return context;
}
