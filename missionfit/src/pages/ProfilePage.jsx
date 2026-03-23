import { useState, useEffect } from "react";
import { doc, setDoc, getDoc, collection, getDocs, collectionGroup, query, limit, orderBy } from "firebase/firestore";
import { format } from "date-fns";
import { db } from "../firebase/config";
import { useAuth } from "../hooks/useAuth.jsx";
import { useFavorites } from "../hooks/useFavorites";
import "../styles/profile.css";
import "../styles/exercise.css";

// Bloodwork target ranges
const BP_RANGES = { systolic: { normal: 120, borderline: 140 }, diastolic: { normal: 80, borderline: 90 } };
const LIPID_RANGES = {
  totalCholesterol: { normal: 200, borderline: 240 },
  hdl: { normalMin: 40, good: 60 }, // higher is better
  ldl: { normal: 100, borderline: 160 },
  triglycerides: { normal: 150, borderline: 200 },
  glucose: { normal: 100, borderline: 126 },
};

function getBloodworkStatus(field, value) {
  if (value === null || value === undefined || value === "") return "";
  const v = Number(value);
  if (field === "hdl") {
    if (v >= LIPID_RANGES.hdl.good) return "in-range";
    if (v >= LIPID_RANGES.hdl.normalMin) return "borderline";
    return "high-risk";
  }
  const ranges = field === "systolicBP" ? BP_RANGES.systolic
    : field === "diastolicBP" ? BP_RANGES.diastolic
    : LIPID_RANGES[field];
  if (!ranges) return "";
  if (v <= ranges.normal) return "in-range";
  if (v <= ranges.borderline) return "borderline";
  return "high-risk";
}

export default function ProfilePage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { favorites, removeFavorite } = useFavorites();

  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [form, setForm] = useState({
    displayName: "", dailyPointsBudget: 23, weighInFrequency: "daily",
    startDate: "", goalWeight: "",
  });
  const [stats, setStats] = useState({ entries: 0, weighIns: 0 });

  // Health metrics
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [showBloodwork, setShowBloodwork] = useState(false);
  const [latestMeasurement, setLatestMeasurement] = useState(null);
  const [prevMeasurement, setPrevMeasurement] = useState(null);
  const [latestBloodwork, setLatestBloodwork] = useState(null);
  const [prevBloodwork, setPrevBloodwork] = useState(null);
  const [measureForm, setMeasureForm] = useState({
    waist: "", chest: "", hips: "", shirtSize: "", pantSize: "", notes: "", date: format(new Date(), "yyyy-MM-dd"),
  });
  const [bloodForm, setBloodForm] = useState({
    systolicBP: "", diastolicBP: "", totalCholesterol: "", hdl: "", ldl: "",
    triglycerides: "", glucose: "", notes: "", date: format(new Date(), "yyyy-MM-dd"),
  });

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

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadStats() {
      let entryCount = 0;
      try {
        const eq = query(collectionGroup(db, "entries"), limit(500));
        const eSnap = await getDocs(eq);
        entryCount = eSnap.docs.filter((d) => d.ref.path.split("/")[1] === user.uid).length;
      } catch { entryCount = 0; }

      const wCol = collection(db, "users", user.uid, "weighIns");
      const wSnap = await getDocs(wCol);

      if (!cancelled) setStats({ entries: entryCount, weighIns: wSnap.size });
    }

    async function loadHealth() {
      // Measurements
      try {
        const mCol = collection(db, "users", user.uid, "measurements");
        const mQ = query(mCol, orderBy("date", "desc"), limit(2));
        const mSnap = await getDocs(mQ);
        if (!cancelled && mSnap.docs.length > 0) {
          setLatestMeasurement(mSnap.docs[0].data());
          if (mSnap.docs.length > 1) setPrevMeasurement(mSnap.docs[1].data());
        }
      } catch { /* ignore */ }

      // Bloodwork
      try {
        const bCol = collection(db, "users", user.uid, "bloodwork");
        const bQ = query(bCol, orderBy("date", "desc"), limit(2));
        const bSnap = await getDocs(bQ);
        if (!cancelled && bSnap.docs.length > 0) {
          setLatestBloodwork(bSnap.docs[0].data());
          if (bSnap.docs.length > 1) setPrevBloodwork(bSnap.docs[1].data());
        }
      } catch { /* ignore */ }
    }

    loadStats();
    loadHealth();
    return () => { cancelled = true; };
  }, [user]);

  async function handleSave() {
    await setDoc(doc(db, "users", user.uid, "profile", "main"), {
      ...profile,
      displayName: form.displayName.trim(),
      dailyPointsBudget: Number(form.dailyPointsBudget),
      weighInFrequency: form.weighInFrequency,
      startDate: form.startDate,
      goalWeight: Number(form.goalWeight),
    });
    await refreshProfile();
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function toggleTravelMode() {
    const newVal = !profile?.travelMode;
    await setDoc(doc(db, "users", user.uid, "profile", "main"), {
      ...profile,
      travelMode: newVal,
      travelModeActivatedAt: newVal ? new Date().toISOString() : null,
    });
    await refreshProfile();
  }

  async function saveMeasurement(e) {
    e.preventDefault();
    const dateStr = measureForm.date || format(new Date(), "yyyy-MM-dd");
    await setDoc(doc(db, "users", user.uid, "measurements", dateStr), {
      ...measureForm,
      waist: Number(measureForm.waist) || null,
      chest: Number(measureForm.chest) || null,
      hips: Number(measureForm.hips) || null,
      date: dateStr,
      createdAt: new Date().toISOString(),
    });
    // Update profile with last measurement date
    await setDoc(doc(db, "users", user.uid, "profile", "main"), {
      ...profile, lastMeasurementDate: dateStr,
    });
    await refreshProfile();
    setLatestMeasurement({ ...measureForm, date: dateStr });
    setShowMeasurements(false);
  }

  async function saveBloodwork(e) {
    e.preventDefault();
    const dateStr = bloodForm.date || format(new Date(), "yyyy-MM-dd");
    await setDoc(doc(db, "users", user.uid, "bloodwork", dateStr), {
      systolicBP: Number(bloodForm.systolicBP) || null,
      diastolicBP: Number(bloodForm.diastolicBP) || null,
      totalCholesterol: Number(bloodForm.totalCholesterol) || null,
      hdl: Number(bloodForm.hdl) || null,
      ldl: Number(bloodForm.ldl) || null,
      triglycerides: Number(bloodForm.triglycerides) || null,
      glucose: Number(bloodForm.glucose) || null,
      notes: bloodForm.notes,
      date: dateStr,
      createdAt: new Date().toISOString(),
    });
    await setDoc(doc(db, "users", user.uid, "profile", "main"), {
      ...profile, lastBloodworkDate: dateStr,
    });
    await refreshProfile();
    setLatestBloodwork({ ...bloodForm, date: dateStr });
    setShowBloodwork(false);
  }

  function changeIndicator(current, previous, field, lowerIsBetter = true) {
    if (!current || !previous || !current[field] || !previous[field]) return null;
    const diff = Number(current[field]) - Number(previous[field]);
    if (diff === 0) return null;
    const improved = lowerIsBetter ? diff < 0 : diff > 0;
    return (
      <span className={`health-change ${improved ? "improved" : "worsened"}`}>
        {diff > 0 ? "+" : ""}{diff.toFixed(1)}
      </span>
    );
  }

  const memberSince = profile?.createdAt ? format(new Date(profile.createdAt), "MMM d, yyyy") : "--";

  return (
    <div className="profile-page">
      <h1>Profile</h1>
      {saved && <div className="profile-saved">Profile updated!</div>}

      {/* Stats */}
      <div className="profile-card">
        <div className="profile-card-title">Stats</div>
        <div className="stats-grid">
          <div className="stat-box"><span className="stat-num">{stats.entries}</span><span className="stat-lbl">Entries</span></div>
          <div className="stat-box"><span className="stat-num">{stats.weighIns}</span><span className="stat-lbl">Weigh-Ins</span></div>
        </div>
        <div className="profile-field" style={{ marginTop: "0.75rem", borderBottom: "none" }}>
          <span className="pf-label">Member Since</span>
          <span className="pf-value">{memberSince}</span>
        </div>
      </div>

      {/* Travel Mode */}
      <div className="profile-card">
        <div className="profile-card-title">Travel Mode</div>
        <div className="travel-toggle-row">
          <span className="travel-toggle-label">
            {profile?.travelMode ? "Active — +10 daily points, extended grace" : "Off"}
          </span>
          <button className={`travel-switch ${profile?.travelMode ? "active" : ""}`} onClick={toggleTravelMode} />
        </div>
        {profile?.travelMode && profile?.travelModeActivatedAt && (
          <div className="travel-active-since">
            Since {format(new Date(profile.travelModeActivatedAt), "MMM d, yyyy")}
          </div>
        )}
      </div>

      {/* Favorites */}
      <div className="profile-card">
        <div className="profile-card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Favorites ({favorites.length})</span>
          {favorites.length > 0 && (
            <button className="profile-link-btn" onClick={() => setShowFavorites((v) => !v)}>
              {showFavorites ? "Hide" : "Manage"}
            </button>
          )}
        </div>
        {favorites.length === 0 ? (
          <p className="profile-empty-hint">Star foods in the Food Log to save them as favorites.</p>
        ) : !showFavorites ? (
          <div className="fav-preview">
            {favorites.slice(0, 5).map((f) => (<span key={f.id} className="fav-preview-chip">{f.name}</span>))}
            {favorites.length > 5 && <span className="fav-preview-more">+{favorites.length - 5} more</span>}
          </div>
        ) : (
          <div className="fav-manage-list">
            {favorites.map((f) => (
              <div key={f.id} className="fav-manage-item">
                <span className="fav-manage-name">{f.name}</span>
                <span className="fav-manage-pts">{f.points} pts</span>
                <button className="fav-manage-delete" onClick={() => removeFavorite(f.id)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Health Metrics */}
      <div className="profile-card">
        <div className="profile-card-title">Health Metrics</div>

        {/* Body Measurements */}
        <div className="health-section">
          <div className="health-section-title">Body Measurements</div>
          {latestMeasurement ? (
            <>
              {latestMeasurement.waist && (
                <div className="health-row">
                  <span className="health-label">Waist</span>
                  <span className="health-value">{latestMeasurement.waist}" {changeIndicator(latestMeasurement, prevMeasurement, "waist")}</span>
                </div>
              )}
              {latestMeasurement.chest && (
                <div className="health-row">
                  <span className="health-label">Chest</span>
                  <span className="health-value">{latestMeasurement.chest}" {changeIndicator(latestMeasurement, prevMeasurement, "chest")}</span>
                </div>
              )}
              {latestMeasurement.hips && (
                <div className="health-row">
                  <span className="health-label">Hips</span>
                  <span className="health-value">{latestMeasurement.hips}" {changeIndicator(latestMeasurement, prevMeasurement, "hips")}</span>
                </div>
              )}
              {latestMeasurement.shirtSize && (
                <div className="health-row"><span className="health-label">Shirt</span><span className="health-value">{latestMeasurement.shirtSize}</span></div>
              )}
              {latestMeasurement.pantSize && (
                <div className="health-row"><span className="health-label">Pants</span><span className="health-value">{latestMeasurement.pantSize}</span></div>
              )}
            </>
          ) : (
            <p className="health-empty">No measurements logged yet.</p>
          )}
          <button className="health-add-btn" onClick={() => setShowMeasurements(true)}>
            {latestMeasurement ? "Update Measurements" : "Log Measurements"}
          </button>
        </div>

        {/* Bloodwork */}
        <div className="health-section">
          <div className="health-section-title">Bloodwork</div>
          {latestBloodwork ? (
            <>
              {latestBloodwork.systolicBP && (
                <div className="health-row">
                  <span className="health-label">Blood Pressure</span>
                  <span className={`health-value ${getBloodworkStatus("systolicBP", latestBloodwork.systolicBP)}`}>
                    {latestBloodwork.systolicBP}/{latestBloodwork.diastolicBP}
                  </span>
                </div>
              )}
              {["totalCholesterol", "hdl", "ldl", "triglycerides", "glucose"].map((field) => (
                latestBloodwork[field] ? (
                  <div key={field} className="health-row">
                    <span className="health-label">{field === "hdl" ? "HDL" : field === "ldl" ? "LDL" : field === "totalCholesterol" ? "Total Chol." : field === "triglycerides" ? "Triglycerides" : "Glucose"}</span>
                    <span className={`health-value ${getBloodworkStatus(field, latestBloodwork[field])}`}>
                      {latestBloodwork[field]}
                      {changeIndicator(latestBloodwork, prevBloodwork, field, field !== "hdl")}
                    </span>
                  </div>
                ) : null
              ))}
            </>
          ) : (
            <p className="health-empty">No bloodwork logged yet.</p>
          )}
          <button className="health-add-btn" onClick={() => setShowBloodwork(true)}>
            {latestBloodwork ? "Update Bloodwork" : "Log Bloodwork"}
          </button>
        </div>
      </div>

      {/* Account */}
      <div className="profile-card">
        <div className="profile-card-title">Account</div>
        <div className="profile-field"><span className="pf-label">Email</span><span className="pf-value">{user?.email || "--"}</span></div>
        <div className="profile-field">
          <span className="pf-label">Display Name</span>
          {editing ? <input type="text" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /> : <span className="pf-value">{profile?.displayName}</span>}
        </div>
        <div className="profile-field">
          <span className="pf-label">Daily Budget</span>
          {editing ? <input type="number" min={1} max={100} value={form.dailyPointsBudget} onChange={(e) => setForm({ ...form, dailyPointsBudget: e.target.value })} /> : <span className="pf-value">{profile?.dailyPointsBudget} pts</span>}
        </div>
        <div className="profile-field">
          <span className="pf-label">Weigh-In Frequency</span>
          {editing ? (
            <select value={form.weighInFrequency} onChange={(e) => setForm({ ...form, weighInFrequency: e.target.value })}>
              <option value="daily">Daily</option><option value="weekly">Weekly</option>
            </select>
          ) : <span className="pf-value" style={{ textTransform: "capitalize" }}>{profile?.weighInFrequency}</span>}
        </div>
        <div className="profile-field">
          <span className="pf-label">Start Date</span>
          {editing ? <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /> : <span className="pf-value">{profile?.startDate ? format(new Date(profile.startDate + "T12:00:00"), "MMM d, yyyy") : "--"}</span>}
        </div>
        <div className="profile-field">
          <span className="pf-label">Goal Weight</span>
          {editing ? <input type="number" min={50} max={500} step="0.1" value={form.goalWeight} onChange={(e) => setForm({ ...form, goalWeight: e.target.value })} /> : <span className="pf-value">{profile?.goalWeight} lbs</span>}
        </div>
        {editing ? (
          <div className="profile-actions" style={{ marginTop: "0.75rem" }}>
            <button className="profile-btn secondary" onClick={() => setEditing(false)}>Cancel</button>
            <button className="profile-btn primary" onClick={handleSave}>Save</button>
          </div>
        ) : (
          <button className="profile-btn primary" style={{ marginTop: "0.75rem" }} onClick={() => setEditing(true)}>Edit Profile</button>
        )}
      </div>

      <button className="profile-btn danger" onClick={signOut}>Sign Out</button>

      {/* Measurement Modal */}
      {showMeasurements && (
        <div className="exercise-modal-overlay" onClick={() => setShowMeasurements(false)}>
          <div className="exercise-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Body Measurements</h2>
            <form className="health-modal-form" onSubmit={saveMeasurement}>
              <div className="form-field"><label>Date</label><input type="date" value={measureForm.date} onChange={(e) => setMeasureForm({ ...measureForm, date: e.target.value })} /></div>
              <div className="health-grid">
                <div className="form-field"><label>Waist (in)</label><input type="number" step="0.1" value={measureForm.waist} onChange={(e) => setMeasureForm({ ...measureForm, waist: e.target.value })} placeholder="e.g. 38" /></div>
                <div className="form-field"><label>Chest (in)</label><input type="number" step="0.1" value={measureForm.chest} onChange={(e) => setMeasureForm({ ...measureForm, chest: e.target.value })} placeholder="e.g. 44" /></div>
                <div className="form-field"><label>Hips (in)</label><input type="number" step="0.1" value={measureForm.hips} onChange={(e) => setMeasureForm({ ...measureForm, hips: e.target.value })} placeholder="e.g. 42" /></div>
                <div className="form-field"><label>Shirt Size</label><input type="text" value={measureForm.shirtSize} onChange={(e) => setMeasureForm({ ...measureForm, shirtSize: e.target.value })} placeholder="e.g. 2XL" /></div>
                <div className="form-field"><label>Pant Size</label><input type="text" value={measureForm.pantSize} onChange={(e) => setMeasureForm({ ...measureForm, pantSize: e.target.value })} placeholder="e.g. 38" /></div>
              </div>
              <div className="form-field"><label>Notes</label><textarea rows={2} value={measureForm.notes} onChange={(e) => setMeasureForm({ ...measureForm, notes: e.target.value })} /></div>
              <div className="exercise-form-actions">
                <button type="button" className="exercise-cancel-btn" onClick={() => setShowMeasurements(false)}>Cancel</button>
                <button type="submit" className="exercise-save-btn">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bloodwork Modal */}
      {showBloodwork && (
        <div className="exercise-modal-overlay" onClick={() => setShowBloodwork(false)}>
          <div className="exercise-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Bloodwork</h2>
            <form className="health-modal-form" onSubmit={saveBloodwork}>
              <div className="form-field"><label>Date</label><input type="date" value={bloodForm.date} onChange={(e) => setBloodForm({ ...bloodForm, date: e.target.value })} /></div>
              <div className="health-grid">
                <div className="form-field"><label>Systolic BP</label><input type="number" value={bloodForm.systolicBP} onChange={(e) => setBloodForm({ ...bloodForm, systolicBP: e.target.value })} placeholder="120" /></div>
                <div className="form-field"><label>Diastolic BP</label><input type="number" value={bloodForm.diastolicBP} onChange={(e) => setBloodForm({ ...bloodForm, diastolicBP: e.target.value })} placeholder="80" /></div>
                <div className="form-field"><label>Total Chol.</label><input type="number" value={bloodForm.totalCholesterol} onChange={(e) => setBloodForm({ ...bloodForm, totalCholesterol: e.target.value })} /></div>
                <div className="form-field"><label>HDL</label><input type="number" value={bloodForm.hdl} onChange={(e) => setBloodForm({ ...bloodForm, hdl: e.target.value })} /></div>
                <div className="form-field"><label>LDL</label><input type="number" value={bloodForm.ldl} onChange={(e) => setBloodForm({ ...bloodForm, ldl: e.target.value })} /></div>
                <div className="form-field"><label>Triglycerides</label><input type="number" value={bloodForm.triglycerides} onChange={(e) => setBloodForm({ ...bloodForm, triglycerides: e.target.value })} /></div>
                <div className="form-field"><label>Glucose</label><input type="number" value={bloodForm.glucose} onChange={(e) => setBloodForm({ ...bloodForm, glucose: e.target.value })} /></div>
              </div>
              <div className="form-field"><label>Notes</label><textarea rows={2} value={bloodForm.notes} onChange={(e) => setBloodForm({ ...bloodForm, notes: e.target.value })} /></div>
              <div className="exercise-form-actions">
                <button type="button" className="exercise-cancel-btn" onClick={() => setShowBloodwork(false)}>Cancel</button>
                <button type="submit" className="exercise-save-btn">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
