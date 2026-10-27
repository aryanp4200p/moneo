import { useState } from "react";
import { Filter, RotateCcw } from "lucide-react";
import { useTransactionStore } from "../store/transactionStore";

export default function DashboardFilter() {
  const { fetchTransactions, setFilters, clearFilters } = useTransactionStore();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeQuick, setActiveQuick] = useState(null);
  const [dateError, setDateError] = useState("");

  const applyFilter = () => {
    if (startDate && endDate && startDate > endDate) {
      setDateError("Start date cannot be after end date.");
      return;
    }
    setDateError("");

    const filters = {
      start_date: startDate,
      end_date: endDate,
    };

    setFilters(filters);
    fetchTransactions(filters);
  };

  const resetFilter = () => {
    setStartDate("");
    setEndDate("");
    setActiveQuick(null);
    setDateError("");

    clearFilters();
    fetchTransactions({});
  };

  const formatDate = (date) => date.toISOString().slice(0, 10);

  const quickFilter = (type) => {
    const today = new Date();

    let start = new Date();
    let end = new Date();

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

    const filters = {
      start_date: formatDate(start),
      end_date: formatDate(end),
    };

    setStartDate(filters.start_date);
    setEndDate(filters.end_date);
    setActiveQuick(type);
    setDateError("");

    setFilters(filters);
    fetchTransactions(filters);
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
          <label className="label">From Date</label>
          <input
            className="input"
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setActiveQuick(null);
              setDateError("");
            }}
          />
        </div>

        <div>
          <label className="label">To Date</label>
          <input
            className="input"
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setActiveQuick(null);
              setDateError("");
            }}
          />
        </div>

        <div className="filter-buttons">
          <button className="btn btn-accent" onClick={applyFilter}>
            Apply
          </button>

          <button
            className="btn btn-ghost"
            onClick={resetFilter}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            title="Reset filters"
          >
            <RotateCcw size={14} />
            Reset
          </button>
        </div>
      </div>

      {dateError && (
        <p style={{ color: "var(--color-alert)", fontSize: 13, marginTop: 10, marginBottom: 0 }}>
          {dateError}
        </p>
      )}
    </div>
  );
}
