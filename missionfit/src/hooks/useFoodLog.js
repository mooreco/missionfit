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
      setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return unsub;
  }, [user, dateStr]);

  // Fetch recently logged non-zero-point foods
  const fetchRecent = useCallback(async () => {
    if (!user) return;

    // Query recent entries across all dates via collectionGroup
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
        // Only include docs belonging to this user
        const pathParts = d.ref.path.split("/");
        if (pathParts[1] !== user.uid) continue;

        const data = d.data();
        if (data.points === 0) continue;

        const key = data.name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        recent.push(data);
        if (recent.length >= 5) break;
      }

      setRecentFoods(recent);
    } catch {
      // collectionGroup index may not exist yet — degrade gracefully
      setRecentFoods([]);
    }
  }, [user]);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent, dateStr]);

  async function addEntry(food) {
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

  const totalPoints = entries.reduce((sum, e) => sum + (e.points || 0), 0);
  const remainingPoints = dailyBudget - totalPoints;

  return {
    entries,
    loading,
    addEntry,
    deleteEntry,
    totalPoints,
    remainingPoints,
    dailyBudget,
    recentFoods,
  };
}
