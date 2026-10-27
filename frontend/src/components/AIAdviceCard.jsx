import { useState } from "react";
import { Bot, Send, User, Sparkles } from "lucide-react";
import { useMonthlySummary } from "../hooks/useMonthlySummary";
import api from "../services/api";

export default function AIAdviceCard() {
  const {
    insights,
    loading: insightsLoading,
    error: insightsError,
  } = useMonthlySummary();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  const sendMessage = async (messageOverride = null) => {
    const message = (messageOverride ?? input).trim();

    if (!message || chatLoading) {
      return;
    }

    setChatError("");

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: message,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setChatLoading(true);

    try {
      const { data } = await api.post("/advisor/chat", {
        message,
      });

      const aiMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.answer,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("AI advisor error:", error);

      setChatError("I couldn't connect to the AI advisor. Please try again.");
    } finally {
      setChatLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  const suggestedQuestions = [
    "Why did I spend so much this month?",
    "How can I save more money?",
    "What are my biggest expenses?",
  ];

  return (
    <div
      className="card ai-advisor-card"
      style={{
        overflow: "hidden",
      }}
    >
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 6,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: "var(--color-accent)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Bot size={21} />
        </div>

        <div>
          <h3 style={{ margin: 0 }}>AI Financial Advisor</h3>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              marginTop: 2,
              color: "var(--color-ink-muted)",
              fontSize: 12,
            }}
          >
            <Sparkles size={12} />
            Personalized financial insights
          </div>
        </div>
      </div>

      {/* =====================================================
          MONTHLY INSIGHTS
      ====================================================== */}

      <div style={{ marginTop: 16 }}>
        <p
          style={{
            color: "var(--color-ink-muted)",
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          Your financial activity is analyzed using your verified transaction,
          budget and financial data.
        </p>

        {insightsLoading && (
          <p
            style={{
              color: "var(--color-ink-muted)",
              fontSize: 14,
            }}
          >
            Analyzing your finances…
          </p>
        )}

        {insightsError && (
          <p
            style={{
              color: "var(--color-alert)",
              fontSize: 14,
            }}
          >
            {insightsError}
          </p>
        )}

        {!insightsLoading && !insightsError && insights.length === 0 && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              background: "var(--color-surface-soft)",
              color: "var(--color-ink-muted)",
              fontSize: 13,
            }}
          >
            No notable month-over-month changes yet. Keep adding transactions to
            unlock more insights.
          </div>
        )}

        {!insightsLoading &&
          !insightsError &&
          insights.slice(0, 3).map((insight, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                padding: "13px 0",
                borderTop: i > 0 ? "1px solid var(--color-line)" : "none",
              }}
            >
              <span
                className={`pill ${
                  insight.change_pct > 0 ? "pill-alert" : "pill-accent"
                }`}
                style={{
                  flexShrink: 0,
                }}
              >
                {insight.change_pct > 0 ? "▲" : "▼"}{" "}
                {Math.abs(insight.change_pct)}%
              </span>

              <div style={{ minWidth: 0 }}>
                <strong>{insight.category}</strong>

                <p
                  style={{
                    margin: "4px 0 0",
                    color: "var(--color-ink-muted)",
                    fontSize: 14,
                    lineHeight: 1.55,
                  }}
                >
                  {insight.advice}
                </p>
              </div>
            </div>
          ))}
      </div>

      {/* =====================================================
          DIVIDER
      ====================================================== */}

      <div
        style={{
          borderTop: "1px solid var(--color-line)",
          margin: "18px 0",
        }}
      />

      {/* =====================================================
          CHAT SECTION
      ====================================================== */}

      <div>
        <h4
          style={{
            margin: "0 0 10px",
            fontSize: 14,
          }}
        >
          Ask your financial advisor
        </h4>

        {/* Suggested Questions */}

        {messages.length === 0 && (
          <div
            className="ai-suggested-questions"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 16,
            }}
          >
            {suggestedQuestions.map((question) => (
              <button
                key={question}
                type="button"
                className="btn btn-ghost"
                onClick={() => sendMessage(question)}
                style={{
                  fontSize: 12,
                  padding: "8px 11px",
                  textAlign: "left",
                }}
              >
                {question}
              </button>
            ))}
          </div>
        )}

        {/* Chat Messages */}

        {messages.length > 0 && (
          <div
            className="ai-chat-messages"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              maxHeight: 360,
              overflowY: "auto",
              marginBottom: 14,
              paddingRight: 3,
            }}
          >
            {messages.map((message) => {
              const isUser = message.role === "user";

              return (
                <div
                  key={message.id}
                  style={{
                    display: "flex",
                    justifyContent: isUser ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      maxWidth: "88%",
                      flexDirection: isUser ? "row-reverse" : "row",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: isUser
                          ? "var(--color-line)"
                          : "var(--color-accent)",
                        color: isUser ? "var(--color-ink)" : "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {isUser ? <User size={14} /> : <Bot size={14} />}
                    </div>

                    <div
                      style={{
                        background: isUser
                          ? "var(--color-accent)"
                          : "var(--color-surface-soft)",
                        color: isUser ? "#fff" : "var(--color-ink)",
                        padding: "9px 12px",
                        borderRadius: 12,
                        fontSize: 14,
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {message.content}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* AI Loading */}

            {chatLoading && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "var(--color-ink-muted)",
                  fontSize: 13,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "var(--color-accent)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Bot size={14} />
                </div>
                Thinking…
              </div>
            )}
          </div>
        )}

        {/* Error */}

        {chatError && (
          <p
            style={{
              color: "var(--color-alert)",
              fontSize: 13,
              margin: "0 0 10px",
            }}
          >
            {chatError}
          </p>
        )}

        {/* Chat Input */}

        <form
          onSubmit={handleSubmit}
          className="ai-chat-form"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <input
            type="text"
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your finances…"
            maxLength={1000}
            disabled={chatLoading}
            style={{
              flex: 1,
              minWidth: 0,
              height: 42,
              boxSizing: "border-box",
            }}
          />

          <button
            type="submit"
            className="btn btn-accent"
            disabled={!input.trim() || chatLoading}
            style={{
              width: 42,
              height: 42,
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            aria-label="Send message"
          >
            <Send size={17} />
          </button>
        </form>
      </div>

      {/* =====================================================
          MOBILE STYLES
      ====================================================== */}

      <style>
        {`
          .ai-chat-messages::-webkit-scrollbar {
            width: 5px;
          }

          .ai-chat-messages::-webkit-scrollbar-thumb {
            background: var(--color-line);
            border-radius: 10px;
          }

          @media (max-width: 600px) {
            .ai-advisor-card {
              padding: 18px !important;
            }

            .ai-suggested-questions {
              display: grid !important;
              grid-template-columns: 1fr;
            }

            .ai-suggested-questions button {
              width: 100%;
            }

            .ai-chat-form {
              align-items: stretch !important;
            }

            .ai-chat-form input {
              min-width: 0;
            }
          }
        `}
      </style>
    </div>
  );
}
