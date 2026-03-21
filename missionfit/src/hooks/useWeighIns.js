import { useState, useEffect } from "react";
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "./useAuth.jsx";

export function useWeighIns() {
  const { user, profile } = useAuth();
  const [weighIns, setWeighIns] = useState([]);
  const [loading, setLoading] = useState(true);

  const goalWeight = profile?.goalWeight ?? null;

  useEffect(() => {
    if (!user) return;

    const colRef = collection(db, "users", user.uid, "weighIns");
    const q = query(colRef, orderBy("date", "asc"));

    const unsub = onSnapshot(q, (snap) => {
      setWeighIns(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return unsub;
  }, [user]);

  async function saveWeighIn(dateStr, weight) {
    if (!user) return;
    const docRef = doc(db, "users", user.uid, "weighIns", dateStr);
    await setDoc(docRef, {
      weight: parseFloat(weight),
      date: dateStr,
      timestamp: new Date().toISOString(),
    });
  }

  const firstWeight = weighIns.length > 0 ? weighIns[0].weight : null;
  const currentWeight =
    weighIns.length > 0 ? weighIns[weighIns.length - 1].weight : null;

  const totalLost =
    firstWeight !== null && currentWeight !== null
      ? firstWeight - currentWeight
      : null;

  const remainingToGoal =
    currentWeight !== null && goalWeight !== null
      ? currentWeight - goalWeight
      : null;

  return {
    weighIns,
    loading,
    saveWeighIn,
    goalWeight,
    firstWeight,
    currentWeight,
    totalLost,
    remainingToGoal,
  };
}
