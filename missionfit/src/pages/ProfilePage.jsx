import { useState, useEffect } from "react";
import { doc, setDoc, collection, getDocs, collectionGroup, query, limit } from "firebase/firestore";
import { format } from "date-fns";
import { db } from "../firebase/config";
import { useAuth } from "../hooks/useAuth.jsx";
import "../styles/profile.css";

export default function ProfilePage() {
  const { user, profile, signOut, refreshProfile } = useAuth();

  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    dailyPointsBudget: 23,
    weighInFrequency: "daily",
    startDate: "",
    goalWeight: "",
  });
  const [stats, setStats] = useState({ entries: 0, weighIns: 0 });

  useEffect(() => {
    if (profile) {
      setForm({
        displayName: profile.displayName || "",
        dailyPointsBudget: profile.dailyPointsBudget ?? 23,
        weighInFrequency: profile.weighInFrequency || "daily",
        startDate: profile.startDate || "",
        goalWeight: profile.goalWeight ?? "",
      });
    }
  }, [profile]);

  // Load stats
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadStats() {
      // Count food entries
      let entryCount = 0;
      try {
        const eq = query(collectionGroup(db, "entries"), limit(500));
        const eSnap = await getDocs(eq);
        entryCount = eSnap.docs.filter(
          (d) => d.ref.path.split("/")[1] === user.uid
        ).length;
      } catch {
        entryCount = 0;
      }

      // Count weigh-ins
      const wCol = collection(db, "users", user.uid, "weighIns");
      const wSnap = await getDocs(wCol);

      if (!cancelled) {
        setStats({ entries: entryCount, weighIns: wSnap.size });
      }
    }

    loadStats();
    return () => { cancelled = true; };
  }, [user]);

  async function handleSave() {
    await setDoc(doc(db, "users", user.uid, "profile", "main"), {
      displayName: form.displayName.trim(),
      dailyPointsBudget: Number(form.dailyPointsBudget),
      weighInFrequency: form.weighInFrequency,
      startDate: form.startDate,
      goalWeight: Number(form.goalWeight),
      createdAt: profile?.createdAt || new Date().toISOString(),
    });
    await refreshProfile();
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const memberSince = profile?.createdAt
    ? format(new Date(profile.createdAt), "MMM d, yyyy")
    : "--";

  return (
    <div className="profile-page">
      <h1>Profile</h1>

      {saved && <div className="profile-saved">Profile updated!</div>}

      {/* Stats */}
      <div className="profile-card">
        <div className="profile-card-title">Stats</div>
        <div className="stats-grid">
          <div className="stat-box">
            <span className="stat-num">{stats.entries}</span>
            <span className="stat-lbl">Entries</span>
          </div>
          <div className="stat-box">
            <span className="stat-num">{stats.weighIns}</span>
            <span className="stat-lbl">Weigh-Ins</span>
          </div>
        </div>
        <div className="profile-field" style={{ marginTop: "0.75rem", borderBottom: "none" }}>
          <span className="pf-label">Member Since</span>
          <span className="pf-value">{memberSince}</span>
        </div>
      </div>

      {/* Profile info */}
      <div className="profile-card">
        <div className="profile-card-title">Account</div>

        <div className="profile-field">
          <span className="pf-label">Email</span>
          <span className="pf-value">{user?.email || "--"}</span>
        </div>

        <div className="profile-field">
          <span className="pf-label">Display Name</span>
          {editing ? (
            <input
              type="text"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            />
          ) : (
            <span className="pf-value">{profile?.displayName}</span>
          )}
        </div>

        <div className="profile-field">
          <span className="pf-label">Daily Budget</span>
          {editing ? (
            <input
              type="number"
              min={1}
              max={100}
              value={form.dailyPointsBudget}
              onChange={(e) => setForm({ ...form, dailyPointsBudget: e.target.value })}
            />
          ) : (
            <span className="pf-value">{profile?.dailyPointsBudget} pts</span>
          )}
        </div>

        <div className="profile-field">
          <span className="pf-label">Weigh-In Frequency</span>
          {editing ? (
            <select
              value={form.weighInFrequency}
              onChange={(e) => setForm({ ...form, weighInFrequency: e.target.value })}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          ) : (
            <span className="pf-value" style={{ textTransform: "capitalize" }}>
              {profile?.weighInFrequency}
            </span>
          )}
        </div>

        <div className="profile-field">
          <span className="pf-label">Start Date</span>
          {editing ? (
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          ) : (
            <span className="pf-value">
              {profile?.startDate
                ? format(new Date(profile.startDate + "T12:00:00"), "MMM d, yyyy")
                : "--"}
            </span>
          )}
        </div>

        <div className="profile-field">
          <span className="pf-label">Goal Weight</span>
          {editing ? (
            <input
              type="number"
              min={50}
              max={500}
              step="0.1"
              value={form.goalWeight}
              onChange={(e) => setForm({ ...form, goalWeight: e.target.value })}
            />
          ) : (
            <span className="pf-value">{profile?.goalWeight} lbs</span>
          )}
        </div>

        {editing ? (
          <div className="profile-actions" style={{ marginTop: "0.75rem" }}>
            <button
              className="profile-btn secondary"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
            <button className="profile-btn primary" onClick={handleSave}>
              Save
            </button>
          </div>
        ) : (
          <button
            className="profile-btn primary"
            style={{ marginTop: "0.75rem" }}
            onClick={() => setEditing(true)}
          >
            Edit Profile
          </button>
        )}
      </div>

      <button className="profile-btn danger" onClick={signOut}>
        Sign Out
      </button>
    </div>
  );
}
