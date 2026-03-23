import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth.jsx";
import LoginPage from "./pages/LoginPage";
import OnboardingPage from "./pages/OnboardingPage";
import DashboardPage from "./pages/DashboardPage";
import FoodLogPage from "./pages/FoodLogPage";
import WeighInPage from "./pages/WeighInPage";
import ProfilePage from "./pages/ProfilePage";
import MedalsPage from "./pages/MedalsPage";
import RecipesPage from "./pages/RecipesPage";
import RecipeEditPage from "./pages/RecipeEditPage";
import MealPlanPage from "./pages/MealPlanPage";
import BottomNav from "./components/BottomNav";
import "./styles/auth.css";

function AppRoutes() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  if (!profile) {
    return (
      <Routes>
        <Route path="*" element={<OnboardingPage />} />
      </Routes>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/log" element={<FoodLogPage />} />
        <Route path="/weigh-in" element={<WeighInPage />} />
        <Route path="/medals" element={<MedalsPage />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/recipes/:id" element={<RecipeEditPage />} />
        <Route path="/meal-plan" element={<MealPlanPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
