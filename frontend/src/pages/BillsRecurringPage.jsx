import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Pencil,
  Pause,
  Play,
  Plus,
  Repeat2,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";

import { useTransactionStore } from "../store/transactionStore";

const initialForm = {
  title: "",
  amount: "",
  type: "expense",
  category: "",
  merchant: "",
  note: "",
  frequency: "monthly",
  start_date: "",
  next_due_date: "",
  end_date: "",
};

const frequencyLabels = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

const categories = [
  "Housing",
  "Bills",
  "Utilities",
  "Subscription",
  "Food",
  "Transport",
  "Shopping",
  "Entertainment",
  "Health",
  "Education",
  "Travel",
  "Salary",
  "Investment",
  "Other",
];

function today() {
  const d = new Date();

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

function emptyForm() {
  const current = today();

  return {
    ...initialForm,
    start_date: current,
    next_due_date: current,
  };
}

function formatDate(value) {
  if (!value) return "-";

  const d = new Date(`${value}T00:00:00`);

  if (Number.isNaN(d.getTime())) {
    return value;
  }

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function BillsRecurringPage() {
  const {
    recurringTransactions,
    recurringLoading,
    recurringError,
    fetchRecurringTransactions,
    createRecurringTransaction,
    updateRecurringTransaction,
    toggleRecurringTransaction,
    deleteRecurringTransaction,
    clearRecurringError,
  } = useTransactionStore();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [showPaused, setShowPaused] = useState(false);

  useEffect(() => {
    fetchRecurringTransactions(false).catch(() => {});
  }, [fetchRecurringTransactions]);

  const active = useMemo(
    () => recurringTransactions.filter((item) => item.is_active),
    [recurringTransactions],
  );

  const paused = useMemo(
    () => recurringTransactions.filter((item) => !item.is_active),
    [recurringTransactions],
  );

  const visible = showPaused ? paused : active;

  const monthlyExpense = useMemo(() => {
    return active.reduce((total, item) => {
      if (item.type !== "expense") return total;

      if (item.frequency === "monthly") {
        return total + Number(item.amount);
      }

      if (item.frequency === "weekly") {
        return total + Number(item.amount) * 4.33;
      }

      if (item.frequency === "daily") {
        return total + Number(item.amount) * 30;
      }

      if (item.frequency === "yearly") {
        return total + Number(item.amount) / 12;
      }

      return total;
    }, 0);
  }, [active]);

  const openAdd = () => {
    clearRecurringError();
    setEditing(null);
    setForm(emptyForm());
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (item) => {
    clearRecurringError();

    setEditing(item);

    setForm({
      title: item.title || "",
      amount: item.amount || "",
      type: item.type || "expense",
      category: item.category || "",
      merchant: item.merchant || "",
      note: item.note || "",
      frequency: item.frequency || "monthly",
      start_date: item.start_date || "",
      next_due_date: item.next_due_date || "",
      end_date: item.end_date || "",
    });

    setFormError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditing(null);
    setForm(emptyForm());
    setFormError("");
  };

  const change = (e) => {
    setForm((current) => ({
      ...current,
      [e.target.name]: e.target.value,
    }));

    setFormError("");
  };

  const validate = () => {
    if (!form.title.trim()) {
      return "Enter a bill or recurring transaction name.";
    }

    if (!form.amount || Number(form.amount) <= 0) {
      return "Enter a valid amount.";
    }

    if (!form.start_date) {
      return "Select a start date.";
    }

    if (!form.next_due_date) {
      return "Select the next due date.";
    }

    if (form.next_due_date < form.start_date) {
      return "Next due date cannot be before the start date.";
    }

    if (form.end_date && form.end_date < form.next_due_date) {
      return "End date cannot be before the next due date.";
    }

    return "";
  };

  const submit = async (e) => {
    e.preventDefault();

    const error = validate();

    if (error) {
      setFormError(error);
      return;
    }

    setSaving(true);

    const payload = {
      title: form.title.trim(),
      amount: Number(form.amount),
      type: form.type,
      category: form.category.trim() || null,
      merchant: form.merchant.trim() || null,
      note: form.note.trim() || null,
      frequency: form.frequency,
      start_date: form.start_date,
      next_due_date: form.next_due_date,
      end_date: form.end_date || null,
    };

    try {
      if (editing) {
        await updateRecurringTransaction(editing.id, payload);
      } else {
        await createRecurringTransaction(payload);
      }

      closeModal();

      await fetchRecurringTransactions(showPaused);
    } catch (error) {
      setFormError(
        error.response?.data?.detail || "Unable to save. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (item) => {
    setActionId(item.id);

    try {
      await toggleRecurringTransaction(item.id);

      await fetchRecurringTransactions(showPaused);
    } catch {
      // Store handles the error.
    } finally {
      setActionId(null);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;

    setActionId(deleteTarget.id);

    try {
      await deleteRecurringTransaction(deleteTarget.id);

      setDeleteTarget(null);

      await fetchRecurringTransactions(showPaused);
    } catch {
      // Store handles the error.
    } finally {
      setActionId(null);
    }
  };

  return (
    <div
      className="container"
      style={{
        paddingTop: 32,
        paddingBottom: 60,
      }}
    >
      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 18,
          flexWrap: "wrap",
          marginBottom: 26,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 30,
              fontWeight: 750,
            }}
          >
            Bills & Recurring
          </h1>

          <p
            style={{
              margin: "7px 0 0",
              color: "var(--color-muted, #6b7280)",
              fontSize: 14,
            }}
          >
            Manage bills, subscriptions and automatic income.
          </p>
        </div>

        <button
          className="btn btn-primary"
          type="button"
          onClick={openAdd}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Plus size={18} />
          Add Bill
        </button>
      </div>

      {/* =====================================================
          SUMMARY
      ====================================================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 16,
          marginBottom: 26,
        }}
      >
        <SummaryCard
          icon={<WalletCards size={20} />}
          label="Active Bills"
          value={active.length}
        />

        <SummaryCard
          icon={<CalendarDays size={20} />}
          label="Paused"
          value={paused.length}
        />

        <SummaryCard
          icon={<Repeat2 size={20} />}
          label="Monthly Commitment"
          value={money(monthlyExpense)}
        />
      </div>

      {/* =====================================================
          TOOLBAR
      ====================================================== */}

      <div
        className="card"
        style={{
          padding: "14px 18px",
          marginBottom: 18,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <strong
            style={{
              fontSize: 16,
            }}
          >
            Upcoming & Active
          </strong>

          <div
            style={{
              marginTop: 3,
              fontSize: 12,
              color: "var(--color-muted, #6b7280)",
            }}
          >
            Automatic transactions are created when their due date arrives.
          </div>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={showPaused}
            onChange={async () => {
              const next = !showPaused;

              setShowPaused(next);

              await fetchRecurringTransactions(next);
            }}
          />
          Show paused
        </label>
      </div>

      {/* =====================================================
          ERROR
      ====================================================== */}

      {recurringError && (
        <div
          style={{
            marginBottom: 18,
            padding: "12px 15px",
            borderRadius: 10,
            background: "rgba(239,68,68,0.08)",
            color: "#dc2626",
            fontSize: 14,
          }}
        >
          {recurringError}
        </div>
      )}

      {/* =====================================================
          LOADING
      ====================================================== */}

      {recurringLoading && visible.length === 0 && (
        <div
          className="card"
          style={{
            padding: 45,
            textAlign: "center",
            color: "var(--color-muted, #6b7280)",
          }}
        >
          Loading bills...
        </div>
      )}

      {/* =====================================================
          EMPTY
      ====================================================== */}

      {!recurringLoading && visible.length === 0 && (
        <div
          className="card"
          style={{
            padding: "60px 25px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 58,
              height: 58,
              margin: "0 auto 16px",
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(99,102,241,0.10)",
              color: "var(--color-accent, #6366f1)",
            }}
          >
            <Repeat2 size={27} />
          </div>

          <h2
            style={{
              margin: "0 0 7px",
              fontSize: 19,
            }}
          >
            No recurring bills yet
          </h2>

          <p
            style={{
              maxWidth: 450,
              margin: "0 auto 20px",
              fontSize: 14,
              lineHeight: 1.6,
              color: "var(--color-muted, #6b7280)",
            }}
          >
            Add rent, subscriptions, EMIs, utility bills, salary or other
            recurring transactions.
          </p>

          <button
            className="btn btn-primary"
            type="button"
            onClick={openAdd}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <Plus size={17} />
            Add Your First Bill
          </button>
        </div>
      )}

      {/* =====================================================
          BILL CARDS
      ====================================================== */}

      {visible.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
            gap: 17,
          }}
        >
          {visible.map((item) => {
            const expense = item.type === "expense";

            const busy = actionId === item.id;

            return (
              <div
                key={item.id}
                className="card"
                style={{
                  padding: 19,
                  opacity: item.is_active ? 1 : 0.68,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        flexShrink: 0,
                        borderRadius: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: expense
                          ? "rgba(239,68,68,0.10)"
                          : "rgba(34,197,94,0.10)",
                        color: expense ? "#dc2626" : "#16a34a",
                      }}
                    >
                      <Repeat2 size={20} />
                    </div>

                    <div
                      style={{
                        minWidth: 0,
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontSize: 16,
                          fontWeight: 700,
                        }}
                      >
                        {item.title}
                      </h3>

                      <div
                        style={{
                          marginTop: 5,
                          fontSize: 12,
                          color: "var(--color-muted, #6b7280)",
                        }}
                      >
                        {item.category || "Uncategorized"} •{" "}
                        {frequencyLabels[item.frequency]}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 17,
                        fontWeight: 750,
                        color: expense ? "#dc2626" : "#16a34a",
                      }}
                    >
                      {expense ? "-" : "+"}
                      {money(item.amount)}
                    </div>

                    <span
                      style={{
                        display: "inline-flex",
                        marginTop: 6,
                        padding: "4px 8px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 650,
                        background: item.is_active
                          ? "rgba(34,197,94,0.10)"
                          : "rgba(245,158,11,0.10)",
                        color: item.is_active ? "#16a34a" : "#d97706",
                      }}
                    >
                      {item.is_active ? "Active" : "Paused"}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 18,
                    paddingTop: 15,
                    borderTop: "1px solid var(--color-border, #e5e7eb)",
                    display: "grid",
                    gap: 11,
                  }}
                >
                  <InfoRow
                    icon={<CalendarDays size={16} />}
                    label="Next payment"
                    value={
                      item.is_active ? formatDate(item.next_due_date) : "Paused"
                    }
                  />

                  {item.merchant && (
                    <InfoRow
                      icon={<WalletCards size={16} />}
                      label="Merchant"
                      value={item.merchant}
                    />
                  )}

                  {item.end_date && (
                    <InfoRow
                      icon={<Clock3 size={16} />}
                      label="Ends"
                      value={formatDate(item.end_date)}
                    />
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 17,
                  }}
                >
                  <ActionButton
                    icon={<Pencil size={14} />}
                    text="Edit"
                    onClick={() => openEdit(item)}
                    disabled={busy}
                  />

                  <ActionButton
                    icon={
                      item.is_active ? <Pause size={14} /> : <Play size={14} />
                    }
                    text={item.is_active ? "Pause" : "Resume"}
                    onClick={() => toggle(item)}
                    disabled={busy}
                  />

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    disabled={busy}
                    style={{
                      width: 39,
                      minHeight: 38,
                      flexShrink: 0,
                      border: "1px solid rgba(239,68,68,0.25)",
                      borderRadius: 9,
                      background: "rgba(239,68,68,0.06)",
                      color: "#dc2626",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================
          ADD / EDIT MODAL
      ====================================================== */}

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(15,23,42,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 650,
              maxHeight: "calc(100vh - 40px)",
              overflowY: "auto",
              background: "var(--color-surface, #fff)",
              borderRadius: 18,
              boxShadow: "0 25px 70px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                padding: "19px 22px",
                borderBottom: "1px solid var(--color-border, #e5e7eb)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 19,
                  }}
                >
                  {editing ? "Edit Bill" : "Add Bill"}
                </h2>

                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 13,
                    color: "var(--color-muted, #6b7280)",
                  }}
                >
                  Set the schedule for this recurring transaction.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                style={closeButton}
              >
                <X size={19} />
              </button>
            </div>

            <form
              onSubmit={submit}
              style={{
                padding: 22,
              }}
            >
              {formError && (
                <div
                  style={{
                    marginBottom: 16,
                    padding: "11px 13px",
                    borderRadius: 10,
                    background: "rgba(239,68,68,0.08)",
                    color: "#dc2626",
                    fontSize: 13,
                  }}
                >
                  {formError}
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 15,
                }}
              >
                <Field
                  label="Bill / Transaction Name"
                  name="title"
                  value={form.title}
                  onChange={change}
                  placeholder="e.g. House Rent"
                  required
                  full
                />

                <Field
                  label="Amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={change}
                  placeholder="15000"
                  required
                />

                <SelectField
                  label="Type"
                  name="type"
                  value={form.type}
                  onChange={change}
                  options={[
                    ["expense", "Expense"],
                    ["income", "Income"],
                  ]}
                />

                <SelectField
                  label="Frequency"
                  name="frequency"
                  value={form.frequency}
                  onChange={change}
                  options={[
                    ["daily", "Daily"],
                    ["weekly", "Weekly"],
                    ["monthly", "Monthly"],
                    ["yearly", "Yearly"],
                  ]}
                />

                <Field
                  label="Category"
                  name="category"
                  value={form.category}
                  onChange={change}
                  placeholder="e.g. Housing"
                  list="bill-categories"
                />

                <Field
                  label="Merchant"
                  name="merchant"
                  value={form.merchant}
                  onChange={change}
                  placeholder="e.g. Netflix"
                />

                <Field
                  label="Start Date"
                  name="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={change}
                  required
                />

                <Field
                  label="Next Due Date"
                  name="next_due_date"
                  type="date"
                  value={form.next_due_date}
                  onChange={change}
                  required
                />

                <Field
                  label="End Date (Optional)"
                  name="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={change}
                  full
                />

                <div
                  style={{
                    gridColumn: "1 / -1",
                  }}
                >
                  <label style={labelStyle}>Note</label>

                  <textarea
                    name="note"
                    value={form.note}
                    onChange={change}
                    rows={3}
                    placeholder="Optional note"
                    style={{
                      ...inputStyle,
                      resize: "vertical",
                    }}
                  />
                </div>
              </div>

              <datalist id="bill-categories">
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>

              <div
                style={{
                  marginTop: 22,
                  paddingTop: 17,
                  borderTop: "1px solid var(--color-border, #e5e7eb)",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  style={secondaryButton}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{
                    minWidth: 145,
                  }}
                >
                  {saving ? "Saving..." : editing ? "Save Changes" : "Add Bill"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          DELETE MODAL
      ====================================================== */}

      {deleteTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            background: "rgba(15,23,42,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              background: "var(--color-surface, #fff)",
              borderRadius: 17,
              padding: 23,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(239,68,68,0.10)",
                color: "#dc2626",
                marginBottom: 14,
              }}
            >
              <Trash2 size={21} />
            </div>

            <h2
              style={{
                margin: "0 0 7px",
                fontSize: 18,
              }}
            >
              Delete this bill?
            </h2>

            <p
              style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.55,
                color: "var(--color-muted, #6b7280)",
              }}
            >
              <strong>{deleteTarget.title}</strong> will stop generating future
              transactions. Existing transactions will remain.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 9,
                marginTop: 21,
              }}
            >
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                style={secondaryButton}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={remove}
                disabled={actionId === deleteTarget.id}
                style={{
                  ...dangerButton,
                  minWidth: 90,
                }}
              >
                {actionId === deleteTarget.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function SummaryCard({ icon, label, value }) {
  return (
    <div
      className="card"
      style={{
        padding: 19,
        display: "flex",
        alignItems: "center",
        gap: 13,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(99,102,241,0.10)",
          color: "var(--color-accent, #6366f1)",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      <div>
        <div
          style={{
            fontSize: 12,
            color: "var(--color-muted, #6b7280)",
          }}
        >
          {label}
        </div>

        <div
          style={{
            marginTop: 3,
            fontSize: 18,
            fontWeight: 750,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
      }}
    >
      <span
        style={{
          color: "var(--color-muted, #6b7280)",
          display: "flex",
        }}
      >
        {icon}
      </span>

      <div>
        <div
          style={{
            fontSize: 11,
            color: "var(--color-muted, #6b7280)",
          }}
        >
          {label}
        </div>

        <div
          style={{
            marginTop: 2,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon, text, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        minHeight: 38,
        border: "1px solid var(--color-border, #d1d5db)",
        borderRadius: 9,
        background: "transparent",
        color: "var(--color-ink, #374151)",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      {icon}
      {text}
    </button>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  full = false,
  ...props
}) {
  return (
    <div
      style={{
        gridColumn: full ? "1 / -1" : undefined,
      }}
    >
      <label htmlFor={`bill-${name}`} style={labelStyle}>
        {label}
      </label>

      <input
        id={`bill-${name}`}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        style={inputStyle}
        {...props}
      />
    </div>
  );
}

function SelectField({ label, name, value, onChange, options }) {
  return (
    <div>
      <label htmlFor={`bill-${name}`} style={labelStyle}>
        {label}
      </label>

      <select
        id={`bill-${name}`}
        name={name}
        value={value}
        onChange={onChange}
        style={inputStyle}
      >
        {options.map(([optionValue, label]) => (
          <option key={optionValue} value={optionValue}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: 7,
  fontSize: 13,
  fontWeight: 650,
  color: "var(--color-ink, #374151)",
};

const inputStyle = {
  width: "100%",
  minHeight: 42,
  boxSizing: "border-box",
  padding: "9px 12px",
  border: "1px solid var(--color-border, #d1d5db)",
  borderRadius: 10,
  background: "var(--color-surface, #ffffff)",
  color: "var(--color-ink, #111827)",
  fontSize: 14,
  outline: "none",
};

const secondaryButton = {
  minHeight: 40,
  padding: "0 16px",
  border: "1px solid var(--color-border, #d1d5db)",
  borderRadius: 9,
  background: "transparent",
  color: "var(--color-ink, #374151)",
  cursor: "pointer",
  fontWeight: 600,
};

const dangerButton = {
  minHeight: 40,
  padding: "0 16px",
  border: "none",
  borderRadius: 9,
  background: "#dc2626",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};

const closeButton = {
  width: 36,
  height: 36,
  border: "none",
  borderRadius: 9,
  background: "var(--color-surface-soft, #f3f4f6)",
  color: "var(--color-muted, #6b7280)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
