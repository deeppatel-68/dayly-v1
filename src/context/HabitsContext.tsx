import * as habitsService from "@/services/habitsService";
import { HabitRewardResult } from "@/services/habitsService";
import { incrementUserProgress } from "@/services/progressService";
import { Habit } from "@/types/habits";
import { calculateStreaks } from "@/utils/analytics";
import {
  calculateCompletedCount,
  calculateCompletionPercentage,
  calculateCurrentStreak,
  isHabitCompletedOnDate,
  todayDateKey,
} from "@/utils/habitStats";
import { logSupabaseError } from "@/utils/supabaseErrors";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./AuthContext";

// Thin view over the habits persistence seam (services/habitsService): holds
// screen state and optimistic updates; every query and reward lives behind
// the service interface.

interface HabitsContextType {
  habits: Habit[];
  loading: boolean;

  // Actions
  addHabit: (title: string, description?: string) => Promise<void>;
  toggleHabit: (
    id: string,
    dateKey?: string
  ) => Promise<HabitRewardResult | void>;
  deleteHabit: (id: string) => Promise<void>;
  updateHabit: (
    id: string,
    title: string,
    description?: string
  ) => Promise<void>;

  // Statistics
  completedCount: number;
  totalCount: number;
  percentage: number;
  currentStreak: number;
}

// Context
export const HabitsContext = createContext<HabitsContextType | undefined>(
  undefined
);

export const HabitsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  // Load habits and run the daily reset check when the user logs in
  useEffect(() => {
    if (!user) {
      setHabits([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    setLoading(true);
    habitsService
      .loadUserHabits(user.id)
      .then((loaded) => {
        if (!cancelled) setHabits(loaded);
      })
      .catch((error) => logSupabaseError("Error loading habits:", error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    habitsService.syncDailyReset(user.id).then((didReset) => {
      if (!didReset || cancelled) return;
      console.log("New day detected - resetting completion status");
      // Completion status is derived from habit_completions; on a new day
      // only the local "completed today" flags need clearing
      setHabits((prev) =>
        prev.map((habit) => ({
          ...habit,
          completed: false,
          completedAt: undefined,
        }))
      );
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Keep streak progress in sync for the rest of the app (avatar tiers etc.)
  useEffect(() => {
    if (!user || loading) return;
    const { currentStreak, longestStreak } = calculateStreaks(habits);
    incrementUserProgress(user.id, {
      currentStreak,
      bestStreak: longestStreak,
    }).catch((error) =>
      logSupabaseError("Error syncing streak progress:", error)
    );
  }, [habits, loading, user]);

  // Add Habit
  const addHabit = async (title: string, description?: string) => {
    if (!user) {
      console.error("No user logged in");
      return;
    }

    // Fast-path guard; the service enforces the same invariant
    if (habits.length >= habitsService.MAX_HABITS) {
      console.warn(
        `Maximum habit limit reached (${habitsService.MAX_HABITS} habits)`
      );
      return;
    }

    try {
      const newHabit = await habitsService.createHabit(
        user.id,
        title,
        description
      );
      setHabits((prev) => [...prev, newHabit]);
    } catch (error) {
      logSupabaseError("Error adding habit:", error);
      throw error;
    }
  };

  // Toggle Habit completion for a date (defaults to today)
  const toggleHabit = async (id: string, dateKey?: string) => {
    if (!user) return;

    const targetDate = dateKey || todayDateKey();

    try {
      const habit = habits.find((h) => h.id === id);
      if (!habit) return;

      const newCompletedState = !isHabitCompletedOnDate(habit, targetDate);

      const rewardResult = await habitsService.setHabitCompletion(
        user.id,
        id,
        targetDate,
        newCompletedState
      );

      // Update local state
      setHabits((prev) =>
        prev.map((h) => {
          if (h.id !== id) return h;

          const isToday = targetDate === todayDateKey();

          return {
            ...h,
            completed: isToday ? newCompletedState : h.completed,
            completedAt:
              isToday && newCompletedState
                ? new Date().toISOString()
                : h.completedAt,
            completionHistory: {
              ...h.completionHistory,
              [targetDate]: newCompletedState,
            },
          };
        })
      );

      return rewardResult;
    } catch (error) {
      logSupabaseError("Error toggling habit:", error);
      throw error;
    }
  };

  // Delete Habit
  const deleteHabit = async (id: string) => {
    if (!user) return;

    try {
      await habitsService.deleteHabit(user.id, id);
      setHabits((prev) => prev.filter((habit) => habit.id !== id));
    } catch (error) {
      logSupabaseError("Error deleting habit:", error);
      throw error;
    }
  };

  // Update Habit
  const updateHabit = async (
    id: string,
    title: string,
    description?: string
  ) => {
    if (!user) return;

    try {
      await habitsService.updateHabit(user.id, id, title, description);
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
    } catch (error) {
      logSupabaseError("Error updating habit:", error);
      throw error;
    }
  };

  // Derived statistics
  const completedCount = calculateCompletedCount(habits);
  const totalCount = habits.length;
  const percentage = calculateCompletionPercentage(completedCount, totalCount);
  const currentStreak = calculateCurrentStreak(habits);

  const value = {
    habits,
    loading,
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

export function useHabits() {
  const context = useContext(HabitsContext);
  if (context === undefined) {
    throw new Error("useHabits must be used within a HabitsProvider");
  }
  return context;
}
