import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../hooks/useAuth.jsx";
import "../styles/auth.css";

export default function OnboardingPage() {
  const { user, refreshProfile } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [dailyBudget, setDailyBudget] = useState(23);
  const [budgetManuallySet, setBudgetManuallySet] = useState(false);
  const [weighInFrequency, setWeighInFrequency] = useState("daily");
  const [startDate, setStartDate] = useState("2026-03-21");
  const [goalWeight, setGoalWeight] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleGoalWeightChange(value) {
    setGoalWeight(value);
    const weight = parseFloat(value);
    if (weight > 0 && !budgetManuallySet) {
      setDailyBudget(Math.round(weight / 10) + 10);
    }
  }

  function handleBudgetChange(value) {
    setDailyBudget(value);
    setBudgetManuallySet(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!displayName.trim()) {
      setError("Please enter your display name.");
      return;
    }
    if (!goalWeight) {
      setError("Please enter a goal weight.");
      return;
    }

    setSubmitting(true);
    try {
      await setDoc(doc(db, "users", user.uid, "profile", "main"), {
        displayName: displayName.trim(),
        dailyPointsBudget: Number(dailyBudget),
        weighInFrequency,
        startDate,
        goalWeight: Number(goalWeight),
        createdAt: new Date().toISOString(),
      });
      await refreshProfile();
    } catch (err) {
      setError("Failed to save profile. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        <h1>Welcome to MissionFit</h1>
        <p className="subtitle">Let's set up your profile</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="onboarding-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="displayName">Display Name</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="goalWeight">Goal Weight (lbs)</label>
            <input
              id="goalWeight"
              type="number"
              min={50}
              max={500}
              step="0.1"
              value={goalWeight}
              onChange={(e) => handleGoalWeightChange(e.target.value)}
              placeholder="e.g. 180"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="dailyBudget">Daily Points Budget</label>
            <input
              id="dailyBudget"
              type="number"
              min={1}
              max={100}
              value={dailyBudget}
              onChange={(e) => handleBudgetChange(e.target.value)}
              required
            />
            <span className="field-hint">
              Suggested based on your goal weight. Adjust if needed.
            </span>
          </div>

          <div className="form-field">
            <label htmlFor="weighInFrequency">Weigh-In Frequency</label>
            <select
              id="weighInFrequency"
              value={weighInFrequency}
              onChange={(e) => setWeighInFrequency(e.target.value)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="startDate">Start Date</label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Get Started"}
          </button>
        </form>
      </div>
    </div>
  );
}
