import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Trash2,
  Inbox,
  ArrowUpRight,
  ArrowDownLeft,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import { useTransactionStore } from "../store/transactionStore";

export default function TransactionList() {
  const transactions = useTransactionStore((s) => s.transactions);
  const fetchTransactions = useTransactionStore((s) => s.fetchTransactions);
  const deleteTransaction = useTransactionStore((s) => s.deleteTransaction);
  const loading = useTransactionStore((s) => s.loading);

  // Global search support:
  // /transactions?search=amazon&highlight=123
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || "",
  );
  const [typeFilter, setTypeFilter] = useState("all");

  // Transaction ID selected by the global navbar search.
  const [highlightedId, setHighlightedId] = useState(
    searchParams.get("highlight") || "",
  );

  // Single delete
  const [deletingId, setDeletingId] = useState(null);

  // Bulk delete
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Custom confirmation modal
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    type: null,
    id: null,
  });

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // --------------------------------------------------
  // GLOBAL SEARCH -> TRANSACTION
  // --------------------------------------------------

  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    const urlHighlight = searchParams.get("highlight") || "";

    setSearchQuery(urlSearch);
    setHighlightedId(urlHighlight);
  }, [searchParams]);

  useEffect(() => {
    if (!highlightedId || loading || transactions.length === 0) {
      return;
    }

    const targetExists = transactions.some(
      (txn) => String(txn.id) === String(highlightedId),
    );

    if (!targetExists) return;

    const timer = setTimeout(() => {
      const element =
        document.getElementById(`transaction-${highlightedId}`) ||
        document.getElementById(`transaction-mobile-${highlightedId}`);

      if (!element) return;

      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      element.classList.add("transaction-search-highlight");

      const removeTimer = setTimeout(() => {
        element.classList.remove("transaction-search-highlight");
      }, 3500);

      return () => clearTimeout(removeTimer);
    }, 150);

    return () => clearTimeout(timer);
  }, [highlightedId, loading, transactions]);

  // --------------------------------------------------
  // FILTERED TRANSACTIONS
  // --------------------------------------------------

  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) => {
      const matchesType = typeFilter === "all" || txn.type === typeFilter;

      const q = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !q ||
        (txn.category && txn.category.toLowerCase().includes(q)) ||
        (txn.note && txn.note.toLowerCase().includes(q)) ||
        (txn.merchant && txn.merchant.toLowerCase().includes(q));

      return matchesType && matchesSearch;
    });
  }, [transactions, searchQuery, typeFilter]);

  const allFilteredSelected =
    filteredTransactions.length > 0 &&
    filteredTransactions.every((txn) => selectedIds.includes(txn.id));

  // --------------------------------------------------
  // CHECKBOX HANDLERS
  // --------------------------------------------------

  const toggleSelection = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((selectedId) => selectedId !== id)
        : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    const filteredIds = filteredTransactions.map((txn) => txn.id);

    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...filteredIds])]);
    }
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  // --------------------------------------------------
  // DELETE HANDLERS
  // --------------------------------------------------

  const handleDelete = (id) => {
    setDeleteModal({
      open: true,
      type: "single",
      id,
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;

    setDeleteModal({
      open: true,
      type: "bulk",
      id: null,
    });
  };

  const confirmDelete = async () => {
    if (deleteModal.type === "single") {
      const id = deleteModal.id;

      setDeleteModal({
        open: false,
        type: null,
        id: null,
      });

      setDeletingId(id);

      try {
        await deleteTransaction(id);
        setSelectedIds((prev) =>
          prev.filter((selectedId) => selectedId !== id),
        );
      } finally {
        setDeletingId(null);
      }

      return;
    }

    if (deleteModal.type === "bulk") {
      const idsToDelete = [...selectedIds];

      setDeleteModal({
        open: false,
        type: null,
        id: null,
      });

      setIsBulkDeleting(true);

      try {
        await Promise.all(idsToDelete.map((id) => deleteTransaction(id)));
        setSelectedIds([]);
      } finally {
        setIsBulkDeleting(false);
      }
    }
  };

  // Helper to format clean primary & secondary labels
  const getDisplayLabels = (txn) => {
    const merchant = txn.merchant?.trim();
    const note = txn.note?.trim();
    const primary = merchant || note || txn.category || "Transaction";
    const secondary =
      merchant && note && note.toLowerCase() !== merchant.toLowerCase()
        ? note
        : null;
    return { primary, secondary };
  };

  // --------------------------------------------------
  // LOADING & EMPTY STATES
  // --------------------------------------------------

  if (loading) {
    return (
      <div
        className="card"
        style={{
          textAlign: "center",
          padding: "40px 20px",
          color: "var(--color-ink-muted)",
        }}
      >
        Loading transactions…
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div
        className="card"
        style={{
          textAlign: "center",
          padding: "40px 20px",
        }}
      >
        <Inbox
          size={40}
          style={{
            margin: "0 auto 12px",
            color: "var(--color-ink-muted)",
            opacity: 0.7,
          }}
        />

        <h3 style={{ margin: 0 }}>No Transactions Yet</h3>

        <p
          style={{
            color: "var(--color-ink-muted)",
            marginTop: 8,
            fontSize: 14,
          }}
        >
          Add an expense above or upload a bank statement to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="card transaction-list-card">
      {/* ================================================
          HEADER
      ================================================= */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>
            Transactions ({filteredTransactions.length})
          </h3>

          {highlightedId && (
            <div
              style={{
                marginTop: 5,
                color: "var(--color-accent)",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Search result highlighted
            </div>
          )}
        </div>

        {/* Search & Type Filter */}
        <div
          className="transaction-filter-bar"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              position: "relative",
              minWidth: 200,
            }}
          >
            <Search
              size={15}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-ink-muted)",
              }}
            />

            <input
              type="text"
              className="input"
              placeholder="Search transactions…"
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setSearchQuery(value);

                const nextParams = new URLSearchParams(searchParams);

                if (value.trim()) {
                  nextParams.set("search", value);
                } else {
                  nextParams.delete("search");
                }

                nextParams.delete("highlight");

                setSearchParams(nextParams, { replace: true });
                setHighlightedId("");
              }}
              style={{
                paddingLeft: 32,
                fontSize: 13,
                height: 36,
                paddingRight: searchQuery ? 32 : 10,
              }}
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");

                  const nextParams = new URLSearchParams(searchParams);
                  nextParams.delete("search");
                  nextParams.delete("highlight");

                  setSearchParams(nextParams, { replace: true });
                  setHighlightedId("");
                }}
                aria-label="Clear transaction search"
                title="Clear search"
                style={{
                  position: "absolute",
                  right: 7,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  color: "var(--color-ink-muted)",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                  padding: 3,
                  zIndex: 2,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 4,
            }}
          >
            {["all", "expense", "income"].map((t) => (
              <button
                key={t}
                className={`btn ${
                  typeFilter === t ? "btn-accent" : "btn-ghost"
                }`}
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  textTransform: "capitalize",
                }}
                onClick={() => setTypeFilter(t)}
              >
                {t === "all" ? "All" : t === "expense" ? "Expenses" : "Income"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ================================================
          BULK ACTION BAR
      ================================================= */}

      {selectedIds.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 16,
            padding: "10px 12px",
            borderRadius: 10,
            background: "var(--color-surface-soft, rgba(255,255,255,0.04))",
            border: "1px solid var(--color-line)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <CheckSquare size={17} />
            {selectedIds.length} transaction
            {selectedIds.length !== 1 ? "s" : ""} selected
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <button
              className="btn btn-ghost"
              onClick={clearSelection}
              disabled={isBulkDeleting}
              style={{
                padding: "7px 10px",
                fontSize: 12,
              }}
            >
              <X size={14} />
              Clear
            </button>

            <button
              className="btn"
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              style={{
                padding: "7px 12px",
                fontSize: 12,
                color: "var(--color-alert)",
                borderColor: "var(--color-alert)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Trash2 size={14} />
              {isBulkDeleting ? "Deleting…" : `Delete ${selectedIds.length}`}
            </button>
          </div>
        </div>
      )}

      {/* ================================================
          NO SEARCH RESULTS
      ================================================= */}

      {filteredTransactions.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "30px 10px",
            color: "var(--color-ink-muted)",
          }}
        >
          No transactions match your search or filter.
        </div>
      ) : (
        <>
          {/* ============================================
              DESKTOP TABLE
          ============================================= */}

          <div className="desktop-transactions-table">
            <div
              style={{
                overflowX: "auto",
                width: "100%",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 14,
                }}
              >
                <thead>
                  <tr
                    style={{
                      textAlign: "left",
                      color: "var(--color-ink-muted)",
                      fontSize: 12,
                    }}
                  >
                    <th style={{ padding: "10px 6px", width: 42 }}>
                      <button
                        onClick={toggleSelectAll}
                        className="transaction-checkbox-button"
                        title={
                          allFilteredSelected ? "Deselect all" : "Select all"
                        }
                        aria-label={
                          allFilteredSelected ? "Deselect all" : "Select all"
                        }
                      >
                        {allFilteredSelected ? (
                          <CheckSquare size={17} />
                        ) : (
                          <Square size={17} />
                        )}
                      </button>
                    </th>
                    <th style={{ padding: "10px 6px" }}>Date</th>
                    <th style={{ padding: "10px 6px" }}>Category</th>
                    <th style={{ padding: "10px 6px" }}>
                      Description / Merchant
                    </th>
                    <th style={{ padding: "10px 6px", textAlign: "right" }}>
                      Amount
                    </th>
                    <th style={{ padding: "10px 6px", width: 60 }} />
                  </tr>
                </thead>

                <tbody>
                  {filteredTransactions.map((txn) => {
                    const isIncome = txn.type === "income";
                    const isSelected = selectedIds.includes(txn.id);
                    const { primary, secondary } = getDisplayLabels(txn);

                    return (
                      <tr
                        key={txn.id}
                        id={`transaction-${txn.id}`}
                        className={
                          String(txn.id) === String(highlightedId)
                            ? "transaction-search-target"
                            : ""
                        }
                        style={{
                          borderTop: "1px solid var(--color-line)",
                          transition:
                            "background-color 0.25s ease, box-shadow 0.25s ease",
                          background: isSelected
                            ? "var(--color-surface-soft, rgba(255,255,255,0.03))"
                            : undefined,
                        }}
                      >
                        <td style={{ padding: "12px 6px" }}>
                          <button
                            onClick={() => toggleSelection(txn.id)}
                            className="transaction-checkbox-button"
                            aria-label={
                              isSelected
                                ? "Deselect transaction"
                                : "Select transaction"
                            }
                          >
                            {isSelected ? (
                              <CheckSquare size={17} />
                            ) : (
                              <Square size={17} />
                            )}
                          </button>
                        </td>

                        <td
                          style={{
                            padding: "12px 6px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {txn.date}
                        </td>

                        <td style={{ padding: "12px 6px" }}>
                          <span
                            className={`pill ${
                              isIncome ? "pill-accent" : "pill-alert"
                            }`}
                          >
                            {txn.category || "Uncategorized"}
                          </span>
                        </td>

                        <td
                          style={{
                            padding: "12px 6px",
                            color: "var(--color-ink-muted)",
                          }}
                        >
                          <div
                            style={{
                              color: "var(--color-ink)",
                              fontWeight: 500,
                            }}
                          >
                            {primary}
                          </div>

                          {secondary && (
                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--color-ink-muted)",
                                marginTop: 2,
                              }}
                            >
                              {secondary}
                            </div>
                          )}
                        </td>

                        <td
                          style={{
                            padding: "12px 6px",
                            textAlign: "right",
                            color: isIncome
                              ? "var(--color-accent)"
                              : "var(--color-ink)",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            {isIncome ? (
                              <ArrowDownLeft
                                size={14}
                                style={{ color: "var(--color-accent)" }}
                              />
                            ) : (
                              <ArrowUpRight
                                size={14}
                                style={{ color: "var(--color-alert)" }}
                              />
                            )}
                            {isIncome ? "+" : "-"}₹
                            {txn.amount.toLocaleString("en-IN")}
                          </span>
                        </td>

                        <td
                          style={{
                            padding: "12px 6px",
                            textAlign: "right",
                          }}
                        >
                          <button
                            className="btn btn-ghost"
                            style={{
                              padding: "6px 8px",
                              fontSize: 12,
                              color: "var(--color-alert)",
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                            disabled={deletingId === txn.id || isBulkDeleting}
                            onClick={() => handleDelete(txn.id)}
                            title="Delete transaction"
                            aria-label="Delete transaction"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ============================================
              MOBILE TRANSACTION CARDS
          ============================================= */}

          <div className="mobile-transactions-list">
            {/* Mobile select all */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 6px",
                borderBottom: "1px solid var(--color-line)",
                fontSize: 13,
              }}
            >
              <button
                onClick={toggleSelectAll}
                className="transaction-checkbox-button"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                {allFilteredSelected ? (
                  <CheckSquare size={17} />
                ) : (
                  <Square size={17} />
                )}
                {allFilteredSelected ? "Deselect all" : "Select all"}
              </button>

              {selectedIds.length > 0 && (
                <span
                  style={{
                    color: "var(--color-ink-muted)",
                    fontSize: 12,
                  }}
                >
                  {selectedIds.length} selected
                </span>
              )}
            </div>

            {filteredTransactions.map((txn) => {
              const isIncome = txn.type === "income";
              const isSelected = selectedIds.includes(txn.id);
              const { primary, secondary } = getDisplayLabels(txn);

              return (
                <div
                  key={txn.id}
                  id={`transaction-mobile-${txn.id}`}
                  className={`mobile-transaction-item ${
                    String(txn.id) === String(highlightedId)
                      ? "transaction-search-target"
                      : ""
                  }`}
                  style={{
                    background: isSelected
                      ? "var(--color-surface-soft, rgba(255,255,255,0.03))"
                      : undefined,
                  }}
                >
                  {/* Top Row: Checkbox + Merchant/Title + Amount */}
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
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <button
                        onClick={() => toggleSelection(txn.id)}
                        className="transaction-checkbox-button"
                        style={{ marginTop: 1, flexShrink: 0 }}
                        aria-label={
                          isSelected
                            ? "Deselect transaction"
                            : "Select transaction"
                        }
                      >
                        {isSelected ? (
                          <CheckSquare size={17} />
                        ) : (
                          <Square size={17} />
                        )}
                      </button>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            color: "var(--color-ink)",
                            fontWeight: 600,
                            fontSize: 14,
                            lineHeight: 1.35,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {primary}
                        </div>

                        {secondary && (
                          <div
                            style={{
                              marginTop: 3,
                              fontSize: 12,
                              lineHeight: 1.4,
                              color: "var(--color-ink-muted)",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {secondary}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <div
                      style={{
                        flexShrink: 0,
                        textAlign: "right",
                        color: isIncome
                          ? "var(--color-accent)"
                          : "var(--color-ink)",
                        fontWeight: 700,
                        fontSize: 15,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        {isIncome ? (
                          <ArrowDownLeft
                            size={14}
                            style={{ color: "var(--color-accent)" }}
                          />
                        ) : (
                          <ArrowUpRight
                            size={14}
                            style={{ color: "var(--color-alert)" }}
                          />
                        )}
                        {isIncome ? "+" : "-"}₹
                        {txn.amount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Row: Date + Category Pill + Delete Button */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      marginTop: 10,
                      paddingLeft: 35,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 8,
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--color-ink-muted)",
                        }}
                      >
                        {txn.date}
                      </span>

                      <span
                        className={`pill ${
                          isIncome ? "pill-accent" : "pill-alert"
                        }`}
                      >
                        {txn.category || "Uncategorized"}
                      </span>
                    </div>

                    <button
                      className="btn btn-ghost"
                      style={{
                        padding: "5px 7px",
                        color: "var(--color-alert)",
                        display: "inline-flex",
                        alignItems: "center",
                        flexShrink: 0,
                      }}
                      disabled={deletingId === txn.id || isBulkDeleting}
                      onClick={() => handleDelete(txn.id)}
                      title="Delete transaction"
                      aria-label="Delete transaction"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ================================================
          CUSTOM DELETE CONFIRMATION MODAL
      ================================================= */}

      {deleteModal.open && (
        <div
          className="transaction-delete-overlay"
          onClick={() =>
            setDeleteModal({
              open: false,
              type: null,
              id: null,
            })
          }
        >
          <div
            className="transaction-delete-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "color-mix(in srgb, var(--color-alert) 12%, transparent)",
                color: "var(--color-alert)",
                marginBottom: 14,
              }}
            >
              <Trash2 size={22} />
            </div>

            <h3
              style={{
                margin: "0 0 8px",
                fontSize: 18,
              }}
            >
              {deleteModal.type === "bulk"
                ? `Delete ${selectedIds.length} Transactions?`
                : "Delete Transaction?"}
            </h3>

            <p
              style={{
                margin: "0 0 20px",
                color: "var(--color-ink-muted)",
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              {deleteModal.type === "bulk"
                ? `Are you sure you want to permanently delete ${selectedIds.length} selected transaction${
                    selectedIds.length !== 1 ? "s" : ""
                  }? This action cannot be undone.`
                : (() => {
                    const txn = transactions.find(
                      (item) => item.id === deleteModal.id,
                    );

                    if (!txn) {
                      return "Are you sure you want to delete this transaction? This action cannot be undone.";
                    }

                    return (
                      <>
                        Are you sure you want to permanently delete{" "}
                        <strong>
                          {txn.merchant || txn.note || "this transaction"}
                        </strong>{" "}
                        — ₹{txn.amount.toLocaleString("en-IN")}? This action
                        cannot be undone.
                      </>
                    );
                  })()}
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                className="btn btn-ghost"
                onClick={() =>
                  setDeleteModal({
                    open: false,
                    type: null,
                    id: null,
                  })
                }
              >
                Cancel
              </button>

              <button
                className="btn"
                onClick={confirmDelete}
                disabled={isBulkDeleting}
                style={{
                  color: "#fff",
                  background: "var(--color-alert)",
                  borderColor: "var(--color-alert)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <Trash2 size={14} />
                {deleteModal.type === "bulk"
                  ? `Delete ${selectedIds.length}`
                  : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================
          RESPONSIVE STYLES
      ================================================= */}

      <style>
        {`
          .mobile-transactions-list {
            display: none;
          }

          .mobile-transaction-item {
            position: relative;
            padding: 14px 8px;
            border-bottom: 1px solid var(--color-line);
            transition: background-color 0.25s ease, box-shadow 0.25s ease;
          }

          .mobile-transaction-item:last-child {
            border-bottom: none;
          }

          .transaction-checkbox-button {
            border: none;
            background: transparent;
            padding: 4px;
            margin: 0;
            cursor: pointer;
            color: var(--color-ink-muted);
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }

          .transaction-checkbox-button:hover {
            color: var(--color-accent);
          }

          .transaction-delete-overlay {
            position: fixed;
            inset: 0;
            z-index: 9999;
            background: rgba(0, 0, 0, 0.58);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            backdrop-filter: blur(3px);
          }

          .transaction-delete-modal {
            width: min(420px, 100%);
            background: var(--color-surface);
            border: 1px solid var(--color-line);
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
          }

          /* Global search exact-match highlight */
          .transaction-search-target {
            position: relative;
            background: var(--color-accent-soft) !important;
            box-shadow:
              inset 4px 0 0 var(--color-accent),
              0 0 0 1px var(--color-accent);
            border-radius: 8px;
          }

          .transaction-search-highlight {
            animation: transactionSearchPulse 3.5s ease-out;
          }

          @keyframes transactionSearchPulse {
            0% {
              background: var(--color-accent-soft) !important;
              box-shadow:
                inset 5px 0 0 var(--color-accent),
                0 0 0 3px var(--color-accent-soft);
            }

            70% {
              background: var(--color-accent-soft) !important;
              box-shadow:
                inset 5px 0 0 var(--color-accent),
                0 0 0 2px var(--color-accent-soft);
            }

            100% {
              background: transparent !important;
              box-shadow: none;
            }
          }

          @media (max-width: 700px) {
            .transaction-list-card {
              padding-left: 16px !important;
              padding-right: 16px !important;
            }

            .transaction-filter-bar {
              width: 100%;
              align-items: stretch !important;
            }

            .transaction-filter-bar > div:first-child {
              width: 100%;
              min-width: 0 !important;
            }

            .transaction-filter-bar input {
              width: 100%;
              box-sizing: border-box;
            }

            .transaction-filter-bar > div:last-child {
              width: 100%;
              display: grid !important;
              grid-template-columns: repeat(3, 1fr);
              gap: 6px !important;
            }

            .transaction-filter-bar > div:last-child button {
              width: 100%;
              padding-left: 6px !important;
              padding-right: 6px !important;
            }

            .desktop-transactions-table {
              display: none;
            }

            .mobile-transactions-list {
              display: block;
            }
          }

          @media (max-width: 420px) {
            .transaction-list-card {
              padding-left: 14px !important;
              padding-right: 14px !important;
            }

            .mobile-transaction-item {
              padding: 13px 4px;
            }

            .mobile-transaction-item .pill {
              font-size: 11px;
            }

            .transaction-delete-modal {
              padding: 20px;
            }
          }
        `}
      </style>
    </div>
  );
}
