import React, { useEffect, useRef, useState } from "react";
import {
  UserCircle,
  Mail,
  Activity,
  FileText,
  Download,
  Pencil,
  Save,
  X,
  Lock,
  LogOut,
  Eye,
  EyeOff,
  UserCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Camera,
  Trash2,
  Monitor,
  Smartphone,
  Globe,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";

import { useAuthStore } from "../store/authStore";
import API from "../services/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const ProfilePage = () => {
  const {
    user,
    logout,
    updateUser,
    fetchSessions,
    revokeSession,
    logoutOtherSessions,
  } = useAuthStore();

  const [downloading, setDownloading] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Profile image
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState("");
  // ==========================================================
  // ACTIVE SESSIONS
  // ==========================================================

  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState(null);
  const [loggingOutOthers, setLoggingOutOthers] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [sessionSuccess, setSessionSuccess] = useState("");

  const fileInputRef = useRef(null);

  // Password status
  const [passwordStatus, setPasswordStatus] = useState({
    type: null,
    message: "",
  });

  const [reportError, setReportError] = useState("");
  const [categoryReportLoading, setCategoryReportLoading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || "");
  const [savingName, setSavingName] = useState(false);
  const [nameStatus, setNameStatus] = useState({ type: null, message: "" });

  // Password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Password visibility
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Account deletion
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Report filters
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // User initials fallback
  const initials =
    user?.name
      ?.split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "U";

  // ==========================================================
  // Profile image upload
  // ==========================================================

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    setImageError("");

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setImageError("Only JPG, PNG, and WEBP images are allowed.");

      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError("Profile image must be smaller than 5 MB.");

      e.target.value = "";
      return;
    }

    const formData = new FormData();

    formData.append("file", file);

    setUploadingImage(true);

    try {
      const { data } = await API.post("/auth/profile-image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      updateUser(data);
    } catch (error) {
      console.error("Profile image upload failed:", error);

      setImageError(
        error.response?.data?.detail || "Failed to upload profile image.",
      );
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  // ==========================================================
  // Remove profile image
  // ==========================================================

  const handleRemoveProfileImage = async () => {
    if (!user?.profile_image_url) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to remove your profile picture?",
    );

    if (!confirmed) {
      return;
    }

    setImageError("");
    setUploadingImage(true);

    try {
      const { data } = await API.delete("/auth/profile-image");

      updateUser(data);
    } catch (error) {
      console.error("Failed to remove profile image:", error);

      setImageError(
        error.response?.data?.detail || "Failed to remove profile image.",
      );
    } finally {
      setUploadingImage(false);
    }
  };

  // ==========================================================
  // Download PDF report
  // ==========================================================

  const handleDownloadReport = async () => {
    setDownloading(true);
    setReportError("");

    try {
      const response = await API.get("/reports/pdf", {
        params: {
          year: selectedYear,
          month: selectedMonth,
        },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));

      const link = document.createElement("a");

      link.href = url;

      link.setAttribute(
        "download",
        `financial_report_${selectedYear}_${String(selectedMonth).padStart(
          2,
          "0",
        )}.pdf`,
      );

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download PDF report", error);

      setReportError(
        "Failed to generate report. Please ensure transactions exist for the selected month.",
      );
    } finally {
      setDownloading(false);
    }
  };

  // ==========================================================
  // Download category-wise PDF (separate from existing statement)
  // ==========================================================

  const handleDownloadCategoryReport = async () => {
    setCategoryReportLoading(true);
    setReportError("");
    try {
      const response = await API.get("/reports/category-pdf", {
        params: { year: selectedYear, month: selectedMonth },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `category_report_${selectedYear}_${String(selectedMonth).padStart(2, "0")}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download category PDF", error);
      setReportError(
        error.response?.data?.detail ||
          "Failed to generate category-wise report.",
      );
    } finally {
      setCategoryReportLoading(false);
    }
  };

  // ==========================================================
  // Rename profile (uses existing PUT /auth/profile endpoint)
  // ==========================================================

  const handleSaveName = async () => {
    const name = editedName.trim();
    if (!name) {
      setNameStatus({ type: "error", message: "Name cannot be empty." });
      return;
    }
    setSavingName(true);
    setNameStatus({ type: null, message: "" });
    try {
      const { data } = await API.put("/auth/profile", null, {
        params: { name },
      });
      updateUser(data);
      setEditedName(data.name || name);
      setIsEditingName(false);
      setNameStatus({ type: "success", message: "Name updated successfully." });
    } catch (error) {
      setNameStatus({
        type: "error",
        message: error.response?.data?.detail || "Could not update your name.",
      });
    } finally {
      setSavingName(false);
    }
  };

  // ==========================================================
  // Password update
  // ==========================================================

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();

    setPasswordStatus({
      type: null,
      message: "",
    });

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordStatus({
        type: "error",
        message: "Please fill in all password fields.",
      });

      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({
        type: "error",
        message: "New password and confirmation do not match.",
      });

      return;
    }

    if (newPassword.length < 8) {
      setPasswordStatus({
        type: "error",
        message: "New password must be at least 8 characters.",
      });

      return;
    }

    setUpdatingPassword(true);

    try {
      await API.put("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });

      setPasswordStatus({
        type: "success",
        message: "Password updated successfully!",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Password update error:", error);

      setPasswordStatus({
        type: "error",
        message:
          error.response?.data?.detail ||
          error.response?.data?.message ||
          "Failed to update password.",
      });
    } finally {
      setUpdatingPassword(false);
    }
  };

  // ==========================================================
  // Delete account
  // ==========================================================

  const handleDeleteAccount = async () => {
    setDeleteError("");

    if (!deletePassword.trim()) {
      setDeleteError("Please enter your password.");

      return;
    }

    setDeletingAccount(true);

    try {
      await API.delete("/auth/account", {
        data: {
          password: deletePassword,
        },
      });

      // Clear local authentication
      logout();

      // Redirect to login
      window.location.href = "/login";
    } catch (error) {
      console.error("Account deletion failed:", error);

      setDeleteError(
        error.response?.data?.detail ||
          "Failed to delete account. Please try again.",
      );

      setDeletingAccount(false);
    }
  };

  // ==========================================================
  // ACTIVE SESSIONS
  // ==========================================================

  const loadSessions = async () => {
    setLoadingSessions(true);
    setSessionError("");

    try {
      const data = await fetchSessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load sessions:", error);
      setSessionError(
        error.response?.data?.detail || "Failed to load active sessions.",
      );
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    if (!window.confirm("Are you sure you want to sign out this session?")) {
      return;
    }

    setRevokingSessionId(sessionId);
    setSessionError("");
    setSessionSuccess("");

    try {
      const success = await revokeSession(sessionId);

      if (!success) {
        throw new Error("Failed to revoke session");
      }

      setSessionSuccess("Session revoked successfully.");
      await loadSessions();
    } catch (error) {
      console.error("Failed to revoke session:", error);
      setSessionError(
        error.response?.data?.detail || "Failed to revoke session.",
      );
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleLogoutOtherSessions = async () => {
    if (
      !window.confirm(
        "This will sign out all other devices and browsers. Continue?",
      )
    ) {
      return;
    }

    setLoggingOutOthers(true);
    setSessionError("");
    setSessionSuccess("");

    try {
      const success = await logoutOtherSessions();

      if (!success) {
        throw new Error("Failed to logout other sessions");
      }

      setSessionSuccess("All other sessions have been signed out.");
      await loadSessions();
    } catch (error) {
      console.error("Failed to logout other sessions:", error);
      setSessionError(
        error.response?.data?.detail || "Failed to logout other sessions.",
      );
    } finally {
      setLoggingOutOthers(false);
    }
  };

  const getSessionIcon = (deviceName = "") => {
    const device = deviceName.toLowerCase();

    if (
      device.includes("mobile") ||
      device.includes("android") ||
      device.includes("iphone") ||
      device.includes("ipad")
    ) {
      return <Smartphone size={20} />;
    }

    if (
      device.includes("windows") ||
      device.includes("mac") ||
      device.includes("linux") ||
      device.includes("chrome") ||
      device.includes("firefox") ||
      device.includes("edge")
    ) {
      return <Monitor size={20} />;
    }

    return <Globe size={20} />;
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // ==========================================================
  // Render
  // ==========================================================

  return (
    <div
      className="container"
      style={{
        paddingTop: 32,
        paddingBottom: 60,
      }}
    >
      <div
        className="profile-container"
        style={{
          maxWidth: 960,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          width: "100%",
          minWidth: 0,
        }}
      >
        {/* ==================================================
            HEADER HERO CARD
        ================================================== */}

        <div
          className="profile-hero"
          style={{
            background:
              "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #0f766e 100%)",
            borderRadius: "var(--radius)",
            minHeight: 216,
            height: "auto",
            maxHeight: "none",
            overflow: "visible",
            padding: "28px 40px",
            color: "#ffffff",
            boxShadow: "var(--shadow)",
            boxSizing: "border-box",
            // overflow: "hidden",
          }}
        >
          <div
            className="profile-hero-inner"
            style={{
              minHeight: 160,
              display: "flex",
              alignItems: "center",
              gap: 28,
              width: "100%",
              minWidth: 0,
            }}
          >
            {/* Profile picture */}

            <div
              className="profile-hero-avatar"
              style={{
                position: "relative",
                width: 100,
                height: 100,
                minWidth: 100,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 24,
                  backgroundColor: "#ffffff",
                  color: "#1e3a8a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 42,
                  fontWeight: 800,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  overflow: "hidden",
                }}
              >
                {user?.profile_image_url ? (
                  <img
                    src={`${API_URL}${user.profile_image_url}`}
                    alt={`${user.name}'s profile`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  initials
                )}
              </div>

              {/* Camera button */}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                title="Change profile picture"
                style={{
                  position: "absolute",
                  right: -7,
                  bottom: -7,
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: "3px solid #ffffff",
                  background: "#2563eb",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: uploadingImage ? "not-allowed" : "pointer",
                  opacity: uploadingImage ? 0.7 : 1,
                  zIndex: 2,
                }}
              >
                {uploadingImage ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Camera size={16} />
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleProfileImageUpload}
                style={{
                  display: "none",
                }}
              />
            </div>

            {/* User information */}

            <div
              className="profile-hero-info"
              style={{
                minWidth: 0,
                flex: 1,
                height: "auto",
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <h1
                style={{
                  color: "#ffffff",
                  fontSize: 36,
                  lineHeight: 1.1,
                  margin: "0 0 10px",
                  fontWeight: 700,
                }}
              >
                {user?.name || "Finance User"}
              </h1>

              <div
                className="profile-hero-email"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  opacity: 0.9,
                  fontSize: 17,
                  marginBottom: 14,
                }}
              >
                <Mail size={17} />
                <span>{user?.email || "user@example.com"}</span>
              </div>

              {/* All profile actions stay on ONE row.
                  This prevents the card height from increasing when
                  the Remove Photo button appears. */}

              <div
                className="profile-hero-actions"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  minHeight: 36,
                  flexWrap: "wrap",
                  whiteSpace: "normal",
                }}
              >
                {user?.profile_image_url && (
                  <button
                    type="button"
                    onClick={handleRemoveProfileImage}
                    disabled={uploadingImage}
                    style={{
                      height: 36,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      border: "none",
                      background: "rgba(255,255,255,0.15)",
                      color: "#ffffff",
                      padding: "0 14px",
                      borderRadius: 8,
                      cursor: uploadingImage ? "not-allowed" : "pointer",
                      fontSize: 14,
                      fontWeight: 500,
                    }}
                  >
                    <Trash2 size={14} />
                    Remove Photo
                  </button>
                )}

                <span
                  style={{
                    height: 36,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "0 14px",
                    borderRadius: 8,
                    background: "rgba(255, 255, 255, 0.2)",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  <UserCheck size={15} />
                  User
                </span>

                <span
                  style={{
                    height: 36,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "0 14px",
                    borderRadius: 8,
                    background: "rgba(16, 185, 129, 0.9)",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  <Activity size={15} />
                  Active Account
                </span>
              </div>

              {/* Image error */}

              {imageError && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    bottom: -2,
                    padding: "5px 10px",
                    borderRadius: 7,
                    background: "rgba(239,68,68,0.2)",
                    color: "#fecaca",
                    fontSize: 11,
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {imageError}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ==================================================
            INFO GRID
        ================================================== */}

        <div className="grid-2">
          {/* Account Details */}

          <div className="card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
                paddingBottom: 12,
                borderBottom: "1px solid var(--color-line)",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: "var(--color-accent-soft)",
                  color: "var(--color-accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <UserCircle size={20} />
              </div>

              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 16,
                  }}
                >
                  Account Details
                </h3>

                <span
                  style={{
                    fontSize: 12,
                    color: "var(--color-ink-muted)",
                  }}
                >
                  Your personal profile information
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                fontSize: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingBottom: 10,
                  borderBottom: "1px solid var(--color-line)",
                }}
              >
                <span
                  style={{
                    color: "var(--color-ink-muted)",
                  }}
                >
                  Full Name
                </span>

                {isEditingName ? (
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      flexWrap: "wrap",
                      justifyContent: "flex-end",
                    }}
                  >
                    <input
                      className="input"
                      aria-label="New display name"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      maxLength={120}
                      style={{ maxWidth: 220, minWidth: 140 }}
                    />
                    <button
                      type="button"
                      className="btn btn-accent"
                      onClick={handleSaveName}
                      disabled={savingName}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      {savingName ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Save size={14} />
                      )}{" "}
                      Save
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setIsEditingName(false);
                        setEditedName(user?.name || "");
                        setNameStatus({ type: null, message: "" });
                      }}
                      disabled={savingName}
                      aria-label="Cancel rename"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <strong>{user?.name || "N/A"}</strong>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setEditedName(user?.name || "");
                        setIsEditingName(true);
                        setNameStatus({ type: null, message: "" });
                      }}
                      aria-label="Rename profile"
                      title="Rename profile"
                      style={{
                        padding: "5px 7px",
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                )}
              </div>

              {nameStatus.message && (
                <div
                  style={{
                    color:
                      nameStatus.type === "success"
                        ? "var(--color-accent)"
                        : "var(--color-alert)",
                    fontSize: 12,
                  }}
                  role="status"
                >
                  {nameStatus.message}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingBottom: 10,
                  borderBottom: "1px solid var(--color-line)",
                }}
              >
                <span
                  style={{
                    color: "var(--color-ink-muted)",
                  }}
                >
                  Email Address
                </span>

                <strong>{user?.email || "N/A"}</strong>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingBottom: 10,
                  borderBottom: "1px solid var(--color-line)",
                }}
              >
                <span
                  style={{
                    color: "var(--color-ink-muted)",
                  }}
                >
                  User ID
                </span>

                <span className="pill pill-accent">#{user?.id || "0000"}</span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingBottom: 10,
                  borderBottom: "1px solid var(--color-line)",
                }}
              >
                <span
                  style={{
                    color: "var(--color-ink-muted)",
                  }}
                >
                  Status
                </span>

                <span
                  className="pill pill-accent"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--color-accent)",
                    }}
                  />
                  Active
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    color: "var(--color-ink-muted)",
                  }}
                >
                  Member Since
                </span>

                <strong>
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString("default", {
                        month: "long",
                        year: "numeric",
                      })
                    : "N/A"}
                </strong>
              </div>
            </div>
          </div>

          {/* PDF Report */}

          <div className="card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
                paddingBottom: 12,
                borderBottom: "1px solid var(--color-line)",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: "rgba(59, 130, 246, 0.15)",
                  color: "#3b82f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FileText size={20} />
              </div>

              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 16,
                  }}
                >
                  Financial Statement
                </h3>

                <span
                  style={{
                    fontSize: 12,
                    color: "var(--color-ink-muted)",
                  }}
                >
                  Export structured PDF summary report
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div className="grid-2">
                <div>
                  <label className="label">Year</label>

                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="input"
                  >
                    <option value={2026}>2026</option>

                    <option value={2025}>2025</option>

                    <option value={2024}>2024</option>
                  </select>
                </div>

                <div>
                  <label className="label">Month</label>

                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="input"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(0, i).toLocaleString("default", {
                          month: "long",
                        })}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {reportError && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    borderRadius: 8,
                    backgroundColor: "var(--color-alert-soft)",
                    color: "var(--color-alert)",
                    fontSize: 13,
                  }}
                >
                  <AlertCircle size={15} />

                  <span>{reportError}</span>
                </div>
              )}

              <button
                onClick={handleDownloadReport}
                disabled={downloading}
                className="btn btn-accent"
                style={{
                  marginTop: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  width: "100%",
                }}
              >
                {downloading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating Report…
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Download PDF Report
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadCategoryReport}
                disabled={categoryReportLoading}
                className="btn"
                style={{
                  marginTop: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  width: "100%",
                }}
              >
                {categoryReportLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Generating
                    Category Report…
                  </>
                ) : (
                  <>
                    <Activity size={16} /> Download Category-wise PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ==================================================
            SECURITY & PASSWORD
        ================================================== */}

        <div className="card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 20,
              paddingBottom: 12,
              borderBottom: "1px solid var(--color-line)",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: "rgba(245, 158, 11, 0.15)",
                color: "#f59e0b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Lock size={20} />
            </div>

            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 16,
                }}
              >
                Security & Authentication
              </h3>

              <span
                style={{
                  fontSize: 12,
                  color: "var(--color-ink-muted)",
                }}
              >
                Update your account password
              </span>
            </div>
          </div>

          {passwordStatus.message && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
                padding: "10px 14px",
                borderRadius: 8,
                backgroundColor:
                  passwordStatus.type === "success"
                    ? "var(--color-accent-soft)"
                    : "var(--color-alert-soft)",
                color:
                  passwordStatus.type === "success"
                    ? "var(--color-accent)"
                    : "var(--color-alert)",
                fontSize: 13,
              }}
            >
              {passwordStatus.type === "success" ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertCircle size={16} />
              )}

              <span>{passwordStatus.message}</span>
            </div>
          )}

          <form onSubmit={handlePasswordUpdate}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              {/* Current Password */}

              <div>
                <label className="label">Current Password</label>

                <div
                  style={{
                    position: "relative",
                  }}
                >
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input"
                    style={{
                      paddingRight: 38,
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--color-ink-muted)",
                      padding: 4,
                    }}
                    aria-label="Toggle current password visibility"
                  >
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}

              <div>
                <label className="label">New Password</label>

                <div
                  style={{
                    position: "relative",
                  }}
                >
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input"
                    style={{
                      paddingRight: 38,
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--color-ink-muted)",
                      padding: 4,
                    }}
                    aria-label="Toggle new password visibility"
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}

              <div>
                <label className="label">Confirm Password</label>

                <div
                  style={{
                    position: "relative",
                  }}
                >
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input"
                    style={{
                      paddingRight: 38,
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--color-ink-muted)",
                      padding: 4,
                    }}
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 20,
              }}
            >
              <button
                type="submit"
                disabled={updatingPassword}
                className="btn btn-primary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {updatingPassword ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Updating…
                  </>
                ) : (
                  "Update Password"
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ==================================================
            ACTIVE SESSIONS
        ================================================== */}

        <div
          className="card"
          style={{
            border: "1px solid rgba(59, 130, 246, 0.35)",
            background: "var(--color-surface)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 18,
              paddingBottom: 14,
              borderBottom: "1px solid var(--color-line)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "rgba(59, 130, 246, 0.15)",
                  color: "#3b82f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShieldCheck size={20} />
              </div>

              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 17,
                  }}
                >
                  Active Sessions
                </h3>

                <span
                  style={{
                    fontSize: 12,
                    color: "var(--color-ink-muted)",
                  }}
                >
                  Manage devices and browsers currently signed in to your
                  account
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={loadSessions}
                disabled={loadingSessions}
                className="btn btn-ghost"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <RefreshCw
                  size={15}
                  className={loadingSessions ? "animate-spin" : ""}
                />
                Refresh
              </button>

              {sessions.length > 1 && (
                <button
                  type="button"
                  onClick={handleLogoutOtherSessions}
                  disabled={loggingOutOthers}
                  className="btn btn-ghost"
                  style={{
                    color: "var(--color-alert)",
                    borderColor: "rgba(239, 68, 68, 0.4)",
                  }}
                >
                  {loggingOutOthers
                    ? "Signing out..."
                    : "Logout Other Sessions"}
                </button>
              )}
            </div>
          </div>

          {sessionError && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
                padding: "10px 12px",
                borderRadius: 8,
                background: "var(--color-alert-soft)",
                color: "var(--color-alert)",
                fontSize: 13,
              }}
            >
              <AlertCircle size={15} />
              <span>{sessionError}</span>
            </div>
          )}

          {sessionSuccess && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
                padding: "10px 12px",
                borderRadius: 8,
                background: "var(--color-accent-soft)",
                color: "var(--color-accent)",
                fontSize: 13,
              }}
            >
              <CheckCircle2 size={15} />
              <span>{sessionSuccess}</span>
            </div>
          )}

          {loadingSessions && sessions.length === 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "18px 0",
                color: "var(--color-ink-muted)",
                fontSize: 13,
              }}
            >
              <Loader2 size={17} className="animate-spin" />
              Loading active sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div
              style={{
                padding: "18px 0",
                color: "var(--color-ink-muted)",
                fontSize: 13,
              }}
            >
              No active sessions found.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {sessions.map((session) => (
                <div
                  key={session.session_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    padding: "15px 16px",
                    borderRadius: 12,
                    border: session.is_current
                      ? "1px solid rgba(20, 184, 166, 0.5)"
                      : "1px solid var(--color-line)",
                    background: session.is_current
                      ? "rgba(20, 184, 166, 0.06)"
                      : "var(--color-bg)",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: "rgba(59, 130, 246, 0.12)",
                        color: "#3b82f6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {getSessionIcon(session.device_name)}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <strong style={{ fontSize: 14 }}>
                          {session.device_name || "Unknown device"}
                        </strong>

                        {session.is_current && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "3px 8px",
                              borderRadius: 999,
                              background: "rgba(20, 184, 166, 0.15)",
                              color: "var(--color-accent)",
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: "currentColor",
                              }}
                            />
                            Current Session
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          marginTop: 5,
                          color: "var(--color-ink-muted)",
                          fontSize: 12,
                          lineHeight: 1.6,
                        }}
                      >
                        <div>IP: {session.ip_address || "Unknown"}</div>
                        <div>
                          Last active:{" "}
                          {session.last_active_at
                            ? new Date(session.last_active_at).toLocaleString()
                            : "Unknown"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {!session.is_current && (
                    <button
                      type="button"
                      onClick={() => handleRevokeSession(session.session_id)}
                      disabled={revokingSessionId === session.session_id}
                      className="btn btn-ghost"
                      style={{
                        color: "var(--color-alert)",
                        borderColor: "rgba(239, 68, 68, 0.4)",
                      }}
                    >
                      {revokingSessionId === session.session_id
                        ? "Revoking..."
                        : "Revoke"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ==================================================
            DELETE ACCOUNT
        ================================================== */}

        <div
          className="card"
          style={{
            border: "1px solid rgba(239, 68, 68, 0.35)",
            background: "rgba(239, 68, 68, 0.03)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(239, 68, 68, 0.12)",
                color: "#ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ShieldAlert size={21} />
            </div>

            <div
              style={{
                flex: 1,
              }}
            >
              <h3
                style={{
                  margin: "0 0 5px",
                  fontSize: 17,
                  color: "#dc2626",
                }}
              >
                Delete Account
              </h3>

              <p
                style={{
                  margin: 0,
                  color: "var(--color-ink-muted)",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                Permanently delete your account and all associated financial
                data. This includes transactions, budgets, financial health
                records, and your profile.
              </p>
            </div>
          </div>

          {!showDeleteConfirm ? (
            <div
              style={{
                marginTop: 20,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(true);
                  setDeleteError("");
                }}
                className="btn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#dc2626",
                  border: "1px solid rgba(239, 68, 68, 0.45)",
                  background: "#ffffff",
                }}
              >
                <Trash2 size={16} />
                Delete My Account
              </button>
            </div>
          ) : (
            <div
              style={{
                marginTop: 20,
                padding: 18,
                borderRadius: 12,
                background: "var(--color-surface)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <AlertCircle
                  size={19}
                  style={{
                    color: "#dc2626",
                    marginTop: 2,
                    flexShrink: 0,
                  }}
                />

                <div>
                  <strong
                    style={{
                      display: "block",
                      color: "#dc2626",
                      marginBottom: 5,
                    }}
                  >
                    This action cannot be undone.
                  </strong>

                  <span
                    style={{
                      fontSize: 13,
                      color: "var(--color-ink-muted)",
                      lineHeight: 1.5,
                    }}
                  >
                    Enter your current password to permanently delete your
                    account.
                  </span>
                </div>
              </div>

              <label className="label">Current Password</label>

              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your password"
                className="input"
                disabled={deletingAccount}
                autoComplete="current-password"
              />

              {deleteError && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 10,
                    padding: "9px 12px",
                    borderRadius: 8,
                    background: "var(--color-alert-soft)",
                    color: "var(--color-alert)",
                    fontSize: 13,
                  }}
                >
                  <AlertCircle size={15} />

                  <span>{deleteError}</span>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 16,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount}
                  className="btn"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    color: "#ffffff",
                    background: "#dc2626",
                    border: "1px solid #dc2626",
                    opacity: deletingAccount ? 0.65 : 1,
                    cursor: deletingAccount ? "not-allowed" : "pointer",
                  }}
                >
                  {deletingAccount ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Deleting Account…
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Yes, Delete Account
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletePassword("");
                    setDeleteError("");
                  }}
                  disabled={deletingAccount}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ==================================================
            SIGN OUT
        ================================================== */}

        <div
          className="card"
          style={{
            borderColor: "rgba(239, 68, 68, 0.3)",
            backgroundColor: "var(--color-surface)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <LogOut
                  size={18}
                  style={{
                    color: "var(--color-alert)",
                  }}
                />

                <h3
                  style={{
                    margin: 0,
                    fontSize: 16,
                  }}
                >
                  Sign Out Session
                </h3>
              </div>

              <p
                style={{
                  margin: "4px 0 0",
                  color: "var(--color-ink-muted)",
                  fontSize: 13,
                }}
              >
                Disconnect your active session from this device.
              </p>
            </div>

            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to sign out?")) {
                  logout();
                }
              }}
              className="btn btn-ghost"
              style={{
                color: "var(--color-alert)",
                borderColor: "rgba(239, 68, 68, 0.4)",
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
