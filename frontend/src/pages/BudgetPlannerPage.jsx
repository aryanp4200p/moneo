import { useEffect, useMemo, useState } from "react";

import {
  PiggyBank,
  PlusCircle,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

import { useBudgetStore } from "../store/budgetStore";
import BudgetProgressBar from "../components/BudgetProgressBar";
import { useTransactionStore } from "../store/transactionStore";

// ============================================================
// COMMON CATEGORIES
// ============================================================

const COMMON_CATEGORIES = [
  "Food",
  "Shopping",
  "Travel",
  "Bills",
  "Health",
  "Movies",
  "Groceries",
  "Entertainment",
];

// ============================================================
// PAGE
// ============================================================

export default function BudgetPlannerPage() {
  // ============================================================
  // BUDGET STORE
  // ============================================================

  const budgets = useBudgetStore((s) => s.budgets);

  const progress = useBudgetStore((s) => s.progress);

  const recommendations = useBudgetStore((s) => s.recommendations);

  const predictions = useBudgetStore((s) => s.predictions);

  const fetchBudgets = useBudgetStore((s) => s.fetchBudgets);

  const fetchProgress = useBudgetStore((s) => s.fetchProgress);

  const createBudget = useBudgetStore((s) => s.createBudget);

  const deleteBudget = useBudgetStore((s) => s.deleteBudget);

  const fetchRecommendations = useBudgetStore((s) => s.fetchRecommendations);

  const fetchPredictions = useBudgetStore((s) => s.fetchPredictions);

  const recommendationsLoading = useBudgetStore(
    (s) => s.recommendationsLoading,
  );

  const predictionsLoading = useBudgetStore((s) => s.predictionsLoading);

  const recommendationError = useBudgetStore((s) => s.recommendationError);

  const predictionError = useBudgetStore((s) => s.predictionError);

  // ============================================================
  // TRANSACTION STORE
  // ============================================================

  const transactions = useTransactionStore((s) => s.transactions);

  const fetchTransactions = useTransactionStore((s) => s.fetchTransactions);

  // ============================================================
  // FORM STATE
  // ============================================================

  const [category, setCategory] = useState("");

  const [limit, setLimit] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const [recommendationMonths, setRecommendationMonths] = useState(3);

  // ============================================================
  // CURRENT MONTH SUMMARY
  // ============================================================

  const currentMonthSummary = useMemo(() => {
    const now = new Date();

    const currentYear = now.getFullYear();

    const currentMonth = now.getMonth() + 1;

    let income = 0;

    let expenses = 0;

    transactions.forEach((transaction) => {
      if (!transaction.date) {
        return;
      }

      const parts = String(transaction.date).split("-").map(Number);

      if (parts.length !== 3) {
        return;
      }

      const [year, month] = parts;

      if (year !== currentYear || month !== currentMonth) {
        return;
      }

      const amount = Number(transaction.amount || 0);

      if (transaction.type === "income") {
        income += amount;
      }

      if (transaction.type === "expense") {
        expenses += amount;
      }
    });

    return {
      income,
      expenses,
      remaining: Math.max(income - expenses, 0),
    };
  }, [transactions]);

  // ============================================================
  // LOAD DATA
  // ============================================================

  useEffect(() => {
    fetchBudgets();

    fetchProgress();

    fetchPredictions();

    fetchTransactions();
  }, [fetchBudgets, fetchProgress, fetchPredictions, fetchTransactions]);

  // ============================================================
  // CREATE BUDGET
  // ============================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!category.trim() || !limit || Number(limit) <= 0) {
      setErrorMessage(
        "Please enter a category name and a valid positive limit.",
      );

      return;
    }

    setSubmitting(true);

    setErrorMessage("");

    setSuccessMessage("");

    try {
      await createBudget(category.trim(), Number(limit), budgetMonth);

      await fetchProgress();
      await fetchPredictions();
      setCategory("");

      setLimit("");

      setSuccessMessage("Budget saved successfully!");

      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || "Failed to save budget.");
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // DELETE BUDGET
  // ============================================================

  const handleDelete = async (budgetId, categoryName) => {
    if (
      window.confirm(
        `Are you sure you want to delete the budget for "${categoryName}"?`,
      )
    ) {
      setErrorMessage("");

      try {
        await deleteBudget(budgetId);

        await fetchProgress();

        await fetchPredictions();
      } catch (err) {
        setErrorMessage("Failed to delete budget. Please try again.");
      }
    }
  };

  // ============================================================
  // GENERATE BUDGET RECOMMENDATIONS
  // ============================================================

  const handleGenerateRecommendations = async () => {
    setErrorMessage("");

    try {
      await fetchRecommendations(Number(recommendationMonths));
    } catch (err) {
      // Error is already stored
      // inside Zustand.
    }
  };

  // ============================================================
  // FORMAT MONEY
  // ============================================================

  const formatMoney = (value) => {
    const number = Number(value || 0);

    return `₹${number.toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    })}`;
  };

  // ============================================================
  // RECOMMENDATION HELPERS
  // ============================================================

  const getRecommendationCategory = (item) => {
    return item.category || item.name || item.expense_category || "Category";
  };

  const getRecommendationAmount = (item) => {
    return (
      item.recommended_budget ??
      item.recommended_monthly_budget ??
      item.monthly_limit ??
      item.amount ??
      item.recommended_amount ??
      0
    );
  };

  const getRecommendationReason = (item) => {
    return (
      item.reason ||
      item.explanation ||
      item.message ||
      "Based on your historical spending."
    );
  };

  // ============================================================
  // PREDICTION HELPERS
  // ============================================================

  const getPredictionCategory = (item) => {
    return item.category || item.name || "Category";
  };

  const getProjectedAmount = (item) => {
    return (
      item.projected_spending ??
      item.projected_monthly_spending ??
      item.projected ??
      item.predicted_spending ??
      0
    );
  };

  const getBudgetAmount = (item) => {
    return item.monthly_limit ?? item.budget ?? item.budget_limit ?? 0;
  };

  const getExpectedExcess = (item) => {
    const directValue =
      item.expected_excess ?? item.excess ?? item.amount_over_budget;

    if (directValue !== undefined) {
      return Number(directValue);
    }

    const projected = Number(getProjectedAmount(item));

    const budget = Number(getBudgetAmount(item));

    return Math.max(projected - budget, 0);
  };

  const isPredictionRisk = (item) => {
    if (item.will_overspend !== undefined) {
      return Boolean(item.will_overspend);
    }

    if (item.overspending_risk !== undefined) {
      return Boolean(item.overspending_risk);
    }

    if (item.risk) {
      return String(item.risk).toLowerCase() !== "low";
    }

    return getProjectedAmount(item) > getBudgetAmount(item);
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      className="container"
      style={{
        paddingTop: 32,
        paddingBottom: 60,
      }}
    >
      {/* ========================================================
          HEADER
      ======================================================== */}

      <h1 style={{ marginBottom: 24 }}>Budgets</h1>

      {/* ========================================================
          ERROR
      ======================================================== */}

      {errorMessage && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 20,
            padding: "10px 14px",
            borderRadius: 8,
            backgroundColor: "var(--color-alert-soft)",
            color: "var(--color-alert)",
            fontSize: 14,
          }}
        >
          <AlertCircle size={16} />

          <span>{errorMessage}</span>
        </div>
      )}

      {/* ========================================================
          SUCCESS
      ======================================================== */}

      {successMessage && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 20,
            padding: "10px 14px",
            borderRadius: 8,
            backgroundColor: "var(--color-accent-soft)",
            color: "var(--color-accent)",
            fontSize: 14,
          }}
        >
          <CheckCircle2 size={16} />

          <span>{successMessage}</span>
        </div>
      )}

      {/* ========================================================
          AI BUDGET GENERATOR
      ======================================================== */}

      <div
        className="card"
        style={{
          marginBottom: 24,
          border: "1px solid var(--color-line)",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 8,
          }}
        >
          <Sparkles
            size={20}
            style={{
              color: "var(--color-accent)",
            }}
          />

          <h3 style={{ margin: 0 }}>AI Budget Generator</h3>
        </div>

        <p
          style={{
            color: "var(--color-ink-muted)",
            fontSize: 13,
            marginBottom: 18,
          }}
        >
          Your budget is created from the amount remaining after this month's
          expenses, combined with your historical spending patterns.
        </p>

        {/* ======================================================
            FINANCIAL SUMMARY
        ====================================================== */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          {/* INCOME */}

          <div
            style={{
              padding: 14,
              borderRadius: 10,
              background: "var(--color-accent-soft)",
              border: "1px solid var(--color-line)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "var(--color-ink-muted)",
              }}
            >
              Monthly Income
            </div>

            <strong
              style={{
                display: "block",
                fontSize: 20,
                marginTop: 4,
              }}
            >
              {formatMoney(currentMonthSummary.income)}
            </strong>
          </div>

          {/* EXPENSE */}

          <div
            style={{
              padding: 14,
              borderRadius: 10,
              background: "var(--color-alert-soft)",
              border: "1px solid var(--color-line)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "var(--color-ink-muted)",
              }}
            >
              Current Expenses
            </div>

            <strong
              style={{
                display: "block",
                fontSize: 20,
                marginTop: 4,
              }}
            >
              {formatMoney(currentMonthSummary.expenses)}
            </strong>
          </div>

          {/* REMAINING */}

          <div
            style={{
              padding: 14,
              borderRadius: 10,
              background: "var(--color-accent-soft)",
              border: "1px solid var(--color-accent)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "var(--color-ink-muted)",
              }}
            >
              Available to Budget
            </div>

            <strong
              style={{
                display: "block",
                fontSize: 20,
                marginTop: 4,
                color: "var(--color-accent)",
              }}
            >
              {formatMoney(currentMonthSummary.remaining)}
            </strong>
          </div>
        </div>

        {/* ======================================================
            EXPLANATION
        ====================================================== */}

        <div
          style={{
            padding: 14,
            marginBottom: 18,
            borderRadius: 10,
            background: "var(--color-surface)",
            border: "1px solid var(--color-line)",
          }}
        >
          <strong
            style={{
              fontSize: 13,
            }}
          >
            How your budget is calculated
          </strong>

          <p
            style={{
              margin: "6px 0 0",
              color: "var(--color-ink-muted)",
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            Income − current expenses = amount available to budget. Your
            historical spending is then used to distribute that amount across
            categories. Any extra amount is assigned to Savings.
          </p>
        </div>

        {/* ======================================================
            CONTROLS
        ====================================================== */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <select
            className="input"
            value={recommendationMonths}
            onChange={(e) => setRecommendationMonths(Number(e.target.value))}
            style={{
              maxWidth: 180,
            }}
          >
            <option value={1}>Last 1 month</option>

            <option value={3}>Last 3 months</option>

            <option value={6}>Last 6 months</option>

            <option value={12}>Last 12 months</option>
          </select>

          <button
            type="button"
            className="btn btn-accent"
            onClick={handleGenerateRecommendations}
            disabled={
              recommendationsLoading || currentMonthSummary.remaining <= 0
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            {recommendationsLoading ? (
              <>
                <RefreshCw size={15} className="spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles size={15} />
                Generate AI Budget
              </>
            )}
          </button>
        </div>

        {/* NO MONEY WARNING */}

        {currentMonthSummary.remaining <= 0 && (
          <div
            style={{
              marginTop: 16,
              padding: "10px 12px",
              borderRadius: 8,
              background: "var(--color-alert-soft)",
              color: "var(--color-alert)",
              fontSize: 13,
            }}
          >
            You currently have no positive amount remaining after this month's
            expenses.
          </div>
        )}

        {/* ======================================================
            RECOMMENDATION ERROR
        ====================================================== */}

        {recommendationError && (
          <div
            style={{
              marginTop: 16,
              padding: "10px 12px",
              borderRadius: 8,
              background: "var(--color-alert-soft)",
              color: "var(--color-alert)",
              fontSize: 13,
            }}
          >
            {recommendationError}
          </div>
        )}

        {/* ======================================================
            RECOMMENDATION CARDS
        ====================================================== */}

        {recommendations.length > 0 && (
          <div
            style={{
              marginTop: 22,
            }}
          >
            {/* TOTAL */}

            <div
              style={{
                marginBottom: 16,
                padding: 14,
                borderRadius: 10,
                background: "var(--color-accent-soft)",
                border: "1px solid var(--color-line)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <strong>Budget created from your remaining amount</strong>

                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 12,
                      color: "var(--color-ink-muted)",
                    }}
                  >
                    Your recommended budgets are constrained by the amount
                    available after current expenses.
                  </p>
                </div>

                <strong
                  style={{
                    fontSize: 20,
                    color: "var(--color-accent)",
                  }}
                >
                  {formatMoney(
                    recommendations[0]?.available_to_budget ??
                      currentMonthSummary.remaining,
                  )}
                </strong>
              </div>
            </div>

            <h4
              style={{
                marginBottom: 12,
              }}
            >
              Recommended Budgets
            </h4>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                gap: 12,
              }}
            >
              {recommendations.map((item, index) => {
                const categoryName = getRecommendationCategory(item);

                const amount = getRecommendationAmount(item);

                const reason = getRecommendationReason(item);

                return (
                  <div
                    key={`${categoryName}-${index}`}
                    style={{
                      padding: 16,
                      borderRadius: 10,
                      border: "1px solid var(--color-line)",
                      background: "var(--color-surface)",
                    }}
                  >
                    {/* CATEGORY */}

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <strong>{categoryName}</strong>

                      <Sparkles
                        size={15}
                        style={{
                          color: "var(--color-accent)",
                        }}
                      />
                    </div>

                    {/* AMOUNT */}

                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        marginTop: 10,
                      }}
                    >
                      {formatMoney(amount)}
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--color-ink-muted)",
                        marginTop: 3,
                      }}
                    >
                      Recommended monthly budget
                    </div>

                    {/* ALLOCATION */}

                    {item.allocation_percent !== undefined && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--color-accent)",
                          marginTop: 6,
                          fontWeight: 600,
                        }}
                      >
                        {Number(item.allocation_percent).toFixed(1)}% of
                        available amount
                      </div>
                    )}

                    {/* REASON */}

                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--color-ink-muted)",
                        marginTop: 10,
                        marginBottom: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      {reason}
                    </p>

                    {/* USE */}

                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        setCategory(categoryName);

                        setLimit(String(Math.round(Number(amount))));

                        window.scrollTo({
                          top: 0,
                          behavior: "smooth",
                        });
                      }}
                      style={{
                        marginTop: 12,
                        fontSize: 12,
                      }}
                    >
                      Use this budget
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          OVERSPENDING PREDICTION
      ======================================================== */}

      <div
        className="card"
        style={{
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <TrendingUp
            size={19}
            style={{
              color: "var(--color-accent)",
            }}
          />

          <h3 style={{ margin: 0 }}>Overspending Prediction</h3>
        </div>

        <p
          style={{
            color: "var(--color-ink-muted)",
            fontSize: 13,
            marginBottom: 18,
          }}
        >
          Predicts your month-end spending based on your current spending rate.
        </p>

        {predictionError && (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              background: "var(--color-alert-soft)",
              color: "var(--color-alert)",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {predictionError}
          </div>
        )}

        {predictionsLoading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--color-ink-muted)",
              fontSize: 13,
            }}
          >
            <RefreshCw size={15} className="spin" />
            Analyzing your spending...
          </div>
        ) : predictions.length === 0 ? (
          <p
            style={{
              color: "var(--color-ink-muted)",
              margin: "20px 0",
              fontSize: 13,
            }}
          >
            No overspending prediction is available yet. Add budgets and
            categorized expenses to see predictions.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {predictions.map((item, index) => {
              const categoryName = getPredictionCategory(item);

              const projected = getProjectedAmount(item);

              const budget = getBudgetAmount(item);

              const excess = getExpectedExcess(item);

              const risk = isPredictionRisk(item);

              return (
                <div
                  key={`${categoryName}-${index}`}
                  style={{
                    padding: 16,
                    borderRadius: 10,
                    border: `1px solid ${
                      risk ? "var(--color-alert)" : "var(--color-line)"
                    }`,
                    background: risk
                      ? "var(--color-alert-soft)"
                      : "var(--color-surface)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <strong>{categoryName}</strong>

                    {risk ? (
                      <AlertTriangle
                        size={17}
                        style={{
                          color: "var(--color-alert)",
                        }}
                      />
                    ) : (
                      <CheckCircle2
                        size={17}
                        style={{
                          color: "var(--color-accent)",
                        }}
                      />
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      display: "grid",
                      gap: 7,
                      fontSize: 13,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          color: "var(--color-ink-muted)",
                        }}
                      >
                        Budget
                      </span>

                      <strong>{formatMoney(budget)}</strong>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          color: "var(--color-ink-muted)",
                        }}
                      >
                        Projected
                      </span>

                      <strong>{formatMoney(projected)}</strong>
                    </div>

                    {risk && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          color: "var(--color-alert)",
                        }}
                      >
                        <span>Expected excess</span>

                        <strong>{formatMoney(excess)}</strong>
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      color: risk
                        ? "var(--color-alert)"
                        : "var(--color-accent)",
                    }}
                  >
                    {risk
                      ? "⚠ Likely to exceed budget"
                      : "✓ Currently on track"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================
          MANUAL BUDGET + PROGRESS
      ======================================================== */}

      <div
        className="grid-2"
        style={{
          alignItems: "start",
        }}
      >
        {/* ======================================================
            MANUAL BUDGET
        ====================================================== */}

        <form className="card" onSubmit={handleSubmit}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <PlusCircle
              size={18}
              style={{
                color: "var(--color-accent)",
              }}
            />

            <h3 style={{ margin: 0 }}>Set a Monthly Budget</h3>
          </div>

          <div
            style={{
              marginBottom: 14,
            }}
          >
            <label className="label" htmlFor="category">
              Category
            </label>

            <input
              id="category"
              className="input"
              type="text"
              placeholder="e.g. Movies, Groceries"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            />

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginTop: 8,
              }}
            >
              {COMMON_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className="pill"
                  style={{
                    border: "1px solid var(--color-line)",
                    background:
                      category === cat
                        ? "var(--color-accent-soft)"
                        : "transparent",
                    color:
                      category === cat
                        ? "var(--color-accent)"
                        : "var(--color-ink-muted)",
                    cursor: "pointer",
                    fontSize: 11,
                    padding: "3px 8px",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              marginBottom: 18,
            }}
          >
            <label className="label" htmlFor="limit">
              Monthly Limit (₹)
            </label>

            <input
              id="limit"
              className="input"
              type="number"
              min="1"
              step="1"
              placeholder="e.g. 5000"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              required
            />
          </div>

          <button
            className="btn btn-accent"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Set budget"}
          </button>

          {budgets.length > 0 && (
            <p
              style={{
                marginTop: 16,
                fontSize: 12,
                color: "var(--color-ink-muted)",
              }}
            >
              {budgets.length} budget
              {budgets.length > 1 ? "s" : ""} active.
            </p>
          )}
        </form>

        {/* ======================================================
            PROGRESS
        ====================================================== */}

        <div className="card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <PiggyBank
              size={18}
              style={{
                color: "var(--color-accent)",
              }}
            />

            <h3 style={{ margin: 0 }}>This Month's Progress</h3>
          </div>

          <p
            style={{
              color: "var(--color-ink-muted)",
              fontSize: 13,
              marginBottom: 18,
            }}
          >
            Compares categorized spend so far this month against each limit.
          </p>

          {progress.length === 0 && (
            <p
              style={{
                color: "var(--color-ink-muted)",
                margin: "20px 0",
              }}
            >
              No budgets yet — set one to see progress here.
            </p>
          )}

          {progress.map((item) => (
            <div
              key={item.budget_id || item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "14px",
                paddingBottom: "10px",
                borderBottom: "1px solid var(--color-line)",
              }}
            >
              <div
                style={{
                  flex: 1,
                }}
              >
                <BudgetProgressBar item={item} />
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() =>
                  handleDelete(item.budget_id || item.id, item.category)
                }
                style={{
                  padding: "6px 8px",
                  fontSize: "12px",
                  color: "var(--color-alert)",
                  display: "inline-flex",
                  alignItems: "center",
                }}
                title="Delete budget"
                aria-label={`Delete budget for ${item.category}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
