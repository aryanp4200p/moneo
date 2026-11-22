import { useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  FileImage,
  FileText,
  Loader2,
  ScanLine,
  ShieldCheck,
  Tag,
  UploadCloud,
  X,
} from "lucide-react";
import api from "../services/api";

const money = (value) =>
  value == null || value === ""
    ? "—"
    : `₹${Number(value).toLocaleString("en-IN", {
        maximumFractionDigits: 2,
      })}`;

const panelStyle = {
  background: "var(--color-bg)",
  border: "1px solid var(--color-line)",
  borderRadius: 18,
  padding: 20,
  minWidth: 0,
};

const iconTileStyle = {
  width: 42,
  height: 42,
  borderRadius: 12,
  display: "grid",
  placeItems: "center",
  background: "rgba(20, 184, 166, 0.14)",
  color: "var(--color-accent, #14b8a6)",
  flexShrink: 0,
};

export default function ReceiptScannerPage() {
  const inputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [dragging, setDragging] = useState(false);

  const chooseFile = (selected) => {
    if (!selected) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(selected.type)) {
      setError("Please choose a JPG, PNG, or WEBP receipt image.");
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setError("Receipt image must be 10 MB or smaller.");
      return;
    }

    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setData(null);
    setSaved(false);
    setError("");
  };

  const removeFile = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
    setData(null);
    setSaved(false);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const scan = async () => {
    if (!file) return;
    setBusy(true);
    setError("");

    try {
      const form = new FormData();
      form.append("file", file);
      const response = await api.post("/receipt-ocr/preview", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not scan the receipt.");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!data) return;
    setSaving(true);
    setError("");

    try {
      await api.post("/receipt-ocr/save", {
        amount: data.amount,
        date: data.date,
        merchant: data.merchant,
        category: data.category,
        note: "Receipt scanned with OCR",
      });
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not save the transaction.");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setData((current) => ({ ...current, [field]: value }));
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files?.[0]);
  };

  const mutedText = { color: "var(--color-ink-muted, #b6c2d2)" };
  const fieldStyle = {
    display: "grid",
    gap: 7,
    fontSize: 13,
    marginBottom: 14,
    color: "var(--color-ink, #f8fafc)",
  };

  return (
    <main
      className="page-shell"
      style={{
        width: "100%",
        maxWidth: 1600,
        boxSizing: "border-box",
        margin: "0 auto",
        padding: "clamp(16px, 2.5vw, 36px) clamp(14px, 3vw, 44px) 56px",
      }}
    >
      <style>{`
        .receipt-layout { display:grid; grid-template-columns:minmax(0,1fr); gap:24px; align-items:stretch; width:100%; }
        .receipt-dropzone {
          width: 100%;
          min-height: clamp(280px, 38vw, 390px);
          box-sizing: border-box;
          border: 1.5px dashed var(--color-line, #3b4b61);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: clamp(18px, 4vw, 36px);
          transition: border-color 0.2s, background 0.2s;
          background: var(--color-surface, #1e293b) !important;
        }
        .receipt-drop-content { width:100%; max-width:620px; margin:0 auto; }
        .receipt-heading { text-align:center; }
        .receipt-subtitle { max-width:560px; margin:0 auto 20px; line-height:1.6; }
        .receipt-upload-actions { display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:12px; }
        .receipt-feature-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:18px; padding:24px 4px 2px; }
        .receipt-feature { display:flex; align-items:flex-start; gap:12px; min-width:0; }
        .receipt-feature-copy { min-width:0; overflow-wrap:anywhere; }
        .receipt-feature-copy strong { display:block; font-size:13px; line-height:1.4; }
        .receipt-feature-copy p { margin:5px 0 0; font-size:12px; line-height:1.5; color:var(--color-ink-muted,#b6c2d2); }
        .receipt-dropzone.dragging { border-color:var(--color-accent,#14b8a6); background:rgba(20,184,166,.12); }
        .receipt-primary { display:inline-flex; align-items:center; justify-content:center; gap:9px; border:0; border-radius:13px; padding:14px 22px; font-weight:700; cursor:pointer; background:var(--color-accent,#14b8a6); color:#062c2b; transition:transform .15s,filter .15s; }
        .receipt-primary:hover { filter:brightness(1.06); transform:translateY(-1px); }
        .receipt-primary:disabled { opacity:.6; cursor:not-allowed; transform:none; }
        .receipt-secondary { display:inline-flex; align-items:center; justify-content:center; gap:8px; border:1px solid var(--color-line,#475569); border-radius:11px; padding:10px 14px; background:transparent; color:inherit; cursor:pointer; }
        .receipt-upload-btn { display:inline-flex; align-items:center; justify-content:center; gap:9px; border:1px solid var(--color-line,#475569); border-radius:13px; padding:14px 22px; font-weight:600; background:rgba(148,163,184,.08); color:var(--color-ink,#f8fafc); cursor:pointer; }
        .receipt-badge { display:inline-flex; align-items:center; justify-content:center; border-radius:999px; padding:7px 12px; font-size:12px; font-weight:700; background:rgba(148,163,184,.12); color:var(--color-ink,#e2e8f0); }
        .receipt-step { display:flex; align-items:flex-start; gap:12px; min-width:0; }
        .receipt-step p { margin:5px 0 0; font-size:12px; line-height:1.5; color:var(--color-ink-muted,#b6c2d2); }
        .receipt-heading {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        .receipt-heading h1 {
          color: var(--color-ink);
          letter-spacing: -0.035em;
        }
        .receipt-heading .dashboard-eyebrow {
          color: var(--color-accent);
        }
        .receipt-heading .receipt-subtitle {
          color: var(--color-ink-muted);
        }
        .receipt-dropzone {
          border-color: var(--color-line);
          background:
            linear-gradient(
              145deg,
              var(--color-accent-soft),
              transparent 75%
            );
          transition:
            border-color 180ms ease,
            background-color 180ms ease,
            box-shadow 180ms ease;
        }
        .receipt-dropzone:hover,
        .receipt-dropzone.dragging {
          border-color: var(--color-accent);
          box-shadow: inset 0 0 0 1px var(--color-accent-soft);
        }
        .receipt-primary {
          box-shadow: 0 4px 12px rgba(20, 184, 166, 0.16);
          transition:
            filter 180ms ease,
            box-shadow 180ms ease,
            transform 180ms ease;
        }
        .receipt-primary:hover:not(:disabled) {
          filter: brightness(1.05);
          box-shadow: 0 6px 16px rgba(20, 184, 166, 0.22);
        }
        .receipt-primary:focus-visible,
        .receipt-secondary:focus-visible,
        .receipt-upload-btn:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 3px;
        }
        .receipt-secondary,
        .receipt-upload-btn {
          transition:
            border-color 180ms ease,
            background-color 180ms ease,
            color 180ms ease;
        }
        .receipt-secondary:hover,
        .receipt-upload-btn:hover {
          border-color: var(--color-accent);
          background: var(--color-accent-soft);
          color: var(--color-accent);
        }
        .receipt-field {
          transition:
            border-color 180ms ease,
            box-shadow 180ms ease;
        }
        .receipt-field:focus {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 3px var(--color-accent-soft);
          outline: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .receipt-dropzone,
          .receipt-primary,
          .receipt-secondary,
          .receipt-upload-btn,
          .receipt-field {
            transition: none !important;
          }
        }
        .receipt-field { width:100%; box-sizing:border-box; }
        @media (max-width: 760px) {
          .receipt-feature-grid { grid-template-columns:1fr; gap:16px; }
          .receipt-feature { align-items:center; }
        }
        @media (max-width: 480px) {
          .receipt-dropzone { min-height:270px; padding:18px 14px; }
          .receipt-feature-grid { padding:20px 0 0; }
          .receipt-upload-actions { flex-direction:column; width:100%; }
          .receipt-primary,
          .receipt-upload-btn { width:100%; max-width:320px; }
        }
      `}</style>

      <header
        className="receipt-heading"
        style={{
          marginBottom: 24,
          background: "transparent",
          border: "none",
          borderRadius: 0,
          boxShadow: "none",
        }}
      >
        <p className="dashboard-eyebrow" style={{ marginBottom: 8 }}>
          AUTOMATED CAPTURE
        </p>
        <h1 style={{ margin: "0 0 10px", fontSize: "clamp(26px, 3vw, 36px)" }}>
          Receipt Scanner
        </h1>
        <p className="dashboard-subtitle receipt-subtitle">
          Upload a receipt, extract the transaction details, review them, and
          save.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          style={{
            ...panelStyle,
            marginBottom: 18,
            padding: "13px 16px",
            color: "var(--color-alert, #f87171)",
            borderColor: "rgba(248,113,113,.35)",
          }}
        >
          {error}
        </div>
      )}

      <div className="receipt-layout">
        <section
          style={{
            ...panelStyle,
            padding: "clamp(14px, 2vw, 26px)",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {!preview ? (
            <>
              <div
                className={`receipt-dropzone${dragging ? " dragging" : ""}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                <div className="receipt-drop-content">
                  <div
                    style={{
                      width: 68,
                      height: 68,
                      borderRadius: 20,
                      display: "grid",
                      placeItems: "center",
                      margin: "0 auto 18px",
                      background: "rgba(20,184,166,.16)",
                      color: "var(--color-accent, #14b8a6)",
                    }}
                  >
                    <UploadCloud size={32} />
                  </div>
                  <h2 style={{ margin: "0 0 8px", fontSize: 21 }}>
                    Capture or upload a receipt
                  </h2>
                  <p
                    style={{
                      ...mutedText,
                      margin: "0 0 20px",
                      lineHeight: 1.6,
                    }}
                  >
                    Take a live photo with your camera, drag and drop, or browse
                    files from your device.
                  </p>

                  <div className="receipt-upload-actions">
                    <button
                      type="button"
                      className="receipt-primary"
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      <Camera size={18} />
                      Take photo
                    </button>
                    <button
                      type="button"
                      className="receipt-upload-btn"
                      onClick={() => inputRef.current?.click()}
                    >
                      <FileImage size={18} />
                      Upload file
                    </button>
                  </div>

                  {/* Direct rear camera capture on mobile */}
                  <input
                    ref={cameraInputRef}
                    hidden
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    onChange={(event) => {
                      chooseFile(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />

                  {/* Standard gallery / file picker */}
                  <input
                    ref={inputRef}
                    hidden
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      chooseFile(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />

                  <p style={{ ...mutedText, fontSize: 12, margin: "16px 0 0" }}>
                    JPG, PNG or WEBP · Maximum file size 10 MB
                  </p>
                </div>
              </div>

              <div className="receipt-feature-grid">
                <div className="receipt-feature">
                  <div style={iconTileStyle}>
                    <ScanLine size={21} />
                  </div>
                  <div className="receipt-feature-copy">
                    <strong>Automatic extraction</strong>
                    <p>Detect merchant, amount and date.</p>
                  </div>
                </div>
                <div className="receipt-feature">
                  <div style={iconTileStyle}>
                    <Tag size={21} />
                  </div>
                  <div className="receipt-feature-copy">
                    <strong>Category suggestion</strong>
                    <p>Get a suggested spending category.</p>
                  </div>
                </div>
                <div className="receipt-feature">
                  <div style={iconTileStyle}>
                    <ShieldCheck size={21} />
                  </div>
                  <div className="receipt-feature-copy">
                    <strong>Review before saving</strong>
                    <p>Edit extracted details first.</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(min(100%,260px),1fr))",
                gap: 22,
                alignItems: "start",
              }}
            >
              <div style={{ position: "relative", minWidth: 0 }}>
                <img
                  src={preview}
                  alt="Receipt preview"
                  style={{
                    display: "block",
                    width: "100%",
                    maxHeight: 560,
                    objectFit: "contain",
                    borderRadius: 14,
                    background: "var(--color-bg, #0f172a)",
                  }}
                />
                <button
                  type="button"
                  className="receipt-secondary"
                  onClick={removeFile}
                  style={{ marginTop: 12 }}
                >
                  <X size={15} /> Remove receipt
                </button>
                <p
                  style={{
                    ...mutedText,
                    fontSize: 12,
                    overflowWrap: "anywhere",
                  }}
                >
                  {file?.name}
                </p>
              </div>

              <div style={{ minWidth: 0 }}>
                {!data ? (
                  <div style={{ textAlign: "center", padding: "35px 12px" }}>
                    <div
                      style={{
                        ...iconTileStyle,
                        margin: "0 auto 14px",
                        width: 58,
                        height: 58,
                      }}
                    >
                      {busy ? (
                        <Loader2 className="spin" size={27} />
                      ) : (
                        <Camera size={27} />
                      )}
                    </div>
                    <h2 style={{ margin: "0 0 8px", fontSize: 21 }}>
                      {busy ? "Scanning receipt…" : "Ready to scan"}
                    </h2>
                    <p
                      style={{
                        ...mutedText,
                        lineHeight: 1.6,
                        margin: "0 auto 20px",
                        maxWidth: 320,
                      }}
                    >
                      We’ll try to extract the merchant, amount, date and a
                      suggested category.
                    </p>
                    <button
                      type="button"
                      className="receipt-primary"
                      onClick={scan}
                      disabled={busy}
                    >
                      {busy ? (
                        <Loader2 className="spin" size={17} />
                      ) : (
                        <Camera size={17} />
                      )}
                      {busy ? "Scanning…" : "Scan receipt"}
                    </button>
                  </div>
                ) : (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 18,
                      }}
                    >
                      <div style={iconTileStyle}>
                        <FileText size={21} />
                      </div>
                      <div>
                        <h2 style={{ margin: 0, fontSize: 20 }}>
                          Review details
                        </h2>
                        <p
                          style={{
                            ...mutedText,
                            fontSize: 12,
                            margin: "4px 0 0",
                          }}
                        >
                          Check the extracted information before saving.
                        </p>
                      </div>
                    </div>

                    <label style={fieldStyle}>
                      Merchant
                      <input
                        className="input receipt-field"
                        value={data.merchant || ""}
                        onChange={(e) =>
                          updateField("merchant", e.target.value)
                        }
                      />
                    </label>
                    <label style={fieldStyle}>
                      Amount (₹)
                      <input
                        className="input receipt-field"
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.amount ?? ""}
                        onChange={(e) =>
                          updateField(
                            "amount",
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                      />
                    </label>
                    <label style={fieldStyle}>
                      Date
                      <input
                        className="input receipt-field"
                        type="date"
                        value={data.date || ""}
                        onChange={(e) => updateField("date", e.target.value)}
                      />
                    </label>
                    <label style={fieldStyle}>
                      Category
                      <input
                        className="input receipt-field"
                        value={data.category || ""}
                        onChange={(e) =>
                          updateField("category", e.target.value)
                        }
                      />
                    </label>

                    <div
                      style={{
                        ...panelStyle,
                        padding: 14,
                        margin: "4px 0 16px",
                        background: "rgba(20,184,166,.07)",
                      }}
                    >
                      <span style={{ ...mutedText, fontSize: 12 }}>
                        Receipt total
                      </span>
                      <div
                        style={{
                          fontSize: 25,
                          fontWeight: 800,
                          color: "var(--color-accent, #14b8a6)",
                          marginTop: 3,
                        }}
                      >
                        {money(data.amount)}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="receipt-primary"
                      onClick={save}
                      disabled={saving || saved}
                      style={{ width: "100%" }}
                    >
                      {saved ? (
                        <CheckCircle2 size={18} />
                      ) : saving ? (
                        <Loader2 className="spin" size={18} />
                      ) : (
                        <CheckCircle2 size={18} />
                      )}
                      {saved
                        ? "Transaction saved"
                        : saving
                          ? "Saving…"
                          : "Save transaction"}
                    </button>
                    {saved && (
                      <p
                        style={{
                          color: "var(--color-accent, #14b8a6)",
                          fontSize: 13,
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                        }}
                      >
                        <CheckCircle2 size={16} /> Added to your transactions
                        successfully.
                      </p>
                    )}
                    <p
                      style={{
                        ...mutedText,
                        fontSize: 11,
                        lineHeight: 1.5,
                        marginTop: 12,
                      }}
                    >
                      Always review OCR results before saving; receipt text can
                      be misread.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
