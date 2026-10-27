import { create } from "zustand";
import api from "../services/api";

export const useBudgetStore = create((set, get) => ({
  // ============================================================
  // STATE
  // ============================================================

  budgets: [],
  progress: [],
  recommendations: [],
  predictions: [],

  loading: false,
  progressLoading: false,
  recommendationsLoading: false,
  predictionsLoading: false,

  error: null,
  progressError: null,
  recommendationError: null,
  predictionError: null,

  // ============================================================
  // FETCH ALL BUDGETS
  // ============================================================

  fetchBudgets: async () => {
    set({
      loading: true,
      error: null,
    });

    try {
      const { data } = await api.get("/budgets");

      set({
        budgets: Array.isArray(data) ? data : [],
        loading: false,
      });

      return data;
    } catch (err) {
      const message = err.response?.data?.detail || "Could not load budgets";

      set({
        budgets: [],
        error: message,
        loading: false,
      });

      throw err;
    }
  },

  // ============================================================
  // FETCH BUDGET PROGRESS
  // ============================================================

  fetchProgress: async (year, month) => {
    set({
      progressLoading: true,
      progressError: null,
    });

    try {
      const params = {};

      if (year !== undefined && year !== null) {
        params.year = year;
      }

      if (month !== undefined && month !== null) {
        params.month = month;
      }

      const { data } = await api.get("/budgets/progress", {
        params,
      });

      const progressData = Array.isArray(data) ? data : data?.budgets || [];

      set({
        progress: progressData,
        progressLoading: false,
      });

      return data;
    } catch (err) {
      const message =
        err.response?.data?.detail || "Could not load budget progress";

      set({
        progress: [],
        progressError: message,
        progressLoading: false,
      });

      throw err;
    }
  },

  // ============================================================
  // CREATE / UPDATE BUDGET FOR A SPECIFIC MONTH
  // ============================================================

  createBudget: async (category, monthly_limit, budgetMonth) => {
    // budgetMonth should be a YYYY-MM string, e.g. "2026-10".
    if (!budgetMonth || !/^\d{4}-\d{2}$/.test(budgetMonth)) {
      throw new Error("Please select a valid budget month.");
    }

    const [year, month] = budgetMonth.split("-").map(Number);

    if (month < 1 || month > 12) {
      throw new Error("Please select a valid budget month.");
    }

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      throw new Error("You cannot create a budget for a past month.");
    }

    const normalizedCategory = category.trim();

    if (!normalizedCategory || Number(monthly_limit) <= 0) {
      throw new Error("Enter a valid category and positive budget limit.");
    }

    // Store the first day of the selected month.
    const budgetMonthDate = `${budgetMonth}-01`;

    try {
      const { data } = await api.post("/budgets", {
        category: normalizedCategory,
        monthly_limit: Number(monthly_limit),
        budget_month: budgetMonthDate,
      });

      set((state) => {
        const existingIndex = state.budgets.findIndex(
          (budget) =>
            budget.category?.toLowerCase() ===
              normalizedCategory.toLowerCase() &&
            budget.budget_month === budgetMonthDate,
        );

        if (existingIndex !== -1) {
          const updatedBudgets = [...state.budgets];
          updatedBudgets[existingIndex] = data;

          return {
            budgets: updatedBudgets,
            error: null,
          };
        }

        return {
          budgets: [...state.budgets, data],
          error: null,
        };
      });

      return data;
    } catch (err) {
      const message =
        err.response?.data?.detail || err.message || "Could not create budget";

      set({ error: message });
      throw err;
    }
  },

  // ============================================================
  // DELETE BUDGET
  // ============================================================

  deleteBudget: async (budgetId) => {
    set({
      loading: true,
      error: null,
    });

    try {
      await api.delete(`/budgets/${budgetId}`);

      set((state) => ({
        budgets: state.budgets.filter((budget) => budget.id !== budgetId),

        progress: state.progress.filter(
          (item) => item.budget_id !== budgetId && item.id !== budgetId,
        ),

        loading: false,
      }));

      return true;
    } catch (err) {
      const message = err.response?.data?.detail || "Could not delete budget";

      set({
        error: message,
        loading: false,
      });

      throw err;
    }
  },

  // ============================================================
  // AI BUDGET RECOMMENDATIONS
  //
  // Backend calculation:
  //
  // Income
  //    ↓
  // Current Expenses
  //    ↓
  // Available Amount
  //    ↓
  // Historical Spending
  //    ↓
  // Recommended Category Budgets
  //    ↓
  // Remaining Amount → Savings
  // ============================================================

  fetchRecommendations: async (months = 3) => {
    set({
      recommendationsLoading: true,
      recommendationError: null,
    });

    try {
      const { data } = await api.get("/budgets/ai-recommendation", {
        params: {
          months: Number(months),
        },
      });

      const recommendations = data?.recommendations || [];

      set({
        recommendations: Array.isArray(recommendations) ? recommendations : [],
        recommendationsLoading: false,
        recommendationError: null,
      });

      return data;
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        "Could not generate budget recommendations";

      set({
        recommendations: [],
        recommendationError: message,
        recommendationsLoading: false,
      });

      throw err;
    }
  },

  // ============================================================
  // CLEAR RECOMMENDATIONS
  // ============================================================

  clearRecommendations: () => {
    set({
      recommendations: [],
      recommendationError: null,
    });
  },

  // ============================================================
  // OVERSPENDING PREDICTION
  // ============================================================

  fetchPredictions: async (year, month) => {
    set({
      predictionsLoading: true,
      predictionError: null,
    });

    try {
      const params = {};

      if (year !== undefined && year !== null) {
        params.year = year;
      }

      if (month !== undefined && month !== null) {
        params.month = month;
      }

      const { data } = await api.get("/budgets/overspending-prediction", {
        params,
      });

      const predictions = data?.predictions || [];

      set({
        predictions: Array.isArray(predictions) ? predictions : [],
        predictionsLoading: false,
        predictionError: null,
      });

      return data;
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        "Could not generate overspending prediction";

      set({
        predictions: [],
        predictionError: message,
        predictionsLoading: false,
      });

      throw err;
    }
  },

  // ============================================================
  // CLEAR PREDICTIONS
  // ============================================================

  clearPredictions: () => {
    set({
      predictions: [],
      predictionError: null,
    });
  },

  // ============================================================
  // REFRESH ALL BUDGET DATA
  //
  // Useful after creating/deleting a budget.
  // ============================================================

  refreshBudgets: async () => {
    try {
      await Promise.all([
        get().fetchBudgets(),
        get().fetchProgress(),
        get().fetchPredictions(),
      ]);

      return true;
    } catch (err) {
      throw err;
    }
  },

  // ============================================================
  // RESET BUDGET STORE
  // ============================================================

  resetBudgetStore: () => {
    set({
      budgets: [],
      progress: [],
      recommendations: [],
      predictions: [],

      loading: false,
      progressLoading: false,
      recommendationsLoading: false,
      predictionsLoading: false,

      error: null,
      progressError: null,
      recommendationError: null,
      predictionError: null,
    });
  },
}));
