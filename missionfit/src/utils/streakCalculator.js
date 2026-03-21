/**
 * Calculate logging streaks from an array of date strings.
 *
 * Grace rule: missing exactly 1 day does NOT break the streak.
 * Two or more consecutive missed days breaks it.
 *
 * @param {string[]} dateStrings - Array of "YYYY-MM-DD" strings (dates with at least one food entry)
 * @returns {{ currentStreak: number, longestStreak: number, lastLogDate: string|null, graceActive: boolean }}
 */
export function calculateStreak(dateStrings) {
  if (!dateStrings || dateStrings.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastLogDate: null, graceActive: false };
  }

  const sorted = [...new Set(dateStrings)].sort();
  const lastLogDate = sorted[sorted.length - 1];

  // Day difference between two YYYY-MM-DD strings
  function daysBetween(a, b) {
    const da = new Date(a + "T12:00:00");
    const db = new Date(b + "T12:00:00");
    return Math.round((db - da) / 86400000);
  }

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  // Build streaks: group consecutive logged dates where gaps are <= 2 days
  // (gap of 1 calendar day between entries = 1 missed day = grace)
  // (gap of 2+ calendar days between entries = 2+ missed days = break)
  const streaks = [];
  let run = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const gap = daysBetween(sorted[i - 1], sorted[i]);
    if (gap <= 2) {
      run.push(sorted[i]);
    } else {
      streaks.push(run);
      run = [sorted[i]];
    }
  }
  streaks.push(run);

  const longestStreak = Math.max(...streaks.map((s) => s.length));

  // Current streak: the last streak, but only if it's still "alive"
  // (last logged date is within 2 days of today)
  const today = todayStr();
  const lastStreak = streaks[streaks.length - 1];
  const daysSinceLast = daysBetween(lastLogDate, today);

  let currentStreak = 0;
  let graceActive = false;

  if (daysSinceLast <= 2) {
    // The last streak is still active
    currentStreak = lastStreak.length;

    // Grace is active if today has no entry but we're still in the streak
    const dateSet = new Set(sorted);
    if (!dateSet.has(today) && daysSinceLast >= 1) {
      graceActive = true;
    }
  }

  return { currentStreak, longestStreak, lastLogDate, graceActive };
}
