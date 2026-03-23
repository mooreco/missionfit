import { useState } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useMealPlan } from "../hooks/useMealPlan";
import { useRecipes } from "../hooks/useRecipes";
import { groupByCategory } from "../utils/categorizeIngredient";
import "../styles/mealplan.css";

const SLOT_LABELS = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" };

export default function MealPlanPage() {
  const navigate = useNavigate();
  const [weekOffset, setWeekOffset] = useState(0);
  const [showGrocery, setShowGrocery] = useState(false);
  const [addingTo, setAddingTo] = useState(null);
  const [checkedItems, setCheckedItems] = useState(new Set());

  const {
    plan, loading, weekDates, weekLabel, dailyBudget,
    addMeal, removeMeal, getDayPoints, getGroceryList, MEAL_SLOTS,
  } = useMealPlan(weekOffset);

  const { recipes } = useRecipes();

  async function handleAddFromRecipe(recipe, slot, dateStr) {
    await addMeal(dateStr, {
      slot, type: "recipe", recipeId: recipe.id,
      name: recipe.name, pointsPerServing: recipe.pointsPerServing,
      servings: 1, ingredients: recipe.ingredients || [],
    });
    setAddingTo(null);
  }

  const [customName, setCustomName] = useState("");
  const [customPoints, setCustomPoints] = useState("");

  async function handleAddCustom(slot, dateStr) {
    if (!customName.trim()) return;
    await addMeal(dateStr, {
      slot, type: "custom", name: customName.trim(),
      pointsPerServing: parseInt(customPoints) || 0, servings: 1,
    });
    setCustomName("");
    setCustomPoints("");
    setAddingTo(null);
  }

  const rawGroceryList = showGrocery ? getGroceryList() : [];
  const groupedGrocery = showGrocery ? groupByCategory(rawGroceryList) : [];

  function toggleChecked(name) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function copyGroceryList() {
    const lines = [];
    for (const group of groupedGrocery) {
      lines.push(`\n${group.category.label}`);
      for (const item of group.items) {
        const qty = item.unit === "meal"
          ? `×${item.count}`
          : `${Number(item.count.toFixed(1))} ${item.unit}`;
        lines.push(`  ${checkedItems.has(item.name) ? "✓" : "○"} ${item.name} — ${qty}`);
      }
    }
    navigator.clipboard?.writeText(lines.join("\n").trim()).catch(() => {});
  }

  function displayDate(d) {
    return format(new Date(d + "T12:00:00"), "EEE, MMM d");
  }

  if (loading) {
    return <div className="mealplan-page"><div className="mealplan-empty">Loading...</div></div>;
  }

  return (
    <div className="mealplan-page">
      <div className="mealplan-header">
        <h1>Meal Plan</h1>
        <div className="week-nav">
          <button onClick={() => { setWeekOffset((o) => o - 1); setCheckedItems(new Set()); }}>←</button>
          <span className="week-label">{weekLabel}</span>
          <button onClick={() => { setWeekOffset((o) => o + 1); setCheckedItems(new Set()); }}>→</button>
        </div>
      </div>

      <div className="mealplan-toolbar">
        <button className={`grocery-toggle ${showGrocery ? "active" : ""}`} onClick={() => setShowGrocery((v) => !v)}>
          {showGrocery ? "Hide" : "Show"} Grocery List
        </button>
        <button className="recipes-link-btn" onClick={() => navigate("/recipes")}>Recipes</button>
      </div>

      {/* Categorized grocery list */}
      {showGrocery && (
        <div className="grocery-panel">
          <div className="grocery-panel-header">
            <h2>Grocery List</h2>
            {rawGroceryList.length > 0 && (
              <button className="grocery-copy-btn" onClick={copyGroceryList}>📋 Copy</button>
            )}
          </div>
          {groupedGrocery.length === 0 ? (
            <p className="grocery-empty">Add meals to your plan to generate a grocery list.</p>
          ) : (
            groupedGrocery.map((group) => (
              <div key={group.category.id} className="grocery-category">
                <h3 className="grocery-cat-label">
                  {group.category.label}
                </h3>
                <ul className="grocery-list">
                  {group.items.map((item, i) => (
                    <li key={i} className={`grocery-item ${checkedItems.has(item.name) ? "checked" : ""}`}>
                      <label className="grocery-checkbox-label">
                        <input
                          type="checkbox"
                          checked={checkedItems.has(item.name)}
                          onChange={() => toggleChecked(item.name)}
                        />
                        <span className="grocery-name">{item.name}</span>
                      </label>
                      <span className="grocery-qty">
                        {item.unit === "meal"
                          ? `×${item.count}`
                          : `${Number(item.count.toFixed(1))} ${item.unit}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      )}

      {/* Day cards */}
      <div className="mealplan-days">
        {weekDates.map((dateStr) => {
          const dayMeals = plan[dateStr]?.meals || [];
          const dayPoints = getDayPoints(dateStr);
          const overBudget = dayPoints > dailyBudget;

          return (
            <div key={dateStr} className="day-card">
              <div className="day-card-header">
                <span className="day-date">{displayDate(dateStr)}</span>
                <span className={`day-points ${overBudget ? "over" : ""}`}>
                  {dayPoints} / {dailyBudget} pts
                </span>
              </div>
              {MEAL_SLOTS.map((slot) => {
                const slotMeals = dayMeals.filter((m) => m.slot === slot);
                return (
                  <div key={slot} className="meal-slot">
                    <div className="meal-slot-header">
                      <span className="meal-slot-label">{SLOT_LABELS[slot]}</span>
                      <button className="meal-add-btn" onClick={() => setAddingTo({ dateStr, slot })}>+</button>
                    </div>
                    {slotMeals.length > 0 && (
                      <div className="meal-items">
                        {slotMeals.map((meal, mi) => {
                          const realIndex = dayMeals.indexOf(meal);
                          return (
                            <div key={mi} className="meal-item">
                              <span className="meal-item-name">{meal.name}</span>
                              <span className="meal-item-pts">
                                {(meal.pointsPerServing || 0) * (meal.servings || 1)} pts
                              </span>
                              <button className="meal-item-remove" onClick={() => removeMeal(dateStr, realIndex)}>✕</button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Add meal modal */}
      {addingTo && (
        <div className="meal-modal-overlay" onClick={() => setAddingTo(null)}>
          <div className="meal-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add {SLOT_LABELS[addingTo.slot]} · {displayDate(addingTo.dateStr)}</h2>
            {recipes.length > 0 && (
              <>
                <h3>From Recipes</h3>
                <div className="modal-recipe-list">
                  {recipes.map((r) => (
                    <button key={r.id} className="modal-recipe-item" onClick={() => handleAddFromRecipe(r, addingTo.slot, addingTo.dateStr)}>
                      <span>{r.name}</span>
                      <span className="modal-recipe-pts">{r.pointsPerServing} pts</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            <h3>Quick Add</h3>
            <div className="modal-custom">
              <input type="text" placeholder="Meal name" value={customName} onChange={(e) => setCustomName(e.target.value)} />
              <input type="number" placeholder="Points" min="0" value={customPoints} onChange={(e) => setCustomPoints(e.target.value)} />
              <button className="modal-custom-add" onClick={() => handleAddCustom(addingTo.slot, addingTo.dateStr)} disabled={!customName.trim()}>Add</button>
            </div>
            <button className="modal-close" onClick={() => setAddingTo(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
