import { startOfWeek, addDays, format } from "date-fns";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

/**
 * Get the Mon–Sun date strings for the week containing `date`.
 */
export function getCurrentWeekDates(date = new Date()) {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) =>
    format(addDays(monday, i), "yyyy-MM-dd")
  );
}

/**
 * Calculate weekly bonus points consumed this week.
 * Overage = max(0, dayPoints - dailyBudget) for each day.
 * Returns { weeklyUsed, weeklyRemaining, weeklyTotal, dailyOverages }.
 * dailyOverages is a map of dateStr -> overage for days that went over.
 */
export async function calcWeeklyPoints(uid, dailyBudget, weeklyTotal = 28) {
  const weekDates = getCurrentWeekDates();
  const dailyOverages = {};
  let weeklyUsed = 0;

  for (const dateStr of weekDates) {
    const colRef = collection(db, "users", uid, "foodLog", dateStr, "entries");
    try {
      const snap = await getDocs(colRef);
      const dayPoints = snap.docs.reduce(
        (sum, d) => sum + (d.data().points || 0),
        0
      );
      const overage = Math.max(0, dayPoints - dailyBudget);
      if (overage > 0) {
        dailyOverages[dateStr] = overage;
        weeklyUsed += overage;
      }
    } catch {
      // Skip dates with no entries
    }
  }

  return {
    weeklyUsed,
    weeklyRemaining: Math.max(0, weeklyTotal - weeklyUsed),
    weeklyTotal,
    dailyOverages,
  };
}
