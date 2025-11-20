// Habit interface for a single habit
export interface Habit {
  id: string;
  title: string;
  description?: string; // optional description
  completed: boolean;
  createdAt: string;
  completedAt?: string;
  completionHistory: { [date: string]: boolean }; //  Track completion by date (e.g., "2024-11-18": true)
}

// Habit state interface for the habits context
export interface HabitState {
  habits: Habit[];
  lastResetDate: string;
}
