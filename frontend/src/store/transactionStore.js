import { create } from "zustand";
import api from "../services/api";

export const useTransactionStore = create((set, get) => ({
  transactions: [],
  pending: [],

  // =========================================================
  // PAGINATION STATE
  // =========================================================

  paginatedTransactions: [],
  pagination: {
    page: 1,
    limit: 25,
    total: 0,
    pages: 1,
  },
  paginatedLoading: false,

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
    category: "",
    type: "",
  },

  // =========================================================
  // FILTERS & PAGINATION CONTROLS
  // =========================================================

  setFilters: (filters) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...filters,
      },
      pagination: {
        ...state.pagination,
        page: 1, // Reset to page 1 whenever filters change
      },
    })),

  clearFilters: () =>
    set((state) => ({
      filters: {
        start_date: "",
        end_date: "",
        category: "",
        type: "",
      },
      pagination: {
        ...state.pagination,
        page: 1,
      },
    })),

  setPage: (page) =>
    set((state) => ({
      pagination: {
        ...state.pagination,
        page: Math.max(1, Math.min(page, state.pagination.pages || 1)),
      },
    })),

  setPageLimit: (limit) =>
    set((state) => ({
      pagination: {
        ...state.pagination,
        limit,
        page: 1,
      },
    })),

  // =========================================================
  // FETCH PAGINATED TRANSACTIONS (FOR TRANSACTION LIST TABLE)
  // =========================================================

  fetchPaginatedTransactions: async (overrides = {}) => {
    set({
      paginatedLoading: true,
      error: null,
    });

    try {
      const currentPagination = get().pagination;
      const finalFilters = overrides.filters ?? get().filters;
      const page = overrides.page ?? currentPagination.page;
      const limit = overrides.limit ?? currentPagination.limit;

      const cleanFilters = Object.fromEntries(
        Object.entries(finalFilters).filter(
          ([, value]) => value !== "" && value != null,
        ),
      );

      const { data } = await api.get("/transactions/paginated", {
        params: {
          ...cleanFilters,
          page,
          limit,
        },
      });

      set({
        paginatedTransactions: data.items || [],
        pagination: {
          page: data.page,
          limit: data.limit,
          total: data.total,
          pages: data.pages,
        },
        paginatedLoading: false,
      });

      return data;
    } catch (err) {
      set({
        error: "Could not load transactions",
        paginatedLoading: false,
      });

      throw err;
    }
  },

  // =========================================================
  // FETCH TRANSACTIONS (BACKWARD-COMPATIBLE FOR CHARTS/DASHBOARD)
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

    // Refresh current page metadata
    await get().fetchPaginatedTransactions({ page: 1 });

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

    await get().fetchPaginatedTransactions({ page: 1 });

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

    await get().fetchPaginatedTransactions({ page: 1 });

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

      paginatedTransactions: state.paginatedTransactions.map((transaction) =>
        String(transaction.id) === String(id) ? data : transaction,
      ),

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

      paginatedTransactions: get().paginatedTransactions.map((transaction) =>
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

      paginatedTransactions: get().paginatedTransactions.filter(
        (transaction) => transaction.id !== id,
      ),

      pending: get().pending.filter((transaction) => transaction.id !== id),
    });

    await get().fetchPaginatedTransactions();
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

      await get().fetchTransactions();
      await get().fetchPaginatedTransactions();

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

      await get().fetchTransactions();
      await get().fetchPaginatedTransactions();

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
