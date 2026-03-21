import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { calculateStreak } from "../utils/streakCalculator";
import WeightTrendChart from "../components/WeightTrendChart";
import "../styles/dashboard.css";
import "../styles/weighin.css";

const TIPS = [
  "Water first. Drink a full glass before every meal.",
  "Protein at every meal keeps you full longer.",
  "Progress isn't linear. Trust the process.",
  "You didn't come this far to only come this far.",
  "Meal prep on Sunday saves you all week.",
  "A 10-minute walk beats zero minutes every time.",
  "Sleep matters. Poor sleep drives hunger hormones.",
  "Track everything — even the bad days. Awareness is power.",
  "You're not starting over. You're starting from experience.",
  "Vegetables first, protein second, carbs last.",
  "One bad meal won't wreck you. One bad week might.",
  "Your body is doing hard things. Be patient with it.",
  "The best exercise is the one you'll actually do.",
  "Discipline weighs ounces. Regret weighs tons.",
  "Every pound lost is four less pounds of pressure on your knees.",
];

function getDailyTip() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  return TIPS[dayOfYear % TIPS.length];
}

function today() {
  const d = new Date();
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { weighIns, goalWeight, totalLost } = useWeighIns();

  const dailyBudget = profile?.dailyPointsBudget ?? 23;

  const [todayPoints, setTodayPoints] = useState(0);
  const [recentFoods, setRecentFoods] = useState([]);
  const [streak, setStreak] = useState({
    currentStreak: 0,
    longestStreak: 0,
    lastLogDate: null,
    graceActive: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      // 1. Today's entries — for points total
      const todayCol = collection(
        db, "users", user.uid, "foodLog", today(), "entries"
      );
      const todaySnap = await getDocs(todayCol);
      if (!cancelled) {
        const pts = todaySnap.docs.reduce(
          (s, d) => s + (d.data().points || 0), 0
        );
        setTodayPoints(pts);
      }

      // 2. Recent foods (last 5 unique non-zero) via collectionGroup
      try {
        const recentQ = query(
          collectionGroup(db, "entries"),
          orderBy("createdAt", "desc"),
          limit(50)
        );
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

      // 3. Food log dates for streak
      const logCol = collection(db, "users", user.uid, "foodLog");
      const logSnap = await getDocs(logCol);
      // These are the date-keyed documents; check which have entries
      const dates = [];
      for (const dateDoc of logSnap.docs) {
        const entriesCol = collection(
          db, "users", user.uid, "foodLog", dateDoc.id, "entries"
        );
        const entriesSnap = await getDocs(entriesCol);
        if (entriesSnap.size > 0) dates.push(dateDoc.id);
      }
      if (!cancelled) {
        setStreak(calculateStreak(dates));
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user]);

  async function quickLog(food) {
    const colRef = collection(
      db, "users", user.uid, "foodLog", today(), "entries"
    );
    await addDoc(colRef, {
      name: food.name,
      points: food.points,
      calories: food.calories || 0,
      protein: food.protein || 0,
      fiber: food.fiber || 0,
      saturatedFat: food.saturatedFat || 0,
      sugar: food.sugar || 0,
      sodium: food.sodium || 0,
      purine: food.purine || false,
      createdAt: new Date().toISOString(),
    });
    setTodayPoints((p) => p + (food.points || 0));
  }

  const remaining = dailyBudget - todayPoints;
  const usedPct = Math.min(todayPoints / dailyBudget, 1);
  const remainPct = Math.max(1 - usedPct, 0);

  // Ring color: green >30%, amber 10-30%, red <10%
  let ringColor = "#22c55e";
  if (remainPct < 0.1) ringColor = "#ef4444";
  else if (remainPct < 0.3) ringColor = "#f59e0b";

  // SVG ring params
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - usedPct);

  // Milestone: first target is 10 lbs
  const lostNum = totalLost !== null && totalLost > 0 ? totalLost : 0;
  const milestoneTarget = 10;
  const milestonePct = Math.min((lostNum / milestoneTarget) * 100, 100);

  return (
    <div className="dash-page">
      {/* Greeting */}
      <div className="dash-greeting">
        <h1>Hey {profile?.displayName || "there"}, you've got this.</h1>
      </div>

      {/* Points ring */}
      <div className="dash-card points-ring-section">
        <div className="ring-container">
          <svg viewBox="0 0 132 132">
            <circle className="ring-bg" cx="66" cy="66" r={radius} />
            <circle
              className="ring-fill"
              cx="66"
              cy="66"
              r={radius}
              stroke={ringColor}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className="ring-text">
            <span className="ring-number" style={{ color: ringColor }}>
              {remaining}
            </span>
            <span className="ring-label">pts left</span>
          </div>
        </div>
        <span className="ring-detail">
          {todayPoints} of {dailyBudget} used
        </span>
      </div>

      {/* Quick log */}
      <div className="dash-card">
        <div className="dash-card-title">Quick Log</div>
        <div className="quick-log-row">
          {recentFoods.map((food, i) => (
            <button key={i} className="quick-chip" onClick={() => quickLog(food)}>
              {food.name}
              <span className="qc-pts">{food.points}pt</span>
            </button>
          ))}
          <button className="quick-chip add-btn" onClick={() => navigate("/log")}>
            + Add Food
          </button>
        </div>
      </div>

      {/* Milestone */}
      <div className="dash-card">
        <div className="dash-card-title">Next Milestone</div>
        {weighIns.length === 0 ? (
          <div className="milestone-empty">
            Log your first weigh-in to start tracking!
          </div>
        ) : (
          <div className="milestone-bar">
            <span className="milestone-label">
              {lostNum.toFixed(1)} of {milestoneTarget} lbs to first milestone
            </span>
            <div className="milestone-track">
              <div
                className="milestone-fill"
                style={{ width: `${milestonePct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Weight trend */}
      {weighIns.length > 0 && (
        <div className="dash-card">
          <div className="dash-card-title">Weight Trend</div>
          <WeightTrendChart weighIns={weighIns} goalWeight={goalWeight} />
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
              <span className="streak-count">
                0 <span>days</span>
              </span>
              <span className="streak-longest">
                Log some food to start your streak!
              </span>
            </div>
          </div>
        ) : (
          <div className="streak-row">
            <span className="streak-flame">
              {streak.currentStreak > 0 ? "\uD83D\uDD25" : "\u26A1"}
            </span>
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
            </div>
          </div>
        )}
      </div>

      {/* Daily tip */}
      <div className="dash-card tip-card">
        <div className="dash-card-title">Daily Tip</div>
        <p className="tip-text">&ldquo;{getDailyTip()}&rdquo;</p>
      </div>
    </div>
  );
}
