import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, addDays, subDays } from "date-fns";
import { calculatePoints, ZERO_POINT_FOODS } from "../utils/calculatePoints";
import { useFoodLog } from "../hooks/useFoodLog";
import { useRecipes } from "../hooks/useRecipes";
import { useFavorites } from "../hooks/useFavorites";
import { useAuth } from "../hooks/useAuth.jsx";
import { calcWeeklyPoints } from "../utils/weeklyPoints";
import "../styles/foodlog.css";

const today = () => format(new Date(), "yyyy-MM-dd");

const SLOT_LABELS = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" };
// No emojis for slot labels — typography handles visual hierarchy

const emptyForm = {
  name: "", calories: "", protein: "", fiber: "",
  saturatedFat: "", sugar: "", sodium: "", purine: false,
};

export default function FoodLogPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(today);
  const [addingToSlot, setAddingToSlot] = useState(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const {
    entries, loading, addEntry, deleteEntry,
    getEntriesBySlot, getSlotPoints,
    totalPoints, remainingPoints, dailyBudget,
    recentFoods, MEAL_SLOTS,
  } = useFoodLog(selectedDate);

  const { recipes } = useRecipes();
  const { favorites, addFavorite, removeFavoriteByName, isFavorited, touchFavorite } = useFavorites();

  const previewPoints = useMemo(() => calculatePoints(form), [form]);

  // Weekly points state
  const [weekly, setWeekly] = useState({ weeklyUsed: 0, weeklyRemaining: 28, weeklyTotal: 28, dailyOverages: {} });
  useEffect(() => {
    if (!user) return;
    calcWeeklyPoints(user.uid, dailyBudget, 28)
      .then(setWeekly)
      .catch(() => {});
  }, [user, dailyBudget, entries.length]);

  const todayOverage = Math.max(0, totalPoints - dailyBudget);
  const isOverBudget = totalPoints > dailyBudget;

  const usedPct = Math.min((totalPoints / dailyBudget) * 100, 100);
  const progressColor =
    totalPoints > dailyBudget ? "#EF476F"
      : totalPoints > dailyBudget * 0.8 ? "#FFD166" : "#06D6A0";

  function prevDay() {
    setSelectedDate((d) => format(subDays(new Date(d + "T12:00:00"), 1), "yyyy-MM-dd"));
  }
  function nextDay() {
    setSelectedDate((d) => format(addDays(new Date(d + "T12:00:00"), 1), "yyyy-MM-dd"));
  }
  function displayDate(d) {
    if (d === today()) return "Today";
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
    if (d === yesterday) return "Yesterday";
    return format(new Date(d + "T12:00:00"), "EEE, MMM d");
  }
  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }
  function openAddModal(slot) {
    setAddingToSlot(slot);
    setShowCustomForm(false);
    setForm(emptyForm);
  }

  async function handleAddZero(name) {
    await addEntry(
      { name, points: 0, calories: 0, protein: 0, fiber: 0, saturatedFat: 0, sugar: 0, sodium: 0, purine: false },
      addingToSlot
    );
    setAddingToSlot(null);
  }

  async function handleAddRecent(food) {
    await addEntry({
      name: food.name, points: food.points,
      calories: food.calories || 0, protein: food.protein || 0,
      fiber: food.fiber || 0, saturatedFat: food.saturatedFat || 0,
      sugar: food.sugar || 0, sodium: food.sodium || 0,
      purine: food.purine || false,
    }, addingToSlot);
    setAddingToSlot(null);
  }

  async function handleAddFavorite(fav) {
    await addEntry({
      name: fav.name, points: fav.points,
      calories: fav.calories || 0, protein: fav.protein || 0,
      fiber: fav.fiber || 0, saturatedFat: fav.saturatedFat || 0,
      sugar: fav.sugar || 0, sodium: fav.sodium || 0,
      purine: fav.purine || false,
    }, addingToSlot);
    touchFavorite(fav.name);
    setAddingToSlot(null);
  }

  async function handleAddRecipe(recipe) {
    await addEntry({
      name: recipe.name, points: recipe.pointsPerServing || 0,
      calories: 0, protein: 0, fiber: 0, saturatedFat: 0,
      sugar: 0, sodium: 0, purine: false, fromRecipe: recipe.id,
    }, addingToSlot);
    setAddingToSlot(null);
  }

  async function handleSubmitCustom(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const points = calculatePoints(form);
    await addEntry({
      name: form.name.trim(), points,
      calories: parseFloat(form.calories) || 0,
      protein: parseFloat(form.protein) || 0,
      fiber: parseFloat(form.fiber) || 0,
      saturatedFat: parseFloat(form.saturatedFat) || 0,
      sugar: parseFloat(form.sugar) || 0,
      sodium: parseFloat(form.sodium) || 0,
      purine: form.purine,
    }, addingToSlot);
    setForm(emptyForm);
    setShowCustomForm(false);
    setAddingToSlot(null);
  }

  async function toggleFavorite(entry) {
    if (isFavorited(entry.name)) {
      await removeFavoriteByName(entry.name);
    } else {
      await addFavorite(entry);
    }
  }

  return (
    <div className="foodlog-page">
      {/* Sticky header */}
      <div className="foodlog-header">
        <div className="foodlog-title-row">
          <h1>Food Log</h1>
          <div className="foodlog-menu-wrap">
            <button className="foodlog-menu-btn" onClick={() => setShowMenu((v) => !v)} aria-label="Menu">⋯</button>
            {showMenu && (
              <div className="foodlog-dropdown">
                <button onClick={() => { setShowMenu(false); navigate("/weigh-in"); }}>Log Weight</button>
                <button onClick={() => { setShowMenu(false); navigate("/meal-plan"); }}>Weekly Plan</button>
                <button onClick={() => { setShowMenu(false); navigate("/recipes"); }}>Recipes</button>
              </div>
            )}
          </div>
        </div>

        <div className="budget-bar">
          <span className={`budget-remaining ${remainingPoints < 0 ? "over" : "ok"}`}>
            {remainingPoints} Steps left
          </span>
          <span className="budget-detail">{totalPoints} / {dailyBudget} Steps used</span>
        </div>

        <div className="budget-progress">
          <div className="budget-progress-fill" style={{ width: `${usedPct}%`, background: progressColor }} />
        </div>
      </div>

      {/* Weekly Steps banner */}
      {isOverBudget && (
        <div className={`weekly-banner ${weekly.weeklyRemaining <= 0 ? "exhausted" : ""}`}>
          {weekly.weeklyRemaining > 0 ? (
            <>Used {todayOverage} weekly Step{todayOverage !== 1 ? "s" : ""} today. {weekly.weeklyRemaining} remaining this week.</>
          ) : (
            <>Weekly Steps used up. Fresh start Monday!</>
          )}
        </div>
      )}

      {/* Date selector */}
      <div className="date-selector">
        <button onClick={prevDay} aria-label="Previous day">&larr;</button>
        <span>{displayDate(selectedDate)}</span>
        <button onClick={nextDay} aria-label="Next day">&rarr;</button>
      </div>

      {/* Meal slot cards */}
      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : (
        <div className="meal-slots">
          {MEAL_SLOTS.map((slot) => {
            const slotEntries = getEntriesBySlot(slot);
            const slotPts = getSlotPoints(slot);
            return (
              <div key={slot} className="slot-card">
                <div className="slot-header">
                  <span className="slot-label">
                    {SLOT_LABELS[slot]}
                  </span>
                  <div className="slot-header-right">
                    {slotPts > 0 && <span className="slot-pts">{slotPts} Steps</span>}
                    <button className="slot-add-btn" onClick={() => openAddModal(slot)}>+</button>
                  </div>
                </div>
                {slotEntries.length > 0 && (
                  <div className="slot-entries">
                    {slotEntries.map((entry) => (
                      <div key={entry.id} className="slot-entry">
                        <button
                          className={`fav-star ${isFavorited(entry.name) ? "filled" : ""}`}
                          onClick={() => toggleFavorite(entry)}
                          aria-label={isFavorited(entry.name) ? "Unfavorite" : "Favorite"}
                        >
                          {isFavorited(entry.name) ? "★" : "☆"}
                        </button>
                        <span className="entry-name">{entry.name}</span>
                        <span className="entry-points">{entry.points} Steps</span>
                        <button className="entry-delete" onClick={() => deleteEntry(entry.id)} aria-label={`Delete ${entry.name}`}>&times;</button>
                      </div>
                    ))}
                  </div>
                )}
                {slotEntries.length === 0 && (
                  <button className="slot-empty-add" onClick={() => openAddModal(slot)}>
                    + Add {SLOT_LABELS[slot].toLowerCase()}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showMenu && <div className="foodlog-backdrop" onClick={() => setShowMenu(false)} />}

      {/* Add food bottom sheet */}
      {addingToSlot && (
        <div className="add-modal-overlay" onClick={() => { setAddingToSlot(null); setShowCustomForm(false); }}>
          <div className="add-modal" onClick={(e) => e.stopPropagation()}>
            <div className="add-modal-header">
              <h2>Add to {SLOT_LABELS[addingToSlot]}</h2>
              <button className="add-modal-close" onClick={() => { setAddingToSlot(null); setShowCustomForm(false); }}>✕</button>
            </div>

            {!showCustomForm ? (
              <>
                {/* Favorites */}
                <div className="add-modal-section">
                  <h3>Favorites</h3>
                  {favorites.length > 0 ? (
                    <div className="add-modal-chips">
                      {favorites.map((fav) => (
                        <button key={fav.id} className="chip fav-chip" onClick={() => handleAddFavorite(fav)}>
                          {fav.name}
                          <span className="chip-pts">{fav.points}s</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="add-modal-empty-hint">Star foods to pin them here.</p>
                  )}
                </div>

                {/* Recipes */}
                {recipes.length > 0 && (
                  <div className="add-modal-section">
                    <h3>Recipes</h3>
                    <div className="add-modal-chips">
                      {recipes.map((r) => (
                        <button key={r.id} className="chip recipe-chip" onClick={() => handleAddRecipe(r)}>
                          {r.name}
                          <span className="chip-pts">{r.pointsPerServing}s</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent */}
                {recentFoods.length > 0 && (
                  <div className="add-modal-section">
                    <h3>Recent</h3>
                    <div className="add-modal-chips">
                      {recentFoods.map((food, i) => (
                        <button key={i} className="chip" onClick={() => handleAddRecent(food)}>
                          {food.name}
                          <span className="chip-pts">{food.points}s</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Zero point */}
                <div className="add-modal-section">
                  <h3>Free Fuel</h3>
                  <div className="add-modal-chips">
                    {ZERO_POINT_FOODS.map((name) => (
                      <button key={name} className="chip zero" onClick={() => handleAddZero(name)}>{name}</button>
                    ))}
                  </div>
                </div>

                <button className="add-modal-custom-btn" onClick={() => setShowCustomForm(true)}>
                  + Custom Food Entry
                </button>
              </>
            ) : (
              <form className="add-modal-form" onSubmit={handleSubmitCustom}>
                <div className="form-field">
                  <label htmlFor="food-name">Food Name</label>
                  <input id="food-name" type="text" value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="e.g. Grilled chicken breast" autoFocus required />
                </div>
                <div className="nutrient-grid">
                  <div className="form-field"><label htmlFor="food-cal">Calories</label><input id="food-cal" type="number" min="0" value={form.calories} onChange={(e) => updateField("calories", e.target.value)} placeholder="0" /></div>
                  <div className="form-field"><label htmlFor="food-protein">Protein (g)</label><input id="food-protein" type="number" min="0" step="0.1" value={form.protein} onChange={(e) => updateField("protein", e.target.value)} placeholder="0" /></div>
                  <div className="form-field"><label htmlFor="food-fiber">Fiber (g)</label><input id="food-fiber" type="number" min="0" step="0.1" value={form.fiber} onChange={(e) => updateField("fiber", e.target.value)} placeholder="0" /></div>
                  <div className="form-field"><label htmlFor="food-satfat">Sat Fat (g)</label><input id="food-satfat" type="number" min="0" step="0.1" value={form.saturatedFat} onChange={(e) => updateField("saturatedFat", e.target.value)} placeholder="0" /></div>
                  <div className="form-field"><label htmlFor="food-sugar">Sugar (g)</label><input id="food-sugar" type="number" min="0" step="0.1" value={form.sugar} onChange={(e) => updateField("sugar", e.target.value)} placeholder="0" /></div>
                  <div className="form-field"><label htmlFor="food-sodium">Sodium (mg)</label><input id="food-sodium" type="number" min="0" value={form.sodium} onChange={(e) => updateField("sodium", e.target.value)} placeholder="0" /></div>
                </div>
                <label className="purine-field">
                  <input type="checkbox" checked={form.purine} onChange={(e) => updateField("purine", e.target.checked)} />
                  High purine (organ meats, shellfish, etc.)
                </label>
                <div className="points-preview">Steps: {previewPoints}</div>
                <div className="add-food-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowCustomForm(false)}>Back</button>
                  <button type="submit" className="btn-add" disabled={!form.name.trim()}>Add ({previewPoints} Steps)</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
