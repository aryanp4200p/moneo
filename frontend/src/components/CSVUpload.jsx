import { useEffect, useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Loader2,
} from "lucide-react";

import { useTransactionStore } from "../store/transactionStore";

const ACCEPTED_EXTENSIONS = [".csv", ".jpg", ".jpeg", ".png", ".webp"];
const ACCEPTED_MIME_TYPES = [
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_FILE_SIZE_MB = 10;

export default function CSVUpload() {
  const previewStatement = useTransactionStore(
    (state) => state.previewStatement || state.previewCSV,
  );
  const importTransactions = useTransactionStore(
    (state) => state.importTransactions || state.importCSV,
  );

  const fileInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);

  const [fileMeta, setFileMeta] = useState(null); // { name, kind, previewUrl }
  const [previewData, setPreviewData] = useState(null);
  const [rows, setRows] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Clean up object URL for image previews
  useEffect(() => {
    return () => {
      if (fileMeta?.previewUrl) {
        URL.revokeObjectURL(fileMeta.previewUrl);
      }
    };
  }, [fileMeta]);

  // =========================================================
  // HELPERS
  // =========================================================

  const getFileKind = (file) => {
    const name = file.name.toLowerCase();
    if (name.endsWith(".csv") || file.type === "text/csv") return "csv";
    if (file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp)$/.test(name)) {
      return "image";
    }
    return null;
  };

  const formatCurrency = (value, showZero = false) => {
    const num = Number(value);
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      Number.isNaN(num)
    ) {
      return "—";
    }
    if (num === 0 && !showZero) return "—";

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(num);
  };

  // =========================================================
  // PROCESS FILE (CSV OR IMAGE)
  // =========================================================

  const processFile = async (file) => {
    if (!file) return;

    const kind = getFileKind(file);
    if (!kind) {
      setError(
        "Unsupported file. Please upload a .csv file or a passbook image (.jpg, .png, .webp).",
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File exceeds ${MAX_FILE_SIZE_MB}MB limit.`);
      return;
    }

    if (fileMeta?.previewUrl) {
      URL.revokeObjectURL(fileMeta.previewUrl);
    }

    const previewUrl = kind === "image" ? URL.createObjectURL(file) : null;

    setUploading(true);
    setError(null);
    setResult(null);
    setPreviewData(null);
    setRows([]);
    setSelectedIds(new Set());
    setFileMeta({ name: file.name, kind, previewUrl });

    try {
      const data = await previewStatement(file);
      setPreviewData(data);

      const normalizedRows = (data.preview || []).map((tx, idx) => ({
        ...tx,
        _rowId: tx.id || `row_${idx}_${Date.now()}`,
      }));

      setRows(normalizedRows);

      const defaultSelected = new Set(
        normalizedRows.filter((tx) => !tx.is_duplicate).map((tx) => tx._rowId),
      );
      setSelectedIds(defaultSelected);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          `Could not extract transactions from this ${kind === "csv" ? "CSV" : "image"}.`,
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // =========================================================
  // DRAG & DROP + INPUT HANDLERS
  // =========================================================

  const handleFileChange = (e) => processFile(e.target.files?.[0]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files?.[0]);
  };

  // =========================================================
  // SELECTION & INLINE EDITING
  // =========================================================

  const toggleRow = (rowId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === rows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((r) => r._rowId)));
    }
  };

  const updateRowField = (rowId, field, value) => {
    setRows((prev) =>
      prev.map((row) =>
        row._rowId === rowId ? { ...row, [field]: value } : row,
      ),
    );
  };

  // =========================================================
  // IMPORT & RESET
  // =========================================================

  const handleImport = async () => {
    if (selectedIds.size === 0) {
      setError("Please select at least one transaction to import.");
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const payload = rows
        .filter((r) => selectedIds.has(r._rowId))
        .map(({ _rowId, ...cleanTx }) => cleanTx);

      const data = await importTransactions(payload);
      setResult(data);
      setPreviewData(null);
      setRows([]);
      setSelectedIds(new Set());
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Could not import the selected transactions.",
      );
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    if (fileMeta?.previewUrl) {
      URL.revokeObjectURL(fileMeta.previewUrl);
    }
    setFileMeta(null);
    setPreviewData(null);
    setRows([]);
    setSelectedIds(new Set());
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="card">
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
        }}
      >
        <FileText size={18} style={{ color: "var(--color-accent)" }} />
        <h3 style={{ margin: 0 }}>Import Bank Statement</h3>
      </div>

      <p
        style={{
          color: "var(--color-ink-muted)",
          fontSize: 13,
          marginBottom: 16,
        }}
      >
        Upload a CSV bank statement or a photo/screenshot of your passbook.
      </p>

      {/* UPLOAD DROPZONE */}
      {!previewData && !result && (
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${
              isDragging ? "var(--color-accent)" : "var(--color-line)"
            }`,
            borderRadius: "var(--radius)",
            padding: "28px 16px",
            textAlign: "center",
            cursor: "pointer",
            backgroundColor: isDragging
              ? "var(--color-accent-soft)"
              : "transparent",
            transition: "all 0.2s ease",
          }}
        >
          {uploading ? (
            <Loader2
              size={32}
              className="spin"
              style={{ color: "var(--color-accent)" }}
            />
          ) : (
            <UploadCloud size={32} style={{ color: "var(--color-accent)" }} />
          )}

          <p style={{ margin: "10px 0 4px", fontWeight: 600 }}>
            {uploading
              ? fileMeta?.kind === "csv"
                ? "Parsing CSV statement..."
                : "Reading passbook image..."
              : "Drag & drop your CSV or passbook image here"}
          </p>

          {!uploading && (
            <>
              <span style={{ color: "var(--color-ink-muted)", fontSize: 13 }}>
                or click to browse
              </span>

              {/* SUPPORTED FORMAT PILLS */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 8,
                  marginTop: 14,
                  flexWrap: "wrap",
                }}
              >
                <FormatPill
                  icon={<FileSpreadsheet size={13} />}
                  label="CSV Statement"
                />
                <FormatPill
                  icon={<ImageIcon size={13} />}
                  label="Passbook Image (JPG / PNG / WEBP)"
                />
              </div>

              <p
                style={{
                  color: "var(--color-ink-muted)",
                  fontSize: 11,
                  marginTop: 10,
                  marginBottom: 0,
                }}
              >
                Columns: Date, Particulars, Cheque No, Debit, Credit, Balance
                (Max {MAX_FILE_SIZE_MB}MB)
              </p>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={[...ACCEPTED_EXTENSIONS, ...ACCEPTED_MIME_TYPES].join(",")}
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </div>
      )}

      {/* ERROR BANNER */}
      {error && (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: "var(--radius)",
            background: "var(--color-danger-soft)",
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <AlertCircle size={18} />
          <span style={{ fontSize: 13 }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: "auto",
              border: "none",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* PREVIEW & REVIEW */}
      {previewData && (
        <div style={{ marginTop: 20 }}>
          {/* FILE HEADER + IMAGE THUMBNAIL */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {fileMeta?.previewUrl && (
                <img
                  src={fileMeta.previewUrl}
                  alt="Uploaded passbook preview"
                  style={{
                    width: 48,
                    height: 48,
                    objectFit: "cover",
                    borderRadius: 6,
                    border: "1px solid var(--color-line)",
                  }}
                />
              )}
              <div>
                <strong>Review Statement</strong>
                <div
                  style={{
                    color: "var(--color-ink-muted)",
                    fontSize: 12,
                    marginTop: 3,
                  }}
                >
                  {fileMeta?.name} •{" "}
                  {fileMeta?.kind === "csv" ? "CSV" : "Image"}
                </div>
              </div>
            </div>

            <button
              onClick={handleReset}
              aria-label="Cancel upload"
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* IMAGE OCR TIP */}
          {fileMeta?.kind === "image" && (
            <div
              style={{
                padding: 10,
                marginBottom: 14,
                borderRadius: "var(--radius)",
                background: "var(--color-accent-soft)",
                fontSize: 12,
                color: "var(--color-ink-muted)",
              }}
            >
              Tip: Verify extracted dates and Debit/Credit amounts below—click
              any description to edit before importing.
            </div>
          )}

          {/* SUMMARY */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <SummaryBox
              label="Parsed"
              value={previewData.parsed_count ?? rows.length}
            />
            <SummaryBox
              label="New"
              value={previewData.new_count ?? rows.length}
            />
            <SummaryBox
              label="Duplicates"
              value={previewData.duplicate_count ?? 0}
            />
            <SummaryBox label="Errors" value={previewData.error_count ?? 0} />
          </div>

          {/* DUPLICATE WARNING */}
          {previewData.duplicate_count > 0 && (
            <div
              style={{
                padding: 12,
                marginBottom: 14,
                borderRadius: "var(--radius)",
                background: "var(--color-accent-soft)",
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
              }}
            >
              <AlertTriangle size={18} />
              <div style={{ fontSize: 13 }}>
                <strong>Duplicate transactions found</strong>
                <div style={{ marginTop: 3, color: "var(--color-ink-muted)" }}>
                  Existing transactions are unchecked by default.
                </div>
              </div>
            </div>
          )}

          {/* PASSBOOK PREVIEW TABLE */}
          {rows.length > 0 ? (
            <div
              style={{
                overflowX: "auto",
                border: "1px solid var(--color-line)",
                borderRadius: "var(--radius)",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr>
                    <th style={{ padding: 10, textAlign: "left" }}>
                      <input
                        type="checkbox"
                        aria-label="Select all transactions"
                        checked={
                          selectedIds.size === rows.length && rows.length > 0
                        }
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th style={{ padding: 10, textAlign: "left" }}>Date</th>
                    <th style={{ padding: 10, textAlign: "left" }}>
                      Particulars
                    </th>
                    <th style={{ padding: 10, textAlign: "left" }}>
                      Cheque No
                    </th>
                    <th style={{ padding: 10, textAlign: "left" }}>Category</th>
                    <th style={{ padding: 10, textAlign: "right" }}>Debit</th>
                    <th style={{ padding: 10, textAlign: "right" }}>Credit</th>
                    <th style={{ padding: 10, textAlign: "right" }}>Balance</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((tx) => {
                    const isChecked = selectedIds.has(tx._rowId);
                    return (
                      <tr
                        key={tx._rowId}
                        onClick={() => toggleRow(tx._rowId)}
                        style={{
                          borderTop: "1px solid var(--color-line)",
                          cursor: "pointer",
                          opacity: tx.is_duplicate && !isChecked ? 0.55 : 1,
                        }}
                      >
                        <td
                          style={{ padding: 10 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            aria-label={`Select transaction ${tx.particulars || tx.date}`}
                            checked={isChecked}
                            onChange={() => toggleRow(tx._rowId)}
                          />
                        </td>

                        <td style={{ padding: 10, whiteSpace: "nowrap" }}>
                          {tx.date || "—"}
                        </td>

                        <td
                          style={{ padding: 10, minWidth: 200 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={
                              tx.particulars || tx.merchant || tx.note || ""
                            }
                            onChange={(e) =>
                              updateRowField(
                                tx._rowId,
                                "particulars",
                                e.target.value,
                              )
                            }
                            placeholder="Enter particulars"
                            style={{
                              width: "100%",
                              border: "1px solid transparent",
                              background: "transparent",
                              color: "inherit",
                              fontSize: 13,
                              padding: "2px 4px",
                              borderRadius: 4,
                            }}
                            onFocus={(e) =>
                              (e.target.style.borderColor = "var(--color-line)")
                            }
                            onBlur={(e) =>
                              (e.target.style.borderColor = "transparent")
                            }
                          />
                        </td>

                        <td
                          style={{
                            padding: 10,
                            whiteSpace: "nowrap",
                            color: "var(--color-ink-muted)",
                            fontSize: 12,
                          }}
                        >
                          {tx.cheque_no && tx.cheque_no !== "-"
                            ? tx.cheque_no
                            : "—"}
                        </td>

                        <td style={{ padding: 10 }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 8px",
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 600,
                              background: tx.category
                                ? "var(--color-accent-soft)"
                                : "transparent",
                              border: tx.category
                                ? "none"
                                : "1px solid var(--color-line)",
                            }}
                          >
                            {tx.category || "Needs review"}
                          </span>
                        </td>

                        <td
                          style={{
                            padding: 10,
                            textAlign: "right",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            color:
                              Number(tx.debit) > 0
                                ? "var(--color-danger, #dc2626)"
                                : "var(--color-ink-muted)",
                          }}
                        >
                          {formatCurrency(tx.debit)}
                        </td>

                        <td
                          style={{
                            padding: 10,
                            textAlign: "right",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            color:
                              Number(tx.credit) > 0
                                ? "var(--color-success, #16a34a)"
                                : "var(--color-ink-muted)",
                          }}
                        >
                          {formatCurrency(tx.credit)}
                        </td>

                        <td
                          style={{
                            padding: 10,
                            textAlign: "right",
                            whiteSpace: "nowrap",
                            color: "var(--color-ink-muted)",
                          }}
                        >
                          {formatCurrency(tx.balance, true)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              style={{
                padding: 20,
                textAlign: "center",
                color: "var(--color-ink-muted)",
              }}
            >
              No transactions detected in this file.
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 16,
            }}
          >
            <button
              onClick={handleReset}
              disabled={importing}
              style={{
                padding: "9px 14px",
                border: "1px solid var(--color-line)",
                borderRadius: "var(--radius)",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            <button
              onClick={handleImport}
              disabled={importing || selectedIds.size === 0}
              style={{
                padding: "9px 16px",
                border: "none",
                borderRadius: "var(--radius)",
                background: "var(--color-accent)",
                color: "white",
                cursor:
                  importing || selectedIds.size === 0
                    ? "not-allowed"
                    : "pointer",
                opacity: importing || selectedIds.size === 0 ? 0.6 : 1,
                fontWeight: 600,
              }}
            >
              {importing
                ? "Importing..."
                : `Import Selected (${selectedIds.size})`}
            </button>
          </div>
        </div>
      )}

      {/* SUCCESS STATE */}
      {result && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            borderRadius: "var(--radius)",
            background: "var(--color-accent-soft)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <CheckCircle2 size={20} />
            <strong>Import completed successfully</strong>
          </div>

          <div style={{ fontSize: 13, color: "var(--color-ink-muted)" }}>
            {result.imported_count || 0} transaction(s) imported.
          </div>

          {result.error_count > 0 && (
            <div style={{ marginTop: 6, fontSize: 13 }}>
              {result.error_count} transaction(s) could not be imported.
            </div>
          )}

          <button
            onClick={handleReset}
            style={{
              marginTop: 12,
              padding: "8px 14px",
              border: "1px solid var(--color-line)",
              borderRadius: "var(--radius)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            Import Another Statement
          </button>
        </div>
      )}
    </div>
  );
}

// =========================================================
// SUBCOMPONENTS
// =========================================================

function FormatPill({ icon, label }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 500,
        border: "1px solid var(--color-line)",
        color: "var(--color-ink-muted)",
      }}
    >
      {icon}
      {label}
    </span>
  );
}

function SummaryBox({ label, value }) {
  return (
    <div
      style={{
        padding: 10,
        border: "1px solid var(--color-line)",
        borderRadius: "var(--radius)",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 11, color: "var(--color-ink-muted)" }}>
        {label}
      </div>
      <strong style={{ fontSize: 18 }}>{value}</strong>
    </div>
  );
}
