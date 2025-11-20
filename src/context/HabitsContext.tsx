import { Habit } from "@/types/habits";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface HabitsContextType {
  habits: Habit[]; // Array of all habits

  //Actions
  addHabit: (title: string, description?: string) => void; // Function to add a new habit
  toggleHabit: (id: string, dateKey?: string) => void; // Function to toggle a habit
  deleteHabit: (id: string) => void; // Function to delete a habit
  updateHabit: (id: string, title: string, description?: string) => void; // Function to update a habit

  //Statistics
  completedCount: number; // Number of completed habits
  totalCount: number; // Total number of habits
  percentage: number; // Percentage of completed habits
  currentStreak: number; // Current streak of completed habits
}

const defaultHabits: Habit[] = [
  {
    id: "1",
    title: "Drink Water",
    completed: false,
    createdAt: new Date().toISOString(),
    completionHistory: {},
  },
  {
    id: "2",
    title: "Exercise",
    completed: false,
    createdAt: new Date().toISOString(),
    completionHistory: {},
  },
  {
    id: "3",
    title: "Read",
    completed: false,
    createdAt: new Date().toISOString(),
    completionHistory: {},
  },
];

//Context
export const HabitsContext = createContext<HabitsContextType | undefined>(
  undefined
);

//Storage Keys
const HABITS_STORAGE_KEY = "@habits"; // Key to store the habits array
const LAST_RESET_DATE_STORAGE_KEY = "@lastResetDate"; // Key to store the last reset date

export const HabitsProvider = ({ children }: { children: ReactNode }) => {
  const [habits, setHabits] = useState<Habit[]>([]); // State to store the habits array <Habit[]> is a generic type arguement that means the state is an array of Habit objects and starts off empty

  //Load habits from storage when the component mounts
  useEffect(() => {
    loadHabits();
    checkAndResetDaily();
  }, []);

  //Save habits to storage when they change
  useEffect(() => {
    saveHabits();
  }, [habits]);

  //Load Habits function
  const loadHabits = async () => {
    try {
      const storedHabits = await AsyncStorage.getItem(HABITS_STORAGE_KEY); // Get the habits from storage
      if (storedHabits) {
        setHabits(JSON.parse(storedHabits)); // Parse the habits from storage and set the state
      } else {
        setHabits(defaultHabits);
      }
    } catch (error) {
      console.error("Error loading habits:", error);
    }
  };

  //Save Habits function
  const saveHabits = async () => {
    try {
      await AsyncStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits)); // Save the habits to storage
    } catch (error) {
      console.error("Error saving habits:", error);
    }
  };

  //Check and Reset Daily function
  const checkAndResetDaily = async () => {
    try {
      const lastReset = await AsyncStorage.getItem(LAST_RESET_DATE_STORAGE_KEY); // Get the last reset date from storage
      const today = new Date().toDateString();

      if (lastReset !== today) {
        // Its a new day, reset the habits
        console.log("Resetting habits for new day");
        setHabits((prev) =>
          prev.map((habit) => {
            // Map through the habits and reset the completed and completedAt properties to false and undefined respectively
            return {
              ...habit,
              completed: false,
              completedAt: undefined,
            };
          })
        );
        await AsyncStorage.setItem(LAST_RESET_DATE_STORAGE_KEY, today);
      }
    } catch (error) {
      console.error("Error checking and resetting daily:", error);
    }
  };
  //Add Habits function
  const addHabit = (title: string, description?: string) => {
    // Check if we've reached the maximum limit of 5 habits
    if (habits.length >= 5) {
      console.warn("Maximum habit limit reached (5 habits)");
      return;
    }

    const newHabit: Habit = {
      id: Date.now().toString(), // Generate a unique id for the new habit
      title: title.trim(), // Trim the title to remove any leading or trailing whitespace
      completed: false, // Set the completed property to false
      createdAt: new Date().toISOString(), // Set the createdAt property to the current date and time
      completionHistory: {}, // Set the completionHistory property to an empty object
      description: description?.trim() || undefined, // Set description if provided
    };
    setHabits((prev) => [...prev, newHabit]); // Add the new habit to the state
  };

  //Toggle Habit function
  const toggleHabit = (id: string, dateKey?: string) => {
    const targetDate = dateKey || new Date().toISOString().split("T")[0];

    setHabits((prev) =>
      prev.map((habit) => {
        if (habit.id !== id) return habit;

        const isCompleted = habit.completionHistory?.[targetDate] === true;
        const newCompletedState = !isCompleted;

        return {
          ...habit,
          completed: newCompletedState,
          completedAt: newCompletedState ? new Date().toISOString() : undefined,
          completionHistory: {
            ...habit.completionHistory,
            [targetDate]: newCompletedState,
          },
        };
      })
    );
  };

  //Delete Habit function
  const deleteHabit = (id: string) => {
    setHabits((prev) => prev.filter((habit) => habit.id !== id));
  };

  //Update Habit function
  const updateHabit = (id: string, title: string, description?: string) => {
    setHabits((prev) =>
      prev.map((habit) =>
        habit.id === id
          ? {
              ...habit,
              title: title.trim(),
              description: description?.trim() || undefined,
            }
          : habit
      )
    );
  };

  //Calculate Statistics function
  const completedCount = habits.filter((habit) => habit.completed).length; // Number of completed habits
  const totalCount = habits.length; // Total number of habits
  const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0; // Percentage of completed habits

  //Calculate Current Streak function
  // Calculate current streak
  const currentStreak = (() => {
    if (habits.length === 0) return 0;

    let streak = 0;
    const today = new Date();

    // Start from yesterday and go backwards
    for (let i = 1; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateKey = checkDate.toISOString().split("T")[0];

      // Check if ALL habits were completed on this date
      const allCompleted = habits.every(
        (habit) => habit.completionHistory?.[dateKey] === true
      );

      if (allCompleted) {
        streak++;
      } else {
        break; // Streak is broken
      }
    }

    return streak;
  })();

  const value = {
    habits,
    addHabit,
    toggleHabit,
    deleteHabit,
    updateHabit,
    completedCount,
    totalCount,
    percentage,
    currentStreak,
  };

  return (
    <HabitsContext.Provider value={value}>{children}</HabitsContext.Provider>
  );
};

//Custom hook to easily access habits data in any component
export function useHabits() {
  const context = useContext(HabitsContext);
  if (context === undefined) {
    throw new Error("useHabits must be used within a HabitsProvider");
  }
  return context;
}
