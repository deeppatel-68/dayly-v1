import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

export interface CharacterData {
  color: string;
  accessories: string[];
  model?: string;
}

interface CharacterContextType {
  character: CharacterData;
  updateCharacter: (updates: Partial<CharacterData>) => void;
  resetCharacter: () => void;
}

const defaultCharacter: CharacterData = {
  color: "#ff6b35",
  accessories: [],
};

const CharacterContext = createContext<CharacterContextType | undefined>(
  undefined
);

const CHARACTER_STORAGE_KEY = "@character_data";

export function CharacterProvider({ children }: { children: ReactNode }) {
  const [character, setCharacter] = useState<CharacterData>(defaultCharacter);

  useEffect(() => {
    loadCharacter();
  }, []);

  useEffect(() => {
    saveCharacter();
  }, [character]);

  const loadCharacter = async () => {
    try {
      const storedCharacter = await AsyncStorage.getItem(CHARACTER_STORAGE_KEY);
      if (storedCharacter) {
        setCharacter(JSON.parse(storedCharacter));
      }
    } catch (error) {
      console.error("Error loading character:", error);
    }
  };

  const saveCharacter = async () => {
    try {
      await AsyncStorage.setItem(CHARACTER_STORAGE_KEY, JSON.stringify(character));
    } catch (error) {
      console.error("Error saving character:", error);
    }
  };

  const updateCharacter = (updates: Partial<CharacterData>) => {
    setCharacter((prev) => ({ ...prev, ...updates }));
  };

  const resetCharacter = () => {
    setCharacter(defaultCharacter);
  };

  const value = {
    character,
    updateCharacter,
    resetCharacter,
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

