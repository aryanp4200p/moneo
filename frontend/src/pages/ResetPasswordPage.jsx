import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  AlertCircle,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";

export default function ResetPasswordPage() {
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const clearError = useAuthStore((s) => s.clearError);
  const loading = useAuthStore((s) => s.loading);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(4);

  useEffect(() => {
    return () => {
      if (typeof clearError === "function") {
        clearError();
      }
    };
  }, [clearError]);

  useEffect(() => {
    if (!success) return;

    const timer = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/login", { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [success, navigate]);

  const passwordRequirements = [
    {
      label: "At least 8 characters",
      valid: password.length >= 8,
    },
    {
      label: "One uppercase letter",
      valid: /[A-Z]/.test(password),
    },
    {
      label: "One lowercase letter",
      valid: /[a-z]/.test(password),
    },
    {
      label: "One number",
      valid: /[0-9]/.test(password),
    },
    {
      label: "One special character",
      valid: /[^A-Za-z0-9]/.test(password),
    },
  ];

  const passwordIsValid = passwordRequirements.every((item) => item.valid);
  const passwordsMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;
  const canSubmit = !loading && passwordIsValid && passwordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError(
        "Your reset link is missing its token. Please request a new link.",
      );
      return;
    }

    if (!passwordIsValid) {
      setError("Please meet all password requirements.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const result = await resetPassword(token, password);

      if (result) {
        setSuccess(true);
      } else {
        setError(
          "This reset link is invalid or expired. Please request a new one.",
        );
      }
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Unable to reset your password. Please try again.",
      );
    }
  };

  const pageStyle = {
    minHeight: "100vh",
    backgroundColor: "#f4f6fc",
    backgroundImage:
      "linear-gradient(rgba(121,87,232,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(121,87,232,0.045) 1px, transparent 1px)",
    backgroundSize: "44px 44px",
    display: "flex",
    flexDirection: "column",
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    color: "#171B2B",
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 43px 12px 40px",
    border: "1px solid #E0E3EF",
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    color: "#171B2B",
    fontSize: 14,
    outlineColor: "#7957E8",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  const labelStyle = {
    display: "block",
    marginBottom: 6,
    color: "#34394D",
    fontSize: 13,
    fontWeight: 600,
  };

  const linkStyle = {
    color: "#7957E8",
    fontWeight: 600,
    textDecoration: "none",
  };

  const alertStyle = {
    display: "flex",
    alignItems: "flex-start",
    gap: 9,
    marginBottom: 16,
    padding: "11px 13px",
    border: "1px solid #F3CCCC",
    borderRadius: 9,
    backgroundColor: "#FFF4F4",
    color: "#B42318",
    fontSize: 13,
    lineHeight: 1.5,
  };

  const handlePasswordVisibility = (setter) => {
    setter((previous) => !previous);
  };

  return (
    <div style={pageStyle}>
      {/* Header — matching LoginPage */}
      <header
        style={{
          minHeight: 62,
          padding: "0 clamp(20px, 6vw, 80px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          backgroundColor: "rgba(255,255,255,0.86)",
          borderBottom: "1px solid #E7E8F1",
          backdropFilter: "blur(12px)",
        }}
      >
        <Link
          to="/"
          aria-label="Moneo home"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <img
            src="/pwa-192x192.png"
            alt=""
            style={{
              width: 34,
              height: 34,
              objectFit: "contain",
              flexShrink: 0,
            }}
          />

          <img
            src="/brand/moneo-wordmark-light.png"
            alt="Moneo"
            style={{
              width: 96,
              height: "auto",
              objectFit: "contain",
              flexShrink: 0,
            }}
          />
        </Link>

        <span style={{ color: "#737990", fontSize: 13 }}>
          Personal finance, made clearer.
        </span>
      </header>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
          alignItems: "center",
          gap: "clamp(28px, 5vw, 72px)",
          width: "100%",
          maxWidth: 1180,
          boxSizing: "border-box",
          margin: "0 auto",
          padding: "32px clamp(20px, 5vw, 64px)",
        }}
      >
        {/* Intro section */}
        <section
          style={{
            maxWidth: 500,
            margin: "0 auto",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              padding: "8px 13px",
              marginBottom: 20,
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E1F7",
              boxShadow: "0 5px 15px rgba(32,25,70,0.04)",
              color: "#62518F",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                backgroundColor: "#7957E8",
              }}
            />
            Account security
          </div>

          <h1
            style={{
              margin: "0 0 18px",
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "clamp(42px, 5vw, 66px)",
              fontWeight: 500,
              lineHeight: 0.99,
              letterSpacing: "-2.6px",
              color: "#171B2B",
            }}
          >
            A fresh start
            <br />
            for your
            <br />
            account.
          </h1>

          <p
            style={{
              maxWidth: 410,
              margin: 0,
              color: "#6B728B",
              fontSize: 15,
              lineHeight: 1.8,
            }}
          >
            Choose a strong new password to protect your account and keep your
            personal financial information secure.
          </p>

          <div
            style={{
              display: "grid",
              gap: 14,
              marginTop: 26,
            }}
          >
            {[
              {
                title: "Create a strong password",
                description:
                  "Use a mix of letters, numbers, and special characters.",
              },
              {
                title: "Keep your account secure",
                description:
                  "Never share your password or reset link with anyone.",
              },
              {
                title: "Return to your finances",
                description: "Once reset, sign in using your new password.",
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <span
                  style={{
                    width: 32,
                    height: 32,
                    flexShrink: 0,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 9,
                    backgroundColor: "#EEE9FF",
                    color: "#7957E8",
                  }}
                >
                  <CheckCircle size={17} />
                </span>

                <div>
                  <strong
                    style={{
                      display: "block",
                      fontSize: 13,
                      color: "#34394D",
                      marginBottom: 3,
                    }}
                  >
                    {item.title}
                  </strong>
                  <p
                    style={{
                      margin: 0,
                      color: "#737990",
                      fontSize: 12,
                      lineHeight: 1.6,
                    }}
                  >
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Reset password card */}
        <section
          style={{
            width: "100%",
            maxWidth: 430,
            justifySelf: "center",
          }}
        >
          <div
            style={{
              padding: "clamp(22px, 3.5vw, 32px)",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7F0",
              borderRadius: 16,
              boxShadow:
                "0 24px 65px rgba(39,31,82,0.09), 0 3px 10px rgba(39,31,82,0.03)",
            }}
          >
            {!token ? (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      flexShrink: 0,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 12,
                      backgroundColor: "#FFF0F0",
                      color: "#B42318",
                    }}
                  >
                    <AlertCircle size={22} />
                  </div>

                  <div>
                    <h2
                      style={{
                        margin: 0,
                        color: "#171B2B",
                        fontSize: 22,
                        letterSpacing: "-0.6px",
                      }}
                    >
                      Invalid reset link
                    </h2>
                    <p
                      style={{
                        margin: "3px 0 0",
                        color: "#858BA0",
                        fontSize: 12,
                      }}
                    >
                      A valid reset token is required.
                    </p>
                  </div>
                </div>

                <p
                  style={{
                    color: "#747A90",
                    fontSize: 13,
                    lineHeight: 1.75,
                    marginBottom: 20,
                  }}
                >
                  This link is missing its reset token. Request a new password
                  reset email to continue.
                </p>

                <Link
                  to="/forgot-password"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 9,
                    minHeight: 46,
                    padding: "11px 16px",
                    boxSizing: "border-box",
                    borderRadius: 9,
                    backgroundColor: "#7957E8",
                    color: "#FFFFFF",
                    textDecoration: "none",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  Request a new link <ArrowRight size={17} />
                </Link>
              </>
            ) : success ? (
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    margin: "0 auto 18px",
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 16,
                    backgroundColor: "#EEE9FF",
                    color: "#7957E8",
                  }}
                >
                  <CheckCircle size={32} />
                </div>

                <h2
                  style={{
                    margin: "0 0 8px",
                    color: "#171B2B",
                    fontSize: 24,
                    letterSpacing: "-0.6px",
                  }}
                >
                  Password updated!
                </h2>

                <p
                  style={{
                    color: "#747A90",
                    fontSize: 13,
                    lineHeight: 1.75,
                    margin: 0,
                  }}
                >
                  Your password has been changed successfully. Redirecting to
                  login in {redirectCountdown}s…
                </p>

                <button
                  type="button"
                  onClick={() => navigate("/login", { replace: true })}
                  style={{
                    width: "100%",
                    minHeight: 46,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 9,
                    marginTop: 20,
                    padding: "11px 16px",
                    border: "none",
                    borderRadius: 9,
                    backgroundColor: "#7957E8",
                    color: "#FFFFFF",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Continue to login <ArrowRight size={17} />
                </button>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      flexShrink: 0,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 12,
                      backgroundColor: "#EEE9FF",
                      color: "#7957E8",
                    }}
                  >
                    <KeyRound size={20} />
                  </div>

                  <div>
                    <h2
                      style={{
                        margin: 0,
                        color: "#171B2B",
                        fontSize: 22,
                        letterSpacing: "-0.6px",
                      }}
                    >
                      Reset password
                    </h2>
                    <p
                      style={{
                        margin: "3px 0 0",
                        color: "#858BA0",
                        fontSize: 12,
                      }}
                    >
                      Create a new secure password.
                    </p>
                  </div>
                </div>

                <p
                  style={{
                    margin: "10px 0 18px",
                    color: "#747A90",
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  Enter your new password below to regain access to your
                  account.
                </p>

                {error && (
                  <div role="alert" style={alertStyle}>
                    <AlertCircle
                      size={17}
                      style={{ flexShrink: 0, marginTop: 1 }}
                    />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {/* New password */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle} htmlFor="new-password">
                      New password
                    </label>

                    <div style={{ position: "relative" }}>
                      <Lock
                        size={17}
                        style={{
                          position: "absolute",
                          left: 13,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#969BB0",
                          pointerEvents: "none",
                        }}
                      />

                      <input
                        id="new-password"
                        name="new-password"
                        style={inputStyle}
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        autoComplete="new-password"
                        autoFocus
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (error) setError("");
                        }}
                        required
                        minLength={8}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          handlePasswordVisibility(setShowPassword)
                        }
                        style={{
                          position: "absolute",
                          right: 11,
                          top: "50%",
                          transform: "translateY(-50%)",
                          display: "grid",
                          placeItems: "center",
                          background: "transparent",
                          border: "none",
                          color: "#858BA0",
                          padding: 5,
                          cursor: "pointer",
                        }}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff size={17} />
                        ) : (
                          <Eye size={17} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Password requirements */}
                  <div
                    style={{
                      marginBottom: 16,
                      padding: "12px 14px",
                      border: "1px solid #E5E7F0",
                      borderRadius: 10,
                      backgroundColor: "#F9F9FD",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 8px",
                        color: "#34394D",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      Password requirements
                    </p>

                    <div
                      style={{
                        display: "grid",
                        gap: 5,
                      }}
                    >
                      {passwordRequirements.map((item) => (
                        <div
                          key={item.label}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            color: item.valid ? "#5B42C4" : "#858BA0",
                            fontSize: 12,
                            fontWeight: item.valid ? 500 : 400,
                          }}
                        >
                          <CheckCircle
                            size={14}
                            style={{
                              flexShrink: 0,
                              opacity: item.valid ? 1 : 0.45,
                            }}
                          />
                          {item.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Confirm password */}
                  <div style={{ marginBottom: 18 }}>
                    <label style={labelStyle} htmlFor="confirm-password">
                      Confirm new password
                    </label>

                    <div style={{ position: "relative" }}>
                      <Lock
                        size={17}
                        style={{
                          position: "absolute",
                          left: 13,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#969BB0",
                          pointerEvents: "none",
                        }}
                      />

                      <input
                        id="confirm-password"
                        name="confirm-password"
                        style={{
                          ...inputStyle,
                          borderColor:
                            confirmPassword && confirmPassword !== password
                              ? "#D92D20"
                              : passwordsMatch
                                ? "#7957E8"
                                : "#E0E3EF",
                        }}
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter your new password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (error) setError("");
                        }}
                        required
                        minLength={8}
                        aria-invalid={
                          Boolean(confirmPassword) &&
                          confirmPassword !== password
                        }
                      />

                      <button
                        type="button"
                        onClick={() =>
                          handlePasswordVisibility(setShowConfirmPassword)
                        }
                        style={{
                          position: "absolute",
                          right: 11,
                          top: "50%",
                          transform: "translateY(-50%)",
                          display: "grid",
                          placeItems: "center",
                          background: "transparent",
                          border: "none",
                          color: "#858BA0",
                          padding: 5,
                          cursor: "pointer",
                        }}
                        aria-label={
                          showConfirmPassword
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={17} />
                        ) : (
                          <Eye size={17} />
                        )}
                      </button>
                    </div>

                    {confirmPassword && confirmPassword !== password && (
                      <p
                        style={{
                          margin: "6px 0 0",
                          color: "#B42318",
                          fontSize: 12,
                        }}
                      >
                        Passwords do not match.
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    style={{
                      width: "100%",
                      minHeight: 46,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 9,
                      padding: "11px 16px",
                      border: "none",
                      borderRadius: 9,
                      backgroundColor: !canSubmit ? "#A999E9" : "#7957E8",
                      color: "#FFFFFF",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: !canSubmit ? "not-allowed" : "pointer",
                      boxShadow: "0 5px 13px rgba(121,87,232,0.2)",
                      transition: "background-color 0.2s ease",
                    }}
                  >
                    {loading ? "Updating password…" : "Reset password"}
                    {!loading && <ArrowRight size={17} />}
                  </button>
                </form>
              </>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                margin: "20px 0 16px",
                color: "#C0C3D0",
                fontSize: 11,
              }}
            >
              <span
                style={{
                  flex: 1,
                  height: 1,
                  backgroundColor: "#ECECF3",
                }}
              />
              ACCOUNT ACCESS
              <span
                style={{
                  flex: 1,
                  height: 1,
                  backgroundColor: "#ECECF3",
                }}
              />
            </div>

            <p
              style={{
                margin: 0,
                color: "#747A90",
                fontSize: 13,
                textAlign: "center",
              }}
            >
              Remember your password?{" "}
              <Link to="/login" style={linkStyle}>
                Log in
              </Link>
            </p>
          </div>

          <p
            style={{
              margin: "14px 0 0",
              color: "#8B90A4",
              fontSize: 11,
              lineHeight: 1.6,
              textAlign: "center",
            }}
          >
            Your finances are personal. Keep your account credentials secure.
          </p>
        </section>
      </main>

      <footer
        style={{
          padding: "15px 20px",
          borderTop: "1px solid rgba(225,226,239,0.85)",
          color: "#898EA2",
          fontSize: 11,
          textAlign: "center",
        }}
      >
        Moneo · Manage Today. Build Tomorrow.
      </footer>
    </div>
  );
}
