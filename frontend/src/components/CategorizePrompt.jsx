import { useEffect, useState } from "react";
import { useTransactionStore } from "../store/transactionStore";

const EXPENSE_CATEGORIES = [
  "Food",
  "Groceries",
  "Movies",
  "Shopping",
  "Travel",
  "Bills",
  "Health",
  "Other",
];

const INCOME_CATEGORIES = ["Salary", "Investment", "Other"];

export default function CategorizePrompt() {
  const pending = useTransactionStore((s) => s.pending);
  const fetchPending = useTransactionStore((s) => s.fetchPending);
  const categorizeTransaction = useTransactionStore(
    (s) => s.categorizeTransaction,
  );

  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleCategorize = async (id, category) => {
    setBusyId(id);
    setError("");

    try {
      await categorizeTransaction(id, category);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Could not categorize transaction. Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  };

  if (pending.length === 0) {
    return (
      <div className="card">
        <h3>Categorize</h3>
        <p style={{ color: "var(--color-ink-muted)", marginTop: 8 }}>
          Nothing waiting — every transaction is categorized.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: 4 }}>Categorize</h3>

      <p
        style={{
          color: "var(--color-ink-muted)",
          fontSize: 13,
          marginBottom: 16,
        }}
      >
        {pending.length} transaction
        {pending.length > 1 ? "s" : ""} waiting for a category.
      </p>

      {error && (
        <p
          role="alert"
          style={{ color: "var(--color-alert)", marginBottom: 12 }}
        >
          {error}
        </p>
      )}

      {pending.map((txn) => {
        const isIncome = txn.type === "income";
        const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

        return (
          <div
            key={txn.id}
            style={{
              borderTop: "1px solid var(--color-line)",
              padding: "14px 0",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 10,
              }}
            >
              <div>
                <strong>
                  ₹{Number(txn.amount || 0).toLocaleString("en-IN")}
                </strong>{" "}
                <span
                  style={{
                    color: "var(--color-ink-muted)",
                    fontSize: 13,
                  }}
                >
                  {txn.date} {txn.note ? `· ${txn.note}` : ""}
                </span>
                <div
                  style={{
                    color: "var(--color-ink-muted)",
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  {isIncome ? "Income transaction" : "Expense transaction"}
                </div>
              </div>

              <span className="pill pill-alert">pending</span>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className="btn btn-ghost"
                  disabled={busyId === txn.id}
                  onClick={() => handleCategorize(txn.id, cat)}
                >
                  {busyId === txn.id ? "Saving..." : cat}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
