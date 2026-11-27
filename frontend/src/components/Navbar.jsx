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
} from "lucide-react";

import api from "../services/api";
import { useAuthStore } from "../store/authStore";
import { useTransactionStore } from "../store/transactionStore";
import { useBudgetStore } from "../store/budgetStore";
import ThemeToggle from "./ThemeToggle";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const transactions = useTransactionStore((s) => s.transactions);
  const pendingTransactions = useTransactionStore((s) => s.pending);
  const fetchTransactions = useTransactionStore((s) => s.fetchTransactions);
  const fetchPending = useTransactionStore((s) => s.fetchPending);

  const budgetProgress = useBudgetStore((s) => s.progress);
  const fetchProgress = useBudgetStore((s) => s.fetchProgress);

  const navigate = useNavigate();
  const location = useLocation();

  const searchRef = useRef(null);
  const notificationRef = useRef(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [wealthSummary, setWealthSummary] = useState(null);

  // Persisted read notification IDs per user
  const readStorageKey = `fm_read_notifications_${user?.id || "guest"}`;
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem(readStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Track goals from localStorage (same key as GoalsPage.jsx)
  const goalsStorageKey = `fm_goals_${user?.id || "guest"}`;
  const [goals, setGoals] = useState(() => {
    try {
      const saved = localStorage.getItem(goalsStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Reload persisted read IDs & goals when user changes
  useEffect(() => {
    try {
      const savedRead = localStorage.getItem(readStorageKey);
      setReadIds(savedRead ? JSON.parse(savedRead) : []);
    } catch {
      setReadIds([]);
    }

    try {
      const savedGoals = localStorage.getItem(goalsStorageKey);
      setGoals(savedGoals ? JSON.parse(savedGoals) : []);
    } catch {
      setGoals([]);
    }
  }, [readStorageKey, goalsStorageKey]);

  // Listen for live goal updates (same tab + cross-tab)
  useEffect(() => {
    const syncGoals = () => {
      try {
        const saved = localStorage.getItem(goalsStorageKey);
        setGoals(saved ? JSON.parse(saved) : []);
      } catch {
        setGoals([]);
      }
    };

    window.addEventListener("moneo:goals-updated", syncGoals);
    window.addEventListener("storage", syncGoals);

    return () => {
      window.removeEventListener("moneo:goals-updated", syncGoals);
      window.removeEventListener("storage", syncGoals);
    };
  }, [goalsStorageKey]);

  // Fetch transactions, pending items, and budget progress for live alerts
  useEffect(() => {
    if (user) {
      fetchTransactions().catch(() => {});
      fetchPending().catch(() => {});
      fetchProgress().catch(() => {});
    }
  }, [user, fetchTransactions, fetchPending, fetchProgress]);

  // Fetch wealth summary & listen for live updates from WealthPage
  useEffect(() => {
    if (!user) return;

    const loadWealth = () => {
      api
        .get("/wealth")
        .then((res) => setWealthSummary(res.data))
        .catch(() => {});
    };

    loadWealth();
    window.addEventListener("moneo:wealth-updated", loadWealth);
    return () => window.removeEventListener("moneo:wealth-updated", loadWealth);
  }, [user]);

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
     DYNAMIC NOTIFICATIONS (TRANSACTIONS, BUDGETS, GOALS & WEALTH)
     --------------------------------------------------------- */

  const notificationItems = useMemo(() => {
    const items = [];

    // 1. Achieved Goals
    goals.forEach((goal) => {
      const target = Number(goal.target || 0);
      const saved = Number(goal.saved || 0);
      if (target > 0 && saved >= target) {
        items.push({
          id: `goal-achieved-${goal.id}`,
          kind: "goal",
          title: `Goal achieved: ${goal.name} 🎉`,
          message: `You reached your ₹${target.toLocaleString("en-IN")} savings target!`,
          path: "/goals",
        });
      }
    });

    // 2. Budget Exceeded or Approaching Limit (>= 80%)
    budgetProgress.forEach((item) => {
      const limit = Number(item.monthly_limit ?? item.limit ?? 0);
      const spent = Number(item.spent ?? item.actual_spent ?? 0);
      if (limit <= 0) return;

      const pct = Math.round((spent / limit) * 100);
      const categoryName = item.category || "Category";
      const budgetKey = item.budget_id || item.id || categoryName;

      if (spent > limit) {
        items.push({
          id: `budget-exceeded-${budgetKey}-${pct}`,
          kind: "budget-danger",
          title: `Budget exceeded: ${categoryName}`,
          message: `Spent ₹${spent.toLocaleString("en-IN")} of ₹${limit.toLocaleString("en-IN")} (${pct}%).`,
          path: "/budgets",
        });
      } else if (pct >= 80) {
        items.push({
          id: `budget-warning-${budgetKey}-${pct}`,
          kind: "budget-warn",
          title: `Budget alert: ${categoryName} at ${pct}%`,
          message: `₹${Math.max(limit - spent, 0).toLocaleString("en-IN")} remaining out of ₹${limit.toLocaleString("en-IN")}.`,
          path: "/budgets",
        });
      }
    });

    // 3. Latest Transaction Added
    if (transactions.length > 0) {
      const latest = [...transactions].sort((a, b) => {
        const dateCmp = String(b.date || "").localeCompare(
          String(a.date || ""),
        );
        if (dateCmp !== 0) return dateCmp;
        return Number(b.id || 0) - Number(a.id || 0);
      })[0];

      if (latest) {
        const label =
          latest.merchant || latest.note || latest.category || "Transaction";
        const sign = latest.type === "income" ? "+" : "-";
        const amountText =
          latest.amount != null
            ? ` (${sign}₹${Number(latest.amount).toLocaleString("en-IN")})`
            : "";

        items.push({
          id: `txn-${latest.id}`,
          kind: "transaction",
          title: "New transaction added",
          message: `${label}${amountText} recorded.`,
          path: "/transactions",
        });
      }
    }

    // 4. Pending Categorization Alert
    if (pendingTransactions.length > 0) {
      items.push({
        id: `pending-txns-${pendingTransactions.length}`,
        kind: "transaction",
        title: "Uncategorized transactions",
        message: `${pendingTransactions.length} transaction${
          pendingTransactions.length === 1 ? "" : "s"
        } need a category.`,
        path: "/transactions",
      });
    }

    // 5. Net Worth Milestone (every ₹1,00,000 crossed)
    const netWorth = Number(wealthSummary?.net_worth || 0);
    if (netWorth >= 100000) {
      const lakhMilestone = Math.floor(netWorth / 100000);
      items.push({
        id: `wealth-milestone-${lakhMilestone}L`,
        kind: "goal",
        title: `Net worth milestone: ₹${lakhMilestone}L+`,
        message: `Your net worth reached ₹${netWorth.toLocaleString("en-IN")}.`,
        path: "/wealth",
      });
    }

    return items.slice(0, 8);
  }, [transactions, pendingTransactions, budgetProgress, goals, wealthSummary]);

  const readIdSet = useMemo(() => new Set(readIds), [readIds]);

  const unreadCount = useMemo(
    () => notificationItems.filter((item) => !readIdSet.has(item.id)).length,
    [notificationItems, readIdSet],
  );

  const hasUnreadNotifications = unreadCount > 0;

  const persistReadIds = (nextIds) => {
    const trimmed = Array.from(new Set(nextIds)).slice(-100);
    setReadIds(trimmed);
    try {
      localStorage.setItem(readStorageKey, JSON.stringify(trimmed));
    } catch {
      // Ignore storage quota errors
    }
  };

  const handleMarkAllRead = (event) => {
    event.stopPropagation();
    if (notificationItems.length === 0) return;
    persistReadIds([...readIds, ...notificationItems.map((item) => item.id)]);
  };

  const handleNotificationClick = (item) => {
    if (!readIdSet.has(item.id)) {
      persistReadIds([...readIds, item.id]);
    }
    setNotificationsOpen(false);
    if (item.path) {
      navigate(item.path);
    }
  };

  // Opening the bell shows the list WITHOUT automatically marking everything read
  const toggleNotifications = () => {
    setNotificationsOpen((open) => !open);
    setSearchOpen(false);
  };

  /* ---------------------------------------------------------
     CLOSE DROPDOWNS WHEN CLICKING OUTSIDE
     --------------------------------------------------------- */

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

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
            ref={notificationRef}
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

            {notificationsOpen && (
              <div
                style={{
                  position: "absolute",
                  top: 48,
                  right: 0,
                  width: 340,
                  maxWidth: "calc(100vw - 30px)",
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
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
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
                      padding: "22px 16px",
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
                      No new finance notifications right now.
                    </span>
                  </div>
                ) : (
                  <div style={{ maxHeight: 320, overflowY: "auto" }}>
                    {notificationItems.map((item) => {
                      const isRead = readIdSet.has(item.id);

                      const badgeColor =
                        item.kind === "budget-danger"
                          ? "var(--color-alert)"
                          : item.kind === "goal"
                            ? "#10B981"
                            : "var(--color-accent)";

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleNotificationClick(item)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            border: 0,
                            borderBottom: "1px solid var(--color-line)",
                            padding: "13px 16px",
                            background: isRead
                              ? "transparent"
                              : "var(--color-accent-soft)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                            transition:
                              "background 0.2s ease, opacity 0.2s ease",
                            opacity: isRead ? 0.78 : 1,
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
                              border: isRead
                                ? "1px solid var(--color-line)"
                                : "none",
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
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen(false);
                    navigate("/transactions");
                  }}
                  style={{
                    width: "100%",
                    border: 0,
                    background: "transparent",
                    color: "var(--color-accent)",
                    padding: "12px 16px",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  View transactions →
                </button>
              </div>
            )}
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
          <ThemeToggle />

          <button
            className="mobile-menu-button"
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
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
