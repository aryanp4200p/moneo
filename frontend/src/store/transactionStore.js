import { create } from "zustand";
import api from "../services/api";

export const useTransactionStore = create((set, get) => ({
  transactions: [],
  pending: [],

  // =========================================================
  // RECURRING TRANSACTIONS
  // =========================================================

  recurringTransactions: [],
  recurringLoading: false,
  recurringError: null,

  loading: false,
  error: null,

  filters: {
    start_date: "",
    end_date: "",
  },

  // =========================================================
  // FILTERS
  // =========================================================

  setFilters: (filters) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...filters,
      },
    })),

  clearFilters: () =>
    set({
      filters: {
        start_date: "",
        end_date: "",
      },
    }),

  // =========================================================
  // FETCH TRANSACTIONS
  // =========================================================

  fetchTransactions: async (filters = null) => {
    set({
      loading: true,
      error: null,
    });

    try {
      const finalFilters = filters ?? get().filters;

      const cleanFilters = Object.fromEntries(
        Object.entries(finalFilters).filter(
          ([, value]) => value !== "" && value != null,
        ),
      );

      const { data } = await api.get("/transactions", {
        params: cleanFilters,
      });

      set({
        transactions: data,
        loading: false,
      });

      return data;
    } catch (err) {
      set({
        error: "Could not load transactions",
        loading: false,
      });

      throw err;
    }
  },

  // =========================================================
  // FETCH PENDING TRANSACTIONS
  // =========================================================

  fetchPending: async () => {
    try {
      const { data } = await api.get("/transactions/pending");

      set({
        pending: data,
      });

      return data;
    } catch (err) {
      set({
        error: "Could not load pending transactions",
      });

      throw err;
    }
  },

  // =========================================================
  // CREATE MANUAL TRANSACTION
  // =========================================================

  createTransaction: async (payload) => {
    const { data } = await api.post("/transactions", payload);

    set((state) => ({
      transactions: [
        data,
        ...state.transactions.filter(
          (transaction) => String(transaction.id) !== String(data.id),
        ),
      ],
      pending: [
        data,
        ...state.pending.filter(
          (transaction) => String(transaction.id) !== String(data.id),
        ),
      ],
    }));

    return data;
  },

  // =========================================================
  // CSV & IMAGE STATEMENT PREVIEW
  // =========================================================

  previewCSV: async (file) => {
    const formData = new FormData();

    formData.append("file", file);

    const { data } = await api.post("/transactions/preview-csv", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return data;
  },

  // =========================================================
  // CSV & IMAGE STATEMENT IMPORT
  // =========================================================

  importCSV: async (transactions) => {
    const normalizedTransactions = transactions.map((tx) => {
      const debit = Number(tx.debit) || 0;
      const credit = Number(tx.credit) || 0;
      const isCredit = credit > 0;

      return {
        ...tx,
        particulars: tx.particulars || tx.merchant || tx.note || "",
        merchant: tx.merchant || tx.particulars || "",
        note: tx.note || tx.particulars || "",
        cheque_no: tx.cheque_no || "",
        debit,
        credit,
        amount: tx.amount ?? (isCredit ? credit : debit),
        type: tx.type || (isCredit ? "income" : "expense"),
      };
    });

    const { data } = await api.post("/transactions/import-csv", {
      transactions: normalizedTransactions,
    });

    const imported = Array.isArray(data.imported) ? data.imported : [];

    set((state) => {
      const byId = new Map(
        state.transactions.map((item) => [String(item.id), item]),
      );

      imported.forEach((item) => byId.set(String(item.id), item));

      const pendingById = new Map(
        state.pending.map((item) => [String(item.id), item]),
      );

      imported.forEach((item) => {
        if (item.status === "pending_category") {
          pendingById.set(String(item.id), item);
        } else {
          pendingById.delete(String(item.id));
        }
      });

      return {
        transactions: Array.from(byId.values()),
        pending: Array.from(pendingById.values()),
      };
    });

    return data;
  },

  // =========================================================
  // OLD DIRECT CSV UPLOAD
  // Kept for compatibility
  // =========================================================

  uploadCSV: async (file) => {
    const formData = new FormData();

    formData.append("file", file);

    const { data } = await api.post("/transactions/upload-csv", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (data.imported) {
      set({
        pending: [...data.imported, ...get().pending],
      });
    }

    return data;
  },

  // =========================================================
  // CATEGORIZE TRANSACTION
  // =========================================================

  categorizeTransaction: async (id, category) => {
    const { data } = await api.patch(`/transactions/${id}/categorize`, {
      category,
    });

    set((state) => ({
      transactions: state.transactions.some(
        (transaction) => String(transaction.id) === String(id),
      )
        ? state.transactions.map((transaction) =>
            String(transaction.id) === String(id) ? data : transaction,
          )
        : [data, ...state.transactions],

      pending: state.pending.filter(
        (transaction) => String(transaction.id) !== String(id),
      ),
    }));

    return data;
  },

  // =========================================================
  // UPDATE TRANSACTION
  // =========================================================

  updateTransaction: async (id, payload) => {
    const { data } = await api.put(`/transactions/${id}`, payload);

    set({
      transactions: get().transactions.map((transaction) =>
        transaction.id === id ? data : transaction,
      ),

      pending: get().pending.map((transaction) =>
        transaction.id === id ? data : transaction,
      ),
    });

    return data;
  },

  // =========================================================
  // DELETE TRANSACTION
  // =========================================================

  deleteTransaction: async (id) => {
    await api.delete(`/transactions/${id}`);

    set({
      transactions: get().transactions.filter(
        (transaction) => transaction.id !== id,
      ),

      pending: get().pending.filter((transaction) => transaction.id !== id),
    });
  },

  // =========================================================
  // RECURRING — FETCH
  // =========================================================

  fetchRecurringTransactions: async (includeInactive = false) => {
    set({
      recurringLoading: true,
      recurringError: null,
    });

    try {
      /*
- First process any recurring transactions
- whose due date has arrived.
       */
      await api.post("/recurring-transactions/process-due");

      const { data } = await api.get("/recurring-transactions", {
        params: {
          include_inactive: true,
        },
      });

      set({
        recurringTransactions: data,
        recurringLoading: false,
      });

      /*
- Refresh normal transactions so any
- automatically generated recurring
- transactions appear immediately.
       */
      await get().fetchTransactions();

      return data;
    } catch (err) {
      set({
        recurringLoading: false,
        recurringError:
          err.response?.data?.detail ||
          "Failed to load recurring transactions.",
      });

      throw err;
    }
  },

  // =========================================================
  // RECURRING — PROCESS DUE
  // =========================================================

  processDueRecurringTransactions: async () => {
    set({
      recurringLoading: true,
      recurringError: null,
    });

    try {
      const { data } = await api.post("/recurring-transactions/process-due");

      set({
        recurringLoading: false,
      });

      /*
- Refresh both recurring and normal
- transactions after processing.
       */
      await get().fetchTransactions();

      return data;
    } catch (err) {
      set({
        recurringLoading: false,
        recurringError:
          err.response?.data?.detail ||
          "Failed to process recurring transactions.",
      });

      throw err;
    }
  },

  // =========================================================
  // RECURRING — CREATE
  // =========================================================

  createRecurringTransaction: async (payload) => {
    set({
      recurringLoading: true,
      recurringError: null,
    });

    try {
      const { data } = await api.post("/recurring-transactions", payload);

      set((state) => ({
        recurringTransactions: [...state.recurringTransactions, data],
        recurringLoading: false,
      }));

      return data;
    } catch (err) {
      set({
        recurringLoading: false,
        recurringError:
          err.response?.data?.detail ||
          "Failed to create recurring transaction.",
      });

      throw err;
    }
  },

  // =========================================================
  // RECURRING — UPDATE
  // =========================================================

  updateRecurringTransaction: async (id, payload) => {
    set({
      recurringLoading: true,
      recurringError: null,
    });

    try {
      const { data } = await api.put(`/recurring-transactions/${id}`, payload);

      set((state) => ({
        recurringTransactions: state.recurringTransactions.map((item) =>
          item.id === id ? data : item,
        ),

        recurringLoading: false,
      }));

      return data;
    } catch (err) {
      set({
        recurringLoading: false,
        recurringError:
          err.response?.data?.detail ||
          "Failed to update recurring transaction.",
      });

      throw err;
    }
  },

  // =========================================================
  // RECURRING — PAUSE / RESUME
  // =========================================================

  toggleRecurringTransaction: async (id) => {
    set({
      recurringLoading: true,
      recurringError: null,
    });

    try {
      const { data } = await api.patch(`/recurring-transactions/${id}/toggle`);

      set((state) => ({
        recurringTransactions: state.recurringTransactions.map((item) =>
          item.id === id ? data : item,
        ),

        recurringLoading: false,
      }));

      return data;
    } catch (err) {
      set({
        recurringLoading: false,
        recurringError:
          err.response?.data?.detail ||
          "Failed to change recurring transaction status.",
      });

      throw err;
    }
  },

  // =========================================================
  // RECURRING — DELETE
  // =========================================================

  deleteRecurringTransaction: async (id) => {
    set({
      recurringLoading: true,
      recurringError: null,
    });

    try {
      await api.delete(`/recurring-transactions/${id}`);

      set((state) => ({
        recurringTransactions: state.recurringTransactions.filter(
          (item) => item.id !== id,
        ),

        recurringLoading: false,
      }));
    } catch (err) {
      set({
        recurringLoading: false,
        recurringError:
          err.response?.data?.detail ||
          "Failed to delete recurring transaction.",
      });

      throw err;
    }
  },

  // =========================================================
  // CLEAR RECURRING ERROR
  // =========================================================

  clearRecurringError: () => {
    set({
      recurringError: null,
    });
  },

  // =========================================================
  // CLEAR GENERAL ERROR
  // =========================================================

  clearError: () => {
    set({
      error: null,
    });
  },
}));
