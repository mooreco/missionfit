import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRecipes } from "../hooks/useRecipes";
import "../styles/recipes.css";

export default function RecipesPage() {
  const { recipes, loading, removeRecipe } = useRecipes();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = search.trim()
    ? recipes.filter((r) =>
        r.name.toLowerCase().includes(search.toLowerCase())
      )
    : recipes;

  async function handleDelete(id) {
    await removeRecipe(id);
    setConfirmDelete(null);
  }

  return (
    <div className="recipes-page">
      <div className="recipes-header">
        <h1>Recipes</h1>
        <button
          className="recipes-add-btn"
          onClick={() => navigate("/recipes/new")}
        >
          + New
        </button>
      </div>

      {/* Search */}
      <div className="recipes-search">
        <input
          type="text"
          placeholder="Search recipes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Recipe list */}
      {loading ? (
        <div className="recipes-empty">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="recipes-empty">
          {search
            ? "No recipes match your search."
            : "No recipes yet. Tap + New to create one!"}
        </div>
      ) : (
        <div className="recipes-list">
          {filtered.map((recipe) => (
            <div key={recipe.id} className="recipe-card">
              <div
                className="recipe-card-main"
                onClick={() => navigate(`/recipes/${recipe.id}`)}
              >
                <div className="recipe-card-info">
                  <span className="recipe-card-name">{recipe.name}</span>
                  <span className="recipe-card-meta">
                    {recipe.servings} serving{recipe.servings !== 1 ? "s" : ""} ·{" "}
                    {recipe.ingredients?.length || 0} ingredient
                    {(recipe.ingredients?.length || 0) !== 1 ? "s" : ""}
                  </span>
                  {recipe.tags && recipe.tags.length > 0 && (
                    <div className="recipe-card-tags">
                      {recipe.tags.map((tag) => (
                        <span key={tag} className="recipe-tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="recipe-card-points">
                  <span className="rcp-num">{recipe.pointsPerServing}</span>
                  <span className="rcp-label">Steps/serving</span>
                </div>
              </div>

              {/* Delete confirmation */}
              {confirmDelete === recipe.id ? (
                <div className="recipe-delete-confirm">
                  <span>Delete this recipe?</span>
                  <button
                    className="rd-yes"
                    onClick={() => handleDelete(recipe.id)}
                  >
                    Delete
                  </button>
                  <button
                    className="rd-no"
                    onClick={() => setConfirmDelete(null)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className="recipe-delete-btn"
                  onClick={() => setConfirmDelete(recipe.id)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
