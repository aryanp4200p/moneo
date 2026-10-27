import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "../store/authStore";

const GOAL_COLORS = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444"];

export default function GoalsPage() {
  const user = useAuthStore((state) => state.user);

  const storageKey = `fm_goals_${user?.id || "guest"}`;

  // New users start with NO goals.
  // Existing users keep their saved goals from localStorage.
  const [goals, setGoals] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  const [form, setForm] = useState({
    name: "",
    target: "",
    saved: "",
    deadline: "",
    icon: "🎯",
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(goals));
  }, [goals, storageKey]);

  const totals = useMemo(() => {
    const target = goals.reduce(
      (sum, goal) => sum + Number(goal.target || 0),
      0,
    );

    const saved = goals.reduce((sum, goal) => sum + Number(goal.saved || 0), 0);

    return {
      target,
      saved,
      remaining: Math.max(target - saved, 0),
      progress: target > 0 ? Math.min((saved / target) * 100, 100) : 0,
    };
  }, [goals]);

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  const formatDate = (date) => {
    if (!date) return "No deadline";

    return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const openAddGoal = () => {
    setEditingGoal(null);

    setForm({
      name: "",
      target: "",
      saved: "",
      deadline: "",
      icon: "🎯",
    });

    setShowForm(true);
  };

  const openEditGoal = (goal) => {
    setEditingGoal(goal);

    setForm({
      name: goal.name,
      target: String(goal.target),
      saved: String(goal.saved),
      deadline: goal.deadline || "",
      icon: goal.icon || "🎯",
    });

    setShowForm(true);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const target = Number(form.target);
    const saved = Number(form.saved || 0);

    if (!form.name.trim() || !target || target <= 0) {
      return;
    }

    const goalData = {
      name: form.name.trim(),
      target,
      saved: Math.max(0, Math.min(saved, target)),
      deadline: form.deadline,
      icon: form.icon || "🎯",
      color:
        editingGoal?.color || GOAL_COLORS[goals.length % GOAL_COLORS.length],
    };

    if (editingGoal) {
      setGoals((current) =>
        current.map((goal) =>
          goal.id === editingGoal.id ? { ...goal, ...goalData } : goal,
        ),
      );
    } else {
      setGoals((current) => [
        ...current,
        {
          id: Date.now(),
          ...goalData,
        },
      ]);
    }

    setShowForm(false);
  };

  const deleteGoal = (id) => {
    if (!window.confirm("Delete this financial goal?")) return;

    setGoals((current) => current.filter((goal) => goal.id !== id));
  };

  const addContribution = (goal) => {
    const amountText = window.prompt(
      `How much would you like to add to "${goal.name}"?`,
      "",
    );

    if (amountText === null) return;

    const amount = Number(amountText);

    if (!amount || amount <= 0) return;

    setGoals((current) =>
      current.map((item) => {
        if (item.id !== goal.id) return item;

        return {
          ...item,
          saved: Math.min(Number(item.saved) + amount, Number(item.target)),
        };
      }),
    );
  };

  return (
    <main className="fin-dashboard">
      <section className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">FINANCIAL GOALS</p>

          <h1>Plan for what matters 🎯</h1>

          <p className="dashboard-subtitle">
            Set savings targets, track your progress, and stay focused on your
            financial goals.
          </p>
        </div>

        <button
          type="button"
          className="primary-dashboard-button"
          onClick={openAddGoal}
        >
          + Add Goal
        </button>
      </section>

      <section className="finance-summary-grid">
        <div className="finance-stat-card balance">
          <div className="stat-icon">🎯</div>

          <div>
            <span>Total Goal Target</span>
            <strong>{formatCurrency(totals.target)}</strong>
          </div>
        </div>

        <div className="finance-stat-card income">
          <div className="stat-icon">💰</div>

          <div>
            <span>Total Saved</span>
            <strong>{formatCurrency(totals.saved)}</strong>
          </div>
        </div>

        <div className="finance-stat-card expense">
          <div className="stat-icon">📌</div>

          <div>
            <span>Still Needed</span>
            <strong>{formatCurrency(totals.remaining)}</strong>
          </div>
        </div>

        <div className="finance-stat-card remaining">
          <div className="stat-icon">📊</div>

          <div>
            <span>Overall Progress</span>
            <strong>{Math.round(totals.progress)}%</strong>
          </div>
        </div>
      </section>

      <section className="dashboard-panel" style={{ marginBottom: 24 }}>
        <div className="panel-heading">
          <div>
            <h3>Your Goals</h3>
            <p>Track every target from one place</p>
          </div>

          <span className="panel-select">
            {goals.length} {goals.length === 1 ? "Goal" : "Goals"}
          </span>
        </div>

        {goals.length === 0 ? (
          <div className="budget-placeholder">
            <div style={{ fontSize: 42 }}>🎯</div>

            <strong>No financial goals yet</strong>

            <p>
              Create your first goal and start tracking how much you need to
              save.
            </p>

            <button
              type="button"
              className="primary-dashboard-button"
              onClick={openAddGoal}
            >
              Create Your First Goal
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 18,
            }}
          >
            {goals.map((goal) => {
              const target = Number(goal.target || 0);
              const saved = Number(goal.saved || 0);

              const progress =
                target > 0 ? Math.min((saved / target) * 100, 100) : 0;

              const completed = progress >= 100;

              return (
                <div
                  key={goal.id}
                  style={{
                    border: "1px solid var(--color-line)",
                    borderRadius: 18,
                    padding: 20,
                    background: "var(--color-surface)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", gap: 12 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          display: "grid",
                          placeItems: "center",
                          background: `${goal.color}20`,
                          fontSize: 24,
                        }}
                      >
                        {goal.icon}
                      </div>

                      <div>
                        <h3 style={{ margin: 0 }}>{goal.name}</h3>

                        <p
                          style={{
                            margin: "5px 0 0",
                            color: "var(--color-ink-muted)",
                            fontSize: 13,
                          }}
                        >
                          {completed
                            ? "Goal completed 🎉"
                            : `Deadline: ${formatDate(goal.deadline)}`}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openEditGoal(goal)}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "var(--color-ink-muted)",
                        cursor: "pointer",
                        fontSize: 16,
                      }}
                      title="Edit goal"
                    >
                      ✏️
                    </button>
                  </div>

                  <div style={{ marginTop: 22 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 8,
                        fontSize: 13,
                      }}
                    >
                      <span>{formatCurrency(saved)} saved</span>

                      <strong>{Math.round(progress)}%</strong>
                    </div>

                    <div
                      style={{
                        height: 9,
                        borderRadius: 999,
                        background: "var(--color-accent-soft)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${progress}%`,
                          borderRadius: 999,
                          background: goal.color,
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: 9,
                        color: "var(--color-ink-muted)",
                        fontSize: 12,
                      }}
                    >
                      <span>Target</span>
                      <span>{formatCurrency(target)}</span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 18,
                    }}
                  >
                    <button
                      type="button"
                      className="primary-dashboard-button"
                      onClick={() => addContribution(goal)}
                      style={{ flex: 1 }}
                      disabled={completed}
                    >
                      {completed ? "Completed ✓" : "+ Add Savings"}
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteGoal(goal.id)}
                      style={{
                        padding: "10px 13px",
                        borderRadius: 10,
                        border: "1px solid var(--color-line)",
                        background: "transparent",
                        color: "var(--color-alert)",
                        cursor: "pointer",
                      }}
                      title="Delete goal"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="dashboard-cta">
        <div>
          <span className="cta-icon">🌱</span>

          <div>
            <h3>Small savings. Big goals.</h3>

            <p>
              Consistent progress makes large financial goals easier to reach.
            </p>
          </div>
        </div>
      </section>

      {showForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            padding: 20,
            background: "rgba(0, 0, 0, 0.55)",
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowForm(false);
            }
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{
              width: "min(520px, 100%)",
              padding: 26,
              borderRadius: 20,
              background: "var(--color-surface)",
              border: "1px solid var(--color-line)",
              boxShadow: "0 25px 70px rgba(0,0,0,.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 22,
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>
                  {editingGoal ? "Edit Goal" : "Create a Goal"}
                </h2>

                <p
                  style={{
                    margin: "6px 0 0",
                    color: "var(--color-ink-muted)",
                    fontSize: 13,
                  }}
                >
                  Define a target and track your savings.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 22,
                  color: "var(--color-ink-muted)",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "80px 1fr",
                gap: 12,
              }}
            >
              <label>
                <span
                  style={{
                    display: "block",
                    marginBottom: 7,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Icon
                </span>

                <input
                  value={form.icon}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      icon: event.target.value,
                    })
                  }
                  maxLength={2}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: 12,
                    borderRadius: 10,
                    border: "1px solid var(--color-line)",
                    background: "var(--color-bg)",
                    color: "var(--color-ink)",
                    fontSize: 20,
                    textAlign: "center",
                  }}
                />
              </label>

              <label>
                <span
                  style={{
                    display: "block",
                    marginBottom: 7,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Goal Name
                </span>

                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: event.target.value,
                    })
                  }
                  placeholder="e.g. Savings / Buy Something"
                  style={inputStyle}
                />
              </label>
            </div>

            <label style={labelStyle}>
              <span style={labelTextStyle}>Target Amount</span>

              <input
                required
                type="number"
                min="1"
                value={form.target}
                onChange={(event) =>
                  setForm({
                    ...form,
                    target: event.target.value,
                  })
                }
                placeholder="100000"
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              <span style={labelTextStyle}>Already Saved</span>

              <input
                type="number"
                min="0"
                value={form.saved}
                onChange={(event) =>
                  setForm({
                    ...form,
                    saved: event.target.value,
                  })
                }
                placeholder="0"
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              <span style={labelTextStyle}>Target Date</span>

              <input
                type="date"
                value={form.deadline}
                onChange={(event) =>
                  setForm({
                    ...form,
                    deadline: event.target.value,
                  })
                }
                style={inputStyle}
              />
            </label>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 24,
              }}
            >
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>

              <button type="submit" className="primary-dashboard-button">
                {editingGoal ? "Save Changes" : "Create Goal"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

const labelStyle = {
  display: "block",
  marginTop: 15,
};

const labelTextStyle = {
  display: "block",
  marginBottom: 7,
  fontSize: 13,
  fontWeight: 600,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 13px",
  borderRadius: 10,
  border: "1px solid var(--color-line)",
  background: "var(--color-bg)",
  color: "var(--color-ink)",
  fontSize: 14,
  outline: "none",
};
