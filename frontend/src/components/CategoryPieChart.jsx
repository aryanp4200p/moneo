import { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useTransactionStore } from "../store/transactionStore";
import { useThemeStore } from "../store/themeStore";

ChartJS.register(ArcElement, Tooltip, Legend);

const centerTotalPlugin = {
  id: "centerTotal",
  beforeDraw(chart) {
    const pluginOpts = chart.options.plugins.centerTotal;
    if (!pluginOpts) return;

    const { ctx, chartArea } = chart;
    const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
    const cx = (chartArea.left + chartArea.right) / 2;
    const cy = (chartArea.top + chartArea.bottom) / 2;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = "600 12px Inter, sans-serif";
    ctx.fillStyle = pluginOpts.mutedColor;
    ctx.fillText("Total spend", cx, cy - 14);

    ctx.font = "700 22px 'Space Grotesk', sans-serif";
    ctx.fillStyle = pluginOpts.inkColor;
    ctx.fillText(`₹${total.toLocaleString("en-IN")}`, cx, cy + 10);

    ctx.restore();
  },
};

const COLORS = [
  "#10B981",
  "#3B82F6",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#14B8A6",
  "#EC4899",
  "#6366F1",
];

export default function CategoryPieChart({ selectedMonth, selectedYear }) {
  const transactions = useTransactionStore((s) => s.transactions);
  const theme = useThemeStore((s) => s.theme);

  const isDark = theme === "dark";
  const surfaceColor = isDark ? "#1e293b" : "#ffffff";
  const mutedColor = isDark ? "#cbd5e1" : "#5b6472";
  const inkColor = isDark ? "#f8fafc" : "#0f172a";

  const { labels, data } = useMemo(() => {
    const totals = {};

    transactions
      .filter((t) => {
        if (t.type !== "expense" || !t.category || !t.date) {
          return false;
        }

        const dateText = String(t.date).slice(0, 10);
        const [year, month] = dateText.split("-").map(Number);

        return year === selectedYear && month === selectedMonth;
      })
      .forEach((t) => {
        totals[t.category] = (totals[t.category] || 0) + Number(t.amount || 0);
      });

    return {
      labels: Object.keys(totals),
      data: Object.values(totals),
    };
  }, [transactions, selectedMonth, selectedYear]);

  if (labels.length === 0) {
    return (
      <div className="card">
        <h3>Spending by Category</h3>

        <p
          style={{
            marginTop: 12,
            color: "var(--color-ink-muted)",
          }}
        >
          No categorized expenses found.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: 20 }}>Spending by Category</h3>

      <Doughnut
        data={{
          labels,
          datasets: [
            {
              data,
              backgroundColor: COLORS,
              borderWidth: 2,
              borderColor: surfaceColor,
              hoverOffset: 18,
            },
          ],
        }}
        options={{
          responsive: true,
          cutout: "65%",
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                padding: 20,
                usePointStyle: true,
                color: mutedColor,
              },
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  return `${context.label}: ₹${context.raw.toLocaleString()}`;
                },
              },
            },
            centerTotal: {
              mutedColor,
              inkColor,
            },
          },
        }}
        plugins={[centerTotalPlugin]}
      />
    </div>
  );
}
