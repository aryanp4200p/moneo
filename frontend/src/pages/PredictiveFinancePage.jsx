import { useEffect, useMemo, useState } from "react";
import { TrendingUp, Brain, RefreshCw, Info } from "lucide-react";
import api from "../services/api";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

export default function PredictiveFinancePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/analytics/predictive", {
        params: {
          months: 6,
        },
      });

      setData(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Could not load the spending forecast.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const max = useMemo(() => {
    if (!data) return 1;

    return Math.max(
      ...data.historical.map((item) => item.amount),
      data.forecast.amount,
      1,
    );
  }, [data]);

  if (loading) {
    return (
      <main className="page-shell">
        <div className="card">Calculating your forecast...</div>
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
          marginBottom: 24,
        }}
      >
        <p className="dashboard-eyebrow">DATA-DRIVEN PLANNING</p>

        <h1
          style={{
            marginBottom: 8,
          }}
        >
          Predictive Finance
        </h1>

        <p className="dashboard-subtitle">
          Estimate next month's spending from your recent financial history.
        </p>
      </div>

      {/* FORECAST */}

      <section
        className="card"
        style={{
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div
            className="stat-icon"
            style={{
              background: "var(--color-accent-soft)",
              color: "var(--color-accent)",
            }}
          >
            <Brain size={22} />
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 20,
              }}
            >
              Next-month spending forecast
            </h2>

            <p
              style={{
                margin: "4px 0 0",
                color: "var(--color-ink-muted)",
                fontSize: 13,
              }}
            >
              {data.method}
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
          }}
        >
          <div className="dashboard-stat-card">
            <span>Predicted spending</span>

            <strong>{money(data.forecast.amount)}</strong>
          </div>

          <div className="dashboard-stat-card">
            <span>Forecast quality</span>

            <strong>{data.confidence_label}</strong>
          </div>

          <div className="dashboard-stat-card">
            <span>Forecast month</span>

            <strong>{data.forecast.month}</strong>
          </div>
        </div>
      </section>

      {/* CHART */}

      <section className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 22,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
              }}
            >
              Historical spending
            </h2>

            <p
              style={{
                margin: "5px 0 0",
                color: "var(--color-ink-muted)",
                fontSize: 12,
              }}
            >
              Recent monthly expenses used by the forecast.
            </p>
          </div>

          <button className="btn btn-ghost" onClick={load}>
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${
              data.historical.length + 1
            }, minmax(70px, 1fr))`,
            gap: 14,
            alignItems: "end",
            minHeight: 300,
          }}
        >
          {data.historical.map((item) => (
            <div
              key={item.month}
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "end",
                height: 260,
                gap: 8,
              }}
            >
              <strong
                style={{
                  fontSize: 12,
                  textAlign: "center",
                }}
              >
                {money(item.amount)}
              </strong>

              <div
                style={{
                  height: `${Math.max(8, (item.amount / max) * 210)}px`,
                  borderRadius: "10px 10px 4px 4px",
                  background: "var(--color-accent)",
                  opacity: 0.82,
                }}
              />

              <span
                style={{
                  fontSize: 11,
                  textAlign: "center",
                  color: "var(--color-ink-muted)",
                }}
              >
                {item.month}
              </span>
            </div>
          ))}

          {/* FORECAST BAR */}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "end",
              height: 260,
              gap: 8,
            }}
          >
            <strong
              style={{
                fontSize: 12,
                textAlign: "center",
                color: "var(--color-accent)",
              }}
            >
              {money(data.forecast.amount)}
            </strong>

            <div
              style={{
                height: `${Math.max(8, (data.forecast.amount / max) * 210)}px`,
                borderRadius: "10px 10px 4px 4px",
                background:
                  "linear-gradient(180deg, var(--color-accent), #2563eb)",
                border: "2px dashed var(--color-accent)",
              }}
            />

            <span
              style={{
                fontSize: 11,
                textAlign: "center",
                color: "var(--color-accent)",
                fontWeight: 700,
              }}
            >
              Forecast
            </span>
          </div>
        </div>
      </section>

      {/* INFORMATION */}

      <div
        className="card"
        style={{
          marginTop: 20,
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          background: "var(--color-accent-soft)",
        }}
      >
        <Info
          size={18}
          style={{
            flexShrink: 0,
            color: "var(--color-accent)",
          }}
        />

        <div>
          <strong>How this works</strong>

          <p
            style={{
              margin: "5px 0 0",
              color: "var(--color-ink-muted)",
              fontSize: 13,
            }}
          >
            {data.note} This is an estimate, not a guarantee or investment
            prediction.
          </p>
        </div>
      </div>
    </main>
  );
}
