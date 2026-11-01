import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

// Public pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

// Protected pages
import DashboardPage from "./pages/DashboardPage";
import TransactionsPage from "./pages/TransactionsPage";
import BudgetPlannerPage from "./pages/BudgetPlannerPage";
import GoalsPage from "./pages/GoalsPage";
import ProfilePage from "./pages/ProfilePage";
import BillsRecurringPage from "./pages/BillsRecurringPage";
import InsightsPage from "./pages/InsightsPage";
import PredictiveFinancePage from "./pages/PredictiveFinancePage";
import WealthPage from "./pages/WealthPage";
import ReceiptScannerPage from "./pages/ReceiptScannerPage";
import useSessionActivity from "./hooks/useSessionActivity";

// Other
import NotFoundPage from "./pages/NotFoundPage";

function AppContent() {
  useSessionActivity();
  const location = useLocation();

  const standalonePaths = [
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ];

  const isStandalonePage = standalonePaths.includes(location.pathname);

  return (
    <div className={isStandalonePage ? "standalone-shell" : "app-shell"}>
      {!isStandalonePage && <Navbar />}

      <Routes>
        {/* ================= PUBLIC ROUTES ================= */}

        <Route path="/" element={<LandingPage />} />

        <Route path="/login" element={<LoginPage />} />

        <Route path="/register" element={<RegisterPage />} />

        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* ================= PROTECTED ROUTES ================= */}

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <TransactionsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/bills"
          element={
            <ProtectedRoute>
              <BillsRecurringPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/budgets"
          element={
            <ProtectedRoute>
              <BudgetPlannerPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/goals"
          element={
            <ProtectedRoute>
              <GoalsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* ================= ADDITIONAL FEATURES ================= */}

        <Route
          path="/insights"
          element={
            <ProtectedRoute>
              <InsightsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/predictive"
          element={
            <ProtectedRoute>
              <PredictiveFinancePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/wealth"
          element={
            <ProtectedRoute>
              <WealthPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/receipt-scanner"
          element={
            <ProtectedRoute>
              <ReceiptScannerPage />
            </ProtectedRoute>
          }
        />

        {/* ================= 404 ROUTE ================= */}

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
