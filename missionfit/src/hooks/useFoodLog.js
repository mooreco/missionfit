import { useState, useEffect, useCallback } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  collectionGroup,
  getDocs,
  limit,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "./useAuth.jsx";

const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snack"];

/**
 * Auto-assign a slot based on creation time for legacy entries.
 */
function guessSlot(entry) {
  if (entry.slot && MEAL_SLOTS.includes(entry.slot)) return entry.slot;
  // Try to guess from createdAt
  if (entry.createdAt) {
    const hour = new Date(entry.createdAt).getHours();
    if (hour < 10) return "breakfast";
    if (hour < 14) return "lunch";
    if (hour < 18) return "dinner";
    return "snack";
  }
  return "snack";
}

export function useFoodLog(dateStr) {
  const { user, profile } = useAuth();
  const [entries, setEntries] = useState([]);
  const [recentFoods, setRecentFoods] = useState([]);
  const [loading, setLoading] = useState(true);

  const dailyBudget = profile?.dailyPointsBudget ?? 23;

  // Live-subscribe to entries for the selected date
  useEffect(() => {
    if (!user || !dateStr) return;

    setLoading(true);
    const colRef = collection(
      db,
      "users",
      user.uid,
      "foodLog",
      dateStr,
      "entries"
    );
    const q = query(colRef, orderBy("createdAt", "asc"));

    const unsub = onSnapshot(q, (snap) => {
      setEntries(
        snap.docs.map((d) => {
          const data = { id: d.id, ...d.data() };
          data.slot = guessSlot(data);
          return data;
        })
      );
      setLoading(false);
    });

    return unsub;
  }, [user, dateStr]);

  // Fetch recently logged non-zero-point foods
  const fetchRecent = useCallback(async () => {
    if (!user) return;

    const q = query(
      collectionGroup(db, "entries"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    try {
      const snap = await getDocs(q);
      const seen = new Set();
      const recent = [];

      for (const d of snap.docs) {
        const pathParts = d.ref.path.split("/");
        if (pathParts[1] !== user.uid) continue;

        const data = d.data();
        if (data.points === 0) continue;

        const key = data.name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        recent.push(data);
        if (recent.length >= 8) break;
      }

      setRecentFoods(recent);
    } catch {
      setRecentFoods([]);
    }
  }, [user]);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent, dateStr]);

  async function addEntry(food, slot = "snack") {
    if (!user) return;
    const colRef = collection(
      db,
      "users",
      user.uid,
      "foodLog",
      dateStr,
      "entries"
    );
    await addDoc(colRef, {
      ...food,
      slot,
      createdAt: new Date().toISOString(),
    });
    fetchRecent();
  }

  async function deleteEntry(entryId) {
    if (!user) return;
    await deleteDoc(
      doc(db, "users", user.uid, "foodLog", dateStr, "entries", entryId)
    );
  }

  // Group entries by slot
  function getEntriesBySlot(slot) {
    return entries.filter((e) => e.slot === slot);
  }

  function getSlotPoints(slot) {
    return getEntriesBySlot(slot).reduce((s, e) => s + (e.points || 0), 0);
  }

  const totalPoints = entries.reduce((sum, e) => sum + (e.points || 0), 0);
  const remainingPoints = dailyBudget - totalPoints;

  return {
    entries,
    loading,
    addEntry,
    deleteEntry,
    getEntriesBySlot,
    getSlotPoints,
    totalPoints,
    remainingPoints,
    dailyBudget,
    recentFoods,
    MEAL_SLOTS,
  };
}
