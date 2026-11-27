import { useEffect, useMemo, useState } from "react";

import {
  Plus,
  Trash2,
  Edit3,
  TrendingUp,
  Wallet,
  ShieldCheck,
  Calculator,
  RefreshCw,
} from "lucide-react";

import api from "../services/api";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const emptyItem = {
  name: "",
  kind: "asset",
  category: "Cash",
  value: "",
  note: "",
};

export default function WealthPage() {
  const [summary, setSummary] = useState(null);
  const [plan, setPlan] = useState(null);

  const [form, setForm] = useState(emptyItem);

  const [editingId, setEditingId] = useState(null);

  const [modal, setModal] = useState(false);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [planner, setPlanner] = useState({
    starting_amount: 100000,
    monthly_contribution: 10000,
    years: 15,
    annual_return_percent: 8,
    inflation_percent: 6,
  });

  const calculate = async (values) => {
    const response = await api.post("/analytics/wealth-plan", values);

    setPlan(response.data);
  };

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/wealth");

      setSummary(response.data);

      await calculate(planner);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not load wealth data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm({
      ...emptyItem,
    });

    setEditingId(null);
    setModal(true);
  };

  const openEdit = (item) => {
    setForm({
      name: item.name,
      kind: item.kind,
      category: item.category || "",
      value: item.value,
      note: item.note || "",
    });

    setEditingId(item.id);
    setModal(true);
  };

  const saveItem = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const payload = {
        ...form,
        value: Number(form.value),
      };

      if (editingId) {
        await api.put(`/wealth/items/${editingId}`, payload);
      } else {
        await api.post("/wealth/items", payload);
      }

      setModal(false);

      await load();
      window.dispatchEvent(new Event("moneo:wealth-updated"));
    } catch (err) {
      setError(err.response?.data?.detail || "Could not save wealth item.");
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (id) => {
    if (!window.confirm("Delete this wealth item?")) {
      return;
    }

    try {
      await api.delete(`/wealth/items/${id}`);

      await load();
      window.dispatchEvent(new Event("moneo:wealth-updated"));
    } catch (err) {
      setError(err.response?.data?.detail || "Could not delete item.");
    }
  };

  const assetsByCategory = useMemo(() => {
    const map = {};

    (summary?.assets || []).forEach((item) => {
      const category = item.category || "Other";

      map[category] = (map[category] || 0) + Number(item.value);
    });

    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [summary]);

  if (loading && !summary) {
    return (
      <main className="page-shell">
        <div className="card">Loading wealth planner...</div>
      </main>
    );
  }

  return (
    <main
      className="page-shell"
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "32px 24px 70px",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          gap: 20,
          marginBottom: 24,
        }}
      >
        <div>
          <p className="dashboard-eyebrow">LONG-TERM PLANNING</p>

          <h1
            style={{
              marginBottom: 8,
            }}
          >
            Wealth Planner
          </h1>

          <p className="dashboard-subtitle">
            Track net worth and explore educational savings scenarios.
          </p>
        </div>

        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} />
          Add Asset / Liability
        </button>
      </div>

      {error && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            color: "var(--color-alert)",
          }}
        >
          {error}
        </div>
      )}

      {/* SUMMARY */}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <div className="card">
          <Wallet size={20} />

          <span className="stat-label">Total Assets</span>

          <strong
            style={{
              fontSize: 24,
            }}
          >
            {money(summary?.total_assets)}
          </strong>
        </div>

        <div className="card">
          <ShieldCheck size={20} />

          <span className="stat-label">Liabilities</span>

          <strong
            style={{
              fontSize: 24,
            }}
          >
            {money(summary?.total_liabilities)}
          </strong>
        </div>

        <div className="card">
          <TrendingUp size={20} />

          <span className="stat-label">Net Worth</span>

          <strong
            style={{
              fontSize: 24,
            }}
          >
            {money(summary?.net_worth)}
          </strong>
        </div>
      </section>

      {/* SCENARIO SIMULATOR */}

      <section
        className="card"
        style={{
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 18,
          }}
        >
          <Calculator size={21} />

          <div>
            <h2
              style={{
                margin: 0,
              }}
            >
              Scenario Simulator
            </h2>

            <p
              style={{
                margin: "4px 0 0",
                color: "var(--color-ink-muted)",
                fontSize: 12,
              }}
            >
              Change assumptions to see how the projection changes.
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 16,
          }}
        >
          {[
            ["starting_amount", "Starting amount", 0, 500000, 10000],
            ["monthly_contribution", "Monthly contribution", 0, 100000, 1000],
            ["years", "Time horizon (years)", 1, 60, 1],
            [
              "annual_return_percent",
              "Illustrative annual return (%)",
              0,
              30,
              0.5,
            ],
            ["inflation_percent", "Inflation assumption (%)", 0, 20, 0.5],
          ].map(([key, label, min, max, step]) => (
            <label
              key={key}
              style={{
                display: "grid",
                gap: 7,
                fontSize: 13,
              }}
            >
              {label}

              <input
                className="input"
                type="number"
                min={min}
                max={max}
                step={step}
                value={planner[key]}
                onChange={async (event) => {
                  const next = {
                    ...planner,
                    [key]: Number(event.target.value),
                  };

                  setPlanner(next);

                  try {
                    await calculate(next);
                  } catch {
                    // Keep current
                    // projection.
                  }
                }}
              />
            </label>
          ))}
        </div>

        {plan && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
              marginTop: 20,
            }}
          >
            <div className="dashboard-stat-card">
              <span>Future value</span>

              <strong>{money(plan.future_value)}</strong>
            </div>

            <div className="dashboard-stat-card">
              <span>Today's purchasing power</span>

              <strong>{money(plan.inflation_adjusted_value)}</strong>
            </div>

            <div className="dashboard-stat-card">
              <span>Estimated growth</span>

              <strong>{money(plan.estimated_growth)}</strong>
            </div>
          </div>
        )}

        <p
          style={{
            margin: "14px 0 0",
            fontSize: 11,
            color: "var(--color-ink-muted)",
          }}
        >
          Return and inflation are editable educational assumptions. They do not
          guarantee investment returns.
        </p>
      </section>

      {/* ASSETS */}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1.15fr .85fr",
          gap: 20,
        }}
      >
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 15,
            }}
          >
            <h2
              style={{
                margin: 0,
              }}
            >
              Assets & Liabilities
            </h2>

            <button className="btn btn-ghost" onClick={load}>
              <RefreshCw size={15} />
            </button>
          </div>

          {[...(summary?.assets || []), ...(summary?.liabilities || [])]
            .length === 0 ? (
            <p
              style={{
                color: "var(--color-ink-muted)",
              }}
            >
              Add your first asset or liability to calculate net worth.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 8,
              }}
            >
              {[
                ...(summary?.assets || []),
                ...(summary?.liabilities || []),
              ].map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "11px 0",
                    borderBottom: "1px solid var(--color-line)",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                    }}
                  >
                    <strong>{item.name}</strong>

                    <span
                      style={{
                        display: "block",
                        fontSize: 11,
                        color: "var(--color-ink-muted)",
                      }}
                    >
                      {item.kind} • {item.category || "Other"}
                    </span>
                  </div>

                  <strong>{money(item.value)}</strong>

                  <button
                    className="btn btn-ghost"
                    onClick={() => openEdit(item)}
                  >
                    <Edit3 size={14} />
                  </button>

                  <button
                    className="btn btn-ghost"
                    onClick={() => removeItem(item.id)}
                    style={{
                      color: "var(--color-alert)",
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ALLOCATION */}

        <div className="card">
          <h2
            style={{
              marginTop: 0,
            }}
          >
            Asset Allocation
          </h2>

          {assetsByCategory.length === 0 ? (
            <p
              style={{
                color: "var(--color-ink-muted)",
              }}
            >
              No assets yet.
            </p>
          ) : (
            assetsByCategory.map(([category, value]) => (
              <div
                key={category}
                style={{
                  marginBottom: 13,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    marginBottom: 5,
                  }}
                >
                  <span>{category}</span>

                  <strong>{money(value)}</strong>
                </div>

                <div
                  style={{
                    height: 8,
                    background: "var(--color-line)",
                    borderRadius: 99,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(
                        100,
                        (value / (summary?.total_assets || 1)) * 100,
                      )}%`,
                      background: "var(--color-accent)",
                      borderRadius: 99,
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* MODAL */}

      {modal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.6)",
            display: "grid",
            placeItems: "center",
            zIndex: 5000,
            padding: 20,
          }}
        >
          <form
            className="card"
            onSubmit={saveItem}
            style={{
              width: "min(520px,100%)",
            }}
          >
            <h2
              style={{
                marginTop: 0,
              }}
            >
              {editingId ? "Edit" : "Add"} wealth item
            </h2>

            <div
              style={{
                display: "grid",
                gap: 12,
              }}
            >
              <input
                className="input"
                placeholder="Name"
                value={form.name}
                required
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
              />

              <select
                className="input"
                value={form.kind}
                onChange={(e) =>
                  setForm({
                    ...form,
                    kind: e.target.value,
                  })
                }
              >
                <option value="asset">Asset</option>

                <option value="liability">Liability</option>
              </select>

              <input
                className="input"
                placeholder="Category (Cash, FD, Gold...)"
                value={form.category}
                onChange={(e) =>
                  setForm({
                    ...form,
                    category: e.target.value,
                  })
                }
              />

              <input
                className="input"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Value"
                value={form.value}
                required
                onChange={(e) =>
                  setForm({
                    ...form,
                    value: e.target.value,
                  })
                }
              />

              <input
                className="input"
                placeholder="Note (optional)"
                value={form.note}
                onChange={(e) =>
                  setForm({
                    ...form,
                    note: e.target.value,
                  })
                }
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 18,
              }}
            >
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setModal(false)}
              >
                Cancel
              </button>

              <button className="btn btn-primary" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
