export type CompanionStudioTabId = "home" | "habits" | "study" | "stats";

export type CompanionStudioTab = {
  id: CompanionStudioTabId;
  label: string;
  title: string;
  path: "/" | "/habits" | "/study" | "/stats";
  sfSymbol: { default: string; selected: string };
  androidIcon: string;
};

export const COMPANION_STUDIO_TABS: readonly CompanionStudioTab[] = [
  {
    id: "home",
    label: "Home",
    title: "Home",
    path: "/",
    sfSymbol: { default: "house", selected: "house.fill" },
    androidIcon: "home",
  },
  {
    id: "habits",
    label: "Habits",
    title: "Habits",
    path: "/habits",
    sfSymbol: { default: "checkmark.circle", selected: "checkmark.circle.fill" },
    androidIcon: "checkmark-circle",
  },
  {
    id: "study",
    label: "Focus",
    title: "Focus",
    path: "/study",
    sfSymbol: { default: "timer", selected: "timer.circle.fill" },
    androidIcon: "timer",
  },
  {
    id: "stats",
    label: "Progress",
    title: "Progress",
    path: "/stats",
    sfSymbol: { default: "chart.bar", selected: "chart.bar.fill" },
    androidIcon: "bar-chart",
  },
] as const;
