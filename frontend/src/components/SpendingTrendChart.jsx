import { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { useTransactionStore } from "../store/transactionStore";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

const RANGE_OPTIONS = [
  { label: "Last 3 Months", value: 3 },
  { label: "Last 6 Months", value: 6 },
  { label: "Last 12 Months", value: 12 },
];

function getMonthKey(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function getMonthLabel(year, month) {
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

function getMonthRange(endDate, count) {
  const end = new Date(endDate);

  if (Number.isNaN(end.getTime())) {
    return [];
  }

  const endYear = end.getFullYear();
  const endMonth = end.getMonth();

  const months = [];

  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(endYear, endMonth - i, 1);

    months.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      key: getMonthKey(date.getFullYear(), date.getMonth() + 1),
      label: getMonthLabel(date.getFullYear(), date.getMonth() + 1),
    });
  }

  return months;
}

export default function SpendingTrendChart({ selectedMonth, selectedYear }) {
  const transactions = useTransactionStore((s) => s.transactions);

  const [range, setRange] = useState(6);

  const { labels, data } = useMemo(() => {
    const expenseTotals = {};

    const expenseTransactions = transactions.filter(
      (transaction) => transaction.type === "expense" && transaction.date,
    );

    if (expenseTransactions.length === 0) {
      return {
        labels: [],
        data: [],
      };
    }

    /*
     * Use the latest transaction date as the end of the graph.
     * This makes the chart useful even when the system date
     * and the latest imported transaction date differ.
     */
    const latestTransaction = new Date(selectedYear, selectedMonth - 1, 1);

    expenseTransactions.forEach((transaction) => {
      const date = new Date(transaction.date);

      if (Number.isNaN(date.getTime())) {
        return;
      }

      const key = getMonthKey(date.getFullYear(), date.getMonth() + 1);

      expenseTotals[key] =
        (expenseTotals[key] || 0) + Number(transaction.amount || 0);
    });

    const months = getMonthRange(latestTransaction, range);

    return {
      labels: months.map((month) => month.label),
      data: months.map((month) => expenseTotals[month.key] || 0),
    };
  }, [transactions, range, selectedMonth, selectedYear]);

  return (
    <div className="spending-trend-wrapper">
      <div
        className="spending-trend-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <h3 style={{ margin: 0 }}>Monthly Spending Trend</h3>

        <select
          value={range}
          onChange={(e) => setRange(Number(e.target.value))}
          className="panel-select"
          style={{
            cursor: "pointer",
            outline: "none",
          }}
          aria-label="Spending trend range"
        >
          {RANGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {labels.length === 0 ? (
        <div
          style={{
            padding: "35px 10px",
            textAlign: "center",
            color: "var(--color-ink-muted)",
          }}
        >
          No expense data available.
        </div>
      ) : (
        <Line
          data={{
            labels,
            datasets: [
              {
                label: "Expenses",
                data,
                fill: true,
                tension: 0.35,
                borderColor: "#3B82F6",
                backgroundColor: "rgba(59,130,246,0.12)",
                pointRadius: 5,
                pointHoverRadius: 8,
                spanGaps: true,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: true,

            plugins: {
              legend: {
                display: false,
              },

              tooltip: {
                callbacks: {
                  label: (context) =>
                    `₹${Number(context.raw || 0).toLocaleString("en-IN")}`,
                },
              },
            },

            scales: {
              y: {
                beginAtZero: true,

                ticks: {
                  callback: (value) =>
                    `₹${Number(value).toLocaleString("en-IN")}`,
                },
              },

              x: {
                grid: {
                  display: true,
                },
              },
            },
          }}
        />
      )}
    </div>
  );
}
