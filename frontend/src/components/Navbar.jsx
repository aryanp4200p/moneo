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
  ArrowRight,
} from "lucide-react";

import { useAuthStore } from "../store/authStore";
import { useTransactionStore } from "../store/transactionStore";
import ThemeToggle from "./ThemeToggle";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const transactions = useTransactionStore((s) => s.transactions);
  const fetchTransactions = useTransactionStore((s) => s.fetchTransactions);

  const navigate = useNavigate();
  const location = useLocation();

  const searchRef = useRef(null);
  const notificationRef = useRef(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTransactions().catch(() => {});
    }
  }, [user, fetchTransactions]);

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

    // If no direct result exists, take the user to Transactions.
    // The page can then be searched using its own filter.
    setSearchOpen(false);
    navigate("/transactions");
  };

  const handleSearchResult = (result) => {
    setSearchOpen(false);
    setSearchQuery("");
    navigate(result.path);
  };

  /* ---------------------------------------------------------
     NOTIFICATIONS
     --------------------------------------------------------- */

  const notificationItems = useMemo(() => {
    const items = [];

    if (transactions.length > 0) {
      const latest = [...transactions].sort((a, b) =>
        String(b.date || "").localeCompare(String(a.date || "")),
      )[0];

      if (latest) {
        items.push({
          id: "latest",
          title: "Latest transaction",
          message: `${latest.merchant || latest.note || latest.category || "Transaction"} recorded.`,
        });
      }

      const expenseCount = transactions.filter(
        (transaction) => transaction.type === "expense",
      ).length;

      if (expenseCount > 0) {
        items.push({
          id: "expenses",
          title: "Spending activity",
          message: `${expenseCount} expense transaction${
            expenseCount === 1 ? "" : "s"
          } are recorded.`,
        });
      }
    }

    if (items.length === 0) {
      items.push({
        id: "welcome",
        title: "You're all caught up",
        message: "No new finance notifications right now.",
      });
    }

    return items.slice(0, 3);
  }, [transactions]);

  const hasUnreadNotifications =
    !notificationsRead && notificationItems.length > 0;

  const toggleNotifications = () => {
    setNotificationsOpen((open) => !open);
    setNotificationsRead(true);
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
                  width: 330,
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
                  }}
                >
                  <strong>Notifications</strong>

                  <button
                    type="button"
                    onClick={() => setNotificationsRead(true)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      border: 0,
                      background: "transparent",
                      color: "var(--color-accent)",
                      cursor: "pointer",
                      fontSize: 11,
                    }}
                  >
                    <Check size={13} />
                    Mark read
                  </button>
                </div>

                {notificationItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: "14px 16px",
                      borderBottom: "1px solid var(--color-line)",
                    }}
                  >
                    <strong
                      style={{
                        display: "block",
                        fontSize: 13,
                      }}
                    >
                      {item.title}
                    </strong>

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
                ))}

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
