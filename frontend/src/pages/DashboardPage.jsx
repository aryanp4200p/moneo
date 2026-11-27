import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useTransactionStore } from "../store/transactionStore";
import { useBudgetStore } from "../store/budgetStore";
import api from "../services/api";

import CategoryPieChart from "../components/CategoryPieChart";
import SpendingTrendChart from "../components/SpendingTrendChart";
import AIAdviceCard from "../components/AIAdviceCard";

export default function DashboardPage() {
  // ============================================================
  // TRANSACTION STORE
  // ============================================================

  const fetchTransactions = useTransactionStore(
    (state) => state.fetchTransactions,
  );

  const transactions = useTransactionStore((state) => state.transactions);

  // BUDGET STORE
  const budgetProgress = useBudgetStore((state) => state.progress);
  const fetchBudgets = useBudgetStore((state) => state.fetchBudgets);
  const fetchBudgetProgress = useBudgetStore((state) => state.fetchProgress);

  // ============================================================
  // FINANCIAL HEALTH STATE
  // ============================================================

  const [healthScore, setHealthScore] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState("");

  // ============================================================
  // DASHBOARD MONTH FILTER
  // ============================================================

  const now = new Date();

  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const monthOptions = useMemo(() => {
    const options = [];
    const currentDate = new Date();

    // Current month + previous 12 months.
    // Future months are intentionally excluded.
    for (let i = 0; i <= 12; i += 1) {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1,
      );

      options.push({
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        label: date.toLocaleDateString("en-IN", {
          month: "long",
          year: "numeric",
        }),
      });
    }

    return options;
  }, []);

  const selectedMonthLabel = useMemo(() => {
    const selectedOption = monthOptions.find(
      (option) =>
        option.month === selectedMonth && option.year === selectedYear,
    );

    return selectedOption?.label || "Selected Month";
  }, [monthOptions, selectedMonth, selectedYear]);

  // ============================================================
  // LOAD DATA
  // ============================================================

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  useEffect(() => {
    fetchBudgetProgress(selectedYear, selectedMonth);
  }, [fetchBudgetProgress, selectedYear, selectedMonth]);

  useEffect(() => {
    const fetchHealthScore = async () => {
      setHealthLoading(true);
      setHealthError("");

      try {
        const { data } = await api.get("/health-score");

        setHealthScore(data);
      } catch (err) {
        setHealthError(
          err.response?.data?.detail || "Could not load financial health score",
        );
      } finally {
        setHealthLoading(false);
      }
    };

    fetchHealthScore();
  }, []);

  // ============================================================
  // SELECTED MONTH TRANSACTIONS
  // ============================================================

  const selectedMonthTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      if (!transaction.date) return false;

      const dateText = String(transaction.date).slice(0, 10);
      const [year, month] = dateText.split("-").map(Number);

      return year === selectedYear && month === selectedMonth;
    });
  }, [transactions, selectedMonth, selectedYear]);

  // ============================================================
  // SUMMARY
  // ============================================================

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;

    selectedMonthTransactions.forEach((transaction) => {
      const amount = Number(transaction.amount || 0);

      if (transaction.type === "income") {
        income += amount;
      } else if (transaction.type === "expense") {
        expense += amount;
      }
    });

    return {
      income,
      expense,
      remaining: income - expense,
      count: selectedMonthTransactions.length,
    };
  }, [selectedMonthTransactions]);

  // ============================================================
  // RECENT TRANSACTIONS
  // ============================================================

  const recentTransactions = useMemo(() => {
    return [...selectedMonthTransactions]
      .sort((a, b) => {
        const dateDiff = new Date(b.date) - new Date(a.date);
        if (dateDiff !== 0) return dateDiff;
        return Number(b.id || 0) - Number(a.id || 0);
      })
      .slice(0, 8);
  }, [selectedMonthTransactions]);

  // ============================================================
  // CATEGORY TOTALS
  // ============================================================

  const categoryTotals = useMemo(() => {
    const totals = {};

    selectedMonthTransactions
      .filter(
        (transaction) => transaction.type === "expense" && transaction.category,
      )
      .forEach((transaction) => {
        const category = transaction.category;

        totals[category] =
          (totals[category] || 0) + Number(transaction.amount || 0);
      });

    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [selectedMonthTransactions]);

  // The backend progress endpoint returns category, monthly_limit,
  // spent, remaining, percent_used, is_over_budget, and budget_id.
  const budgetOverview = useMemo(() => {
    return (Array.isArray(budgetProgress) ? budgetProgress : []).map((item) => {
      const limit = Number(item.monthly_limit || 0);
      const spent = Number(item.spent || 0);
      return {
        ...item,
        monthly_limit: limit,
        spent,
        remaining: Number(item.remaining ?? limit - spent),
        percentUsed: limit > 0 ? Math.round((spent / limit) * 100) : 0,
        isOverBudget: Boolean(item.is_over_budget ?? spent > limit),
      };
    });
  }, [budgetProgress]);

  const totalBudgetLimit = useMemo(
    () => budgetOverview.reduce((total, item) => total + item.monthly_limit, 0),
    [budgetOverview],
  );

  // ============================================================
  // FORMATTERS
  // ============================================================

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  // ============================================================
  // CATEGORY ICONS
  // ============================================================

  const categoryIcons = {
    Food: "🍔",
    Shopping: "🛍️",
    Transport: "🚗",
    Travel: "✈️",
    Entertainment: "🎬",
    Movies: "🎬",
    Utilities: "💡",
    Bills: "📱",
    Healthcare: "🏥",
    Health: "🏥",
    Education: "🎓",
    Cash: "💵",
    Investment: "📈",
    Groceries: "🛒",
    Income: "💰",
  };

  // ============================================================
  // HEALTH SCORE HELPERS
  // ============================================================

  const getHealthRating = (score) => {
    if (score >= 80) {
      return {
        label: "Excellent",
        message: "Your financial habits are looking very strong.",
      };
    }

    if (score >= 60) {
      return {
        label: "Good",
        message:
          "Your finances are generally healthy, with some room for improvement.",
      };
    }

    if (score >= 40) {
      return {
        label: "Fair",
        message:
          "Your finances are on the right track, but some areas need attention.",
      };
    }

    return {
      label: "Needs Attention",
      message:
        "There are some financial areas that you should focus on improving.",
    };
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <main className="fin-dashboard">
      {/* ========================================================
          HEADER
      ======================================================== */}

      <section className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">FINANCIAL OVERVIEW</p>

          <h1>Welcome back! 👋</h1>

          <p className="dashboard-subtitle">
            Here's your financial overview for this month.
          </p>
        </div>

        <div className="dashboard-date">
          📅{" "}
          <select
            className="dashboard-month-select"
            value={`${selectedYear}-${selectedMonth}`}
            onChange={(event) => {
              const [year, month] = event.target.value.split("-").map(Number);
              setSelectedYear(year);
              setSelectedMonth(month);
            }}
            aria-label="Select dashboard month"
          >
            {monthOptions.map((option) => (
              <option
                key={`${option.year}-${option.month}`}
                value={`${option.year}-${option.month}`}
                style={{
                  backgroundColor: "#ffffff",
                  color: "#111827",
                }}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* ========================================================
          SUMMARY CARDS
      ======================================================== */}

      <section className="finance-summary-grid">
        <div className="finance-stat-card balance">
          <div className="stat-icon">💰</div>

          <div>
            <span>Total Balance</span>
            <strong>{formatCurrency(summary.remaining)}</strong>
          </div>

          <div className="stat-chart">╱╲╱╲</div>
        </div>

        <div className="finance-stat-card income">
          <div className="stat-icon">↗</div>

          <div>
            <span>Monthly Income</span>
            <strong>{formatCurrency(summary.income)}</strong>
          </div>
        </div>

        <div className="finance-stat-card expense">
          <div className="stat-icon">↘</div>

          <div>
            <span>Monthly Spent</span>
            <strong>{formatCurrency(summary.expense)}</strong>
          </div>
        </div>

        <div className="finance-stat-card remaining">
          <div className="stat-icon">✦</div>

          <div>
            <span>Remaining Amount</span>
            <strong>{formatCurrency(summary.remaining)}</strong>
          </div>
        </div>
      </section>

      {/* ========================================================
          FINANCIAL HEALTH SCORE
      ======================================================== */}

      <section
        className="dashboard-panel"
        style={{
          marginTop: 20,
          marginBottom: 24,
        }}
      >
        <div className="panel-heading">
          <div>
            <h3>Financial Health Score</h3>
            <p>
              A 0–100 score based on your savings, budget adherence, and
              spending consistency.
            </p>
          </div>

          <span className="panel-select">
            {healthScore?.month_label || "This Month"}
          </span>
        </div>

        {healthLoading ? (
          <div
            style={{
              padding: "30px 10px",
              textAlign: "center",
              color: "var(--color-ink-muted)",
            }}
          >
            Calculating your financial health...
          </div>
        ) : healthError ? (
          <div
            style={{
              padding: "14px",
              borderRadius: 10,
              background: "var(--color-alert-soft)",
              color: "var(--color-alert)",
              fontSize: 13,
            }}
          >
            {healthError}
          </div>
        ) : healthScore ? (
          <div
            className="dashboard-health-layout"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(180px, 0.8fr) minmax(280px, 1.5fr)",
              gap: 24,
              alignItems: "center",
            }}
          >
            {/* SCORE */}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 170,
                  height: 170,
                  borderRadius: "50%",
                  border: "10px solid var(--color-accent-soft)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--color-surface)",
                }}
              >
                <strong
                  style={{
                    fontSize: 48,
                    lineHeight: 1,
                    color: "var(--color-accent)",
                  }}
                >
                  {healthScore.score}
                </strong>

                <span
                  style={{
                    fontSize: 13,
                    color: "var(--color-ink-muted)",
                    marginTop: 5,
                  }}
                >
                  / 100
                </span>

                <strong
                  style={{
                    marginTop: 8,
                    fontSize: 14,
                  }}
                >
                  {getHealthRating(healthScore.score).label}
                </strong>
              </div>
            </div>

            {/* BREAKDOWN */}

            <div>
              <div
                style={{
                  marginBottom: 16,
                }}
              >
                <strong
                  style={{
                    fontSize: 16,
                  }}
                >
                  {getHealthRating(healthScore.score).message}
                </strong>
              </div>

              {/* SAVINGS */}

              <HealthScoreRow
                label="Savings Rate"
                score={healthScore.breakdown?.savings_rate?.score ?? 0}
                max={healthScore.breakdown?.savings_rate?.max ?? 40}
                note={healthScore.breakdown?.savings_rate?.note}
              />

              {/* BUDGET */}

              <HealthScoreRow
                label="Budget Adherence"
                score={healthScore.breakdown?.budget_adherence?.score ?? 0}
                max={healthScore.breakdown?.budget_adherence?.max ?? 30}
                note={healthScore.breakdown?.budget_adherence?.note}
              />

              {/* CONSISTENCY */}

              <HealthScoreRow
                label="Spending Consistency"
                score={healthScore.breakdown?.consistency?.score ?? 0}
                max={healthScore.breakdown?.consistency?.max ?? 30}
                note={healthScore.breakdown?.consistency?.note}
              />
            </div>
          </div>
        ) : null}
      </section>

      {/* ========================================================
          MAIN DASHBOARD
      ======================================================== */}

      <section className="dashboard-main-grid">
        {/* LEFT / CENTER */}

        <div className="dashboard-content">
          {/* ====================================================
              CHARTS
          ==================================================== */}

          <div className="dashboard-two-column">
            <div className="dashboard-panel">
              <div className="panel-heading">
                <div>
                  <h3>Spending Breakdown</h3>
                  <p>Where your money is going</p>
                </div>

                <span className="panel-select">{selectedMonthLabel}</span>
              </div>

              <CategoryPieChart
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
              />
            </div>

            {/* BUDGET OVERVIEW */}

            <div className="dashboard-panel">
              <div className="panel-heading">
                <div>
                  <h3>Budget Overview</h3>
                  <p>Saved category limits for {selectedMonthLabel}</p>
                </div>
                <Link to="/budgets" className="ai-budget-button">
                  ✨ Manage Budgets
                </Link>
              </div>

              <div className="budget-empty-state">
                <div className="budget-remaining">
                  <span>Total monthly budget</span>
                  <strong>{formatCurrency(totalBudgetLimit)}</strong>
                </div>

                {budgetOverview.length > 0 ? (
                  budgetOverview.map((item) => {
                    const category = item.category || "Uncategorized";
                    const percentage = item.percentUsed;
                    const overBudget = item.isOverBudget;

                    return (
                      <div
                        className="mini-budget-row"
                        key={item.budget_id ?? category}
                      >
                        <div className="mini-budget-label">
                          <span>
                            {categoryIcons[category] || "💳"} {category}
                          </span>
                          <strong>
                            {formatCurrency(item.spent)} /{" "}
                            {formatCurrency(item.monthly_limit)}
                          </strong>
                        </div>

                        <div
                          className="mini-progress"
                          role="progressbar"
                          aria-label={`${category} budget used`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.min(100, percentage)}
                        >
                          <div
                            style={{
                              width: `${Math.min(100, percentage)}%`,
                              background: overBudget ? "#ef4444" : undefined,
                            }}
                          />
                        </div>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 8,
                            marginTop: 5,
                            fontSize: 12,
                            color: overBudget
                              ? "var(--color-alert, #dc2626)"
                              : "var(--color-ink-muted)",
                          }}
                        >
                          <span>
                            {overBudget
                              ? `Over budget by ${formatCurrency(item.spent - item.monthly_limit)}`
                              : `${formatCurrency(Math.max(0, item.monthly_limit - item.spent))} remaining`}
                          </span>
                          <strong>{percentage}% used</strong>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="budget-placeholder">
                    <div>✨</div>
                    <strong>Create your first budget</strong>
                    <p>
                      Set a monthly spending limit for each category. Your
                      actual spending will be compared with those saved limits.
                    </p>
                    <Link to="/budgets" className="primary-dashboard-button">
                      Create Budget
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ====================================================
              RECENT TRANSACTIONS + TREND
          ==================================================== */}

          <div className="dashboard-two-column bottom-grid">
            {/* RECENT TRANSACTIONS */}

            <div className="dashboard-panel" style={{ minWidth: 0 }}>
              <div className="panel-heading">
                <div>
                  <h3>Recent Transactions</h3>
                  <p>Your latest financial activity</p>
                </div>

                <Link to="/transactions" className="view-all-link">
                  View All →
                </Link>
              </div>

              {recentTransactions.length === 0 ? (
                <div className="empty-dashboard">No transactions yet.</div>
              ) : (
                <div className="recent-transactions">
                  {recentTransactions.map((transaction) => {
                    const category = transaction.category || "Uncategorized";
                    const title =
                      transaction.merchant?.trim() ||
                      transaction.note?.trim() ||
                      category;
                    const subtitle =
                      title.toLowerCase() === category.toLowerCase()
                        ? transaction.type === "income"
                          ? "Income"
                          : "Expense"
                        : category;

                    return (
                      <div
                        className="recent-transaction"
                        key={transaction.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          minWidth: 0,
                        }}
                      >
                        <div
                          className="transaction-date"
                          style={{
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatDate(transaction.date)}
                        </div>

                        <div
                          className="transaction-description"
                          style={{
                            flex: 1,
                            minWidth: 0,
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            className="transaction-icon"
                            style={{ flexShrink: 0 }}
                          >
                            {categoryIcons[transaction.category] || "💳"}
                          </div>

                          <div
                            style={{
                              flex: 1,
                              minWidth: 0,
                              overflow: "hidden",
                            }}
                          >
                            <strong
                              title={title}
                              style={{
                                display: "block",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {title}
                            </strong>

                            <span
                              style={{
                                display: "block",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {subtitle}
                            </span>
                          </div>
                        </div>

                        <div
                          className={`transaction-amount ${
                            transaction.type === "income"
                              ? "positive"
                              : "negative"
                          }`}
                          style={{
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                            marginLeft: "auto",
                            paddingLeft: 8,
                            textAlign: "right",
                          }}
                        >
                          {transaction.type === "income" ? "+" : "-"}
                          {formatCurrency(transaction.amount)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SPENDING TREND */}

            <div className="dashboard-panel" style={{ minWidth: 0 }}>
              <div className="panel-heading">
                <div>
                  <h3>Spending Trend</h3>
                  <p>Your monthly spending pattern</p>
                </div>
              </div>

              <SpendingTrendChart
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
              />

              <div className="trend-summary">
                <div>
                  <span>Income</span>
                  <strong>{formatCurrency(summary.income)}</strong>
                </div>

                <div>
                  <span>Expenses</span>
                  <strong>{formatCurrency(summary.expense)}</strong>
                </div>

                <div>
                  <span>Savings</span>
                  <strong>{formatCurrency(summary.remaining)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            AI ADVISOR
        ======================================================== */}

        <aside className="dashboard-ai-panel">
          <div className="ai-panel-header">
            <div className="ai-avatar">🤖</div>

            <div>
              <h3>AI Advisor</h3>
              <p>Your Personal Finance Guide</p>
            </div>
          </div>

          <AIAdviceCard />
        </aside>
      </section>

      {/* ========================================================
          BOTTOM CTA
      ======================================================== */}

      <section className="dashboard-cta">
        <div>
          <span className="cta-icon">🌱</span>

          <div>
            <h3>Smarter Money. Brighter Future.</h3>

            <p>
              Let AI help you make better financial decisions, one step at a
              time.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

// ============================================================
// HEALTH SCORE ROW
// ============================================================

function HealthScoreRow({ label, score, max, note }) {
  const percentage =
    max > 0 ? Math.min(100, Math.round((score / max) * 100)) : 0;

  return (
    <div
      style={{
        marginBottom: 15,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          marginBottom: 6,
        }}
      >
        <strong
          style={{
            fontSize: 13,
          }}
        >
          {label}
        </strong>

        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--color-accent)",
          }}
        >
          {score}/{max}
        </span>
      </div>

      <div
        style={{
          height: 7,
          width: "100%",
          borderRadius: 999,
          background: "var(--color-accent-soft)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percentage}%`,
            borderRadius: 999,
            background: "var(--color-accent)",
            transition: "width 0.4s ease",
          }}
        />
      </div>

      {note && (
        <p
          style={{
            margin: "5px 0 0",
            fontSize: 11,
            lineHeight: 1.4,
            color: "var(--color-ink-muted)",
          }}
        >
          {note}
        </p>
      )}
    </div>
  );
}
