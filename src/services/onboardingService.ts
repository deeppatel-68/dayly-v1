import AsyncStorage from "@react-native-async-storage/async-storage";

// First-run onboarding completion flag. AsyncStorage-only for now (matches
// the "MVP-only local gamification" rule in dayly-architecture.md) — can
// migrate into settingsService's Supabase-backed settings blob later if
// onboarding state ever needs to sync across devices.

const onboardingStorageKey = (userId: string) => `@onboarding_complete:${userId}`;

export async function getOnboardingComplete(userId: string): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(onboardingStorageKey(userId));
    return value === "true";
  } catch (error) {
    console.error("Error reading onboarding flag:", error);
    return false;
  }
}

export async function setOnboardingComplete(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(onboardingStorageKey(userId), "true");
  } catch (error) {
    console.error("Error saving onboarding flag:", error);
  }
}
