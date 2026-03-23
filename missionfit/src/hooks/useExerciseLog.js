import { useState, useEffect, useCallback } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { startOfWeek, addDays, format } from "date-fns";
import { db } from "../firebase/config";
import { useAuth } from "./useAuth.jsx";

const ACTIVITY_TYPES = [
  "Walking",
  "Running",
  "Cycling",
  "Gym Workout",
  "Video Workout",
  "Swimming",
  "Other",
];

/**
 * Get Mon–Sun date strings for the current week.
 */
function getCurrentWeekDates() {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) =>
    format(addDays(monday, i), "yyyy-MM-dd")
  );
}

export function useExerciseLog() {
  const { user } = useAuth();
  const [weeklyMinutes, setWeeklyMinutes] = useState(0);
  const [todayEntries, setTodayEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Live-subscribe to today's exercise entries
  useEffect(() => {
    if (!user) return;

    const colRef = collection(
      db, "users", user.uid, "exerciseLog", todayStr, "entries"
    );
    const q = query(colRef, orderBy("createdAt", "asc"));

    const unsub = onSnapshot(q, (snap) => {
      setTodayEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return unsub;
  }, [user, todayStr]);

  // Calculate weekly minutes
  const loadWeeklyMinutes = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const weekDates = getCurrentWeekDates();
    let total = 0;

    for (const dateStr of weekDates) {
      const colRef = collection(
        db, "users", user.uid, "exerciseLog", dateStr, "entries"
      );
      try {
        const snap = await getDocs(colRef);
        total += snap.docs.reduce(
          (sum, d) => sum + (d.data().duration || 0), 0
        );
      } catch {
        // skip
      }
    }

    setWeeklyMinutes(total);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadWeeklyMinutes();
  }, [loadWeeklyMinutes, todayEntries.length]);

  async function addExercise(entry) {
    if (!user) return;
    const dateStr = entry.date || todayStr;
    const colRef = collection(
      db, "users", user.uid, "exerciseLog", dateStr, "entries"
    );
    await addDoc(colRef, {
      activity: entry.activity,
      duration: Number(entry.duration) || 0,
      date: dateStr,
      createdAt: new Date().toISOString(),
    });
    loadWeeklyMinutes();
  }

  async function deleteExercise(dateStr, entryId) {
    if (!user) return;
    await deleteDoc(
      doc(db, "users", user.uid, "exerciseLog", dateStr, "entries", entryId)
    );
    loadWeeklyMinutes();
  }

  return {
    weeklyMinutes,
    todayEntries,
    loading,
    addExercise,
    deleteExercise,
    ACTIVITY_TYPES,
    WEEKLY_TARGET: 150,
  };
}
