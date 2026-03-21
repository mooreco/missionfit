import { useState } from "react";
import { format } from "date-fns";
import { useWeighIns } from "../hooks/useWeighIns";
import WeightTrendChart from "../components/WeightTrendChart";
import "../styles/weighin.css";

const today = () => format(new Date(), "yyyy-MM-dd");

export default function WeighInPage() {
  const {
    weighIns,
    loading,
    saveWeighIn,
    goalWeight,
    totalLost,
    remainingToGoal,
  } = useWeighIns();

  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!weight) return;
    await saveWeighIn(date, weight);
    setWeight("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Most recent 5, reversed so newest is first
  const recentFive = weighIns.slice(-5).reverse();

  return (
    <div className="weighin-page">
      <div className="weighin-header">
        <h1>Weigh In</h1>
      </div>

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
              {remainingToGoal === null
                ? "--"
                : remainingToGoal <= 0
                  ? "Goal reached!"
                  : `${remainingToGoal.toFixed(1)} lbs`}
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
              <input
                id="wi-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="wi-weight">Weight (lbs)</label>
              <input
                id="wi-weight"
                type="number"
                min="50"
                max="500"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 195.4"
                required
              />
            </div>
          </div>
          <button className="weighin-save" type="submit">
            Save Weigh-In
          </button>
        </form>
        {saved && (
          <div className="weighin-success" style={{ marginTop: "0.5rem" }}>
            Weigh-in saved!
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="weighin-section">
        <h2>Weight Trend</h2>
        <WeightTrendChart weighIns={weighIns} goalWeight={goalWeight} />
      </div>

      {/* Recent weigh-ins */}
      <div className="weighin-section">
        <h2>Recent Weigh-Ins</h2>
        {loading ? (
          <div className="chart-empty">Loading...</div>
        ) : recentFive.length === 0 ? (
          <div className="chart-empty">No weigh-ins yet.</div>
        ) : (
          <div className="recent-weighins">
            {recentFive.map((entry, i) => {
              // The entry after this one chronologically (previous in reversed list)
              const olderIndex = weighIns.indexOf(entry) - 1;
              const prev = olderIndex >= 0 ? weighIns[olderIndex] : null;
              const change = prev ? entry.weight - prev.weight : null;

              return (
                <div key={entry.id} className="recent-item">
                  <span className="recent-date">
                    {format(new Date(entry.date + "T12:00:00"), "MMM d, yyyy")}
                  </span>
                  <span className="recent-weight">{entry.weight} lbs</span>
                  <span
                    className={`recent-change ${
                      change === null
                        ? "same"
                        : change < 0
                          ? "loss"
                          : change > 0
                            ? "gain"
                            : "same"
                    }`}
                  >
                    {change === null
                      ? "--"
                      : change === 0
                        ? "0.0"
                        : `${change > 0 ? "+" : ""}${change.toFixed(1)}`}
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
