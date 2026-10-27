
import { useEffect, useState } from "react";
import api from "../services/api";

function scoreColor(score) {
  if (score >= 70) return "var(--color-accent)";
  if (score >= 40) return "#F59E0B";
  return "var(--color-alert)";
}

export default function FinancialHealthScore() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get("/advisor/health-score"),
      api.get("/advisor/health-score/history"),
    ])
      .then(([scoreRes, historyRes]) => {
        if (!cancelled) {
          setData(scoreRes.data);
          setHistory(historyRes.data.history);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load financial health score");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div className="card">Calculating score…</div>;
  if (error)
    return (
      <div className="card">
        <p style={{ color: "var(--color-alert)" }}>{error}</p>
      </div>
    );
  if (!data) return null;

  const color = scoreColor(data.score);

  return (
    <div className="card">
      <h3 style={{ marginBottom: 4 }}>Financial health score</h3>
      <p
        style={{
          color: "var(--color-ink-muted)",
          fontSize: 13,
          marginBottom: 20,
        }}
      >
        Rule-based score out of 100 — savings rate, budget adherence, and
        spending consistency.
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            position: "relative",
            width: 84,
            height: 84,
            flexShrink: 0,
          }}
        >
          <svg
            width="84"
            height="84"
            viewBox="0 0 84 84"
            style={{ transform: "rotate(-90deg)" }}
          >
            <circle
              cx="42"
              cy="42"
              r="36"
              fill="none"
              stroke="var(--color-line)"
              strokeWidth="8"
            />
            <circle
              cx="42"
              cy="42"
              r="36"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 36}
              strokeDashoffset={
                2 * Math.PI * 36 * (1 - Math.min(data.score, 100) / 100)
              }
              style={{ transition: "stroke-dashoffset 0.4s ease" }}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 22,
              fontWeight: 700,
              color,
            }}
          >
            {data.score}
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 600 }}>
            {data.month_label} {data.year}
          </div>
          {history.length > 1 && (
            <div
              style={{
                fontSize: 12,
                color: "var(--color-ink-muted)",
                marginTop: 4,
              }}
            >
              {history.map((h) => h.score).join(" → ")} (last {history.length}{" "}
              months)
            </div>
          )}
        </div>
      </div>

      {Object.entries(data.breakdown).map(([key, item]) => (
        <div key={key} style={{ marginBottom: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              marginBottom: 4,
            }}
          >
            <span style={{ textTransform: "capitalize" }}>
              {key.replace(/_/g, " ")}
            </span>
            <span style={{ color: "var(--color-ink-muted)" }}>
              {item.score}/{item.max}
            </span>
          </div>
          <div
            style={{
              height: 6,
              borderRadius: 999,
              background: "var(--color-line)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(item.score / item.max) * 100}%`,
                background: "var(--color-ink)",
              }}
            />
          </div>
          <p
            style={{
              fontSize: 12,
              color: "var(--color-ink-muted)",
              margin: "4px 0 0",
            }}
          >
            {item.note}
          </p>
        </div>
      ))}
    </div>
  );
}
