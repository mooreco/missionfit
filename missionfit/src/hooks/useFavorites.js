import { useState, useEffect, useCallback } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "./useAuth.jsx";

const MAX_FAVORITES = 50;

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  // Real-time listener sorted by lastUsed desc
  useEffect(() => {
    if (!user) return;

    const colRef = collection(db, "users", user.uid, "favorites");
    const q = query(colRef, orderBy("lastUsed", "desc"));

    const unsub = onSnapshot(q, (snap) => {
      setFavorites(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return unsub;
  }, [user]);

  // Check if a food name is already favorited
  const isFavorited = useCallback(
    (name) => {
      return favorites.some(
        (f) => f.name.toLowerCase() === name.toLowerCase()
      );
    },
    [favorites]
  );

  // Add a food as a favorite
  const addFavorite = useCallback(
    async (food) => {
      if (!user) return null;
      if (favorites.length >= MAX_FAVORITES) return "limit";
      if (isFavorited(food.name)) return "exists";

      const colRef = collection(db, "users", user.uid, "favorites");
      await addDoc(colRef, {
        name: food.name,
        calories: food.calories || 0,
        protein: food.protein || 0,
        fiber: food.fiber || 0,
        saturatedFat: food.saturatedFat || 0,
        sugar: food.sugar || 0,
        sodium: food.sodium || 0,
        purine: food.purine || false,
        points: food.points || 0,
        slot: food.slot || null,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
      });
      return "added";
    },
    [user, favorites, isFavorited]
  );

  // Remove a favorite by ID
  const removeFavorite = useCallback(
    async (favoriteId) => {
      if (!user) return;
      await deleteDoc(doc(db, "users", user.uid, "favorites", favoriteId));
    },
    [user]
  );

  // Remove a favorite by name (used when un-starring from food log)
  const removeFavoriteByName = useCallback(
    async (name) => {
      if (!user) return;
      const colRef = collection(db, "users", user.uid, "favorites");
      const q = query(
        colRef,
        where("name", "==", name)
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    },
    [user]
  );

  // Update lastUsed timestamp when a favorite is logged
  const touchFavorite = useCallback(
    async (name) => {
      if (!user) return;
      const fav = favorites.find(
        (f) => f.name.toLowerCase() === name.toLowerCase()
      );
      if (!fav) return;
      const ref = doc(db, "users", user.uid, "favorites", fav.id);
      await updateDoc(ref, { lastUsed: new Date().toISOString() });
    },
    [user, favorites]
  );

  return {
    favorites,
    loading,
    addFavorite,
    removeFavorite,
    removeFavoriteByName,
    isFavorited,
    touchFavorite,
    MAX_FAVORITES,
  };
}
