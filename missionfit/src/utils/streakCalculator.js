/**
 * Calculate logging streaks from an array of date strings.
 *
 * Grace rule: missing exactly 1 day does NOT break the streak.
 * Two or more consecutive missed days breaks it — UNLESS the user
 * has available streak freezes.
 *
 * Freeze bank:
 *   earnedFreezes = Math.floor(currentStreak / 7)
 *   availableFreezes = earnedFreezes - freezesUsed
 *   Each freeze covers 1 additional missed day beyond the free grace day.
 *
 * @param {string[]} dateStrings - Array of "YYYY-MM-DD" strings
 * @param {number} freezesUsed - Number of freezes already spent (from Firestore)
 * @returns {{ currentStreak, longestStreak, lastLogDate, graceActive, earnedFreezes, availableFreezes, freezeActiveToday }}
 */
export function calculateStreak(dateStrings, freezesUsed = 0, travelMode = false) {
  if (!dateStrings || dateStrings.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastLogDate: null,
      graceActive: false,
      earnedFreezes: 0,
      availableFreezes: 0,
      freezeActiveToday: false,
    };
  }

  const sorted = [...new Set(dateStrings)].sort();
  const lastLogDate = sorted[sorted.length - 1];

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

  // Grace threshold: normally 2 (1 missed day free), travel mode extends to 3 (2 missed days free)
  const graceGap = travelMode ? 3 : 2;

  // Build streaks with freeze-aware gap tolerance.
  // Base grace: gap <= graceGap is always free.
  // With freezes: each available freeze allows 1 more missed day in a gap.
  // We compute streaks in two passes:
  //   1. Standard streaks (grace only, gap <= graceGap)
  //   2. Then check if freezes would bridge broken streaks for current streak

  // Pass 1: standard streak building (for longestStreak — no freezes)
  const streaks = [];
  let run = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const gap = daysBetween(sorted[i - 1], sorted[i]);
    if (gap <= graceGap) {
      run.push(sorted[i]);
    } else {
      streaks.push(run);
      run = [sorted[i]];
    }
  }
  streaks.push(run);

  const longestStreak = Math.max(...streaks.map((s) => s.length));

  // Pass 2: freeze-aware current streak
  // Walk backwards from the last streak, checking if freezes can bridge gaps
  const today = todayStr();
  const daysSinceLast = daysBetween(lastLogDate, today);

  let currentStreak = 0;
  let graceActive = false;
  let freezeActiveToday = false;
  let freezesConsumed = 0; // freezes that would be consumed by gaps in the current streak

  // Start with the last streak
  const lastStreakIdx = streaks.length - 1;
  currentStreak = streaks[lastStreakIdx].length;

  // Try to bridge backwards into previous streaks using freezes
  for (let i = lastStreakIdx; i > 0; i--) {
    const prevStreakEnd = streaks[i - 1][streaks[i - 1].length - 1];
    const thisStreakStart = streaks[i][0];
    const gap = daysBetween(prevStreakEnd, thisStreakStart);
    // gap includes the free grace days. Extra missed days need freezes.
    const extraMissed = gap - graceGap; // days beyond the free grace
    if (extraMissed <= 0) {
      // Should have been merged in pass 1 — shouldn't happen, but handle it
      currentStreak += streaks[i - 1].length;
    } else {
      const freezesAvailNow = Math.floor(currentStreak / 7) - freezesUsed - freezesConsumed;
      if (freezesAvailNow >= extraMissed) {
        freezesConsumed += extraMissed;
        currentStreak += streaks[i - 1].length;
      } else {
        break; // Can't bridge — streak ends here
      }
    }
  }

  // Check if the current streak is still alive (connected to today)
  if (daysSinceLast > graceGap) {
    // More than grace-day gap from last log to today
    const extraMissed = daysSinceLast - graceGap;
    const freezesAvailNow = Math.floor(currentStreak / 7) - freezesUsed - freezesConsumed;
    if (freezesAvailNow >= extraMissed) {
      freezeActiveToday = true;
      freezesConsumed += extraMissed;
    } else {
      // Streak is dead
      currentStreak = 0;
    }
  } else if (daysSinceLast <= graceGap && daysSinceLast >= 1) {
    const dateSet = new Set(sorted);
    if (!dateSet.has(today)) {
      graceActive = true;
    }
  } else if (daysSinceLast > graceGap) {
    currentStreak = 0;
  }

  const earnedFreezes = Math.floor(currentStreak / 7);
  const availableFreezes = Math.max(0, earnedFreezes - freezesUsed - freezesConsumed);

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    lastLogDate,
    graceActive,
    earnedFreezes,
    availableFreezes,
    freezeActiveToday,
  };
}
