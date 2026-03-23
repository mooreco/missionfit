import { useWeighIns } from "../hooks/useWeighIns";
import { useAuth } from "../hooks/useAuth.jsx";
import { useMedals } from "../hooks/useMedals";
import { calculateStreak } from "../utils/streakCalculator";
import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import "../styles/medals.css";

export default function MedalsPage() {
  const { user } = useAuth();
  const { totalLost } = useWeighIns();
  const [longestStreak, setLongestStreak] = useState(0);

  // Load streak data
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      const logCol = collection(db, "users", user.uid, "foodLog");
      const logSnap = await getDocs(logCol);
      const dates = [];
      for (const dateDoc of logSnap.docs) {
        const entriesCol = collection(
          db, "users", user.uid, "foodLog", dateDoc.id, "entries"
        );
        const entriesSnap = await getDocs(entriesCol);
        if (entriesSnap.size > 0) dates.push(dateDoc.id);
      }
      if (!cancelled) {
        const streakData = calculateStreak(dates);
        setLongestStreak(streakData.longestStreak);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  const lost = totalLost !== null && totalLost > 0 ? totalLost : 0;
  const { allMedals, unlockedCount, totalCount } = useMedals(lost, longestStreak, {});

  const weightMedals = allMedals.filter((m) => m.category === "weight");
  const streakMedals = allMedals.filter((m) => m.category === "streak");
  const exerciseMedals = allMedals.filter((m) => m.category === "exercise");

  return (
    <div className="medals-page">
      <div className="medals-header">
        <h1>Medals</h1>
        <span className="medals-count">
          {unlockedCount} / {totalCount} unlocked
        </span>
      </div>

      {/* Progress bar */}
      <div className="medals-progress">
        <div className="medals-progress-track">
          <div
            className="medals-progress-fill"
            style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Weight milestones */}
      <section className="medals-section">
        <h2>Weight Loss</h2>
        <div className="medals-grid">
          {weightMedals.map((m) => (
            <div
              key={m.id}
              className={`medal-card ${m.unlocked ? "unlocked" : "locked"} ${
                m.id === "w100" ? "capstone" : ""
              }`}
            >
              <span className="medal-emoji">{m.unlocked ? m.emoji : "🔒"}</span>
              <span className="medal-label">{m.label}</span>
              <span className="medal-desc">{m.description}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Streak milestones */}
      <section className="medals-section">
        <h2>Logging Streaks</h2>
        <div className="medals-grid">
          {streakMedals.map((m) => (
            <div
              key={m.id}
              className={`medal-card ${m.unlocked ? "unlocked" : "locked"}`}
            >
              <span className="medal-emoji">{m.unlocked ? m.emoji : "🔒"}</span>
              <span className="medal-label">{m.label}</span>
              <span className="medal-desc">{m.description}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Exercise milestones */}
      <section className="medals-section">
        <h2>Exercise</h2>
        <div className="medals-grid">
          {exerciseMedals.map((m) => (
            <div
              key={m.id}
              className={`medal-card ${m.unlocked ? "unlocked" : "locked"}`}
            >
              <span className="medal-emoji">{m.unlocked ? m.emoji : "🔒"}</span>
              <span className="medal-label">{m.label}</span>
              <span className="medal-desc">{m.description}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
