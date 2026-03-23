import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "./useAuth.jsx";
import { getUnlockedIds, ALL_MILESTONES } from "../utils/milestones";

/**
 * Tracks which medals the user has unlocked.
 * Stores acknowledged medal IDs in Firestore so we can detect NEW unlocks
 * and trigger a celebration animation.
 *
 * Firestore doc: users/{uid}/medals/status
 *   { acknowledged: ["w5","s3",...], lastChecked: ISO string }
 */
export function useMedals(totalLost = 0, longestStreak = 0, exerciseStats = {}) {
  const { user } = useAuth();
  const [acknowledged, setAcknowledged] = useState([]);
  const [newMedals, setNewMedals] = useState([]);
  const [loading, setLoading] = useState(true);

  // All milestone IDs that should be unlocked right now
  const currentlyUnlocked = getUnlockedIds(totalLost, longestStreak, exerciseStats);

  // Load acknowledged medals from Firestore
  useEffect(() => {
    if (!user) return;

    async function load() {
      try {
        const ref = doc(db, "users", user.uid, "medals", "status");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setAcknowledged(snap.data().acknowledged || []);
        } else {
          setAcknowledged([]);
        }
      } catch {
        setAcknowledged([]);
      }
      setLoading(false);
    }

    load();
  }, [user]);

  // Detect new medals whenever stats or acknowledged list changes
  useEffect(() => {
    if (loading) return;
    const fresh = currentlyUnlocked.filter((id) => !acknowledged.includes(id));
    setNewMedals(fresh);
  }, [currentlyUnlocked.join(","), acknowledged.join(","), loading]);

  // Acknowledge (dismiss) new medals and persist to Firestore
  const acknowledgeMedals = useCallback(async () => {
    if (!user || newMedals.length === 0) return;

    const merged = [...new Set([...acknowledged, ...newMedals])];
    setAcknowledged(merged);
    setNewMedals([]);

    const ref = doc(db, "users", user.uid, "medals", "status");
    await setDoc(ref, {
      acknowledged: merged,
      lastChecked: new Date().toISOString(),
    });
  }, [user, acknowledged, newMedals]);

  // Enrich milestone objects with unlock status
  const allMedals = ALL_MILESTONES.map((m) => ({
    ...m,
    unlocked: currentlyUnlocked.includes(m.id),
    isNew: newMedals.includes(m.id),
  }));

  return {
    allMedals,
    unlockedCount: currentlyUnlocked.length,
    totalCount: ALL_MILESTONES.length,
    newMedals: newMedals
      .map((id) => ALL_MILESTONES.find((m) => m.id === id))
      .filter(Boolean),
    acknowledgeMedals,
    loading,
  };
}
