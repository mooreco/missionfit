import { useState, useMemo } from "react";
import { format, addDays, subDays } from "date-fns";
import { calculatePoints, ZERO_POINT_FOODS } from "../utils/calculatePoints";
import { useFoodLog } from "../hooks/useFoodLog";
import "../styles/foodlog.css";

const today = () => format(new Date(), "yyyy-MM-dd");

const emptyForm = {
  name: "",
  calories: "",
  protein: "",
  fiber: "",
  saturatedFat: "",
  sugar: "",
  sodium: "",
  purine: false,
};

export default function FoodLogPage() {
  const [selectedDate, setSelectedDate] = useState(today);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const {
    entries,
    loading,
    addEntry,
    deleteEntry,
    totalPoints,
    remainingPoints,
    dailyBudget,
    recentFoods,
  } = useFoodLog(selectedDate);

  const previewPoints = useMemo(() => calculatePoints(form), [form]);

  const usedPct = Math.min((totalPoints / dailyBudget) * 100, 100);
  const progressColor =
    totalPoints > dailyBudget ? "#dc2626" : totalPoints > dailyBudget * 0.8 ? "#f59e0b" : "#16a34a";

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

  async function handleAddZero(name) {
    await addEntry({ name, points: 0, calories: 0, protein: 0, fiber: 0, saturatedFat: 0, sugar: 0, sodium: 0, purine: false });
  }

  async function handleAddRecent(food) {
    await addEntry({
      name: food.name,
      points: food.points,
      calories: food.calories || 0,
      protein: food.protein || 0,
      fiber: food.fiber || 0,
      saturatedFat: food.saturatedFat || 0,
      sugar: food.sugar || 0,
      sodium: food.sodium || 0,
      purine: food.purine || false,
    });
  }

  async function handleSubmitFood(e) {
    e.preventDefault();
    if (!form.name.trim()) return;

    const points = calculatePoints(form);
    await addEntry({
      name: form.name.trim(),
      points,
      calories: parseFloat(form.calories) || 0,
      protein: parseFloat(form.protein) || 0,
      fiber: parseFloat(form.fiber) || 0,
      saturatedFat: parseFloat(form.saturatedFat) || 0,
      sugar: parseFloat(form.sugar) || 0,
      sodium: parseFloat(form.sodium) || 0,
      purine: form.purine,
    });

    setForm(emptyForm);
    setShowForm(false);
  }

  return (
    <div className="foodlog-page">
      {/* Sticky header */}
      <div className="foodlog-header">
        <h1>Food Log</h1>

        <div className="budget-bar">
          <span className={`budget-remaining ${remainingPoints < 0 ? "over" : "ok"}`}>
            {remainingPoints} pts left
          </span>
          <span className="budget-detail">
            {totalPoints} / {dailyBudget} used
          </span>
        </div>

        <div className="budget-progress">
          <div
            className="budget-progress-fill"
            style={{ width: `${usedPct}%`, background: progressColor }}
          />
        </div>
      </div>

      {/* Date selector */}
      <div className="date-selector">
        <button onClick={prevDay} aria-label="Previous day">&larr;</button>
        <span>{displayDate(selectedDate)}</span>
        <button onClick={nextDay} aria-label="Next day">&rarr;</button>
      </div>

      {/* Zero point foods */}
      <div className="foodlog-section">
        <h2>Zero Point Foods</h2>
        <div className="chip-row">
          {ZERO_POINT_FOODS.map((name) => (
            <button key={name} className="chip zero" onClick={() => handleAddZero(name)}>
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Recently logged */}
      {recentFoods.length > 0 && (
        <div className="foodlog-section">
          <h2>Recently Logged</h2>
          <div className="chip-row">
            {recentFoods.map((food, i) => (
              <button key={i} className="chip" onClick={() => handleAddRecent(food)}>
                {food.name}
                <span className="chip-pts">{food.points}pt</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add food */}
      <div className="foodlog-section">
        <h2>Add Food</h2>
        {!showForm ? (
          <button className="add-food-toggle" onClick={() => setShowForm(true)}>
            + Add Custom Food
          </button>
        ) : (
          <form className="add-food-form" onSubmit={handleSubmitFood}>
            <div className="form-field">
              <label htmlFor="food-name">Food Name</label>
              <input
                id="food-name"
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="e.g. Grilled chicken breast"
                autoFocus
                required
              />
            </div>

            <div className="nutrient-grid">
              <div className="form-field">
                <label htmlFor="food-cal">Calories</label>
                <input
                  id="food-cal"
                  type="number"
                  min="0"
                  value={form.calories}
                  onChange={(e) => updateField("calories", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="form-field">
                <label htmlFor="food-protein">Protein (g)</label>
                <input
                  id="food-protein"
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.protein}
                  onChange={(e) => updateField("protein", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="form-field">
                <label htmlFor="food-fiber">Fiber (g)</label>
                <input
                  id="food-fiber"
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.fiber}
                  onChange={(e) => updateField("fiber", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="form-field">
                <label htmlFor="food-satfat">Sat Fat (g)</label>
                <input
                  id="food-satfat"
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.saturatedFat}
                  onChange={(e) => updateField("saturatedFat", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="form-field">
                <label htmlFor="food-sugar">Sugar (g)</label>
                <input
                  id="food-sugar"
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.sugar}
                  onChange={(e) => updateField("sugar", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="form-field">
                <label htmlFor="food-sodium">Sodium (mg)</label>
                <input
                  id="food-sodium"
                  type="number"
                  min="0"
                  value={form.sodium}
                  onChange={(e) => updateField("sodium", e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <label className="purine-field">
              <input
                type="checkbox"
                checked={form.purine}
                onChange={(e) => updateField("purine", e.target.checked)}
              />
              High purine (organ meats, shellfish, etc.)
            </label>

            <div className="points-preview">
              Points: {previewPoints}
            </div>

            <div className="add-food-actions">
              <button type="button" className="btn-cancel" onClick={() => { setShowForm(false); setForm(emptyForm); }}>
                Cancel
              </button>
              <button type="submit" className="btn-add">
                Add ({previewPoints} pts)
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Entries for selected date */}
      <div className="foodlog-section">
        <h2>{selectedDate === today() ? "Logged Today" : "Logged"}</h2>
        {loading ? (
          <div className="empty-state">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="empty-state">Nothing logged yet. Add something above!</div>
        ) : (
          <div className="entry-list">
            {entries.map((entry) => (
              <div key={entry.id} className="entry-item">
                <span className="entry-name">{entry.name}</span>
                <span className="entry-points">{entry.points} pts</span>
                <button
                  className="entry-delete"
                  onClick={() => deleteEntry(entry.id)}
                  aria-label={`Delete ${entry.name}`}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
