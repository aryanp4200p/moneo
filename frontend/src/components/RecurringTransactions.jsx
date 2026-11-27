import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Pencil,
  Play,
  Plus,
  Repeat2,
  Trash2,
  X,
  Pause,
  WalletCards,
} from "lucide-react";

import { useAuthStore } from "../store/authStore";
import { useTransactionStore } from "../store/transactionStore";

const EMPTY_FORM = {
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

const FREQUENCY_LABELS = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

const CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Housing",
  "Entertainment",
  "Health",
  "Education",
  "Travel",
  "Salary",
  "Investment",
  "Other",
];

function getToday() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "Not set";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function getInitialForm() {
  const today = getToday();

  return {
    ...EMPTY_FORM,
    start_date: today,
    next_due_date: today,
  };
}

export default function RecurringTransactions() {
  const user = useAuthStore((s) => s.user);
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

  const paidBillsStorageKey = `fm_paid_bills_${user?.id || "guest"}`;
  const [paidBillKeys, setPaidBillKeys] = useState(() => {
    try {
      const saved = localStorage.getItem(paidBillsStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const syncPaid = () => {
      try {
        const saved = localStorage.getItem(paidBillsStorageKey);
        setPaidBillKeys(saved ? JSON.parse(saved) : []);
      } catch {
        setPaidBillKeys([]);
      }
    };

    syncPaid();
    window.addEventListener("moneo:bills-updated", syncPaid);
    return () => window.removeEventListener("moneo:bills-updated", syncPaid);
  }, [paidBillsStorageKey]);

  const paidBillSet = useMemo(() => new Set(paidBillKeys), [paidBillKeys]);

  const toggleBillPaid = (item) => {
    if (!item?.next_due_date) return;
    const cycleKey = `${item.id}:${item.next_due_date}`;
    const next = paidBillSet.has(cycleKey)
      ? paidBillKeys.filter((k) => k !== cycleKey)
      : [...paidBillKeys, cycleKey];

    setPaidBillKeys(next);
    try {
      localStorage.setItem(paidBillsStorageKey, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
    window.dispatchEvent(new Event("moneo:bills-updated"));
  };

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(getInitialForm());
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [showInactive, setShowInactive] = useState(false);

  const [deleteItem, setDeleteItem] = useState(null);
  const [actionId, setActionId] = useState(null);

  useEffect(() => {
    fetchRecurringTransactions(false).catch(() => {});
  }, [fetchRecurringTransactions]);

  useEffect(() => {
    if (recurringError) {
      setFormError(recurringError);
    }
  }, [recurringError]);

  const activeItems = useMemo(
    () => recurringTransactions.filter((item) => item.is_active),
    [recurringTransactions],
  );

  const inactiveItems = useMemo(
    () => recurringTransactions.filter((item) => !item.is_active),
    [recurringTransactions],
  );

  const visibleItems = showInactive ? recurringTransactions : activeItems;

  const openAddModal = () => {
    clearRecurringError();

    setEditingItem(null);
    setForm(getInitialForm());
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (item) => {
    clearRecurringError();

    setEditingItem(item);

    setForm({
      title: item.title || "",
      amount: item.amount ?? "",
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
    setEditingItem(null);
    setForm(getInitialForm());
    setFormError("");
    clearRecurringError();
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (formError) {
      setFormError("");
    }
  };

  const validateForm = () => {
    if (!form.title.trim()) {
      return "Please enter a title.";
    }

    if (!form.amount || Number(form.amount) <= 0) {
      return "Please enter a valid amount.";
    }

    if (!form.start_date) {
      return "Please select a start date.";
    }

    if (!form.next_due_date) {
      return "Please select the next due date.";
    }

    if (form.next_due_date < form.start_date) {
      return "Next due date cannot be before the start date.";
    }

    if (form.end_date && form.end_date < form.next_due_date) {
      return "End date cannot be before the next due date.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    setFormError("");

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
      if (editingItem) {
        await updateRecurringTransaction(editingItem.id, payload);
      } else {
        await createRecurringTransaction(payload);
      }

      setShowModal(false);
      setEditingItem(null);
      setForm(getInitialForm());

      await fetchRecurringTransactions(showInactive);
      window.dispatchEvent(new Event("moneo:bills-updated"));
    } catch (error) {
      setFormError(
        error.response?.data?.detail ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item) => {
    setActionId(item.id);

    try {
      await toggleRecurringTransaction(item.id);

      await fetchRecurringTransactions(showInactive);
      window.dispatchEvent(new Event("moneo:bills-updated"));
    } catch (error) {
      // Error is already handled by the store.
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;

    setActionId(deleteItem.id);

    try {
      await deleteRecurringTransaction(deleteItem.id);

      setDeleteItem(null);

      await fetchRecurringTransactions(showInactive);
      window.dispatchEvent(new Event("moneo:bills-updated"));
    } catch (error) {
      // Error is already handled by the store.
    } finally {
      setActionId(null);
    }
  };

  const handleShowInactiveChange = async () => {
    const nextValue = !showInactive;

    setShowInactive(nextValue);

    try {
      await fetchRecurringTransactions(nextValue);
    } catch (error) {
      // Error is already handled by the store.
    }
  };

  return (
    <>
      <section
        className="card"
        style={{
          padding: 0,
          overflow: "hidden",
          marginBottom: 24,
        }}
      >
        {/* =====================================================
            HEADER
        ====================================================== */}

        <div
          style={{
            padding: "22px 24px",
            borderBottom: "1px solid var(--color-border, #e5e7eb)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(99, 102, 241, 0.10)",
                color: "var(--color-accent, #6366f1)",
                flexShrink: 0,
              }}
            >
              <Repeat2 size={22} />
            </div>

            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--color-ink, #111827)",
                }}
              >
                Recurring Transactions
              </h2>

              <p
                style={{
                  margin: "5px 0 0",
                  fontSize: 14,
                  color: "var(--color-muted, #6b7280)",
                }}
              >
                Manage your automatic income and expenses
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={openAddModal}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              whiteSpace: "nowrap",
            }}
          >
            <Plus size={18} />
            Add Recurring
          </button>
        </div>

        {/* =====================================================
            SUMMARY
        ====================================================== */}

        <div
          style={{
            padding: "18px 24px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 12,
            borderBottom: "1px solid var(--color-border, #e5e7eb)",
          }}
        >
          <div
            style={{
              borderRadius: 14,
              padding: "13px 15px",
              background: "var(--color-surface-soft, #f8fafc)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <WalletCards
              size={19}
              style={{
                color: "var(--color-accent, #6366f1)",
              }}
            />

            <div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--color-muted, #6b7280)",
                }}
              >
                Total
              </div>

              <strong
                style={{
                  fontSize: 17,
                  color: "var(--color-ink, #111827)",
                }}
              >
                {recurringTransactions.length}
              </strong>
            </div>
          </div>

          <div
            style={{
              borderRadius: 14,
              padding: "13px 15px",
              background: "var(--color-surface-soft, #f8fafc)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <CheckCircle2
              size={19}
              style={{
                color: "#16a34a",
              }}
            />

            <div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--color-muted, #6b7280)",
                }}
              >
                Active
              </div>

              <strong
                style={{
                  fontSize: 17,
                  color: "var(--color-ink, #111827)",
                }}
              >
                {activeItems.length}
              </strong>
            </div>
          </div>

          <div
            style={{
              borderRadius: 14,
              padding: "13px 15px",
              background: "var(--color-surface-soft, #f8fafc)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Pause
              size={19}
              style={{
                color: "#f59e0b",
              }}
            />

            <div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--color-muted, #6b7280)",
                }}
              >
                Paused
              </div>

              <strong
                style={{
                  fontSize: 17,
                  color: "var(--color-ink, #111827)",
                }}
              >
                {inactiveItems.length}
              </strong>
            </div>
          </div>
        </div>

        {/* =====================================================
            FILTER
        ====================================================== */}

        <div
          style={{
            padding: "14px 24px",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              fontSize: 13,
              color: "var(--color-muted, #6b7280)",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={showInactive}
              onChange={handleShowInactiveChange}
              style={{
                width: 16,
                height: 16,
                accentColor: "var(--color-accent, #6366f1)",
              }}
            />
            Show paused transactions
          </label>
        </div>

        {/* =====================================================
            ERROR
        ====================================================== */}

        {recurringError && (
          <div
            style={{
              margin: "0 24px 16px",
              padding: "11px 14px",
              borderRadius: 10,
              background: "rgba(239, 68, 68, 0.08)",
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

        {recurringLoading && visibleItems.length === 0 && (
          <div
            style={{
              padding: "45px 24px",
              textAlign: "center",
              color: "var(--color-muted, #6b7280)",
            }}
          >
            Loading recurring transactions...
          </div>
        )}

        {/* =====================================================
            EMPTY STATE
        ====================================================== */}

        {!recurringLoading && visibleItems.length === 0 && (
          <div
            style={{
              padding: "42px 24px 48px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 54,
                height: 54,
                margin: "0 auto 14px",
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(99, 102, 241, 0.09)",
                color: "var(--color-accent, #6366f1)",
              }}
            >
              <Repeat2 size={25} />
            </div>

            <h3
              style={{
                margin: "0 0 7px",
                fontSize: 17,
                color: "var(--color-ink, #111827)",
              }}
            >
              No recurring transactions
            </h3>

            <p
              style={{
                margin: "0 auto 18px",
                maxWidth: 430,
                fontSize: 14,
                lineHeight: 1.6,
                color: "var(--color-muted, #6b7280)",
              }}
            >
              Add recurring expenses such as rent, subscriptions or EMIs, or
              recurring income such as salary.
            </p>

            <button
              type="button"
              className="btn btn-primary"
              onClick={openAddModal}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <Plus size={17} />
              Add your first recurring transaction
            </button>
          </div>
        )}

        {/* =====================================================
            CARDS
        ====================================================== */}

        {visibleItems.length > 0 && (
          <div
            style={{
              padding: "0 24px 24px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 14,
            }}
          >
            {visibleItems.map((item) => {
              const isExpense = item.type === "expense";
              const isActionLoading = actionId === item.id;
              const isPaidThisCycle = Boolean(
                item.next_due_date &&
                paidBillSet.has(`${item.id}:${item.next_due_date}`),
              );

              return (
                <div
                  key={item.id}
                  style={{
                    border: "1px solid var(--color-border, #e5e7eb)",
                    borderRadius: 16,
                    padding: 18,
                    background: "var(--color-surface, #ffffff)",
                    opacity: item.is_active ? 1 : 0.72,
                    transition: "box-shadow 0.2s ease, transform 0.2s ease",
                  }}
                >
                  {/* Card top */}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        minWidth: 0,
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 11,
                      }}
                    >
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 11,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          background: isExpense
                            ? "rgba(239, 68, 68, 0.10)"
                            : "rgba(34, 197, 94, 0.10)",
                          color: isExpense ? "#dc2626" : "#16a34a",
                        }}
                      >
                        <Repeat2 size={19} />
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
                            color: "var(--color-ink, #111827)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.title}
                        </h3>

                        <div
                          style={{
                            marginTop: 5,
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                            flexWrap: "wrap",
                          }}
                        >
                          {item.category && (
                            <span
                              style={{
                                fontSize: 12,
                                color: "var(--color-muted, #6b7280)",
                              }}
                            >
                              {item.category}
                            </span>
                          )}

                          {item.category && item.frequency && (
                            <span
                              style={{
                                color: "var(--color-border, #d1d5db)",
                              }}
                            >
                              •
                            </span>
                          )}

                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--color-muted, #6b7280)",
                            }}
                          >
                            {FREQUENCY_LABELS[item.frequency]}
                          </span>
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
                          color: isExpense ? "#dc2626" : "#16a34a",
                        }}
                      >
                        {isExpense ? "-" : "+"}
                        {formatCurrency(item.amount)}
                      </div>

                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          marginTop: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "4px 8px",
                          borderRadius: 999,
                          background: item.is_active
                            ? "rgba(34, 197, 94, 0.10)"
                            : "rgba(245, 158, 11, 0.10)",
                          color: item.is_active ? "#16a34a" : "#d97706",
                        }}
                      >
                        {item.is_active ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <Pause size={12} />
                        )}

                        {item.is_active ? "Active" : "Paused"}
                      </span>
                    </div>
                  </div>

                  {/* Details */}

                  <div
                    style={{
                      marginTop: 17,
                      paddingTop: 15,
                      borderTop: "1px solid var(--color-border, #e5e7eb)",
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                      }}
                    >
                      <CalendarDays
                        size={16}
                        style={{
                          color: "var(--color-muted, #6b7280)",
                          flexShrink: 0,
                        }}
                      />

                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--color-muted, #6b7280)",
                          }}
                        >
                          Next payment
                        </div>

                        <div
                          style={{
                            marginTop: 2,
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--color-ink, #111827)",
                          }}
                        >
                          {item.is_active
                            ? formatDate(item.next_due_date)
                            : "Paused"}
                        </div>
                      </div>
                    </div>

                    {item.merchant && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 9,
                        }}
                      >
                        <WalletCards
                          size={16}
                          style={{
                            color: "var(--color-muted, #6b7280)",
                            flexShrink: 0,
                          }}
                        />

                        <div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--color-muted, #6b7280)",
                            }}
                          >
                            Merchant
                          </div>

                          <div
                            style={{
                              marginTop: 2,
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--color-ink, #111827)",
                            }}
                          >
                            {item.merchant}
                          </div>
                        </div>
                      </div>
                    )}

                    {item.end_date && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 9,
                        }}
                      >
                        <Clock3
                          size={16}
                          style={{
                            color: "var(--color-muted, #6b7280)",
                            flexShrink: 0,
                          }}
                        />

                        <div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--color-muted, #6b7280)",
                            }}
                          >
                            Ends on
                          </div>

                          <div
                            style={{
                              marginTop: 2,
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--color-ink, #111827)",
                            }}
                          >
                            {formatDate(item.end_date)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}

                  <div
                    style={{
                      marginTop: 17,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {item.is_active && (
                      <button
                        type="button"
                        onClick={() => toggleBillPaid(item)}
                        disabled={isActionLoading}
                        title="Stop due-date notifications for this payment cycle"
                        style={{
                          flex: "1 1 100%",
                          minHeight: 38,
                          border: isPaidThisCycle
                            ? "1px solid rgba(22, 163, 74, 0.35)"
                            : "1px solid var(--color-border, #d1d5db)",
                          borderRadius: 9,
                          background: isPaidThisCycle
                            ? "rgba(22, 163, 74, 0.10)"
                            : "transparent",
                          color: isPaidThisCycle
                            ? "#16a34a"
                            : "var(--color-ink, #374151)",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        <BadgeCheck size={15} />
                        {isPaidThisCycle
                          ? "Paid (Alerts Paused)"
                          : "Mark as Paid"}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      disabled={isActionLoading}
                      style={{
                        flex: "1 1 auto",
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
                      <Pencil size={14} />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggle(item)}
                      disabled={isActionLoading}
                      style={{
                        flex: "1 1 auto",
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
                      {item.is_active ? (
                        <>
                          <Pause size={14} />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play size={14} />
                          Resume
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteItem(item)}
                      disabled={isActionLoading}
                      aria-label={`Delete ${item.title}`}
                      style={{
                        width: 38,
                        minHeight: 38,
                        border: "1px solid rgba(239, 68, 68, 0.25)",
                        borderRadius: 9,
                        background: "rgba(239, 68, 68, 0.06)",
                        color: "#dc2626",
                        cursor: "pointer",
                        display: "inline-flex",
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
      </section>

      {/* =======================================================
          ADD / EDIT MODAL
      ====================================================== */}

      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 650,
              maxHeight: "calc(100vh - 40px)",
              overflowY: "auto",
              borderRadius: 18,
              background: "var(--color-surface, #ffffff)",
              boxShadow: "0 24px 70px rgba(0,0,0,0.25)",
            }}
          >
            {/* Modal header */}

            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 2,
                padding: "18px 22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                background: "var(--color-surface, #ffffff)",
                borderBottom: "1px solid var(--color-border, #e5e7eb)",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 19,
                    color: "var(--color-ink, #111827)",
                  }}
                >
                  {editingItem
                    ? "Edit Recurring Transaction"
                    : "Add Recurring Transaction"}
                </h2>

                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 13,
                    color: "var(--color-muted, #6b7280)",
                  }}
                >
                  Set up an automatic transaction schedule.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
                style={{
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
                }}
              >
                <X size={19} />
              </button>
            </div>

            {/* Modal form */}

            <form
              onSubmit={handleSubmit}
              style={{
                padding: 22,
              }}
            >
              {formError && (
                <div
                  style={{
                    marginBottom: 17,
                    padding: "11px 13px",
                    borderRadius: 10,
                    background: "rgba(239, 68, 68, 0.08)",
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
                {/* Title */}

                <div
                  style={{
                    gridColumn: "1 / -1",
                  }}
                >
                  <label htmlFor="recurring-title" style={labelStyle}>
                    Title
                  </label>

                  <input
                    id="recurring-title"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="e.g. Monthly Rent"
                    maxLength={120}
                    required
                    style={inputStyle}
                  />
                </div>

                {/* Amount */}

                <div>
                  <label htmlFor="recurring-amount" style={labelStyle}>
                    Amount
                  </label>

                  <input
                    id="recurring-amount"
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={handleChange}
                    placeholder="15000"
                    required
                    style={inputStyle}
                  />
                </div>

                {/* Type */}

                <div>
                  <label htmlFor="recurring-type" style={labelStyle}>
                    Type
                  </label>

                  <select
                    id="recurring-type"
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    style={inputStyle}
                  >
                    <option value="expense">Expense</option>

                    <option value="income">Income</option>
                  </select>
                </div>

                {/* Frequency */}

                <div>
                  <label htmlFor="recurring-frequency" style={labelStyle}>
                    Frequency
                  </label>

                  <select
                    id="recurring-frequency"
                    name="frequency"
                    value={form.frequency}
                    onChange={handleChange}
                    style={inputStyle}
                  >
                    <option value="daily">Daily</option>

                    <option value="weekly">Weekly</option>

                    <option value="monthly">Monthly</option>

                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                {/* Category */}

                <div>
                  <label htmlFor="recurring-category" style={labelStyle}>
                    Category
                  </label>

                  <input
                    id="recurring-category"
                    name="category"
                    list="recurring-category-options"
                    value={form.category}
                    onChange={handleChange}
                    placeholder="e.g. Housing"
                    maxLength={50}
                    style={inputStyle}
                  />

                  <datalist id="recurring-category-options">
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                </div>

                {/* Merchant */}

                <div>
                  <label htmlFor="recurring-merchant" style={labelStyle}>
                    Merchant
                  </label>

                  <input
                    id="recurring-merchant"
                    name="merchant"
                    value={form.merchant}
                    onChange={handleChange}
                    placeholder="e.g. HDFC Bank"
                    maxLength={120}
                    style={inputStyle}
                  />
                </div>

                {/* Start date */}

                <div>
                  <label htmlFor="recurring-start-date" style={labelStyle}>
                    Start Date
                  </label>

                  <input
                    id="recurring-start-date"
                    name="start_date"
                    type="date"
                    value={form.start_date}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                  />
                </div>

                {/* Next due */}

                <div>
                  <label htmlFor="recurring-next-due" style={labelStyle}>
                    Next Due Date
                  </label>

                  <input
                    id="recurring-next-due"
                    name="next_due_date"
                    type="date"
                    value={form.next_due_date}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                  />
                </div>

                {/* End date */}

                <div
                  style={{
                    gridColumn: "1 / -1",
                  }}
                >
                  <label htmlFor="recurring-end-date" style={labelStyle}>
                    End Date
                    <span
                      style={{
                        marginLeft: 5,
                        fontWeight: 400,
                        color: "var(--color-muted, #6b7280)",
                      }}
                    >
                      (optional)
                    </span>
                  </label>

                  <input
                    id="recurring-end-date"
                    name="end_date"
                    type="date"
                    value={form.end_date}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>

                {/* Note */}

                <div
                  style={{
                    gridColumn: "1 / -1",
                  }}
                >
                  <label htmlFor="recurring-note" style={labelStyle}>
                    Note
                    <span
                      style={{
                        marginLeft: 5,
                        fontWeight: 400,
                        color: "var(--color-muted, #6b7280)",
                      }}
                    >
                      (optional)
                    </span>
                  </label>

                  <textarea
                    id="recurring-note"
                    name="note"
                    value={form.note}
                    onChange={handleChange}
                    placeholder="Add a note..."
                    maxLength={255}
                    rows={3}
                    style={{
                      ...inputStyle,
                      resize: "vertical",
                      minHeight: 85,
                    }}
                  />
                </div>
              </div>

              {/* Form buttons */}

              <div
                style={{
                  marginTop: 22,
                  paddingTop: 17,
                  borderTop: "1px solid var(--color-border, #e5e7eb)",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  style={{
                    minHeight: 40,
                    padding: "0 17px",
                    border: "1px solid var(--color-border, #d1d5db)",
                    borderRadius: 9,
                    background: "transparent",
                    color: "var(--color-ink, #374151)",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{
                    minHeight: 40,
                    minWidth: 145,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                  }}
                >
                  {saving ? (
                    "Saving..."
                  ) : (
                    <>
                      <CheckCircle2 size={16} />

                      {editingItem ? "Save Changes" : "Create Recurring"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =======================================================
          DELETE CONFIRMATION
      ======================================================== */}

      {deleteItem && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            background: "rgba(15, 23, 42, 0.55)",
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
              borderRadius: 17,
              background: "var(--color-surface, #ffffff)",
              padding: 23,
              boxShadow: "0 24px 70px rgba(0,0,0,0.25)",
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
                background: "rgba(239, 68, 68, 0.10)",
                color: "#dc2626",
                marginBottom: 14,
              }}
            >
              <Trash2 size={21} />
            </div>

            <h3
              style={{
                margin: "0 0 7px",
                fontSize: 18,
                color: "var(--color-ink, #111827)",
              }}
            >
              Delete recurring transaction?
            </h3>

            <p
              style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.55,
                color: "var(--color-muted, #6b7280)",
              }}
            >
              <strong>{deleteItem.title}</strong> will no longer generate
              automatic transactions. Existing transactions will not be deleted.
            </p>

            <div
              style={{
                marginTop: 21,
                display: "flex",
                justifyContent: "flex-end",
                gap: 9,
              }}
            >
              <button
                type="button"
                onClick={() => setDeleteItem(null)}
                disabled={actionId === deleteItem.id}
                style={{
                  minHeight: 40,
                  padding: "0 16px",
                  border: "1px solid var(--color-border, #d1d5db)",
                  borderRadius: 9,
                  background: "transparent",
                  color: "var(--color-ink, #374151)",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={actionId === deleteItem.id}
                style={{
                  minHeight: 40,
                  padding: "0 16px",
                  border: "none",
                  borderRadius: 9,
                  background: "#dc2626",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <Trash2 size={15} />

                {actionId === deleteItem.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================================
   SHARED FORM STYLES
========================================================= */

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
