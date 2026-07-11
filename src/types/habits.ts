// Habit interface for a single habit
export interface Habit {
  id: string;
  user_id: string;
  title: string;
  description?: string; // optional description
  completed: boolean;
  createdAt: string;
  startsOn: string;
  archivedOn?: string;
  completedAt?: string;
  completionHistory: { [date: string]: boolean }; //  Track completion by date (e.g., "2024-11-18": true)
  target_count: number; // Target number of completions per day
  icon: string; // Icon for the habit
  color: string; // Color for the habit
  frequency: string; // Frequency of the habit (e.g., "daily", "weekly", "monthly")
}

// Habit state interface for the habits context
export interface HabitState {
  habits: Habit[];
  lastResetDate: string;
}
