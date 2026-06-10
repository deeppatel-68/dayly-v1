import { supabase } from "@/lib/supabase";
import { Habit } from "@/types/habits";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { COINS_PER_HABIT_COMPLETION } from "@/utils/xp";
import { useAuth } from "./AuthContext";
import { useCoins } from "./CoinsContext";
import { useXp } from "./XpContext";

interface HabitsContextType {
  habits: Habit[];
  loading: boolean;

  // Actions
  addHabit: (title: string, description?: string) => Promise<void>;
  toggleHabit: (id: string, dateKey?: string) => Promise<void>;
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

const defaultHabits = [
  {
    title: "Drink Water",
    target_count: 8,
    icon: "water",
    color: "#3B82F6", // blue
    frequency: "daily",
    description: "Stay hydrated throughout the day",
  },
  {
    title: "Exercise",
    target_count: 3,
    icon: "walk",
    color: "#22C55E", // green
    frequency: "daily",
    description: "Move your body",
  },
  {
    title: "Read",
    target_count: 1,
    icon: "book",
    color: "#A855F7", // purple
    frequency: "daily",
    description: "Read for personal growth",
  },
];

// Context
export const HabitsContext = createContext<HabitsContextType | undefined>(
  undefined
);

export const HabitsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { awardHabitXp } = useXp();
  const { addCoins } = useCoins();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load habits and completions when user logs in
  useEffect(() => {
    if (user) {
      loadHabits();
      loadCompletions();
      checkAndResetDaily();
    } else {
      setHabits([]);
      setCompletions([]);
      setLoading(false);
    }
  }, [user]);

  // Load habits from Supabase
  const loadHabits = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("habits")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        // First time user - create default habits
        await createDefaultHabits();
        return;
      }

      // Map Supabase data to your Habit type
      const habitsWithHistory = await Promise.all(
        data.map(async (habit: any) => {
          // Get completion history for this habit
          const { data: completionData } = await supabase
            .from("habit_completions")
            .select("completed_at")
            .eq("habit_id", habit.id)
            .eq("user_id", user.id);

          // Convert array to completionHistory object
          // Presence of a row indicates completion (completed_at is a date type)
          const completionHistory: { [key: string]: boolean } = {};
          completionData?.forEach((c: any) => {
            if (c.completed_at) completionHistory[c.completed_at] = true;
          });

          // Check if completed today
          const today = new Date().toISOString().split("T")[0];
          const completedToday = completionHistory[today] === true;

          return {
            id: habit.id,
            user_id: habit.user_id,
            title: habit.title,
            description: habit.description,
            target_count: habit.target_count,
            icon: habit.icon,
            color: habit.color,
            frequency: habit.frequency,
            completed: completedToday,
            completedAt: completedToday ? habit.completed_at : undefined,
            createdAt: habit.created_at,
            completionHistory,
          };
        })
      );

      setHabits(habitsWithHistory);
    } catch (error) {
      console.error("Error loading habits:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load all completions
  const loadCompletions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("habit_completions")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      setCompletions(data || []);
    } catch (error) {
      console.error("Error loading completions:", error);
    }
  };

  // Create default habits for new users
  const createDefaultHabits = async () => {
    if (!user) return;

    try {
      const habitsToCreate = defaultHabits.map((habit) => ({
        ...habit,
        user_id: user.id,
      }));

      const { data, error } = await supabase
        .from("habits")
        .insert(habitsToCreate)
        .select();

      if (error) throw error;

      // Map to Habit type with empty completion history
      const newHabits: Habit[] = data.map((h: any) => ({
        id: h.id,
        user_id: h.user_id,
        title: h.title,
        description: h.description,
        target_count: h.target_count,
        icon: h.icon,
        color: h.color,
        frequency: h.frequency,
        completed: false,
        completedAt: undefined,
        createdAt: h.created_at,
        completionHistory: {},
      }));

      setHabits(newHabits);
    } catch (error) {
      console.error("Error creating default habits:", error);
    }
  };

  // Check and reset daily
  const checkAndResetDaily = async () => {
    if (!user) return;

    try {
      const today = new Date().toDateString();

      // Get last reset date from Supabase profiles table
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("last_reset_date")
        .eq("id", user.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        // PGRST116 is "not found" - we'll handle that below
        throw profileError;
      }

      const lastReset = profile?.last_reset_date || null;

      if (lastReset !== today) {
        console.log("New day detected - resetting completion status");

        // Reset local state (completion status is derived from habit_completions table)
        setHabits((prev) =>
          prev.map((habit) => ({
            ...habit,
            completed: false,
            completedAt: undefined,
          }))
        );

        // Update last reset date in profiles table
        const { error: updateError } = await supabase.from("profiles").upsert(
          {
            id: user.id,
            last_reset_date: today,
          },
          {
            onConflict: "id",
          }
        );

        if (updateError) {
          if (
            updateError.code === "42501" &&
            updateError.message &&
            updateError.message.includes("row-level security")
          ) {
            console.error(
              "Failed to update last reset date due to row-level security (RLS) on the 'profiles' table. Ensure your Supabase RLS policies allow authenticated users to upsert their own profile records. Update your Supabase policy for table 'profiles' to allow upserts for authenticated users where user id = auth.uid().",
              updateError
            );
          } else {
            console.error("Error updating last reset date:", updateError);
          }
        }
      }
    } catch (error) {
      console.error("Error checking and resetting daily:", error);
    }
  };

  // Add Habit
  const addHabit = async (title: string, description?: string) => {
    if (!user) {
      console.error("No user logged in");
      return;
    }

    // Check limit
    if (habits.length >= 5) {
      console.warn("Maximum habit limit reached (5 habits)");
      return;
    }

    try {
      const newHabitData = {
        user_id: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        target_count: 1,
        icon: "book",
        color: "#FF6B35", // orange
        frequency: "daily",
      };

      const { data, error } = await supabase
        .from("habits")
        .insert([newHabitData])
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      const newHabit: Habit = {
        id: data.id,
        user_id: data.user_id,
        title: data.title,
        description: data.description,
        target_count: data.target_count,
        icon: data.icon,
        color: data.color,
        frequency: data.frequency,
        completed: false,
        completedAt: undefined,
        createdAt: data.created_at,
        completionHistory: {},
      };

      setHabits((prev) => [...prev, newHabit]);
    } catch (error) {
      console.error("Error adding habit:", error);
      throw error;
    }
  };

  // Toggle Habit
  const toggleHabit = async (id: string, dateKey?: string) => {
    if (!user) return;

    const targetDate = dateKey || new Date().toISOString().split("T")[0];

    try {
      // Find the habit
      const habit = habits.find((h) => h.id === id);
      if (!habit) return;

      const isCompleted = habit.completionHistory?.[targetDate] === true;
      const newCompletedState = !isCompleted;

      // Update or insert completion record (completed_at is a date type)
      if (newCompletedState) {
        // Add completion (upsert to handle existing records)
        const { error } = await supabase.from("habit_completions").upsert(
          {
            habit_id: id,
            user_id: user.id,
            completed_at: targetDate,
          },
          {
            onConflict: "habit_id,completed_at",
          }
        );

        if (error) throw error;

        // Rewards are granted at most once per habit per date
        if (awardHabitXp(id, targetDate)) {
          addCoins(COINS_PER_HABIT_COMPLETION);
        }
      } else {
        // Remove completion
        const { error } = await supabase
          .from("habit_completions")
          .delete()
          .eq("habit_id", id)
          .eq("user_id", user.id)
          .eq("completed_at", targetDate);

        if (error) throw error;
      }

      // Update local state
      setHabits((prev) =>
        prev.map((h) => {
          if (h.id !== id) return h;

          const isToday = targetDate === new Date().toISOString().split("T")[0];

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
    } catch (error) {
      console.error("Error toggling habit:", error);
      throw error;
    }
  };

  // Delete Habit
  const deleteHabit = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("habits")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      // Update local state
      setHabits((prev) => prev.filter((habit) => habit.id !== id));
    } catch (error) {
      console.error("Error deleting habit:", error);
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
      const { error } = await supabase
        .from("habits")
        .update({
          title: title.trim(),
          description: description?.trim() || null,
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      // Update local state
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
      console.error("Error updating habit:", error);
      throw error;
    }
  };

  // Calculate Statistics
  const completedCount = habits.filter((habit) => habit.completed).length;
  const totalCount = habits.length;
  const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Calculate Current Streak
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
        break;
      }
    }

    return streak;
  })();

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
