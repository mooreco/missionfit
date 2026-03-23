import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { format, startOfWeek, addDays } from "date-fns";
import { db } from "../firebase/config";
import { useAuth } from "./useAuth.jsx";

/**
 * Firestore structure:
 *   users/{uid}/mealPlans/{weekKey}
 *   weekKey = "2026-W12" (ISO week)
 *   {
 *     days: {
 *       "2026-03-21": {
 *         meals: [
 *           { slot: "breakfast"|"lunch"|"dinner"|"snack",
 *             type: "recipe"|"custom",
 *             recipeId?: string,
 *             name: string,
 *             pointsPerServing: number,
 *             servings: number }
 *         ]
 *       },
 *       ...
 *     },
 *     updatedAt: ISO string
 *   }
 */

// Get the Monday of the week containing `date`
function getWeekStart(date = new Date()) {
  return startOfWeek(date, { weekStartsOn: 1 }); // Monday
}

// Generate week key like "2026-W12"
function getWeekKey(date = new Date()) {
  const ws = getWeekStart(date);
  const year = ws.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const dayOfYear = Math.floor((ws - jan1) / 86400000) + 1;
  const weekNum = Math.ceil((dayOfYear + jan1.getDay()) / 7);
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

// Generate array of 7 date strings for a week
function getWeekDates(date = new Date()) {
  const ws = getWeekStart(date);
  return Array.from({ length: 7 }, (_, i) =>
    format(addDays(ws, i), "yyyy-MM-dd")
  );
}

const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snack"];

export function useMealPlan(weekOffset = 0) {
  const { user, profile } = useAuth();
  const dailyBudget = profile?.dailyPointsBudget ?? 23;

  const baseDate = addDays(new Date(), weekOffset * 7);
  const weekKey = getWeekKey(baseDate);
  const weekDates = getWeekDates(baseDate);
  const weekLabel = `${format(new Date(weekDates[0] + "T12:00:00"), "MMM d")} – ${format(new Date(weekDates[6] + "T12:00:00"), "MMM d, yyyy")}`;

  const [plan, setPlan] = useState({});
  const [loading, setLoading] = useState(true);

  // Load plan for this week
  useEffect(() => {
    if (!user) return;

    async function load() {
      setLoading(true);
      try {
        const ref = doc(db, "users", user.uid, "mealPlans", weekKey);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setPlan(snap.data().days || {});
        } else {
          setPlan({});
        }
      } catch {
        setPlan({});
      }
      setLoading(false);
    }

    load();
  }, [user, weekKey]);

  // Save the entire plan for this week
  const savePlan = useCallback(
    async (days) => {
      if (!user) return;
      const ref = doc(db, "users", user.uid, "mealPlans", weekKey);
      await setDoc(ref, {
        days,
        updatedAt: new Date().toISOString(),
      });
      setPlan(days);
    },
    [user, weekKey]
  );

  // Add a meal to a specific day and slot
  const addMeal = useCallback(
    async (dateStr, meal) => {
      const updated = { ...plan };
      if (!updated[dateStr]) {
        updated[dateStr] = { meals: [] };
      }
      updated[dateStr] = {
        ...updated[dateStr],
        meals: [...(updated[dateStr].meals || []), meal],
      };
      await savePlan(updated);
    },
    [plan, savePlan]
  );

  // Remove a meal from a day by index
  const removeMeal = useCallback(
    async (dateStr, index) => {
      const updated = { ...plan };
      if (!updated[dateStr]) return;
      const meals = [...(updated[dateStr].meals || [])];
      meals.splice(index, 1);
      updated[dateStr] = { ...updated[dateStr], meals };
      await savePlan(updated);
    },
    [plan, savePlan]
  );

  // Calculate points per day
  function getDayPoints(dateStr) {
    const day = plan[dateStr];
    if (!day || !day.meals) return 0;
    return day.meals.reduce(
      (sum, m) => sum + (m.pointsPerServing || 0) * (m.servings || 1),
      0
    );
  }

  // Generate grocery list from the current week's plan
  function getGroceryList() {
    const items = new Map(); // name -> { name, count, unit }

    for (const dateStr of weekDates) {
      const day = plan[dateStr];
      if (!day || !day.meals) continue;

      for (const meal of day.meals) {
        if (meal.ingredients && Array.isArray(meal.ingredients)) {
          for (const ing of meal.ingredients) {
            const key = ing.name.toLowerCase().trim();
            if (items.has(key)) {
              const existing = items.get(key);
              existing.count += (parseFloat(ing.amount) || 1) * (meal.servings || 1);
            } else {
              items.set(key, {
                name: ing.name,
                count: (parseFloat(ing.amount) || 1) * (meal.servings || 1),
                unit: ing.unit || "",
              });
            }
          }
        } else {
          // Custom meal without ingredients — just list the name
          const key = meal.name.toLowerCase().trim();
          if (!items.has(key)) {
            items.set(key, { name: meal.name, count: 1, unit: "meal" });
          } else {
            items.get(key).count += 1;
          }
        }
      }
    }

    return Array.from(items.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  return {
    plan,
    loading,
    weekKey,
    weekDates,
    weekLabel,
    dailyBudget,
    addMeal,
    removeMeal,
    savePlan,
    getDayPoints,
    getGroceryList,
    MEAL_SLOTS,
  };
}
