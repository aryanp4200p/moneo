import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Receipt,
  ScanLine,
  PiggyBank,
  Target,
  Repeat,
  User,
  LogOut,
  Menu,
  X,
  Search,
  Bell,
  ChevronDown,
  Check,
  CheckCheck,
  ArrowRight,
  BadgeCheck,
} from "lucide-react";

import { useAuthStore } from "../store/authStore";
import { useTransactionStore } from "../store/transactionStore";
import { useBudgetStore } from "../store/budgetStore";
import ThemeToggle from "./ThemeToggle";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const GOAL_ALERT_DAYS = new Set([15, 13, 11, 9, 7, 5, 4, 3, 2, 1, 0]);
const BILL_ALERT_DAYS = new Set([7, 3, 2, 1, 0]);
const READ_EXPIRY_MS = 12 * 60 * 60 * 1000; // Auto-clear read alerts after 12 hours

function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  const clean = String(dateStr).slice(0, 10);
  const [y, m, d] = clean.split("-").map(Number);
  if (!y || !m || !d) return null;

  const target = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function parseReadMap(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const now = Date.now();
      return parsed.reduce((acc, id) => {
        acc[id] = now;
        return acc;
      }, {});
    }
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {
    // Ignore malformed storage
  }
  return {};
}

export default function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const transactions = useTransactionStore((s) => s.transactions);
  const recurringTransactions = useTransactionStore(
    (s) => s.recurringTransactions,
  );
  const fetchTransactions = useTransactionStore((s) => s.fetchTransactions);
  const fetchRecurringTransactions = useTransactionStore(
    (s) => s.fetchRecurringTransactions,
  );

  const budgetProgress = useBudgetStore((s) => s.progress);
  const fetchProgress = useBudgetStore((s) => s.fetchProgress);

  const navigate = useNavigate();
  const location = useLocation();

  const searchRef = useRef(null);
  const desktopNotifRef = useRef(null);
  const mobileNotifRef = useRef(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const userKey = user?.id || "guest";
  const readStorageKey = `fm_read_notifications_${userKey}`;
  const paidBillsStorageKey = `fm_paid_bills_${userKey}`;
  const goalsStorageKey = `fm_goals_${userKey}`;

  const [readTimestamps, setReadTimestamps] = useState(() => {
    try {
      return parseReadMap(localStorage.getItem(readStorageKey));
    } catch {
      return {};
    }
  });

  const [paidBillKeys, setPaidBillKeys] = useState(() => {
    try {
      const saved = localStorage.getItem(paidBillsStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [goals, setGoals] = useState(() => {
    try {
      const saved = localStorage.getItem(goalsStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Periodic tick every minute so 12h expired read notifications clear live
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync persisted state when user switches
  useEffect(() => {
    try {
      setReadTimestamps(parseReadMap(localStorage.getItem(readStorageKey)));
    } catch {
      setReadTimestamps({});
    }

    try {
      const savedPaid = localStorage.getItem(paidBillsStorageKey);
      setPaidBillKeys(savedPaid ? JSON.parse(savedPaid) : []);
    } catch {
      setPaidBillKeys([]);
    }

    try {
      const savedGoals = localStorage.getItem(goalsStorageKey);
      setGoals(savedGoals ? JSON.parse(savedGoals) : []);
    } catch {
      setGoals([]);
    }
  }, [readStorageKey, paidBillsStorageKey, goalsStorageKey]);

  // Listen for live updates from GoalsPage and BillsRecurringPage
  useEffect(() => {
    const syncGoals = () => {
      try {
        const saved = localStorage.getItem(goalsStorageKey);
        setGoals(saved ? JSON.parse(saved) : []);
      } catch {
        setGoals([]);
      }
    };

    const syncPaidBills = () => {
      try {
        const saved = localStorage.getItem(paidBillsStorageKey);
        setPaidBillKeys(saved ? JSON.parse(saved) : []);
      } catch {
        setPaidBillKeys([]);
      }
    };

    window.addEventListener("moneo:goals-updated", syncGoals);
    window.addEventListener("moneo:bills-updated", syncPaidBills);
    window.addEventListener("storage", () => {
      syncGoals();
      syncPaidBills();
    });

    return () => {
      window.removeEventListener("moneo:goals-updated", syncGoals);
      window.removeEventListener("moneo:bills-updated", syncPaidBills);
    };
  }, [goalsStorageKey, paidBillsStorageKey]);

  // Fetch data needed for search, budgets, and bills alerts
  useEffect(() => {
    if (user) {
      fetchTransactions().catch(() => {});
      fetchProgress().catch(() => {});
      fetchRecurringTransactions(false).catch(() => {});
    }
  }, [user, fetchTransactions, fetchProgress, fetchRecurringTransactions]);

  const handleLogout = () => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
    setNotificationsOpen(false);
    logout();
    navigate("/login");
  };

  const profileImageSrc = user?.profile_image_url
    ? user.profile_image_url.startsWith("http")
      ? user.profile_image_url
      : `${API_URL}${user.profile_image_url}`
    : null;

  const initials =
    user?.name
      ?.split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const navigationItems = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Transactions",
      path: "/transactions",
      icon: Receipt,
    },
    {
      label: "Receipt Scanner",
      path: "/receipt-scanner",
      icon: ScanLine,
    },
    {
      label: "Bills & Recurring",
      path: "/bills",
      icon: Repeat,
    },
    {
      label: "Budgets",
      path: "/budgets",
      icon: PiggyBank,
    },
    {
      label: "Goals",
      path: "/goals",
      icon: Target,
    },
    {
      label: "Profile",
      path: "/profile",
      icon: User,
    },
  ];

  const navLinkStyle = ({ isActive }) => ({
    textDecoration: "none",
    color: isActive ? "var(--color-accent)" : "var(--color-ink-muted)",
    background: isActive ? "var(--color-accent-soft)" : "transparent",
    fontWeight: isActive ? 600 : 500,
    transition: "all .2s ease",
    display: "flex",
    alignItems: "center",
    gap: 11,
    fontSize: 14,
    padding: "11px 13px",
    borderRadius: 11,
    width: "100%",
    boxSizing: "border-box",
  });

  const UserAvatar = ({ size = 38 }) => (
    <div
      className="topbar-avatar"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      {profileImageSrc ? (
        <img src={profileImageSrc} alt={`${user?.name || "User"} profile`} />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );

  /* ---------------------------------------------------------
     GLOBAL SEARCH
     --------------------------------------------------------- */

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return [];

    const results = [];

    navigationItems.forEach((item) => {
      if (item.label.toLowerCase().includes(query)) {
        results.push({
          kind: "page",
          label: item.label,
          description: `Open ${item.label}`,
          path: item.path,
          icon: item.icon,
        });
      }
    });

    transactions
      .filter((transaction) => {
        const searchable = [
          transaction.note,
          transaction.merchant,
          transaction.category,
          transaction.type,
          transaction.date,
          transaction.amount,
        ]
          .filter((value) => value !== null && value !== undefined)
          .join(" ")
          .toLowerCase();

        return searchable.includes(query);
      })
      .slice(0, 7)
      .forEach((transaction) => {
        results.push({
          kind: "transaction",
          label:
            transaction.merchant ||
            transaction.note ||
            transaction.category ||
            "Transaction",
          description: `${transaction.category || "Uncategorized"} • ${
            transaction.date || ""
          }`,
          path: `/transactions?search=${encodeURIComponent(query)}&highlight=${encodeURIComponent(
            String(transaction.id),
          )}`,
          icon: Receipt,
          transactionId: transaction.id,
        });
      });

    return results.slice(0, 9);
  }, [searchQuery, transactions]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    const query = searchQuery.trim();

    if (!query) return;

    if (searchResults.length > 0) {
      const first = searchResults[0];
      setSearchOpen(false);
      setSearchQuery("");
      navigate(first.path);
      return;
    }

    setSearchOpen(false);
    navigate("/transactions");
  };

  const handleSearchResult = (result) => {
    setSearchOpen(false);
    setSearchQuery("");
    navigate(result.path);
  };

  /* ---------------------------------------------------------
     FOCUSED NOTIFICATIONS:
     1. Goals: Achieved OR Deadline on days [15, 13, 11, 9, 7, 5, 4, 3, 2, 1, 0]
     2. Budgets: Exceeded (>100%) or Approaching (>=80%), max 2 alerts
     3. Bills & Recurring: Due on days [7, 3, 2, 1, 0] or overdue, stops when marked Paid
     Auto-clears from list 12 hours after being marked read.
     --------------------------------------------------------- */

  const paidBillSet = useMemo(() => new Set(paidBillKeys), [paidBillKeys]);

  const rawNotificationItems = useMemo(() => {
    const items = [];

    // 1. Goals (Achieved + Exact Countdown Cadence)
    goals.forEach((goal) => {
      const target = Number(goal.target || 0);
      const saved = Number(goal.saved || 0);
      const isCompleted = target > 0 && saved >= target;

      if (isCompleted) {
        items.push({
          id: `goal-achieved-${goal.id}`,
          kind: "goal",
          title: `Goal achieved: ${goal.name} 🎉`,
          message: `You reached your ₹${target.toLocaleString("en-IN")} savings target!`,
          path: "/goals",
        });
        return;
      }

      const daysLeft = getDaysUntil(goal.deadline);
      if (daysLeft !== null && GOAL_ALERT_DAYS.has(daysLeft)) {
        const remaining = Math.max(target - saved, 0);
        const dayText =
          daysLeft === 0
            ? "Deadline is today"
            : daysLeft === 1
              ? "1 day left"
              : `${daysLeft} days left`;

        items.push({
          id: `goal-deadline-${goal.id}-d${daysLeft}`,
          kind: daysLeft <= 4 ? "budget-warn" : "goal",
          title: `Goal deadline: ${goal.name} (${dayText})`,
          message:
            remaining > 0
              ? `₹${remaining.toLocaleString("en-IN")} remaining to hit your target.`
              : "Target deadline is approaching.",
          path: "/goals",
        });
      }
    });

    // 2. Budgets (Approaching >=80% or Exceeded >100%, capped at top 2)
    const budgetAlerts = [];
    budgetProgress.forEach((item) => {
      const limit = Number(item.monthly_limit ?? item.limit ?? 0);
      const spent = Number(item.spent ?? item.actual_spent ?? 0);
      if (limit <= 0) return;

      const pct = Math.round((spent / limit) * 100);
      const categoryName = item.category || "Category";
      const budgetKey = item.budget_id || item.id || categoryName;

      if (spent > limit) {
        budgetAlerts.push({
          id: `budget-exceeded-${budgetKey}`,
          kind: "budget-danger",
          severity: 2,
          pct,
          title: `Budget exceeded: ${categoryName}`,
          message: `Spent ₹${spent.toLocaleString("en-IN")} of ₹${limit.toLocaleString("en-IN")} (${pct}%).`,
          path: "/budgets",
        });
      } else if (pct >= 80) {
        budgetAlerts.push({
          id: `budget-warning-${budgetKey}`,
          kind: "budget-warn",
          severity: 1,
          pct,
          title: `Budget alert: ${categoryName} at ${pct}%`,
          message: `₹${Math.max(limit - spent, 0).toLocaleString("en-IN")} left of ₹${limit.toLocaleString("en-IN")}.`,
          path: "/budgets",
        });
      }
    });

    budgetAlerts
      .sort((a, b) => b.severity - a.severity || b.pct - a.pct)
      .slice(0, 2)
      .forEach(({ severity, pct, ...alert }) => items.push(alert));

    // 3. Bills & Recurring (Days 7, 3, 2, 1, 0 or overdue; hidden once Marked Paid)
    recurringTransactions.forEach((bill) => {
      if (!bill.is_active || !bill.next_due_date) return;

      const billCycleKey = `${bill.id}:${bill.next_due_date}`;
      if (paidBillSet.has(billCycleKey)) return;

      const daysLeft = getDaysUntil(bill.next_due_date);
      if (daysLeft === null) return;

      const isOverdue = daysLeft < 0;
      if (!isOverdue && !BILL_ALERT_DAYS.has(daysLeft)) return;

      const amountText = `₹${Number(bill.amount || 0).toLocaleString("en-IN")}`;
      const dueLabel = isOverdue
        ? `Overdue by ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"}`
        : daysLeft === 0
          ? "Due today"
          : daysLeft === 1
            ? "Due tomorrow (1 day left)"
            : `Due in ${daysLeft} days`;

      items.push({
        id: `bill-due-${bill.id}-${bill.next_due_date}-d${daysLeft}`,
        kind: isOverdue || daysLeft <= 1 ? "budget-danger" : "budget-warn",
        title: `${bill.type === "income" ? "Expected recurring" : "Bill due"}: ${bill.title}`,
        message: `${amountText} • ${dueLabel}.`,
        path: "/bills",
        billCycleKey,
      });
    });

    return items.slice(0, 7);
  }, [goals, budgetProgress, recurringTransactions, paidBillSet]);

  // Filter out notifications that were marked read >= 12 hours ago
  const notificationItems = useMemo(() => {
    return rawNotificationItems.filter((item) => {
      const readAt = readTimestamps[item.id];
      if (!readAt) return true;
      return nowMs - readAt < READ_EXPIRY_MS;
    });
  }, [rawNotificationItems, readTimestamps, nowMs]);

  const unreadCount = useMemo(
    () =>
      notificationItems.filter((item) => !Boolean(readTimestamps[item.id]))
        .length,
    [notificationItems, readTimestamps],
  );

  const hasUnreadNotifications = unreadCount > 0;

  const persistReadMap = (nextMap) => {
    const entries = Object.entries(nextMap).slice(-150);
    const trimmed = Object.fromEntries(entries);
    setReadTimestamps(trimmed);
    try {
      localStorage.setItem(readStorageKey, JSON.stringify(trimmed));
    } catch {
      // Ignore storage quota errors
    }
  };

  const handleMarkAllRead = (event) => {
    event.stopPropagation();
    if (notificationItems.length === 0) return;
    const timestamp = Date.now();
    setNowMs(timestamp);
    const nextMap = { ...readTimestamps };
    notificationItems.forEach((item) => {
      if (!nextMap[item.id]) {
        nextMap[item.id] = timestamp;
      }
    });
    persistReadMap(nextMap);
  };

  const handleMarkBillPaid = (event, billCycleKey) => {
    event.stopPropagation();
    const next = Array.from(new Set([...paidBillKeys, billCycleKey])).slice(
      -120,
    );
    setPaidBillKeys(next);
    try {
      localStorage.setItem(paidBillsStorageKey, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
    window.dispatchEvent(new Event("moneo:bills-updated"));
  };

  const handleNotificationClick = (item) => {
    if (!readTimestamps[item.id]) {
      const timestamp = Date.now();
      setNowMs(timestamp);
      persistReadMap({
        ...readTimestamps,
        [item.id]: timestamp,
      });
    }
    setNotificationsOpen(false);
    setMobileMenuOpen(false);
    if (item.path) {
      navigate(item.path);
    }
  };

  const toggleNotifications = () => {
    setNowMs(Date.now());
    setNotificationsOpen((open) => !open);
    setSearchOpen(false);
    setMobileMenuOpen(false);
  };

  /* ---------------------------------------------------------
     CLOSE DROPDOWNS WHEN CLICKING OUTSIDE
     --------------------------------------------------------- */

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }

      const insideDesktopNotif =
        desktopNotifRef.current &&
        desktopNotifRef.current.contains(event.target);
      const insideMobileNotif =
        mobileNotifRef.current && mobileNotifRef.current.contains(event.target);

      if (!insideDesktopNotif && !insideMobileNotif) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  /* ---------------------------------------------------------
     SHARED NOTIFICATIONS DROPDOWN PANEL
     --------------------------------------------------------- */

  const renderNotificationsDropdown = (isMobile = false) => (
    <div
      style={{
        position: "absolute",
        top: isMobile ? 46 : 48,
        right: isMobile ? -44 : 0,
        width: 355,
        maxWidth: "calc(100vw - 24px)",
        background: "var(--color-surface)",
        border: "1px solid var(--color-line)",
        borderRadius: 14,
        boxShadow: "0 18px 45px rgba(0,0,0,.22)",
        overflow: "hidden",
        zIndex: 2500,
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid var(--color-line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <strong>Notifications</strong>
          {hasUnreadNotifications && (
            <span
              style={{
                padding: "2px 7px",
                borderRadius: 999,
                background: "var(--color-accent-soft)",
                color: "var(--color-accent)",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {unreadCount} new
            </span>
          )}
        </div>

        {notificationItems.length > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={!hasUnreadNotifications}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              border: 0,
              background: "transparent",
              color: hasUnreadNotifications
                ? "var(--color-accent)"
                : "var(--color-ink-muted)",
              cursor: hasUnreadNotifications ? "pointer" : "default",
              fontSize: 11,
              fontWeight: 600,
              opacity: hasUnreadNotifications ? 1 : 0.75,
            }}
          >
            {hasUnreadNotifications ? (
              <>
                <Check size={13} />
                Mark read
              </>
            ) : (
              <>
                <CheckCheck size={13} />
                All read
              </>
            )}
          </button>
        )}
      </div>

      {notificationItems.length === 0 ? (
        <div
          style={{
            padding: "24px 16px",
            textAlign: "center",
          }}
        >
          <strong style={{ display: "block", fontSize: 13 }}>
            You're all caught up
          </strong>
          <span
            style={{
              display: "block",
              marginTop: 4,
              color: "var(--color-ink-muted)",
              fontSize: 12,
            }}
          >
            No upcoming bills, budget alerts, or goal deadlines right now.
          </span>
        </div>
      ) : (
        <div style={{ maxHeight: 340, overflowY: "auto" }}>
          {notificationItems.map((item) => {
            const isRead = Boolean(readTimestamps[item.id]);

            const badgeColor =
              item.kind === "budget-danger"
                ? "var(--color-alert)"
                : item.kind === "goal"
                  ? "#10B981"
                  : "var(--color-accent)";

            return (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleNotificationClick(item);
                  }
                }}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  textAlign: "left",
                  borderBottom: "1px solid var(--color-line)",
                  padding: "13px 16px",
                  background: isRead
                    ? "transparent"
                    : "var(--color-accent-soft)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  transition: "background 0.2s ease, opacity 0.2s ease",
                  opacity: isRead ? 0.8 : 1,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    marginTop: 5,
                    flexShrink: 0,
                    background: isRead ? "transparent" : badgeColor,
                    border: isRead ? "1px solid var(--color-line)" : "none",
                  }}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <strong
                      style={{
                        display: "block",
                        fontSize: 13,
                        color: "var(--color-ink)",
                        fontWeight: isRead ? 500 : 700,
                      }}
                    >
                      {item.title}
                    </strong>

                    {isRead && (
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--color-ink-muted)",
                          flexShrink: 0,
                        }}
                      >
                        Read
                      </span>
                    )}
                  </div>

                  <span
                    style={{
                      display: "block",
                      marginTop: 4,
                      color: "var(--color-ink-muted)",
                      fontSize: 12,
                      lineHeight: 1.45,
                    }}
                  >
                    {item.message}
                  </span>

                  {item.billCycleKey && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkBillPaid(e, item.billCycleKey)}
                      style={{
                        marginTop: 8,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "4px 10px",
                        borderRadius: 7,
                        border: "1px solid rgba(16, 185, 129, 0.35)",
                        background: "rgba(16, 185, 129, 0.10)",
                        color: "#10B981",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      <BadgeCheck size={13} />
                      Mark as Paid (stop alerts)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "11px 16px",
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={() => {
            setNotificationsOpen(false);
            setMobileMenuOpen(false);
            navigate("/bills");
          }}
          style={{
            border: 0,
            background: "transparent",
            color: "var(--color-accent)",
            padding: 0,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Bills & Recurring →
        </button>

        <button
          type="button"
          onClick={() => {
            setNotificationsOpen(false);
            setMobileMenuOpen(false);
            navigate("/goals");
          }}
          style={{
            border: 0,
            background: "transparent",
            color: "var(--color-ink-muted)",
            padding: 0,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Goals →
        </button>
      </div>
    </div>
  );

  /* ---------------------------------------------------------
     PUBLIC PAGES
     --------------------------------------------------------- */

  const publicPages = [
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ];

  if (!user || publicPages.includes(location.pathname)) {
    return (
      <header
        style={{
          borderBottom: "1px solid var(--color-line)",
          background: "var(--color-surface)",
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            height: 70,
          }}
        >
          <Link
            to="/"
            style={{
              textDecoration: "none",
              color: "var(--color-ink)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <img
              src="/pwa-192x192.png"
              alt="Finance Manager"
              style={{
                width: 42,
                height: 42,
                borderRadius: 11,
                objectFit: "cover",
              }}
            />
            <strong style={{ fontSize: 19 }}>Moneo</strong>
          </Link>
        </div>
      </header>
    );
  }

  return (
    <>
      {/* =====================================================
          DESKTOP SIDEBAR
      ===================================================== */}

      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <Link
            to="/dashboard"
            className="sidebar-brand-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            <img
              src="/pwa-192x192.png"
              alt="Finance Manager"
              className="sidebar-logo"
            />

            <div>
              <img
                src={
                  document.documentElement.dataset.theme === "dark"
                    ? "/brand/moneo-wordmark-dark.png"
                    : "/brand/moneo-wordmark-light.png"
                }
                alt="Moneo"
                className="moneo-wordmark"
              />
              <span>Manage Today. Build Tomorrow.</span>
            </div>
          </Link>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <p className="sidebar-section-label">MENU</p>

          {navigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink key={item.path} to={item.path} style={navLinkStyle}>
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <UserAvatar size={40} />

            <div className="sidebar-user-info">
              <strong>{user.name}</strong>
              <span>Personal account</span>
            </div>
          </div>

          <div className="sidebar-actions">
            <ThemeToggle />

            <button
              className="sidebar-logout"
              onClick={handleLogout}
              title="Log out"
              type="button"
            >
              <LogOut size={17} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* =====================================================
          DESKTOP TOPBAR
      ===================================================== */}

      <header className="app-topbar">
        {/* SEARCH */}
        <div
          ref={searchRef}
          className="topbar-search-wrapper"
          style={{
            position: "relative",
            width: "min(630px, 52vw)",
            minWidth: 280,
          }}
        >
          <form
            className="topbar-search"
            onSubmit={handleSearchSubmit}
            style={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <Search
              size={18}
              style={{
                flexShrink: 0,
                color: "var(--color-ink-muted)",
              }}
            />

            <input
              type="text"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => {
                if (searchQuery.trim()) {
                  setSearchOpen(true);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setSearchQuery("");
                  setSearchOpen(false);
                }
              }}
              placeholder="Search transactions, categories, goals..."
              aria-label="Search transactions, categories and pages"
              autoComplete="off"
              style={{
                flex: 1,
                minWidth: 0,
                width: "100%",
                border: "0",
                outline: "0",
                boxShadow: "none",
                background: "transparent",
                color: "var(--color-ink)",
                padding: "0 10px",
                fontSize: 14,
              }}
            />

            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearchQuery("");
                  setSearchOpen(false);
                }}
                style={{
                  border: 0,
                  background: "transparent",
                  color: "var(--color-ink-muted)",
                  cursor: "pointer",
                  padding: 3,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <X size={15} />
              </button>
            )}
          </form>

          {searchOpen && searchQuery.trim() && (
            <div
              className="global-search-results"
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: 0,
                width: "100%",
                background: "var(--color-surface)",
                border: "1px solid var(--color-line)",
                borderRadius: 13,
                boxShadow: "0 18px 45px rgba(0,0,0,.22)",
                overflow: "hidden",
                zIndex: 2000,
              }}
            >
              {searchResults.length > 0 ? (
                searchResults.map((result, index) => {
                  const Icon = result.icon;

                  return (
                    <button
                      key={`${result.kind}-${result.label}-${index}`}
                      type="button"
                      onClick={() => handleSearchResult(result)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 11,
                        padding: "11px 13px",
                        border: 0,
                        borderBottom:
                          index < searchResults.length - 1
                            ? "1px solid var(--color-line)"
                            : "0",
                        background: "transparent",
                        color: "var(--color-ink)",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 9,
                          display: "grid",
                          placeItems: "center",
                          background: "var(--color-accent-soft)",
                          color: "var(--color-accent)",
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={16} />
                      </span>

                      <span style={{ minWidth: 0 }}>
                        <strong
                          style={{
                            display: "block",
                            fontSize: 13,
                          }}
                        >
                          {result.label}
                        </strong>

                        <span
                          style={{
                            display: "block",
                            marginTop: 2,
                            fontSize: 11,
                            color: "var(--color-ink-muted)",
                          }}
                        >
                          {result.description}
                        </span>
                      </span>

                      <ArrowRight
                        size={14}
                        style={{
                          marginLeft: "auto",
                          color: "var(--color-ink-muted)",
                          flexShrink: 0,
                        }}
                      />
                    </button>
                  );
                })
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen(false);
                    navigate("/transactions");
                  }}
                  style={{
                    width: "100%",
                    border: 0,
                    background: "transparent",
                    color: "var(--color-ink)",
                    padding: "16px",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <strong>No direct result found</strong>
                  <span
                    style={{
                      display: "block",
                      marginTop: 4,
                      color: "var(--color-ink-muted)",
                      fontSize: 12,
                    }}
                  >
                    Press Enter or click here to open Transactions.
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="topbar-right">
          {/* NOTIFICATIONS */}
          <div
            ref={desktopNotifRef}
            style={{
              position: "relative",
            }}
          >
            <button
              className="topbar-icon-button"
              title="Notifications"
              type="button"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              onClick={toggleNotifications}
            >
              <Bell size={19} />

              {hasUnreadNotifications && <span className="notification-dot" />}
            </button>

            {notificationsOpen && renderNotificationsDropdown(false)}
          </div>

          {/* PROFILE */}
          <button
            type="button"
            className="topbar-profile"
            onClick={() => navigate("/profile")}
            style={{
              border: 0,
              background: "transparent",
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "center",
              gap: 9,
              color: "var(--color-ink)",
            }}
          >
            <UserAvatar size={40} />

            <div
              className="topbar-profile-info"
              style={{
                textAlign: "left",
              }}
            >
              <strong>{user.name}</strong>
              <span>Personal account</span>
            </div>

            <ChevronDown size={15} />
          </button>
        </div>
      </header>

      {/* =====================================================
          MOBILE HEADER
      ===================================================== */}

      <header className="mobile-app-header">
        <Link to="/dashboard" className="mobile-brand">
          <img src="/pwa-192x192.png" alt="Moneo" />
          <img
            src={
              document.documentElement.dataset.theme === "dark"
                ? "/brand/moneo-wordmark-dark.png"
                : "/brand/moneo-wordmark-light.png"
            }
            alt="Moneo"
            className="moneo-wordmark"
          />
        </Link>

        <div className="mobile-header-actions">
          {/* MOBILE NOTIFICATIONS */}
          <div
            ref={mobileNotifRef}
            style={{
              position: "relative",
            }}
          >
            <button
              className="topbar-icon-button"
              title="Notifications"
              type="button"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              onClick={toggleNotifications}
            >
              <Bell size={19} />

              {hasUnreadNotifications && <span className="notification-dot" />}
            </button>

            {notificationsOpen && renderNotificationsDropdown(true)}
          </div>

          <ThemeToggle />

          <button
            className="mobile-menu-button"
            type="button"
            onClick={() => {
              setMobileMenuOpen((open) => !open);
              setNotificationsOpen(false);
            }}
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>

      {/* =====================================================
          MOBILE DRAWER
      ===================================================== */}

      {mobileMenuOpen && (
        <div className="mobile-sidebar-drawer">
          {navigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={navLinkStyle}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <button
            className="sidebar-logout mobile-logout"
            type="button"
            onClick={handleLogout}
          >
            <LogOut size={17} />
            <span>Logout</span>
          </button>
        </div>
      )}
    </>
  );
}
