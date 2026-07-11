import * as habitsService from "@/services/habitsService";
import { HabitRewardResult } from "@/services/habitsService";
import {
  getUserProgress,
  subscribeToProgress,
} from "@/services/progressService";
import { Habit } from "@/types/habits";
import {
  calculateCompletedCount,
  calculateCompletionPercentage,
  isHabitCompletedOnDate,
  todayDateKey,
} from "@/utils/habitStats";
import { logSupabaseError } from "@/utils/supabaseErrors";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { useAuth } from "./AuthContext";

interface HabitsContextType {
  habits: Habit[];
  loading: boolean;
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
  completedCount: number;
  totalCount: number;
  percentage: number;
  currentStreak: number;
}

export const HabitsContext = createContext<HabitsContextType | undefined>(
  undefined
);

export const HabitsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStreak, setCurrentStreak] = useState(0);
  const activeDateKey = useRef(todayDateKey());

  const loadHabitState = useCallback(async () => {
    if (!user) return null;
    const loaded = await habitsService.loadUserHabits(user.id);
    const progress = await getUserProgress(user.id);
    return { habits: loaded, currentStreak: progress.current_streak };
  }, [user]);

  const reloadHabits = useCallback(async () => {
    const nextState = await loadHabitState();
    if (!nextState) return;
    setHabits(nextState.habits);
    setCurrentStreak(nextState.currentStreak);
  }, [loadHabitState]);

  useEffect(() => {
    if (!user) {
      setHabits([]);
      setCurrentStreak(0);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    activeDateKey.current = todayDateKey();

    const unsubscribe = subscribeToProgress((progress) => {
      if (progress.user_id === user.id) {
        setCurrentStreak(progress.current_streak);
      }
    });

    loadHabitState()
      .then((nextState) => {
        if (cancelled) return;
        if (!nextState) return;
        setHabits(nextState.habits);
        setCurrentStreak(nextState.currentStreak);
      })
      .catch((error) => logSupabaseError("Error loading habits:", error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [loadHabitState, user]);

  useEffect(() => {
    let midnightTimer: ReturnType<typeof setTimeout> | undefined;

    const refreshForNewDate = () => {
      const nextDateKey = todayDateKey();
      if (nextDateKey === activeDateKey.current) return;
      activeDateKey.current = nextDateKey;
      reloadHabits().catch((error) =>
        logSupabaseError("Error refreshing habits for a new day:", error)
      );
    };

    const scheduleMidnightRefresh = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 1, 0);
      midnightTimer = setTimeout(() => {
        refreshForNewDate();
        scheduleMidnightRefresh();
      }, nextMidnight.getTime() - now.getTime());
    };

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshForNewDate();
    });
    scheduleMidnightRefresh();

    return () => {
      subscription.remove();
      if (midnightTimer) clearTimeout(midnightTimer);
    };
  }, [reloadHabits]);

  const addHabit = async (title: string, description?: string) => {
    if (!user || loading) return;
    if (habits.length >= habitsService.MAX_HABITS) return;

    const newHabit = await habitsService.createHabit(
      user.id,
      title,
      description
    );
    setHabits((previous) => [...previous, newHabit]);
  };

  const toggleHabit = async (id: string, dateKey?: string) => {
    if (!user || loading) return;
    const targetDate = dateKey ?? todayDateKey();
    const habit = habits.find((candidate) => candidate.id === id);
    if (!habit) return;

    const completed = !isHabitCompletedOnDate(habit, targetDate);
    const result = await habitsService.setHabitCompletion(
      user.id,
      id,
      targetDate,
      completed
    );

    setHabits((previous) =>
      previous.map((candidate) => {
        if (candidate.id !== id) return candidate;
        const isToday = targetDate === todayDateKey();
        return {
          ...candidate,
          completed: isToday ? completed : candidate.completed,
          completedAt: isToday
            ? completed
              ? new Date().toISOString()
              : undefined
            : candidate.completedAt,
          completionHistory: {
            ...candidate.completionHistory,
            [targetDate]: completed,
          },
        };
      })
    );

    return result;
  };

  const deleteHabit = async (id: string) => {
    if (!user || loading) return;
    await habitsService.deleteHabit(user.id, id);
    setHabits((previous) => previous.filter((habit) => habit.id !== id));
  };

  const updateHabit = async (
    id: string,
    title: string,
    description?: string
  ) => {
    if (!user || loading) return;
    await habitsService.updateHabit(user.id, id, title, description);
    setHabits((previous) =>
      previous.map((habit) =>
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

  const completedCount = calculateCompletedCount(habits);
  const totalCount = habits.length;
  const percentage = calculateCompletionPercentage(completedCount, totalCount);

  return (
    <HabitsContext.Provider
      value={{
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
      }}
    >
      {children}
    </HabitsContext.Provider>
  );
};

export function useHabits() {
  const context = useContext(HabitsContext);
  if (!context) throw new Error("useHabits must be used within a HabitsProvider");
  return context;
}
