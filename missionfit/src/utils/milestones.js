/**
 * MissionFit milestone & medal definitions.
 *
 * Two categories:
 *   1. Weight milestones — unlocked when totalLost >= threshold
 *   2. Streak milestones — unlocked when longestStreak >= threshold
 *
 * Each milestone has a unique id, display name, emoji icon,
 * description, and the numeric threshold to unlock it.
 */

export const WEIGHT_MILESTONES = [
  { id: "w5",   label: "First Steps",        emoji: "👟", threshold: 5,   description: "Lost 5 lbs" },
  { id: "w10",  label: "Double Digits",       emoji: "🔥", threshold: 10,  description: "Lost 10 lbs" },
  { id: "w15",  label: "Rolling",             emoji: "🎯", threshold: 15,  description: "Lost 15 lbs" },
  { id: "w20",  label: "Serious Business",    emoji: "💪", threshold: 20,  description: "Lost 20 lbs" },
  { id: "w25",  label: "Quarter Century",     emoji: "⭐", threshold: 25,  description: "Lost 25 lbs" },
  { id: "w30",  label: "Unstoppable",         emoji: "🚀", threshold: 30,  description: "Lost 30 lbs" },
  { id: "w40",  label: "Transformed",         emoji: "🦅", threshold: 40,  description: "Lost 40 lbs" },
  { id: "w50",  label: "Halfway Home",        emoji: "🏔️", threshold: 50,  description: "Lost 50 lbs" },
  { id: "w60",  label: "New Territory",       emoji: "🌄", threshold: 60,  description: "Lost 60 lbs" },
  { id: "w75",  label: "Three Quarters",      emoji: "🎖️", threshold: 75,  description: "Lost 75 lbs" },
  { id: "w85",  label: "Mission Veteran",     emoji: "🏅", threshold: 85,  description: "Lost 85 lbs — matched your mission weight loss" },
  { id: "w90",  label: "Final Push",          emoji: "⚡", threshold: 90,  description: "Lost 90 lbs" },
  { id: "w100", label: "The Long Walk: Finished", emoji: "🏆", threshold: 100, description: "Lost 100 lbs — you did it, Elder." },
];

export const STREAK_MILESTONES = [
  { id: "s3",   label: "Getting Started",     emoji: "📝", threshold: 3,   description: "3-day logging streak" },
  { id: "s7",   label: "Full Week",           emoji: "📅", threshold: 7,   description: "7-day logging streak" },
  { id: "s14",  label: "Two Weeks Strong",    emoji: "💎", threshold: 14,  description: "14-day logging streak" },
  { id: "s30",  label: "Monthly Master",      emoji: "🗓️", threshold: 30,  description: "30-day logging streak" },
  { id: "s60",  label: "Two-Month Titan",     emoji: "🛡️", threshold: 60,  description: "60-day logging streak" },
  { id: "s100", label: "Century Club",        emoji: "💯", threshold: 100, description: "100-day logging streak" },
  { id: "s200", label: "Iron Will",           emoji: "⚔️", threshold: 200, description: "200-day logging streak" },
  { id: "s365", label: "Full Year",           emoji: "👑", threshold: 365, description: "365-day logging streak" },
];

export const EXERCISE_MILESTONES = [
  { id: "e1",  label: "First Workout",       emoji: "🏃", threshold: 1,   description: "Logged your first workout" },
  { id: "e150",label: "150-Minute Week",      emoji: "💪", threshold: 150, description: "Hit 150 minutes in a week" },
  { id: "e4w", label: "4-Week Exercise Streak",emoji: "🔥", threshold: 4,  description: "Exercised 4 consecutive weeks" },
];

export const ALL_MILESTONES = [
  ...WEIGHT_MILESTONES.map((m) => ({ ...m, category: "weight" })),
  ...STREAK_MILESTONES.map((m) => ({ ...m, category: "streak" })),
  ...EXERCISE_MILESTONES.map((m) => ({ ...m, category: "exercise" })),
];

/**
 * Given current stats, return which milestones are unlocked.
 * @param {number} totalLost - Total weight lost (positive number)
 * @param {number} longestStreak - Longest logging streak in days
 * @returns {string[]} Array of unlocked milestone IDs
 */
export function getUnlockedIds(totalLost = 0, longestStreak = 0, exerciseStats = {}) {
  const unlocked = [];
  for (const m of WEIGHT_MILESTONES) {
    if (totalLost >= m.threshold) unlocked.push(m.id);
  }
  for (const m of STREAK_MILESTONES) {
    if (longestStreak >= m.threshold) unlocked.push(m.id);
  }
  // Exercise milestones
  const { totalWorkouts = 0, bestWeekMinutes = 0, consecutiveExerciseWeeks = 0 } = exerciseStats;
  if (totalWorkouts >= 1) unlocked.push("e1");
  if (bestWeekMinutes >= 150) unlocked.push("e150");
  if (consecutiveExerciseWeeks >= 4) unlocked.push("e4w");
  return unlocked;
}

/**
 * Find the next weight milestone to reach.
 * @param {number} totalLost
 * @returns {{ milestone: object, remaining: number } | null}
 */
export function getNextWeightMilestone(totalLost = 0) {
  for (const m of WEIGHT_MILESTONES) {
    if (totalLost < m.threshold) {
      return { milestone: m, remaining: m.threshold - totalLost };
    }
  }
  return null; // All milestones achieved
}

/**
 * Find the next streak milestone to reach.
 * @param {number} longestStreak
 * @returns {{ milestone: object, remaining: number } | null}
 */
export function getNextStreakMilestone(longestStreak = 0) {
  for (const m of STREAK_MILESTONES) {
    if (longestStreak < m.threshold) {
      return { milestone: m, remaining: m.threshold - longestStreak };
    }
  }
  return null;
}
