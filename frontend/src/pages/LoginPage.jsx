import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Lock,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Wallet,
  ArrowRight,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const error = useAuthStore((s) => s.error);
  const loading = useAuthStore((s) => s.loading);

  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const ok = await login(email.trim(), password);

    if (ok) {
      navigate("/dashboard");
    }
  };

  const pageStyle = {
    minHeight: "100vh",
    backgroundColor: "#F5F6FC",
    backgroundImage:
      "linear-gradient(rgba(121,87,232,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(121,87,232,0.07) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
    display: "flex",
    flexDirection: "column",
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    color: "#171B2B",
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 14px",
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
    marginBottom: 7,
    color: "#34394D",
    fontSize: 13,
    fontWeight: 600,
  };

  const linkStyle = {
    color: "#7957E8",
    fontWeight: 600,
    textDecoration: "none",
  };

  return (
    <div style={pageStyle}>
      {/* Top navigation */}
      <header
        style={{
          minHeight: 64,
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
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            color: "#7957E8",
            textDecoration: "none",
            fontSize: 21,
            fontWeight: 800,
            letterSpacing: "-0.7px",
          }}
        >
          <span
            style={{
              display: "grid",
              placeItems: "center",
              width: 34,
              height: 34,
              borderRadius: 10,
              backgroundColor: "#EEE9FF",
            }}
          >
            <Wallet size={20} />
          </span>
          Moneo
        </Link>

        <span
          style={{
            color: "#737990",
            fontSize: 13,
          }}
        >
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
          gap: "clamp(32px, 6vw, 80px)",
          width: "100%",
          maxWidth: 1180,
          boxSizing: "border-box",
          margin: "0 auto",
          padding: "48px clamp(20px, 5vw, 64px)",
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
              padding: "9px 13px",
              marginBottom: 24,
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
            Your money, in focus
          </div>

          <h1
            style={{
              margin: "0 0 22px",
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "clamp(44px, 5.4vw, 70px)",
              fontWeight: 500,
              lineHeight: 0.99,
              letterSpacing: "-2.8px",
              color: "#171B2B",
            }}
          >
            Make smarter
            <br />
            moves with
            <br />
            your money.
          </h1>

          <p
            style={{
              maxWidth: 410,
              margin: 0,
              color: "#6B728B",
              fontSize: 16,
              lineHeight: 1.9,
            }}
          >
            Understand your spending, manage your budget, and discover
            meaningful insights with your personal finance dashboard.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 28,
            }}
          >
            {["Track expenses", "Plan budgets", "Get insights"].map((item) => (
              <span
                key={item}
                style={{
                  padding: "9px 12px",
                  borderRadius: 7,
                  border: "1px solid #E2DDF4",
                  backgroundColor: "rgba(255,255,255,0.75)",
                  color: "#62518F",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </section>

        {/* Login card */}
        <section
          style={{
            width: "100%",
            maxWidth: 430,
            justifySelf: "center",
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{
              padding: "clamp(24px, 4vw, 38px)",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7F0",
              borderRadius: 16,
              boxShadow:
                "0 24px 65px rgba(39,31,82,0.09), 0 3px 10px rgba(39,31,82,0.03)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 9,
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
                  backgroundColor: "#EEE9FF",
                  color: "#7957E8",
                }}
              >
                <LogIn size={22} />
              </div>

              <div>
                <h2
                  style={{
                    margin: 0,
                    color: "#171B2B",
                    fontSize: 24,
                    letterSpacing: "-0.7px",
                  }}
                >
                  Welcome back
                </h2>
                <p
                  style={{
                    margin: "4px 0 0",
                    color: "#858BA0",
                    fontSize: 12,
                  }}
                >
                  Sign in to your account
                </p>
              </div>
            </div>

            <p
              style={{
                margin: "14px 0 24px",
                color: "#747A90",
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              Your financial overview is just a step away.
            </p>

            {error && (
              <div
                role="alert"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 9,
                  marginBottom: 18,
                  padding: "12px 13px",
                  border: "1px solid #F3CCCC",
                  borderRadius: 9,
                  backgroundColor: "#FFF4F4",
                  color: "#B42318",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                <AlertCircle
                  size={17}
                  style={{ flexShrink: 0, marginTop: 1 }}
                />
                <span>{error}</span>
              </div>
            )}

            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle} htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                name="email"
                style={inputStyle}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle} htmlFor="password">
                Password
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
                  id="password"
                  name="password"
                  style={{
                    ...inputStyle,
                    paddingLeft: 40,
                    paddingRight: 43,
                  }}
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
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
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: 23,
              }}
            >
              <Link
                to="/forgot-password"
                style={{
                  ...linkStyle,
                  fontSize: 12,
                }}
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                minHeight: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 9,
                padding: "12px 16px",
                border: "none",
                borderRadius: 9,
                backgroundColor: loading ? "#A999E9" : "#7957E8",
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 5px 13px rgba(121,87,232,0.2)",
                transition: "background-color 0.2s",
              }}
            >
              {loading ? "Logging in…" : "Log in to your account"}
              {!loading && <ArrowRight size={17} />}
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                margin: "24px 0 19px",
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
              NEW TO FINANCEFLOW?
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
              Don't have an account?{" "}
              <Link to="/register" style={linkStyle}>
                Create one
              </Link>
            </p>
          </form>

          <p
            style={{
              margin: "18px 0 0",
              color: "#8B90A4",
              fontSize: 11,
              lineHeight: 1.7,
              textAlign: "center",
            }}
          >
            Your finances are personal. Keep your account credentials secure.
          </p>
        </section>
      </main>

      <footer
        style={{
          padding: "17px 20px",
          borderTop: "1px solid rgba(225,226,239,0.85)",
          color: "#898EA2",
          fontSize: 11,
          textAlign: "center",
        }}
      >
        Moneo · Personal finance management
      </footer>
    </div>
  );
}
