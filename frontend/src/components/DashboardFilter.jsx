import { useState } from "react";
import { Filter, RotateCcw } from "lucide-react";
import { useTransactionStore } from "../store/transactionStore";

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function DashboardFilter() {
  const { filters, fetchTransactions, setFilters, clearFilters } =
    useTransactionStore();

  const [startDate, setStartDate] = useState(filters?.start_date || "");
  const [endDate, setEndDate] = useState(filters?.end_date || "");
  const [activeQuick, setActiveQuick] = useState(null);
  const [dateError, setDateError] = useState("");

  const todayStr = formatLocalDate(new Date());
  const hasActiveFilter = Boolean(startDate || endDate || activeQuick);

  const applyFilter = () => {
    if (startDate && endDate && startDate > endDate) {
      setDateError("Start date cannot be after end date.");
      return;
    }
    setDateError("");

    const nextFilters = {
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    };

    setFilters(nextFilters);
    fetchTransactions(nextFilters);
  };

  const resetFilter = () => {
    if (!hasActiveFilter) return;

    setStartDate("");
    setEndDate("");
    setActiveQuick(null);
    setDateError("");

    clearFilters();
    fetchTransactions({});
  };

  const quickFilter = (type) => {
    const today = new Date();
    let start = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const end = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    switch (type) {
      case "today":
        break;

      case "7days":
        start.setDate(today.getDate() - 6);
        break;

      case "30days":
        start.setDate(today.getDate() - 29);
        break;

      case "month":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;

      case "year":
        start = new Date(today.getFullYear(), 0, 1);
        break;

      default:
        break;
    }

    const nextFilters = {
      start_date: formatLocalDate(start),
      end_date: formatLocalDate(end),
    };

    setStartDate(nextFilters.start_date);
    setEndDate(nextFilters.end_date);
    setActiveQuick(type);
    setDateError("");

    setFilters(nextFilters);
    fetchTransactions(nextFilters);
  };

  const quickOptions = [
    { key: "today", label: "Today" },
    { key: "7days", label: "Last 7 Days" },
    { key: "30days", label: "Last 30 Days" },
    { key: "month", label: "This Month" },
    { key: "year", label: "This Year" },
  ];

  return (
    <div className="card dashboard-filter">
      <div className="filter-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Filter size={18} style={{ color: "var(--color-accent)" }} />
          <h3 style={{ margin: 0 }}>Filter Transactions</h3>
        </div>

        <div className="quick-filters">
          {quickOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`btn ${activeQuick === opt.key ? "btn-accent" : "btn-ghost"}`}
              onClick={() => quickFilter(opt.key)}
              style={{
                fontSize: 13,
                padding: "7px 14px",
                transition: "all 0.15s ease",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-row">
        <div>
          <label className="label" htmlFor="filter-from-date">
            From Date
          </label>
          <input
            id="filter-from-date"
            className="input"
            type="date"
            max={endDate || todayStr}
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setActiveQuick(null);
              setDateError("");
            }}
          />
        </div>

        <div>
          <label className="label" htmlFor="filter-to-date">
            To Date
          </label>
          <input
            id="filter-to-date"
            className="input"
            type="date"
            min={startDate || undefined}
            max={todayStr}
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setActiveQuick(null);
              setDateError("");
            }}
          />
        </div>

        <div className="filter-buttons">
          <button
            type="button"
            className="btn btn-accent"
            onClick={applyFilter}
          >
            Apply
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={resetFilter}
            disabled={!hasActiveFilter}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              opacity: hasActiveFilter ? 1 : 0.5,
              cursor: hasActiveFilter ? "pointer" : "not-allowed",
            }}
            title="Reset filters"
          >
            <RotateCcw size={14} />
            Reset
          </button>
        </div>
      </div>

      {dateError && (
        <p
          role="alert"
          style={{
            color: "var(--color-alert)",
            fontSize: 13,
            marginTop: 10,
            marginBottom: 0,
          }}
        >
          {dateError}
        </p>
      )}
    </div>
  );
}
