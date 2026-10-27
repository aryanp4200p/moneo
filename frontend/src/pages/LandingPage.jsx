import { Link, Navigate } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  PieChart,
  ShieldCheck,
  TrendingUp,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";

const features = [
  {
    icon: Sparkles,
    title: "AI Financial Advisor",
    description:
      "Understand your spending with clear, personalized insights and recommendations based on your financial activity.",
    color: "#7957E8",
    background: "#EEE9FF",
  },
  {
    icon: PieChart,
    title: "Smart Categorization",
    description:
      "Organize transactions, review spending categories, and import bank statement CSV files more efficiently.",
    color: "#3478E5",
    background: "#E8F1FF",
  },
  {
    icon: TrendingUp,
    title: "Budget Planning",
    description:
      "Set spending limits, monitor your progress, and spot categories where you may need to adjust your budget.",
    color: "#0C9B78",
    background: "#E0F7EF",
  },
];

export default function LandingPage() {
  const token = useAuthStore((state) => state.token);

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="finance-landing">
      <style>{`
        .finance-landing {
          --landing-purple: #7957E8;
          --landing-ink: #171B2B;
          --landing-muted: #69728B;
          --landing-line: #E4E6F1;
          min-height: 100vh;
          box-sizing: border-box;
          color: var(--landing-ink);
          background-color: #F5F6FC;
          background-image:
            linear-gradient(rgba(121,87,232,.065) 1px, transparent 1px),
            linear-gradient(90deg, rgba(121,87,232,.065) 1px, transparent 1px);
          background-size: 44px 44px;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          overflow-wrap: anywhere;
        }

        .finance-landing *,
        .finance-landing *::before,
        .finance-landing *::after {
          box-sizing: border-box;
        }

        .landing-nav {
          min-height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 14px clamp(20px, 5.5vw, 80px);
          background: rgba(255,255,255,.92);
          border-bottom: 1px solid var(--landing-line);
        }

        .landing-brand {
          display: inline-flex;
          align-items: center;
          gap: 11px;
          color: var(--landing-purple);
          font-size: 21px;
          font-weight: 800;
          letter-spacing: -.7px;
          text-decoration: none;
        }

        .landing-brand-icon {
          display: grid;
          width: 39px;
          height: 39px;
          flex-shrink: 0;
          place-items: center;
          border-radius: 12px;
          background: #EEE9FF;
        }

        .landing-nav-note {
          color: var(--landing-muted);
          font-size: 13px;
        }

        .landing-main {
          width: min(1160px, 100%);
          margin: 0 auto;
          padding: clamp(56px, 8vw, 104px) 28px 76px;
        }

        .landing-hero {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(320px, .85fr);
          align-items: center;
          gap: clamp(36px, 7vw, 92px);
        }

        .landing-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 10px 13px;
          margin-bottom: 24px;
          border: 1px solid #E5DFF8;
          background: rgba(255,255,255,.88);
          color: #62518F;
          font-size: 11px;
          font-weight: 750;
          letter-spacing: 1.3px;
          text-transform: uppercase;
          box-shadow: 0 5px 18px rgba(32,25,70,.035);
        }

        .landing-heading {
          max-width: 650px;
          margin: 0 0 23px;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(43px, 5.7vw, 74px);
          font-weight: 500;
          line-height: .99;
          letter-spacing: -.045em;
          color: var(--landing-ink);
        }

        .landing-description {
          max-width: 540px;
          margin: 0;
          color: var(--landing-muted);
          font-size: clamp(15px, 1.5vw, 17px);
          line-height: 1.85;
        }

        .landing-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
          margin-top: 30px;
        }

        .landing-button {
          min-height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 12px 20px;
          border: 1px solid transparent;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
        }

        .landing-button:hover {
          transform: translateY(-2px);
        }

        .landing-button-primary {
          color: #fff;
          background: var(--landing-purple);
          box-shadow: 0 7px 18px rgba(121,87,232,.2);
        }

        .landing-button-primary:hover {
          background: #6945D8;
          box-shadow: 0 9px 22px rgba(121,87,232,.25);
        }

        .landing-button-secondary {
          color: #43366C;
          background: rgba(255,255,255,.85);
          border-color: #DED9EE;
        }

        .landing-button-secondary:hover {
          background: #fff;
        }

        .landing-trust-note {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 23px;
          color: var(--landing-muted);
          font-size: 12px;
          line-height: 1.6;
        }

        .landing-preview {
          position: relative;
          padding: 22px;
          border: 1px solid #E3E2F0;
          border-radius: 18px;
          background: rgba(255,255,255,.92);
          box-shadow: 0 25px 65px rgba(37,32,76,.09);
        }

        .landing-preview-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 18px;
          border-bottom: 1px solid #ECECF4;
        }

        .landing-preview-label {
          color: #777E96;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .landing-preview-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #087E60;
          font-size: 11px;
          font-weight: 650;
        }

        .landing-preview-title {
          margin: 20px 0 5px;
          font-size: 18px;
          font-weight: 750;
          letter-spacing: -.4px;
        }

        .landing-preview-subtitle {
          margin: 0;
          color: var(--landing-muted);
          font-size: 12px;
          line-height: 1.6;
        }

        .landing-preview-metrics {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 22px;
        }

        .landing-metric {
          min-width: 0;
          padding: 16px 14px;
          border: 1px solid #E8E7F2;
          border-radius: 11px;
          background: #FAFAFE;
        }

        .landing-metric-label {
          color: var(--landing-muted);
          font-size: 11px;
          line-height: 1.5;
        }

        .landing-metric-value {
          margin-top: 7px;
          color: var(--landing-ink);
          font-size: clamp(18px, 2vw, 25px);
          font-weight: 750;
          letter-spacing: -.7px;
        }

        .landing-preview-callout {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-top: 13px;
          padding: 13px;
          border: 1px solid #E5DFF8;
          border-radius: 10px;
          background: #F8F5FF;
          color: #62518F;
          font-size: 12px;
          line-height: 1.65;
        }

        .landing-features {
          padding-top: 90px;
        }

        .landing-section-heading {
          max-width: 620px;
          margin: 0 auto 34px;
          text-align: center;
        }

        .landing-section-heading h2 {
          margin: 0 0 12px;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(30px, 4vw, 43px);
          font-weight: 500;
          letter-spacing: -.035em;
        }

        .landing-section-heading p {
          margin: 0;
          color: var(--landing-muted);
          font-size: 14px;
          line-height: 1.8;
        }

        .landing-feature-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .landing-feature-card {
          min-width: 0;
          padding: 24px;
          border: 1px solid #E4E6F1;
          border-radius: 14px;
          background: rgba(255,255,255,.91);
          box-shadow: 0 7px 24px rgba(37,32,76,.035);
          transition: transform .18s ease, box-shadow .18s ease;
        }

        .landing-feature-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 30px rgba(37,32,76,.075);
        }

        .landing-feature-icon {
          display: grid;
          width: 44px;
          height: 44px;
          place-items: center;
          margin-bottom: 19px;
          border-radius: 12px;
        }

        .landing-feature-card h3 {
          margin: 0 0 9px;
          font-size: 16px;
          font-weight: 750;
          letter-spacing: -.25px;
        }

        .landing-feature-card p {
          margin: 0;
          color: var(--landing-muted);
          font-size: 13px;
          line-height: 1.8;
        }

        .landing-bottom-cta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          margin-top: 54px;
          padding: 26px 28px;
          border: 1px solid #E5DFF8;
          border-radius: 15px;
          background: rgba(255,255,255,.88);
        }

        .landing-bottom-cta h3 {
          margin: 0 0 7px;
          font-size: 18px;
        }

        .landing-bottom-cta p {
          margin: 0;
          color: var(--landing-muted);
          font-size: 13px;
          line-height: 1.7;
        }

        .landing-footer {
          padding: 20px 24px;
          border-top: 1px solid var(--landing-line);
          background: rgba(255,255,255,.72);
          color: #81869A;
          font-size: 12px;
          text-align: center;
        }

        @media (max-width: 900px) {
          .landing-main {
            padding-top: 60px;
          }

          .landing-hero {
            grid-template-columns: minmax(0, 1fr);
            gap: 40px;
          }

          .landing-copy {
            max-width: 680px;
            margin: 0 auto;
            width: 100%;
          }

          .landing-preview {
            width: 100%;
            max-width: 570px;
            margin: 0 auto;
          }

          .landing-feature-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .landing-features {
            padding-top: 70px;
          }
        }

        @media (max-width: 560px) {
          .landing-nav {
            min-height: 62px;
            padding: 11px 17px;
          }

          .landing-brand {
            font-size: 18px;
          }

          .landing-brand-icon {
            width: 35px;
            height: 35px;
          }

          .landing-nav-note {
            max-width: 130px;
            font-size: 11px;
            text-align: right;
          }

          .landing-main {
            padding: 43px 18px 48px;
          }

          .landing-eyebrow {
            margin-bottom: 19px;
            font-size: 9px;
            letter-spacing: 1px;
          }

          .landing-heading {
            font-size: clamp(41px, 11.5vw, 57px);
            letter-spacing: -.045em;
          }

          .landing-description {
            font-size: 15px;
            line-height: 1.8;
          }

          .landing-actions {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 10px;
            margin-top: 24px;
          }

          .landing-button {
            width: 100%;
            min-height: 47px;
          }

          .landing-preview {
            padding: 17px;
            border-radius: 14px;
          }

          .landing-preview-metrics {
            gap: 9px;
          }

          .landing-metric {
            padding: 13px 11px;
          }

          .landing-features {
            padding-top: 58px;
          }

          .landing-section-heading {
            margin-bottom: 24px;
            text-align: left;
          }

          .landing-feature-grid {
            grid-template-columns: minmax(0, 1fr);
            gap: 12px;
          }

          .landing-feature-card {
            padding: 21px;
          }

          .landing-bottom-cta {
            align-items: stretch;
            flex-direction: column;
            gap: 18px;
            margin-top: 30px;
            padding: 21px;
          }

          .landing-bottom-cta .landing-button {
            width: 100%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .finance-landing *,
          .finance-landing *::before,
          .finance-landing *::after {
            scroll-behavior: auto !important;
            transition-duration: .01ms !important;
            animation-duration: .01ms !important;
          }
        }
      `}</style>

      {/* Standalone light header */}
      <header className="landing-nav">
        <Link
          to="/"
          className="landing-brand"
          aria-label="Finance Manager home"
        >
          <span className="landing-brand-icon">
            <Wallet size={21} />
          </span>
          Moneo
        </Link>

        <span className="landing-nav-note">
          Personal finance, made clearer.
        </span>
      </header>

      <main className="landing-main">
        {/* Hero */}
        <section className="landing-hero">
          <div className="landing-copy">
            <div className="landing-eyebrow">
              <ShieldCheck size={14} />
              Intelligent Personal Finance
            </div>

            <h1 className="landing-heading">Know where your money goes.</h1>

            <p className="landing-description">
              Track your transactions, plan your budget, and understand your
              spending with meaningful financial insights in one simple place.
            </p>

            <div className="landing-actions">
              <Link
                to="/register"
                className="landing-button landing-button-primary"
              >
                Get Started Free
                <ArrowRight size={17} />
              </Link>

              <Link
                to="/login"
                className="landing-button landing-button-secondary"
              >
                Log In
              </Link>
            </div>

            <div className="landing-trust-note">
              <CheckCircle2 size={16} color="#0C9B78" />
              <span>
                Personal budgeting, expense tracking, and financial insights.
              </span>
            </div>
          </div>

          {/* Illustrative dashboard preview */}
          <div className="landing-preview">
            <div className="landing-preview-top">
              <span className="landing-preview-label">Finance overview</span>

              <span className="landing-preview-status">
                <CheckCircle2 size={14} />
                Your finances, organized
              </span>
            </div>

            <h2 className="landing-preview-title">Your financial dashboard</h2>

            <p className="landing-preview-subtitle">
              A clearer view of your money, month by month.
            </p>

            <div className="landing-preview-metrics">
              <div className="landing-metric">
                <div className="landing-metric-label">Expense tracking</div>
                <div className="landing-metric-value">
                  <PieChart size={22} color="#7957E8" aria-hidden="true" />
                </div>
                <div className="landing-metric-label">
                  Organize transactions
                </div>
              </div>

              <div className="landing-metric">
                <div className="landing-metric-label">Budget planning</div>
                <div className="landing-metric-value">
                  <TrendingUp size={22} color="#0C9B78" aria-hidden="true" />
                </div>
                <div className="landing-metric-label">Monitor your targets</div>
              </div>

              <div className="landing-metric">
                <div className="landing-metric-label">AI financial advisor</div>
                <div className="landing-metric-value">
                  <Sparkles size={22} color="#7957E8" aria-hidden="true" />
                </div>
                <div className="landing-metric-label">Understand spending</div>
              </div>

              <div className="landing-metric">
                <div className="landing-metric-label">Financial goals</div>
                <div className="landing-metric-value">
                  <ShieldCheck size={22} color="#3478E5" aria-hidden="true" />
                </div>
                <div className="landing-metric-label">Plan ahead</div>
              </div>
            </div>

            <div className="landing-preview-callout">
              <Sparkles size={17} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                Turn your financial activity into useful insights and more
                informed budgeting decisions.
              </span>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="landing-features">
          <div className="landing-section-heading">
            <h2>Everything you need to manage your money</h2>
            <p>
              Practical tools to help you understand expenses, stay mindful of
              budgets, and work toward your financial goals.
            </p>
          </div>

          <div className="landing-feature-grid">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article key={feature.title} className="landing-feature-card">
                  <div
                    className="landing-feature-icon"
                    style={{
                      color: feature.color,
                      backgroundColor: feature.background,
                    }}
                  >
                    <Icon size={21} />
                  </div>

                  <h3>{feature.title}</h3>

                  <p>{feature.description}</p>
                </article>
              );
            })}
          </div>

          <div className="landing-bottom-cta">
            <div>
              <h3>Ready to take control of your finances?</h3>
              <p>
                Start organizing your money with your own finance dashboard.
              </p>
            </div>

            <Link
              to="/register"
              className="landing-button landing-button-primary"
            >
              Create your account
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        Moneo · Personal finance management
      </footer>
    </div>
  );
}
