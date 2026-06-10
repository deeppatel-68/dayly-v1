// XP and level calculations shared across screens

export const XP_PER_HABIT_COMPLETION = 10;
export const COINS_PER_HABIT_COMPLETION = 5;

export const XP_PER_STUDY_MINUTE = 1;
export const STUDY_MINUTES_PER_COIN = 5;

export interface StudyRewards {
  minutes: number;
  xp: number;
  coins: number;
}

export const getStudyRewards = (seconds: number): StudyRewards => {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  return {
    minutes,
    xp: minutes * XP_PER_STUDY_MINUTE,
    coins: Math.floor(minutes / STUDY_MINUTES_PER_COIN),
  };
};

// XP required to advance from `level` to `level + 1`
export const xpRequiredForLevel = (level: number): number => level * 100;

export interface LevelProgress {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progress: number; // 0..1 within the current level
}

export const getLevelProgress = (totalXp: number): LevelProgress => {
  let level = 1;
  let remaining = Math.max(0, totalXp);

  while (remaining >= xpRequiredForLevel(level)) {
    remaining -= xpRequiredForLevel(level);
    level++;
  }

  const xpForNextLevel = xpRequiredForLevel(level);

  return {
    level,
    xpIntoLevel: remaining,
    xpForNextLevel,
    progress: remaining / xpForNextLevel,
  };
};
