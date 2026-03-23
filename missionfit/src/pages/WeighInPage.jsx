import { useState } from "react";
import { format } from "date-fns";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../hooks/useAuth.jsx";
import { useWeighIns } from "../hooks/useWeighIns";
import WeightTrendChart from "../components/WeightTrendChart";
import "../styles/weighin.css";
import "../styles/exercise.css";

const today = () => format(new Date(), "yyyy-MM-dd");

/**
 * Calculate suggested budget based on current weight.
 * Calibrated: 280→41, 230→35, 180→28
 */
function suggestBudget(currentWeight, goalWeight) {
  // Linear interpolation: at 280 → 41, at 180 → 28
  // slope = (41-28)/(280-180) = 13/100 = 0.13
  // budget = 28 + 0.13 * (weight - 180)
  const budget = Math.round(28 + 0.13 * (currentWeight - 180));
  return Math.max(20, Math.min(50, budget)); // clamp
}

export default function WeighInPage() {
  const { user, profile, refreshProfile } = useAuth();
  const {
    weighIns, loading, saveWeighIn, goalWeight, totalLost, remainingToGoal, firstWeight, currentWeight,
  } = useWeighIns();

  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState("");
  const [saved, setSaved] = useState(false);
  const [showRecalc, setShowRecalc] = useState(false);
  const [suggestedBudget, setSuggestedBudget] = useState(null);
  const [showMaintenance, setShowMaintenance] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!weight) return;
    await saveWeighIn(date, weight);
    setWeight("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);

    const newWeight = parseFloat(weight);
    const startWeight = firstWeight || newWeight;
    const lostNow = startWeight - newWeight;
    const lastRecalcWeight = profile?.lastBudgetRecalcWeight ?? startWeight;

    // Check budget recalculation threshold: every 10 lbs lost below start
    if (lostNow >= 10 && newWeight <= lastRecalcWeight - 10) {
      const suggested = suggestBudget(newWeight, goalWeight || 180);
      if (suggested !== profile?.dailyPointsBudget) {
        setSuggestedBudget(suggested);
        setShowRecalc(true);
      }
    }

    // Check maintenance mode trigger
    if (
      goalWeight &&
      newWeight <= goalWeight &&
      !profile?.maintenanceMode &&
      lostNow >= 100 // The Long Walk: Finished medal threshold
    ) {
      setShowMaintenance(true);
    }
  }

  async function handleUpdateBudget() {
    if (!user || !suggestedBudget) return;
    await setDoc(doc(db, "users", user.uid, "profile", "main"), {
      ...profile,
      dailyPointsBudget: suggestedBudget,
      lastBudgetRecalcWeight: currentWeight,
    });
    await refreshProfile();
    setShowRecalc(false);
  }

  async function handleDismissRecalc() {
    if (!user) return;
    await setDoc(doc(db, "users", user.uid, "profile", "main"), {
      ...profile,
      lastBudgetRecalcWeight: currentWeight,
    });
    await refreshProfile();
    setShowRecalc(false);
  }

  async function handleActivateMaintenance() {
    if (!user) return;
    const maintBudget = (profile?.dailyPointsBudget ?? 23) + 10;
    const threshold = (goalWeight || 180) + 5;
    await setDoc(doc(db, "users", user.uid, "profile", "main"), {
      ...profile,
      maintenanceMode: true,
      maintenanceThreshold: threshold,
      maintenanceBudget: maintBudget,
    });
    await refreshProfile();
    setShowMaintenance(false);
  }

  const recentFive = weighIns.slice(-5).reverse();

  return (
    <div className="weighin-page">
      <div className="weighin-header">
        <h1>Weigh In</h1>
      </div>

      {/* Budget recalc prompt */}
      {showRecalc && suggestedBudget && (
        <div className="budget-recalc-prompt">
          <div className="budget-recalc-text">
            You've made great progress! Your suggested daily budget is now <strong>{suggestedBudget} Steps</strong>.
          </div>
          <div className="budget-recalc-actions">
            <button className="recalc-update" onClick={handleUpdateBudget}>Update</button>
            <button className="recalc-dismiss" onClick={handleDismissRecalc}>Keep Current</button>
          </div>
        </div>
      )}

      {/* Maintenance celebration */}
      {showMaintenance && (
        <div className="budget-recalc-prompt">
          <div className="budget-recalc-text">
            <strong>You did it. The Long Walk is finished.</strong> Welcome to maintenance mode. Your threshold will be {(goalWeight || 180) + 5} lbs.
          </div>
          <div className="budget-recalc-actions">
            <button className="recalc-update" onClick={handleActivateMaintenance}>Enter Maintenance</button>
            <button className="recalc-dismiss" onClick={() => setShowMaintenance(false)}>Not Yet</button>
          </div>
        </div>
      )}

      {/* Stats */}
      {totalLost !== null && (
        <div className="weighin-stats">
          <div className="stat-card">
            <div className={`stat-value ${totalLost > 0 ? "positive" : totalLost < 0 ? "negative" : ""}`}>
              {totalLost > 0 ? "-" : totalLost < 0 ? "+" : ""}
              {Math.abs(totalLost).toFixed(1)} lbs
            </div>
            <div className="stat-label">Total Lost</div>
          </div>
          <div className="stat-card">
            <div className={`stat-value ${remainingToGoal !== null && remainingToGoal <= 0 ? "positive" : ""}`}>
              {remainingToGoal === null ? "--" : remainingToGoal <= 0 ? "Goal reached!" : `${remainingToGoal.toFixed(1)} lbs`}
            </div>
            <div className="stat-label">To Goal</div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="weighin-form-card">
        <form className="weighin-form" onSubmit={handleSubmit}>
          <div className="weighin-row">
            <div className="form-field">
              <label htmlFor="wi-date">Date</label>
              <input id="wi-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="form-field">
              <label htmlFor="wi-weight">Weight (lbs)</label>
              <input id="wi-weight" type="number" min="50" max="500" step="0.1" value={weight}
                onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 195.4" required />
            </div>
          </div>
          <button className="weighin-save" type="submit">Save Weigh-In</button>
        </form>
        {saved && <div className="weighin-success" style={{ marginTop: "0.5rem" }}>Weigh-in saved!</div>}
      </div>

      {/* Chart */}
      <div className="weighin-section">
        <h2>Weight Trend</h2>
        <WeightTrendChart weighIns={weighIns} goalWeight={goalWeight} />
      </div>

      {/* Recent */}
      <div className="weighin-section">
        <h2>Recent Weigh-Ins</h2>
        {loading ? (
          <div className="chart-empty">Loading...</div>
        ) : recentFive.length === 0 ? (
          <div className="chart-empty">No weigh-ins yet.</div>
        ) : (
          <div className="recent-weighins">
            {recentFive.map((entry) => {
              const olderIndex = weighIns.indexOf(entry) - 1;
              const prev = olderIndex >= 0 ? weighIns[olderIndex] : null;
              const change = prev ? entry.weight - prev.weight : null;
              return (
                <div key={entry.id} className="recent-item">
                  <span className="recent-date">{format(new Date(entry.date + "T12:00:00"), "MMM d, yyyy")}</span>
                  <span className="recent-weight">{entry.weight} lbs</span>
                  <span className={`recent-change ${change === null ? "same" : change < 0 ? "loss" : change > 0 ? "gain" : "same"}`}>
                    {change === null ? "--" : change === 0 ? "0.0" : `${change > 0 ? "+" : ""}${change.toFixed(1)}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
