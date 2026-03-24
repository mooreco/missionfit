import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  collection,
  getDocs,
  collectionGroup,
  query,
  orderBy,
  limit,
  addDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../hooks/useAuth.jsx";
import { useWeighIns } from "../hooks/useWeighIns";
import { useMedals } from "../hooks/useMedals";
import { useExerciseLog } from "../hooks/useExerciseLog";
import { calculateStreak } from "../utils/streakCalculator";
import { getNextWeightMilestone } from "../utils/milestones";
import { calcWeeklyPoints } from "../utils/weeklyPoints";
import { getCoachingTip } from "../utils/coachingEngine";
import WeightTrendChart from "../components/WeightTrendChart";
import CelebrationModal from "../components/CelebrationModal";
import "../styles/dashboard.css";
import "../styles/weighin.css";
import "../styles/medals.css";
import "../styles/exercise.css";

function todayStr() {
  const d = new Date();
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { weighIns, goalWeight, totalLost, currentWeight } = useWeighIns();
  const { weeklyMinutes, todayEntries: exerciseToday, addExercise, deleteExercise, ACTIVITY_TYPES, WEEKLY_TARGET } = useExerciseLog();

  const travelMode = profile?.travelMode ?? false;
  const maintenanceMode = profile?.maintenanceMode ?? false;
  const travelBonus = travelMode ? 10 : 0;
  const baseBudget = maintenanceMode
    ? (profile?.maintenanceBudget ?? (profile?.dailyPointsBudget ?? 23) + 10)
    : (profile?.dailyPointsBudget ?? 23);
  const dailyBudget = baseBudget + travelBonus;

  const [todayPoints, setTodayPoints] = useState(0);
  const [recentFoods, setRecentFoods] = useState([]);
  const [streak, setStreak] = useState({
    currentStreak: 0, longestStreak: 0, lastLogDate: null,
    graceActive: false, earnedFreezes: 0, availableFreezes: 0, freezeActiveToday: false,
  });
  const [weekly, setWeekly] = useState({ weeklyUsed: 0, weeklyRemaining: 28, weeklyTotal: 28 });
  const [loading, setLoading] = useState(true);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [exerciseForm, setExerciseForm] = useState({ activity: "Walking", duration: "", date: todayStr() });

  // Medal system
  const lost = totalLost !== null && totalLost > 0 ? totalLost : 0;
  const {
    allMedals, unlockedCount, totalCount, newMedals, acknowledgeMedals,
  } = useMedals(lost, streak.longestStreak, { totalWorkouts: exerciseToday.length, bestWeekMinutes: weeklyMinutes });

  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (newMedals.length > 0 && !loading) setShowCelebration(true);
  }, [newMedals.length, loading]);

  function handleDismissCelebration() {
    setShowCelebration(false);
    acknowledgeMedals();
  }

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      const todayCol = collection(db, "users", user.uid, "foodLog", todayStr(), "entries");
      const todaySnap = await getDocs(todayCol);
      if (!cancelled) {
        setTodayPoints(todaySnap.docs.reduce((s, d) => s + (d.data().points || 0), 0));
      }

      try {
        const recentQ = query(collectionGroup(db, "entries"), orderBy("createdAt", "desc"), limit(50));
        const recentSnap = await getDocs(recentQ);
        const seen = new Set();
        const foods = [];
        for (const d of recentSnap.docs) {
          if (d.ref.path.split("/")[1] !== user.uid) continue;
          const data = d.data();
          if (data.points === 0) continue;
          const key = data.name.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          foods.push(data);
          if (foods.length >= 5) break;
        }
        if (!cancelled) setRecentFoods(foods);
      } catch {
        if (!cancelled) setRecentFoods([]);
      }

      try {
        const wp = await calcWeeklyPoints(user.uid, baseBudget, 28);
        if (!cancelled) setWeekly(wp);
      } catch { /* ignore */ }

      const logCol = collection(db, "users", user.uid, "foodLog");
      const logSnap = await getDocs(logCol);
      const dates = [];
      for (const dateDoc of logSnap.docs) {
        const entriesCol = collection(db, "users", user.uid, "foodLog", dateDoc.id, "entries");
        const entriesSnap = await getDocs(entriesCol);
        if (entriesSnap.size > 0) dates.push(dateDoc.id);
      }
      if (!cancelled) {
        const freezesUsed = profile?.freezesUsed ?? 0;
        setStreak(calculateStreak(dates, freezesUsed, travelMode));
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user, baseBudget, profile?.freezesUsed, travelMode]);

  async function quickLog(food) {
    const colRef = collection(db, "users", user.uid, "foodLog", todayStr(), "entries");
    await addDoc(colRef, {
      name: food.name, points: food.points,
      calories: food.calories || 0, protein: food.protein || 0,
      fiber: food.fiber || 0, saturatedFat: food.saturatedFat || 0,
      sugar: food.sugar || 0, sodium: food.sodium || 0,
      purine: food.purine || false, createdAt: new Date().toISOString(),
    });
    setTodayPoints((p) => p + (food.points || 0));
  }

  async function handleExerciseSubmit(e) {
    e.preventDefault();
    if (!exerciseForm.duration) return;
    await addExercise(exerciseForm);
    setExerciseForm({ activity: "Walking", duration: "", date: todayStr() });
    setShowExerciseModal(false);
  }

  // Coaching tip
  const coachingTip = getCoachingTip({
    todayPoints, dailyBudget: baseBudget, weighIns, totalLost: lost,
    streak, travelMode, maintenanceMode,
    lastMeasurementDate: profile?.lastMeasurementDate ?? null,
    lastBloodworkDate: profile?.lastBloodworkDate ?? null,
  });

  const remaining = dailyBudget - todayPoints;
  const usedPct = Math.min(todayPoints / dailyBudget, 1);
  const remainPct = Math.max(1 - usedPct, 0);

  let ringColor = "#06D6A0";
  if (remainPct < 0.1) ringColor = "#EF476F";
  else if (remainPct < 0.3) ringColor = "#FFD166";

  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - usedPct);

  const nextMilestone = maintenanceMode ? null : getNextWeightMilestone(lost);
  const milestonePct = nextMilestone
    ? Math.min((lost / nextMilestone.milestone.threshold) * 100, 100)
    : 100;

  const recentMedals = allMedals.filter((m) => m.unlocked).slice(-5).reverse();

  const weeklyPct = (weekly.weeklyUsed / weekly.weeklyTotal) * 100;
  const weeklyColor = weekly.weeklyRemaining < weekly.weeklyTotal * 0.25 ? "#FFD166" : "#06D6A0";

  const exercisePct = Math.min((weeklyMinutes / WEEKLY_TARGET) * 100, 100);

  return (
    <div className="dash-page">
      {showCelebration && newMedals.length > 0 && (
        <CelebrationModal medals={newMedals} onDismiss={handleDismissCelebration} />
      )}

      {/* Travel mode banner */}
      {travelMode && (
        <div className="travel-banner">
          Travel Mode Active — adjusted expectations, same commitment.
        </div>
      )}

      {/* Maintenance banner */}
      {maintenanceMode && (
        <div className="maintenance-banner">
          Maintaining the Mission — you earned this.
        </div>
      )}

      {/* Maintenance weight warning */}
      {maintenanceMode && currentWeight && profile?.maintenanceThreshold && currentWeight > profile.maintenanceThreshold && (
        <div className="maintenance-warning">
          <div className="maintenance-warning-text">
            Weight is above your maintenance threshold of {profile.maintenanceThreshold} lbs.
          </div>
        </div>
      )}

      <div className="dash-greeting">
        <h1>Hey {profile?.displayName || "there"}, you've got this.</h1>
      </div>

      {/* Points ring */}
      <div className="dash-card points-ring-section">
        <div className="ring-container">
          <svg viewBox="0 0 132 132">
            <circle className="ring-bg" cx="66" cy="66" r={radius} />
            <circle className="ring-fill" cx="66" cy="66" r={radius}
              stroke={ringColor} strokeDasharray={circumference} strokeDashoffset={dashOffset} />
          </svg>
          <div className="ring-text">
            <span className="ring-number" style={{ color: ringColor }}>{remaining}</span>
            <span className="ring-label">Steps left</span>
          </div>
        </div>
        <span className="ring-detail">
          {todayPoints} of {dailyBudget} Steps used
          {travelBonus > 0 && ` (${baseBudget} + ${travelBonus} travel)`}
        </span>

        <div className="weekly-indicator">
          <div className="weekly-label">
            <span>Weekly Steps: {weekly.weeklyRemaining} / {weekly.weeklyTotal} remaining</span>
          </div>
          <div className="weekly-track">
            <div className="weekly-fill" style={{ width: `${Math.min(weeklyPct, 100)}%`, background: weeklyColor }} />
          </div>
        </div>
      </div>

      {/* Quick log */}
      <div className="dash-card">
        <div className="dash-card-title">Quick Log</div>
        <div className="quick-log-row">
          {recentFoods.map((food, i) => (
            <button key={i} className="quick-chip" onClick={() => quickLog(food)}>
              {food.name}
              <span className="qc-pts">{food.points}s</span>
            </button>
          ))}
          <button className="quick-chip add-btn" onClick={() => navigate("/log")}>
            + Add Food
          </button>
        </div>
      </div>

      {/* Exercise */}
      <div className="dash-card">
        <div className="dash-card-title">Exercise This Week</div>
        <div className="exercise-card-summary">
          <div className="exercise-progress">
            <div className="exercise-progress-label">
              {weeklyMinutes} / {WEEKLY_TARGET} min
            </div>
            <div className="exercise-progress-bar">
              <div className="exercise-progress-fill" style={{ width: `${exercisePct}%` }} />
            </div>
            <div className="exercise-progress-detail">
              {weeklyMinutes >= WEEKLY_TARGET ? "Target reached!" : `${WEEKLY_TARGET - weeklyMinutes} min to go`}
            </div>
          </div>
          <button className="exercise-add-btn" onClick={() => setShowExerciseModal(true)}>
            + Log
          </button>
        </div>
        {exerciseToday.length > 0 && (
          <div className="exercise-today-list">
            {exerciseToday.map((e) => (
              <div key={e.id} className="exercise-today-item">
                <span className="exercise-today-activity">{e.activity}</span>
                <span className="exercise-today-duration">{e.duration} min</span>
                <button className="exercise-today-delete" onClick={() => deleteExercise(todayStr(), e.id)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Next Milestone */}
      <div className="dash-card" onClick={() => navigate("/medals")} style={{ cursor: "pointer" }}>
        <div className="dash-card-title">{maintenanceMode ? "Mission Status" : "Next Milestone"}</div>
        {maintenanceMode ? (
          <div className="milestone-bar">
            <span className="milestone-label">Mission Complete — maintaining at {currentWeight?.toFixed(1) || "--"} lbs</span>
            <div className="milestone-track">
              <div className="milestone-fill" style={{ width: "100%" }} />
            </div>
          </div>
        ) : weighIns.length === 0 ? (
          <div className="milestone-empty">Log your first weigh-in to start tracking!</div>
        ) : nextMilestone ? (
          <div className="milestone-bar">
            <span className="milestone-label">
              {nextMilestone.milestone.emoji} {lost.toFixed(1)} of{" "}
              {nextMilestone.milestone.threshold} lbs — {nextMilestone.milestone.label}
            </span>
            <div className="milestone-track">
              <div className="milestone-fill" style={{ width: `${milestonePct}%` }} />
            </div>
          </div>
        ) : (
          <div className="milestone-bar">
            <span className="milestone-label">All milestones achieved! The Long Walk is finished.</span>
            <div className="milestone-track">
              <div className="milestone-fill" style={{ width: "100%" }} />
            </div>
          </div>
        )}
      </div>

      {/* Recent medals */}
      {recentMedals.length > 0 && (
        <div className="dash-card" onClick={() => navigate("/medals")} style={{ cursor: "pointer" }}>
          <div className="dash-card-title">Medals · {unlockedCount}/{totalCount}</div>
          <div className="dash-medals-row">
            {recentMedals.map((m) => (
              <span key={m.id} className="dash-medal-chip">
                <span className="dm-emoji">{m.emoji}</span>
                {m.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Weight trend + Log Weight */}
      {weighIns.length > 0 ? (
        <div className="dash-card">
          <div className="dash-card-title-row">
            <span className="dash-card-title" style={{ marginBottom: 0 }}>Weight Trend</span>
            <button className="dash-weighin-btn" onClick={() => navigate("/weigh-in")}>
              Log Weight
            </button>
          </div>
          <div onClick={() => navigate("/weigh-in")} style={{ cursor: "pointer", marginTop: "0.5rem" }}>
            <WeightTrendChart weighIns={weighIns} goalWeight={goalWeight} />
          </div>
        </div>
      ) : (
        <div className="dash-card">
          <div className="dash-card-title">Weigh In</div>
          <div className="milestone-empty">Log your first weigh-in to start tracking!</div>
          <button className="dash-weighin-btn full" onClick={() => navigate("/weigh-in")}>
            Log Weight
          </button>
        </div>
      )}

      {/* Streak */}
      <div className="dash-card">
        <div className="dash-card-title">Logging Streak</div>
        {loading ? (
          <div className="milestone-empty">Loading...</div>
        ) : streak.currentStreak === 0 && streak.longestStreak === 0 ? (
          <div className="streak-row">
            <span className="streak-flame">{"\u26A1"}</span>
            <div className="streak-info">
              <span className="streak-count">0 <span>days</span></span>
              <span className="streak-longest">Log some food to start your streak!</span>
            </div>
          </div>
        ) : (
          <div className="streak-row">
            <span className="streak-flame">{streak.currentStreak > 0 ? "\uD83D\uDD25" : "\u26A1"}</span>
            <div className="streak-info">
              <span className="streak-count">
                {streak.currentStreak} <span>day{streak.currentStreak !== 1 ? "s" : ""}</span>
              </span>
              <span className="streak-longest">
                Longest: {streak.longestStreak} day{streak.longestStreak !== 1 ? "s" : ""}
              </span>
              {streak.graceActive && (
                <span className="streak-grace">Grace day — log today to keep it going!</span>
              )}
              {streak.freezeActiveToday && (
                <span className="streak-freeze-msg">
                  Streak freeze used! Your {streak.currentStreak}-day streak lives on.
                </span>
              )}
            </div>
          </div>
        )}
        {(streak.currentStreak > 0 || streak.availableFreezes > 0) && (
          <div className={`freeze-bank ${streak.availableFreezes === 0 ? "dimmed" : ""}`}>
            <span className="freeze-icon">FRZ</span>
            <span className="freeze-count">
              {streak.availableFreezes} freeze{streak.availableFreezes !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Coaching tip */}
      <div className="dash-card tip-card">
        <div className="dash-card-title">Daily Tip</div>
        <p className="tip-text">&ldquo;{coachingTip.tip}&rdquo;</p>
      </div>

      {/* Exercise modal */}
      {showExerciseModal && (
        <div className="exercise-modal-overlay" onClick={() => setShowExerciseModal(false)}>
          <div className="exercise-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Log Exercise</h2>
            <form className="exercise-form" onSubmit={handleExerciseSubmit}>
              <div className="form-field">
                <label>Activity</label>
                <select value={exerciseForm.activity} onChange={(e) => setExerciseForm({ ...exerciseForm, activity: e.target.value })}>
                  {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="exercise-form-row">
                <div className="form-field">
                  <label>Duration (min)</label>
                  <input type="number" min="1" max="600" value={exerciseForm.duration}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, duration: e.target.value })}
                    placeholder="30" required />
                </div>
                <div className="form-field">
                  <label>Date</label>
                  <input type="date" value={exerciseForm.date}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, date: e.target.value })} />
                </div>
              </div>
              <div className="exercise-form-actions">
                <button type="button" className="exercise-cancel-btn" onClick={() => setShowExerciseModal(false)}>Cancel</button>
                <button type="submit" className="exercise-save-btn">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
