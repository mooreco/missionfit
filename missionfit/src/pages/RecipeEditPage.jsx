import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useRecipes, computeRecipePoints } from "../hooks/useRecipes";
import "../styles/recipes.css";

const emptyIngredient = {
  name: "",
  amount: "",
  unit: "",
  calories: "",
  protein: "",
  fiber: "",
  saturatedFat: "",
  sugar: "",
  sodium: "",
  purine: false,
};

const TAG_OPTIONS = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "vegetarian",
  "high-protein",
  "low-sodium",
  "kidney-safe",
  "quick",
  "meal-prep",
];

export default function RecipeEditPage() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { getRecipe, addRecipe, updateRecipe } = useRecipes();

  const [name, setName] = useState("");
  const [servings, setServings] = useState(1);
  const [instructions, setInstructions] = useState("");
  const [ingredients, setIngredients] = useState([{ ...emptyIngredient }]);
  const [tags, setTags] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Load existing recipe for editing
  useEffect(() => {
    if (isNew) return;

    async function load() {
      const recipe = await getRecipe(id);
      if (!recipe) {
        setLoadError(true);
        return;
      }
      setName(recipe.name || "");
      setServings(recipe.servings || 1);
      setInstructions(recipe.instructions || "");
      setIngredients(
        recipe.ingredients && recipe.ingredients.length > 0
          ? recipe.ingredients
          : [{ ...emptyIngredient }]
      );
      setTags(recipe.tags || []);
    }
    load();
  }, [id, isNew, getRecipe]);

  // Live points calculation
  const recipeData = useMemo(
    () => ({ name, servings, ingredients, instructions, tags }),
    [name, servings, ingredients, instructions, tags]
  );
  const { totalPoints, pointsPerServing } = useMemo(
    () => computeRecipePoints(recipeData),
    [recipeData]
  );

  // Has purine warning?
  const hasPurine = ingredients.some((ing) => ing.purine);

  function updateIngredient(index, field, value) {
    setIngredients((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function addIngredientRow() {
    setIngredients((prev) => [...prev, { ...emptyIngredient }]);
  }

  function removeIngredient(index) {
    setIngredients((prev) => {
      if (prev.length <= 1) return [{ ...emptyIngredient }];
      return prev.filter((_, i) => i !== index);
    });
  }

  function toggleTag(tag) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);

    try {
      const data = { name, servings, ingredients, instructions, tags };
      if (isNew) {
        await addRecipe(data);
      } else {
        await updateRecipe(id, data);
      }
      navigate("/recipes");
    } catch {
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <div className="recipes-page">
        <div className="recipes-empty">
          Recipe not found.{" "}
          <button onClick={() => navigate("/recipes")}>Go back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="recipes-page">
      <div className="recipes-header">
        <button className="recipes-back" onClick={() => navigate("/recipes")}>
          ← Back
        </button>
        <h1>{isNew ? "New Recipe" : "Edit Recipe"}</h1>
      </div>

      {/* Points preview */}
      <div className="recipe-points-preview">
        <div className="rpp-item">
          <span className="rpp-num">{totalPoints}</span>
          <span className="rpp-label">total Steps</span>
        </div>
        <div className="rpp-divider" />
        <div className="rpp-item">
          <span className="rpp-num">{pointsPerServing}</span>
          <span className="rpp-label">Steps/serving</span>
        </div>
        {hasPurine && (
          <div className="rpp-purine-warn">⚠️ Contains high-purine ingredient</div>
        )}
      </div>

      {/* Name & Servings */}
      <div className="recipe-form-card">
        <div className="form-field">
          <label htmlFor="recipe-name">Recipe Name</label>
          <input
            id="recipe-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Turkey Chili"
          />
        </div>
        <div className="form-field">
          <label htmlFor="recipe-servings">Servings</label>
          <input
            id="recipe-servings"
            type="number"
            min="1"
            max="50"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
          />
        </div>
      </div>

      {/* Ingredients */}
      <div className="recipe-form-card">
        <h2 className="recipe-section-title">Ingredients</h2>

        {ingredients.map((ing, i) => (
          <div key={i} className="ingredient-row">
            <div className="ingredient-row-header">
              <span className="ingredient-num">#{i + 1}</span>
              <button
                className="ingredient-remove"
                onClick={() => removeIngredient(i)}
                type="button"
              >
                ✕
              </button>
            </div>

            <div className="ingredient-fields">
              <div className="form-field ingredient-name-field">
                <label>Name</label>
                <input
                  type="text"
                  value={ing.name}
                  onChange={(e) => updateIngredient(i, "name", e.target.value)}
                  placeholder="e.g. Ground turkey"
                />
              </div>

              <div className="ingredient-amount-row">
                <div className="form-field">
                  <label>Amount</label>
                  <input
                    type="text"
                    value={ing.amount}
                    onChange={(e) =>
                      updateIngredient(i, "amount", e.target.value)
                    }
                    placeholder="e.g. 1 lb"
                  />
                </div>
                <div className="form-field">
                  <label>Unit</label>
                  <input
                    type="text"
                    value={ing.unit}
                    onChange={(e) =>
                      updateIngredient(i, "unit", e.target.value)
                    }
                    placeholder="oz, cup, etc."
                  />
                </div>
              </div>

              <div className="nutrient-grid">
                <div className="form-field">
                  <label>Calories</label>
                  <input
                    type="number"
                    min="0"
                    value={ing.calories}
                    onChange={(e) =>
                      updateIngredient(i, "calories", e.target.value)
                    }
                    placeholder="0"
                  />
                </div>
                <div className="form-field">
                  <label>Protein (g)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={ing.protein}
                    onChange={(e) =>
                      updateIngredient(i, "protein", e.target.value)
                    }
                    placeholder="0"
                  />
                </div>
                <div className="form-field">
                  <label>Fiber (g)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={ing.fiber}
                    onChange={(e) =>
                      updateIngredient(i, "fiber", e.target.value)
                    }
                    placeholder="0"
                  />
                </div>
                <div className="form-field">
                  <label>Sat. Fat (g)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={ing.saturatedFat}
                    onChange={(e) =>
                      updateIngredient(i, "saturatedFat", e.target.value)
                    }
                    placeholder="0"
                  />
                </div>
                <div className="form-field">
                  <label>Sugar (g)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={ing.sugar}
                    onChange={(e) =>
                      updateIngredient(i, "sugar", e.target.value)
                    }
                    placeholder="0"
                  />
                </div>
                <div className="form-field">
                  <label>Sodium (mg)</label>
                  <input
                    type="number"
                    min="0"
                    value={ing.sodium}
                    onChange={(e) =>
                      updateIngredient(i, "sodium", e.target.value)
                    }
                    placeholder="0"
                  />
                </div>
              </div>

              <label className="purine-field">
                <input
                  type="checkbox"
                  checked={ing.purine}
                  onChange={(e) =>
                    updateIngredient(i, "purine", e.target.checked)
                  }
                />
                High purine (organ meats, shellfish, etc.)
              </label>
            </div>
          </div>
        ))}

        <button
          className="ingredient-add-btn"
          onClick={addIngredientRow}
          type="button"
        >
          + Add Ingredient
        </button>
      </div>

      {/* Instructions */}
      <div className="recipe-form-card">
        <h2 className="recipe-section-title">Instructions</h2>
        <textarea
          className="recipe-instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Step-by-step instructions (optional)"
          rows={5}
        />
      </div>

      {/* Tags */}
      <div className="recipe-form-card">
        <h2 className="recipe-section-title">Tags</h2>
        <div className="recipe-tags-grid">
          {TAG_OPTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`recipe-tag-btn ${tags.includes(tag) ? "active" : ""}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="recipe-save-bar">
        <button
          className="recipe-save-btn"
          onClick={handleSave}
          disabled={saving || !name.trim()}
        >
          {saving ? "Saving..." : isNew ? "Create Recipe" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
