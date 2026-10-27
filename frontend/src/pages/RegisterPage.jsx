import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  UserPlus,
  Eye,
  EyeOff,
  AlertCircle,
  GraduationCap,
  Mail,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";

const COLLEGE_EMAIL_DOMAIN = "@tcetmumbai.in";

export default function RegisterPage() {
  const register = useAuthStore((s) => s.register);
  const verifyEmail = useAuthStore((s) => s.verifyEmail);
  const resendVerification = useAuthStore((s) => s.resendVerification);
  const error = useAuthStore((s) => s.error);
  const loading = useAuthStore((s) => s.loading);

  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [emailType, setEmailType] = useState("college");
  const [collegeUsername, setCollegeUsername] = useState("");
  const [normalEmail, setNormalEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [validationError, setValidationError] = useState("");

  const email =
    emailType === "college"
      ? `${collegeUsername.trim()}${COLLEGE_EMAIL_DOMAIN}`
      : normalEmail.trim();

  const inputStyle = {
    width: "100%",
    minWidth: 0,
    minHeight: 48,
    padding: "12px 14px",
    border: "1px solid #dce2ed",
    borderRadius: 10,
    background: "#ffffff",
    color: "#172033",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block",
    marginBottom: 7,
    color: "#344054",
    fontSize: 13,
    fontWeight: 650,
  };

  const selectedTabStyle = (active) => ({
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    padding: "10px 8px",
    border: active ? "1px solid #7654ee" : "1px solid #dce2ed",
    borderRadius: 10,
    background: active ? "#f0ebff" : "#ffffff",
    color: active ? "#6844df" : "#667085",
    fontWeight: active ? 700 : 500,
    cursor: "pointer",
    fontSize: 13,
    transition: "all 0.2s ease",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError("");
    setOtpMessage("");

    // STEP 2: Verify the OTP
    if (otpStep) {
      if (!/^\d{6}$/.test(otp)) {
        setValidationError("Enter the six-digit verification code.");
        return;
      }

      const result = await verifyEmail(registeredEmail, otp);

      if (result?.success) {
        navigate("/dashboard");
      } else {
        setValidationError(
          result?.message || "Email verification failed. Please try again.",
        );
      }

      return;
    }

    // STEP 1: Validate registration details
    const finalEmail = email.trim().toLowerCase();

    if (!name.trim()) {
      setValidationError("Please enter your full name.");
      return;
    }

    if (emailType === "college") {
      if (!/^[a-zA-Z0-9._-]+$/.test(collegeUsername.trim())) {
        setValidationError(
          "Enter a valid college email username before @tcetmumbai.in.",
        );
        return;
      }
    } else {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(finalEmail)) {
        setValidationError("Please enter a valid email address.");
        return;
      }
    }

    // Match the backend's password requirements
    const passwordValid =
      password.length >= 8 &&
      password.length <= 128 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[!@#$%^&*()\-_=+\[\]{};:,.?/\\|`~]/.test(password);

    if (!passwordValid) {
      setValidationError(
        "Password must be 8–128 characters and include uppercase, lowercase, a number, and a special character.",
      );
      return;
    }

    const result = await register(name.trim(), finalEmail, password);

    if (result?.success) {
      setRegisteredEmail(result.email || finalEmail);
      setOtp("");
      setOtpStep(true);
      setOtpMessage(
        result.message || "Check your inbox for your verification code.",
      );
    } else {
      setValidationError(result?.message || "Registration failed.");
    }
  };

  const handleResend = async () => {
    setValidationError("");
    setOtpMessage("");

    const result = await resendVerification(registeredEmail);

    if (result?.success) {
      setOtpMessage(result.message || "Check your email for the new code.");
      setOtp("");
    } else {
      setValidationError(
        result?.message || "Unable to resend the verification code.",
      );
    }
  };

  return (
    <main
      className="register-page"
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "36px 20px",
        boxSizing: "border-box",
        backgroundColor: "#f4f6fc",
        backgroundImage:
          "linear-gradient(rgba(121,87,232,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(121,87,232,.045) 1px, transparent 1px)",
        backgroundSize: "42px 42px",
      }}
    >
      <style>{`
        .register-page,
        .register-page * {
          box-sizing: border-box;
        }

        .register-card {
          width: 100%;
          max-width: 460px;
          margin: auto;
          padding: 30px;
          border: 1px solid #e4e7f0;
          border-radius: 20px;
          background: #ffffff;
          color: #172033;
          box-shadow: 0 18px 55px rgba(32, 35, 70, .09);
        }

        .register-field {
          margin-bottom: 17px;
        }

        .register-input:focus {
          outline: none;
          border-color: #7654ee !important;
          box-shadow: 0 0 0 3px rgba(118, 84, 238, .12);
        }

        .register-submit {
          width: 100%;
          min-height: 49px;
          border: 0;
          border-radius: 10px;
          background: #7654ee;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: background .2s ease, transform .2s ease;
        }

        .register-submit:hover:not(:disabled) {
          background: #6341dc;
          transform: translateY(-1px);
        }

        .register-submit:disabled {
          cursor: not-allowed;
          opacity: .65;
        }

        .register-link {
          color: #7654ee;
          font-weight: 700;
          text-decoration: none;
        }

        .register-link:hover {
          text-decoration: underline;
        }

        .register-secondary {
          width: 100%;
          margin-top: 10px;
          padding: 11px;
          border: 0;
          border-radius: 9px;
          background: transparent;
          color: #6844df;
          font-size: 13px;
          font-weight: 650;
          cursor: pointer;
        }

        .register-secondary:disabled {
          cursor: not-allowed;
          opacity: .6;
        }

        @media (max-width: 480px) {
          .register-page {
            padding: 18px 12px !important;
            align-items: flex-start !important;
          }

          .register-card {
            padding: 23px 19px;
            border-radius: 16px;
          }
        }

        @media (max-width: 350px) {
          .register-card {
            padding: 20px 15px;
          }
        }
      `}</style>

      <form className="register-card" onSubmit={handleSubmit} noValidate>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              flexShrink: 0,
              display: "grid",
              placeItems: "center",
              borderRadius: 13,
              background: "#eee9ff",
              color: "#7654ee",
            }}
          >
            {otpStep ? <ShieldCheck size={22} /> : <UserPlus size={22} />}
          </div>

          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 25,
                lineHeight: 1.25,
                letterSpacing: "-0.7px",
                color: "#172033",
              }}
            >
              {otpStep ? "Verify your email" : "Create account"}
            </h1>

            <p
              style={{
                margin: "4px 0 0",
                color: "#7b8498",
                fontSize: 13,
              }}
            >
              {otpStep
                ? "One more step to secure your account."
                : "Start managing your money smarter."}
            </p>
          </div>
        </div>

        <p
          style={{
            margin: "16px 0 23px",
            color: "#69758b",
            fontSize: 14,
            lineHeight: 1.65,
          }}
        >
          {otpStep
            ? "Enter the six-digit verification code sent to your email address."
            : "Track your spending, plan your budget, and discover useful financial insights."}
        </p>

        {/* Errors */}
        {(validationError || (!otpStep && error)) && (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 9,
              marginBottom: 18,
              padding: 12,
              border: "1px solid #f5caca",
              borderRadius: 10,
              background: "#fff3f2",
              color: "#b42318",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{validationError || error}</span>
          </div>
        )}

        {/* Registration form */}
        {!otpStep && (
          <>
            <div className="register-field">
              <label style={labelStyle} htmlFor="register-name">
                Full name
              </label>

              <input
                id="register-name"
                className="register-input"
                style={inputStyle}
                type="text"
                placeholder="Enter your full name"
                autoComplete="name"
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Email type selector */}
            <div className="register-field">
              <label style={labelStyle}>Choose your email type</label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  aria-pressed={emailType === "college"}
                  onClick={() => {
                    setEmailType("college");
                    setValidationError("");
                  }}
                  style={selectedTabStyle(emailType === "college")}
                >
                  <GraduationCap
                    size={16}
                    style={{
                      display: "inline-block",
                      verticalAlign: "middle",
                      marginRight: 5,
                    }}
                  />
                  College email
                </button>

                <button
                  type="button"
                  aria-pressed={emailType === "normal"}
                  onClick={() => {
                    setEmailType("normal");
                    setValidationError("");
                  }}
                  style={selectedTabStyle(emailType === "normal")}
                >
                  <Mail
                    size={15}
                    style={{
                      display: "inline-block",
                      verticalAlign: "middle",
                      marginRight: 5,
                    }}
                  />
                  Personal email
                </button>
              </div>
            </div>

            {/* College email */}
            {emailType === "college" ? (
              <div className="register-field">
                <label style={labelStyle} htmlFor="college-username">
                  College email address
                </label>

                <div
                  style={{
                    display: "flex",
                    width: "100%",
                    minWidth: 0,
                    overflow: "hidden",
                    border: "1px solid #dce2ed",
                    borderRadius: 10,
                    background: "#ffffff",
                  }}
                >
                  <input
                    id="college-username"
                    className="register-input"
                    type="text"
                    placeholder="Your college ID"
                    autoComplete="username"
                    value={collegeUsername}
                    onChange={(e) => setCollegeUsername(e.target.value)}
                    pattern="[a-zA-Z0-9._-]+"
                    title="Enter only the part before @tcetmumbai.in"
                    required
                    style={{
                      ...inputStyle,
                      flex: "1 1 0",
                      width: 0,
                      minWidth: 0,
                      border: 0,
                      borderRadius: 0,
                      boxShadow: "none",
                    }}
                  />

                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "0 10px",
                      background: "#f0ebff",
                      color: "#6844df",
                      fontSize: 12,
                      whiteSpace: "nowrap",
                    }}
                  >
                    @tcetmumbai.in
                  </span>
                </div>

                <p
                  style={{
                    margin: "7px 0 0",
                    color: "#7b8498",
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}
                >
                  Enter only the part before @tcetmumbai.in.
                </p>
              </div>
            ) : (
              <div className="register-field">
                <label style={labelStyle} htmlFor="normal-email">
                  Email address
                </label>

                <input
                  id="normal-email"
                  className="register-input"
                  style={inputStyle}
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  maxLength={254}
                  value={normalEmail}
                  onChange={(e) => setNormalEmail(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Password */}
            <div className="register-field">
              <label style={labelStyle} htmlFor="register-password">
                Password
              </label>

              <div style={{ position: "relative" }}>
                <input
                  id="register-password"
                  className="register-input"
                  style={{ ...inputStyle, paddingRight: 46 }}
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute",
                    top: "50%",
                    right: 10,
                    transform: "translateY(-50%)",
                    display: "grid",
                    placeItems: "center",
                    width: 30,
                    height: 30,
                    border: 0,
                    borderRadius: 7,
                    background: "transparent",
                    color: "#7b8498",
                    cursor: "pointer",
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <p
                style={{
                  margin: "7px 0 0",
                  color: "#7b8498",
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                Use 8–128 characters, including uppercase, lowercase, a number,
                and a special character.
              </p>
            </div>

            <button
              className="register-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? "Sending verification code…" : "Create account"}
              {!loading && (
                <span aria-hidden="true" style={{ marginLeft: 8 }}>
                  →
                </span>
              )}
            </button>
          </>
        )}

        {/* OTP verification form */}
        {otpStep && (
          <>
            <div
              style={{
                marginBottom: 18,
                padding: 13,
                borderRadius: 10,
                background: "#f7f5ff",
                color: "#51409b",
                fontSize: 13,
                lineHeight: 1.6,
                overflowWrap: "anywhere",
              }}
            >
              Verification email: <strong>{registeredEmail}</strong>
            </div>

            {otpMessage && (
              <p
                role="status"
                style={{
                  margin: "0 0 16px",
                  color: "#287a45",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                {otpMessage}
              </p>
            )}

            <div className="register-field">
              <label style={labelStyle} htmlFor="email-otp">
                Six-digit verification code
              </label>

              <input
                id="email-otp"
                className="register-input"
                style={{
                  ...inputStyle,
                  textAlign: "center",
                  letterSpacing: "8px",
                  fontSize: 22,
                  fontWeight: 700,
                }}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="[0-9]{6}"
                placeholder="000000"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                required
              />
            </div>

            <button
              className="register-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? "Verifying…" : "Verify email"}
            </button>

            <button
              className="register-secondary"
              type="button"
              onClick={handleResend}
              disabled={loading}
            >
              Resend verification code
            </button>

            <button
              className="register-secondary"
              type="button"
              onClick={() => {
                setOtpStep(false);
                setOtp("");
                setOtpMessage("");
                setValidationError("");
              }}
              disabled={loading}
              style={{ color: "#69758b" }}
            >
              <ArrowLeft
                size={14}
                style={{
                  display: "inline-block",
                  verticalAlign: "middle",
                  marginRight: 5,
                }}
              />
              Back to registration
            </button>
          </>
        )}

        {/* Login link */}
        <p
          style={{
            margin: "21px 0 0",
            color: "#69758b",
            fontSize: 13,
            textAlign: "center",
            lineHeight: 1.7,
          }}
        >
          Already have an account?{" "}
          <Link className="register-link" to="/login">
            Log in
          </Link>
        </p>

        {!otpStep && (
          <p
            style={{
              margin: "15px 0 0",
              color: "#98a2b3",
              fontSize: 11,
              lineHeight: 1.6,
              textAlign: "center",
            }}
          >
            Use an email address you can access to verify your account and
            receive account recovery messages.
          </p>
        )}
      </form>
    </main>
  );
}
