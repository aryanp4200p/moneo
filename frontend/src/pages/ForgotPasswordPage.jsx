import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  ArrowLeft,
  KeyRound,
  AlertCircle,
  CheckCircle,
  Wallet,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";

export default function ForgotPasswordPage() {
  const forgotPassword = useAuthStore((s) => s.forgotPassword);
  const loading = useAuthStore((s) => s.loading);

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resetToken, setResetToken] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");
    setResetToken("");

    try {
      const result = await forgotPassword(email.trim());

      if (result) {
        setMessage(
          result.message ||
            "If an account exists for this email, a password reset link has been generated.",
        );

        // Development/demo mode only.
        if (import.meta.env.DEV && result.reset_token) {
          setResetToken(result.reset_token);
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    minHeight: 48,
    padding: "12px 14px 12px 42px",
    border: "1px solid #E2E5F0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    color: "#171B2B",
    fontSize: 15,
    outlineColor: "#7957E8",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#F5F6FC",
        backgroundImage:
          "linear-gradient(to right, rgba(121,87,232,0.055) 1px, transparent 1px), linear-gradient(to bottom, rgba(121,87,232,0.055) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        color: "#171B2B",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          backgroundColor: "rgba(255,255,255,0.94)",
          borderBottom: "1px solid #E8E9F3",
          padding: "16px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <Link
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              textDecoration: "none",
              color: "#7957E8",
            }}
          >
            <span
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: "#EEE8FF",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Wallet size={24} />
            </span>
            <span style={{ fontSize: 23, fontWeight: 700 }}>Moneo</span>
          </Link>

          <span style={{ color: "#64748B", fontSize: 14 }}>
            Personal finance, made clearer.
          </span>
        </div>
      </header>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 20px",
        }}
      >
        <section
          style={{
            width: "100%",
            maxWidth: 440,
            boxSizing: "border-box",
            padding: "32px",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E4E2F2",
            borderRadius: 20,
            boxShadow: "0 20px 55px rgba(31, 35, 70, 0.08)",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              backgroundColor: "#EEE8FF",
              color: "#7957E8",
              marginBottom: 20,
            }}
          >
            <KeyRound size={24} />
          </div>

          <h1
            style={{
              margin: "0 0 10px",
              fontSize: 28,
              lineHeight: 1.25,
              fontWeight: 700,
              letterSpacing: "-0.7px",
              color: "#171B2B",
            }}
          >
            Forgot Password?
          </h1>

          <p
            style={{
              margin: "0 0 26px",
              color: "#64748B",
              fontSize: 15,
              lineHeight: 1.7,
            }}
          >
            No worries. Enter your email address and we’ll help you reset your
            password.
          </p>

          {error && (
            <div
              role="alert"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                marginBottom: 20,
                padding: 12,
                borderRadius: 12,
                backgroundColor: "#FEF2F2",
                color: "#B91C1C",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div
              role="status"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                marginBottom: 20,
                padding: 12,
                borderRadius: 12,
                backgroundColor: "#F0FDF4",
                color: "#166534",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              <CheckCircle size={18} style={{ flexShrink: 0 }} />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label
              htmlFor="forgot-email"
              style={{
                display: "block",
                marginBottom: 8,
                color: "#475569",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.8px",
              }}
            >
              EMAIL ADDRESS
            </label>

            <div style={{ position: "relative", marginBottom: 22 }}>
              <Mail
                size={18}
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#64748B",
                  pointerEvents: "none",
                }}
              />

              <input
                id="forgot-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                minHeight: 48,
                padding: "13px 18px",
                border: "none",
                borderRadius: 12,
                backgroundColor: loading ? "#A995ED" : "#7957E8",
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 6px 16px rgba(121,87,232,0.2)",
                transition: "background-color 0.2s ease",
              }}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          {/* Development reset token */}
          {import.meta.env.DEV && resetToken && (
            <div
              style={{
                marginTop: 22,
                padding: 16,
                borderRadius: 12,
                backgroundColor: "#F8F6FF",
                border: "1px solid #E4DDFE",
              }}
            >
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#5B3CC4",
                }}
              >
                Development Reset Token
              </p>

              <p
                style={{
                  margin: "0 0 14px",
                  fontSize: 12,
                  lineHeight: 1.6,
                  wordBreak: "break-all",
                  color: "#64748B",
                }}
              >
                {resetToken}
              </p>

              <Link
                to={`/reset-password?token=${encodeURIComponent(resetToken)}`}
                style={{
                  display: "block",
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: "#7957E8",
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: 600,
                  textAlign: "center",
                  textDecoration: "none",
                }}
              >
                Continue to Reset Password
              </Link>
            </div>
          )}

          <div
            style={{
              marginTop: 24,
              paddingTop: 20,
              borderTop: "1px solid #EEF0F6",
              textAlign: "center",
            }}
          >
            <Link
              to="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                color: "#7957E8",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <ArrowLeft size={16} />
              Back to Login
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: "18px 20px",
          textAlign: "center",
          color: "#64748B",
          fontSize: 12,
        }}
      >
        Moneo · Personal finance management
      </footer>
    </div>
  );
}
