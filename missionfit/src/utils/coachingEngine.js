import { getNextWeightMilestone } from "./milestones";

/**
 * Contextual coaching tips engine.
 * Checks conditions in priority order and returns the highest-priority match.
 *
 * @param {Object} state
 * @param {number} state.todayPoints - Points used today
 * @param {number} state.dailyBudget - Daily points budget
 * @param {Object[]} state.weighIns - All weigh-ins sorted by date asc
 * @param {number} state.totalLost - Total weight lost (positive)
 * @param {Object} state.streak - { currentStreak, longestStreak, ... }
 * @param {boolean} state.travelMode - Whether travel mode is active
 * @param {boolean} state.maintenanceMode - Whether maintenance mode is active
 * @param {string|null} state.lastMeasurementDate - ISO date of last body measurement
 * @param {string|null} state.lastBloodworkDate - ISO date of last bloodwork entry
 * @returns {{ tip: string, context: string }}
 */
export function getCoachingTip(state) {
  const {
    todayPoints = 0,
    dailyBudget = 23,
    weighIns = [],
    totalLost = 0,
    streak = {},
    travelMode = false,
    maintenanceMode = false,
    lastMeasurementDate = null,
    lastBloodworkDate = null,
  } = state;

  // Priority 1: Weigh-in today shows a gain
  if (weighIns.length >= 2) {
    const latest = weighIns[weighIns.length - 1];
    const previous = weighIns[weighIns.length - 2];
    const todayStr = new Date().toISOString().split("T")[0];
    if (latest.date === todayStr && latest.weight > previous.weight) {
      return {
        tip: "The scale is one data point. Your streak is what matters. Keep walking.",
        context: "weigh-in-gain",
      };
    }
  }

  // Priority 2: Travel mode active
  if (travelMode) {
    return {
      tip: "You lost 85 lbs on your mission walking every day in a foreign country. A hotel can't stop you.",
      context: "travel-mode",
    };
  }

  // Priority 3: Within 3 lbs of next weight medal
  const next = getNextWeightMilestone(totalLost);
  if (next && next.remaining <= 3) {
    return {
      tip: "You're close. That grandchild is going to have a grandpa who shows up.",
      context: "near-milestone",
    };
  }

  // Priority 4: Over daily budget today
  if (todayPoints > dailyBudget) {
    return {
      tip: "One meal doesn't define your mission. Tomorrow is a fresh set of points.",
      context: "over-budget",
    };
  }

  // Priority 5: Plateau — no weight loss in 14+ days
  if (weighIns.length >= 2) {
    const latest = weighIns[weighIns.length - 1];
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const twoWeeksStr = twoWeeksAgo.toISOString().split("T")[0];
    // Find the weigh-in closest to 14 days ago
    const olderEntry = [...weighIns].reverse().find((w) => w.date <= twoWeeksStr);
    if (olderEntry && latest.weight >= olderEntry.weight) {
      return {
        tip: "Plateaus are the body recalibrating. Keep logging, keep walking. The scale will catch up.",
        context: "plateau",
      };
    }
  }

  // Priority 6: Hit exactly a 7-day streak
  if (streak.currentStreak === 7) {
    return {
      tip: "A week of consistency. This is how 100 lbs disappears — one tracked day at a time.",
      context: "streak-seven",
    };
  }

  // Priority 7: Maintenance mode
  if (maintenanceMode) {
    return {
      tip: "Maintaining is its own mission. You earned this — now protect it.",
      context: "maintenance",
    };
  }

  // Priority 8: 30+ days since last measurement
  if (lastMeasurementDate) {
    const daysSince = Math.floor(
      (Date.now() - new Date(lastMeasurementDate).getTime()) / 86400000
    );
    if (daysSince >= 30) {
      return {
        tip: "Time for monthly measurements — grab the tape measure, it takes 2 minutes.",
        context: "measurement-reminder",
      };
    }
  }

  // Priority 9: 90+ days since last bloodwork
  if (lastBloodworkDate) {
    const daysSince = Math.floor(
      (Date.now() - new Date(lastBloodworkDate).getTime()) / 86400000
    );
    if (daysSince >= 90) {
      return {
        tip: "Any new bloodwork? Log it to track your progress.",
        context: "bloodwork-reminder",
      };
    }
  }

  // Priority 10: Rotating personalized tips
  return {
    tip: getRotatingTip(),
    context: "rotating",
  };
}

const ROTATING_TIPS = [
  "Water first. Drink a full glass before every meal.",
  "Protein at every meal keeps you full longer.",
  "Progress isn't linear. Trust the process.",
  "You didn't come this far to only come this far.",
  "Meal prep on Sunday saves you all week.",
  "A 10-minute walk beats zero minutes every time.",
  "Sleep matters. Poor sleep drives hunger hormones.",
  "Track everything — even the bad days. Awareness is power.",
  "You're not starting over. You're starting from experience.",
  "Vegetables first, protein second, carbs last.",
  "One bad meal won't wreck you. One bad week might.",
  "Your body is doing hard things. Be patient with it.",
  "The best exercise is the one you'll actually do.",
  "Discipline weighs ounces. Regret weighs tons.",
  "Every pound lost is four less pounds of pressure on your knees.",
  "Remember walking through Resistencia in the summer heat? You can handle a kitchen.",
  "Daymi's watching. The Bombshell married someone who finishes what he starts.",
  "That grandchild is going to know a grandpa who can keep up.",
  "You walked 8+ miles a day on your mission. Channel that Elder energy.",
  "The Long Walk isn't about speed. It's about not stopping.",
  "BYU-Idaho hill walks in January built you for this. Keep climbing.",
  "Every entry you log is a vote for the person you're becoming.",
  "Your mission comp would be proud. Finish what you started, Elder.",
  "280 to 180. That's not a diet — that's a transformation story.",
];

function getRotatingTip() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  return ROTATING_TIPS[dayOfYear % ROTATING_TIPS.length];
}
