import { useState } from "react";
import { PlusCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { useTransactionStore } from "../store/transactionStore";

const todayISO = () => {
  const now = new Date();

  // Use local date instead of UTC so the date doesn't shift around midnight.
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export default function ExpenseForm() {
  const createTransaction = useTransactionStore((s) => s.createTransaction);

  const [form, setForm] = useState({
    amount: "",
    type: "expense",
    date: todayISO(),
    note: "",
    merchant: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [formError, setFormError] = useState("");

  const handleChange = (field) => (e) => {
    const value = e.target.value;

    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.amount || Number(form.amount) <= 0) {
      setFormError("Please enter a valid amount greater than 0.");
      return;
    }

    // Prevent future transaction dates.
    const today = todayISO();

    if (form.date > today) {
      setFormError("Transaction date cannot be in the future.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      await createTransaction({
        amount: Number(form.amount),
        type: form.type,
        date: form.date,
        note: form.note.trim() || null,
        merchant: form.merchant.trim() || null,
      });

      setForm({
        amount: "",
        type: "expense",
        date: todayISO(),
        note: "",
        merchant: "",
      });

      setJustAdded(true);

      setTimeout(() => setJustAdded(false), 3000);
    } catch (err) {
      setFormError(
        err.response?.data?.detail || "Failed to create transaction.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <PlusCircle size={18} style={{ color: "var(--color-accent)" }} />

        <h3 style={{ margin: 0 }}>Add a Transaction</h3>
      </div>

      <div className="grid-2">
        <div style={{ marginBottom: 14 }}>
          <label className="label" htmlFor="amount">
            Amount (₹)
          </label>

          <input
            id="amount"
            className="input"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            value={form.amount}
            onChange={handleChange("amount")}
            required
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="label" htmlFor="type">
            Type
          </label>

          <select
            id="type"
            className="input"
            value={form.type}
            onChange={handleChange("type")}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
      </div>

      <div className="grid-2">
        <div style={{ marginBottom: 14 }}>
          <label className="label" htmlFor="date">
            Date
          </label>

          <input
            id="date"
            className="input"
            type="date"
            value={form.date}
            max={todayISO()}
            onChange={handleChange("date")}
            required
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="label" htmlFor="merchant">
            Merchant (optional)
          </label>

          <input
            id="merchant"
            className="input"
            type="text"
            placeholder="e.g. Starbucks, Amazon"
            value={form.merchant}
            onChange={handleChange("merchant")}
          />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label className="label" htmlFor="note">
          Note (optional)
        </label>

        <input
          id="note"
          className="input"
          type="text"
          placeholder="What was this for?"
          value={form.note}
          onChange={handleChange("note")}
        />
      </div>

      {formError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 14,
            padding: "8px 12px",
            borderRadius: 8,
            backgroundColor: "var(--color-alert-soft)",
            color: "var(--color-alert)",
            fontSize: 13,
          }}
        >
          <AlertCircle size={15} />
          <span>{formError}</span>
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <button className="btn btn-accent" type="submit" disabled={submitting}>
          {submitting ? "Adding…" : "Add transaction"}
        </button>

        {justAdded && (
          <span
            className="pill pill-accent"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <CheckCircle2 size={13} />
            Added — ready to categorize below
          </span>
        )}
      </div>
    </form>
  );
}
