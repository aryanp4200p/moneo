export default function BudgetProgressBar({ item }) {
  const pct = Math.min(item.percent_used, 100);
  const isOver = item.is_over_budget;
  const isWarning = !isOver && item.percent_used >= 80;

  const barColor = isOver
    ? "var(--color-alert)"
    : isWarning
    ? "#F59E0B"
    : "var(--color-accent)";

  const badgeClass = isOver
    ? "pill-alert"
    : isWarning
    ? "pill"
    : "pill-accent";

  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
          fontSize: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <strong>{item.category}</strong>
          <span
            className={`pill ${badgeClass}`}
            style={{
              fontSize: 11,
              padding: "2px 8px",
              backgroundColor: isWarning ? "#FEF3C7" : undefined,
              color: isWarning ? "#D97706" : undefined,
            }}
          >
            {item.percent_used}%
          </span>
        </div>
        <span style={{ color: "var(--color-ink-muted)", fontSize: 13 }}>
          ₹{item.spent.toLocaleString("en-IN")} / ₹
          {item.monthly_limit.toLocaleString("en-IN")}
        </span>
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 999,
          background: "var(--color-line)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: barColor,
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 12,
          display: "flex",
          justifyContent: "space-between",
          color: isOver
            ? "var(--color-alert)"
            : isWarning
            ? "#D97706"
            : "var(--color-ink-muted)",
        }}
      >
        <span>
          {isOver
            ? `Over budget by ₹${Math.abs(item.remaining).toLocaleString("en-IN")}`
            : `₹${item.remaining.toLocaleString("en-IN")} remaining`}
        </span>
        {isWarning && !isOver && <span>Nearing limit</span>}
      </div>
    </div>
  );
}
