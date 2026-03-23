import { useState, useEffect, useCallback } from "react";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "./useAuth.jsx";
import { calculatePoints } from "../utils/calculatePoints";

/**
 * Firestore structure:
 *   users/{uid}/recipes/{recipeId}
 *   {
 *     name: string,
 *     servings: number,
 *     ingredients: [{ name, calories, protein, fiber, saturatedFat, sugar, sodium, purine, amount, unit }],
 *     instructions: string,
 *     totalPoints: number,
 *     pointsPerServing: number,
 *     tags: string[],
 *     createdAt: ISO string,
 *     updatedAt: ISO string,
 *   }
 */
export function useRecipes() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Real-time listener on recipes collection
  useEffect(() => {
    if (!user) return;

    const colRef = collection(db, "users", user.uid, "recipes");
    const q = query(colRef, orderBy("updatedAt", "desc"));

    const unsub = onSnapshot(q, (snap) => {
      setRecipes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return unsub;
  }, [user]);

  // Get a single recipe by ID
  const getRecipe = useCallback(
    async (recipeId) => {
      if (!user) return null;
      const ref = doc(db, "users", user.uid, "recipes", recipeId);
      const snap = await getDoc(ref);
      if (snap.exists()) return { id: snap.id, ...snap.data() };
      return null;
    },
    [user]
  );

  // Create a new recipe
  const addRecipe = useCallback(
    async (recipe) => {
      if (!user) return null;

      const { totalPoints, pointsPerServing } = computeRecipePoints(recipe);

      const colRef = collection(db, "users", user.uid, "recipes");
      const docRef = await addDoc(colRef, {
        name: recipe.name.trim(),
        servings: Number(recipe.servings) || 1,
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions || "",
        totalPoints,
        pointsPerServing,
        tags: recipe.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return docRef.id;
    },
    [user]
  );

  // Update an existing recipe
  const updateRecipe = useCallback(
    async (recipeId, recipe) => {
      if (!user) return;

      const { totalPoints, pointsPerServing } = computeRecipePoints(recipe);

      const ref = doc(db, "users", user.uid, "recipes", recipeId);
      await updateDoc(ref, {
        name: recipe.name.trim(),
        servings: Number(recipe.servings) || 1,
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions || "",
        totalPoints,
        pointsPerServing,
        tags: recipe.tags || [],
        updatedAt: new Date().toISOString(),
      });
    },
    [user]
  );

  // Delete a recipe
  const removeRecipe = useCallback(
    async (recipeId) => {
      if (!user) return;
      const ref = doc(db, "users", user.uid, "recipes", recipeId);
      await deleteDoc(ref);
    },
    [user]
  );

  return {
    recipes,
    loading,
    getRecipe,
    addRecipe,
    updateRecipe,
    removeRecipe,
  };
}

/**
 * Calculate total and per-serving points for a recipe.
 */
export function computeRecipePoints(recipe) {
  const servings = Number(recipe.servings) || 1;
  const ingredients = recipe.ingredients || [];

  // Sum up nutrition across all ingredients
  const totals = {
    calories: 0,
    protein: 0,
    fiber: 0,
    saturatedFat: 0,
    sugar: 0,
    sodium: 0,
    purine: false,
  };

  for (const ing of ingredients) {
    totals.calories += parseFloat(ing.calories) || 0;
    totals.protein += parseFloat(ing.protein) || 0;
    totals.fiber += parseFloat(ing.fiber) || 0;
    totals.saturatedFat += parseFloat(ing.saturatedFat) || 0;
    totals.sugar += parseFloat(ing.sugar) || 0;
    totals.sodium += parseFloat(ing.sodium) || 0;
    if (ing.purine) totals.purine = true;
  }

  const totalPoints = calculatePoints(totals);

  // Per-serving: divide the raw nutrition, then recalculate
  const perServing = {
    calories: totals.calories / servings,
    protein: totals.protein / servings,
    fiber: totals.fiber / servings,
    saturatedFat: totals.saturatedFat / servings,
    sugar: totals.sugar / servings,
    sodium: totals.sodium / servings,
    purine: totals.purine,
  };
  const pointsPerServing = calculatePoints(perServing);

  return { totalPoints, pointsPerServing };
}
