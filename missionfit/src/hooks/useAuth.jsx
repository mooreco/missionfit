import { createContext, useContext, useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const AuthContext = createContext(null);

const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(uid) {
    const snap = await getDoc(doc(db, "users", uid, "profile", "main"));
    if (snap.exists()) {
      setProfile(snap.data());
      return snap.data();
    }
    setProfile(null);
    return null;
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchProfile(firebaseUser.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signIn(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await fetchProfile(cred.user.uid);
    return cred.user;
  }

  async function signUp(email, password) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return cred.user;
  }

  async function signInWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    await fetchProfile(result.user.uid);
    return result.user;
  }

  async function signOut() {
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
  }

  function refreshProfile() {
    if (user) return fetchProfile(user.uid);
  }

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
