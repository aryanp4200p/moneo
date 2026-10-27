import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, RefreshCw } from "lucide-react";
import api from "../services/api";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

export default function InsightsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/analytics/insights");

      setData(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Could not load financial insights.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const iconFor = (severity) => {
    if (severity === "warning" || severity === "critical") {
      return <AlertTriangle size={19} />;
    }

    if (severity === "positive") {
      return <CheckCircle2 size={19} />;
    }

    return <Info size={19} />;
  };

  if (loading) {
    return (
      <main className="page-shell">
        <div className="card">Analyzing your finances...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-shell">
        <div
          className="card"
          style={{
            color: "var(--color-alert)",
          }}
        >
          {error}

          <br />

          <button
            className="btn btn-primary"
            onClick={load}
            style={{
              marginTop: 14,
            }}
          >
            <RefreshCw size={15} />
            Retry
          </button>
        </div>
      </main>
    );
  }

  const maxCategory = Math.max(
    ...data.category_breakdown.map((item) => item.amount),
    1,
  );

  return (
    <main
      className="page-shell"
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "32px 24px 70px",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          gap: 20,
          marginBottom: 24,
        }}
      >
        <div>
          <p className="dashboard-eyebrow">SMART ANALYSIS</p>

          <h1
            style={{
              marginBottom: 8,
            }}
          >
            Financial Insights
          </h1>

          <p className="dashboard-subtitle">
            Understand what changed and where your money is going.
          </p>
        </div>

        <button className="btn btn-ghost" onClick={load}>
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {/* SUMMARY */}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <div className="card">
          <span className="stat-label">Income</span>

          <strong
            style={{
              fontSize: 22,
            }}
          >
            {money(data.total_income)}
          </strong>
        </div>

        <div className="card">
          <span className="stat-label">Expenses</span>

          <strong
            style={{
              fontSize: 22,
            }}
          >
            {money(data.total_expense)}
          </strong>
        </div>

        <div className="card">
          <span className="stat-label">Savings</span>

          <strong
            style={{
              fontSize: 22,
            }}
          >
            {money(data.savings)}
          </strong>
        </div>

        <div className="card">
          <span className="stat-label">Savings rate</span>

          <strong
            style={{
              fontSize: 22,
            }}
          >
            {data.savings_rate.toFixed(1)}%
          </strong>
        </div>
      </section>

      {/* CONTENT */}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1.15fr .85fr",
          gap: 20,
        }}
      >
        {/* INSIGHTS */}

        <div className="card">
          <h2
            style={{
              marginTop: 0,
            }}
          >
            Personalized insights
          </h2>

          <div
            style={{
              display: "grid",
              gap: 12,
            }}
          >
            {data.insights.map((item, index) => (
              <div
                key={`${item.title}-${index}`}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: 14,
                  borderRadius: 12,
                  border: "1px solid var(--color-line)",
                  background: "var(--color-bg)",
                }}
              >
                <span
                  style={{
                    color:
                      item.severity === "positive"
                        ? "var(--color-accent)"
                        : item.severity === "warning"
                          ? "var(--color-alert)"
                          : "#60a5fa",
                    paddingTop: 2,
                  }}
                >
                  {iconFor(item.severity)}
                </span>

                <div
                  style={{
                    minWidth: 0,
                  }}
                >
                  <strong>{item.title}</strong>

                  <p
                    style={{
                      margin: "5px 0 0",
                      color: "var(--color-ink-muted)",
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    {item.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CATEGORY BREAKDOWN */}

        <div className="card">
          <h2
            style={{
              marginTop: 0,
            }}
          >
            Spending by category
          </h2>

          {data.category_breakdown.length === 0 ? (
            <p
              style={{
                color: "var(--color-ink-muted)",
              }}
            >
              No expenses recorded for this month.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 14,
              }}
            >
              {data.category_breakdown.map((item) => (
                <div key={item.category}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      marginBottom: 6,
                    }}
                  >
                    <span>{item.category}</span>

                    <strong>{money(item.amount)}</strong>
                  </div>

                  <div
                    style={{
                      height: 8,
                      background: "var(--color-line)",
                      borderRadius: 99,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${(item.amount / maxCategory) * 100}%`,
                        background: "var(--color-accent)",
                        borderRadius: 99,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
