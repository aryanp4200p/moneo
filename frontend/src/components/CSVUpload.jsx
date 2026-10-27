import { useRef, useState } from "react";

import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Loader2,
} from "lucide-react";

import { useTransactionStore } from "../store/transactionStore";

export default function CSVUpload() {
  const previewCSV = useTransactionStore((state) => state.previewCSV);
  const importCSV = useTransactionStore((state) => state.importCSV);

  const fileInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);

  const [fileName, setFileName] = useState("");
  const [previewData, setPreviewData] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // =========================================================
  // PROCESS FILE
  // =========================================================

  const processFile = async (file) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a valid .csv file.");
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);
    setPreviewData(null);
    setSelectedRows([]);
    setFileName(file.name);

    try {
      const data = await previewCSV(file);

      setPreviewData(data);

      // Select all new transactions by default
      const allIndexes = data.preview
        ? data.preview.map((_, index) => index)
        : [];

      setSelectedRows(allIndexes);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not preview the CSV file.");
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // =========================================================
  // FILE INPUT
  // =========================================================

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    processFile(file);
  };

  // =========================================================
  // DRAG & DROP
  // =========================================================

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();

    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    processFile(file);
  };

  // =========================================================
  // SELECT / UNSELECT
  // =========================================================

  const toggleRow = (index) => {
    setSelectedRows((current) => {
      if (current.includes(index)) {
        return current.filter((item) => item !== index);
      }

      return [...current, index];
    });
  };

  // =========================================================
  // SELECT ALL
  // =========================================================

  const toggleSelectAll = () => {
    if (!previewData?.preview) return;

    if (selectedRows.length === previewData.preview.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(previewData.preview.map((_, index) => index));
    }
  };

  // =========================================================
  // IMPORT SELECTED
  // =========================================================

  const handleImport = async () => {
    if (!previewData?.preview) return;

    if (selectedRows.length === 0) {
      setError("Please select at least one transaction to import.");
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const selectedTransactions = selectedRows.map(
        (index) => previewData.preview[index],
      );

      const data = await importCSV(selectedTransactions);

      setResult(data);

      // Clear preview after successful import
      setPreviewData(null);
      setSelectedRows([]);
      setFileName("");
    } catch (err) {
      setError(
        err.response?.data?.detail || "Could not import the transactions.",
      );
    } finally {
      setImporting(false);
    }
  };

  // =========================================================
  // RESET
  // =========================================================

  const handleReset = () => {
    setPreviewData(null);
    setSelectedRows([]);
    setResult(null);
    setError(null);
    setFileName("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // =========================================================
  // FORMAT MONEY
  // =========================================================

  const formatAmount = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // =========================================================
  // CATEGORY DISPLAY
  // =========================================================

  const getCategoryLabel = (transaction) => {
    return transaction.category || "Needs review";
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="card">
      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
        }}
      >
        <FileText
          size={18}
          style={{
            color: "var(--color-accent)",
          }}
        />

        <h3 style={{ margin: 0 }}>Import Bank Statement</h3>
      </div>

      <p
        style={{
          color: "var(--color-ink-muted)",
          fontSize: 13,
          marginBottom: 16,
        }}
      >
        Upload a CSV bank statement. Your transactions will be previewed before
        they are imported.
      </p>

      {/* ================================================= */}
      {/* UPLOAD AREA */}
      {/* ================================================= */}

      {!previewData && !result && (
        <div
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
              style={{
                color: "var(--color-accent)",
              }}
            />
          ) : (
            <UploadCloud
              size={32}
              style={{
                color: "var(--color-accent)",
              }}
            />
          )}

          <p
            style={{
              margin: "10px 0 4px",
              fontWeight: 600,
            }}
          >
            {uploading ? "Analyzing statement..." : "Drag & drop your CSV here"}
          </p>

          {!uploading && (
            <>
              <span
                style={{
                  color: "var(--color-ink-muted)",
                  fontSize: 13,
                }}
              >
                or click to browse
              </span>

              <p
                style={{
                  color: "var(--color-ink-muted)",
                  fontSize: 12,
                  marginTop: 10,
                  marginBottom: 0,
                }}
              >
                Required: date + amount/debit/credit
              </p>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </div>
      )}

      {/* ================================================= */}
      {/* ERROR */}
      {/* ================================================= */}

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

      {/* ================================================= */}
      {/* PREVIEW */}
      {/* ================================================= */}

      {previewData && (
        <div style={{ marginTop: 20 }}>
          {/* FILE NAME */}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div>
              <strong>Review Statement</strong>

              <div
                style={{
                  color: "var(--color-ink-muted)",
                  fontSize: 12,
                  marginTop: 3,
                }}
              >
                {fileName}
              </div>
            </div>

            <button
              onClick={handleReset}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* SUMMARY */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <SummaryBox label="Parsed" value={previewData.parsed_count} />

            <SummaryBox label="New" value={previewData.new_count} />

            <SummaryBox
              label="Duplicates"
              value={previewData.duplicate_count}
            />

            <SummaryBox label="Errors" value={previewData.error_count} />
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

                <div
                  style={{
                    marginTop: 3,
                    color: "var(--color-ink-muted)",
                  }}
                >
                  These transactions already exist and will not be imported.
                </div>
              </div>
            </div>
          )}

          {/* TABLE */}

          {previewData.preview?.length > 0 ? (
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
                    {/* SELECT */}

                    <th
                      style={{
                        padding: 10,
                        textAlign: "left",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={
                          selectedRows.length === previewData.preview.length &&
                          previewData.preview.length > 0
                        }
                        onChange={toggleSelectAll}
                      />
                    </th>

                    {/* DATE */}

                    <th
                      style={{
                        padding: 10,
                        textAlign: "left",
                      }}
                    >
                      Date
                    </th>

                    {/* MERCHANT */}

                    <th
                      style={{
                        padding: 10,
                        textAlign: "left",
                      }}
                    >
                      Merchant
                    </th>

                    {/* TYPE */}

                    <th
                      style={{
                        padding: 10,
                        textAlign: "left",
                      }}
                    >
                      Type
                    </th>

                    {/* CATEGORY */}

                    <th
                      style={{
                        padding: 10,
                        textAlign: "left",
                      }}
                    >
                      Category
                    </th>

                    {/* AMOUNT */}

                    <th
                      style={{
                        padding: 10,
                        textAlign: "right",
                      }}
                    >
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {previewData.preview.map((transaction, index) => (
                    <tr
                      key={index}
                      style={{
                        borderTop: "1px solid var(--color-line)",
                      }}
                    >
                      {/* CHECKBOX */}

                      <td
                        style={{
                          padding: 10,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(index)}
                          onChange={() => toggleRow(index)}
                        />
                      </td>

                      {/* DATE */}

                      <td
                        style={{
                          padding: 10,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {transaction.date}
                      </td>

                      {/* MERCHANT */}

                      <td
                        style={{
                          padding: 10,
                        }}
                      >
                        {transaction.merchant || transaction.note || "—"}
                      </td>

                      {/* TYPE */}

                      <td
                        style={{
                          padding: 10,
                        }}
                      >
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {transaction.type}
                        </span>
                      </td>

                      {/* CATEGORY */}

                      <td
                        style={{
                          padding: 10,
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 8px",
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 600,
                            background: transaction.category
                              ? "var(--color-accent-soft)"
                              : "transparent",
                            border: transaction.category
                              ? "none"
                              : "1px solid var(--color-line)",
                          }}
                        >
                          {getCategoryLabel(transaction)}
                        </span>
                      </td>

                      {/* AMOUNT */}

                      <td
                        style={{
                          padding: 10,
                          textAlign: "right",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatAmount(transaction.amount)}
                      </td>
                    </tr>
                  ))}
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
              No new transactions to import.
            </div>
          )}

          {/* IMPORT BUTTONS */}

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
              disabled={importing || selectedRows.length === 0}
              style={{
                padding: "9px 16px",
                border: "none",
                borderRadius: "var(--radius)",
                background: "var(--color-accent)",
                color: "white",
                cursor:
                  importing || selectedRows.length === 0
                    ? "not-allowed"
                    : "pointer",
                opacity: importing || selectedRows.length === 0 ? 0.6 : 1,
                fontWeight: 600,
              }}
            >
              {importing
                ? "Importing..."
                : `Import Selected (${selectedRows.length})`}
            </button>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* SUCCESS */}
      {/* ================================================= */}

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

          <div
            style={{
              fontSize: 13,
              color: "var(--color-ink-muted)",
            }}
          >
            {result.imported_count || 0} transaction(s) imported.
          </div>

          {result.error_count > 0 && (
            <div
              style={{
                marginTop: 6,
                fontSize: 13,
              }}
            >
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
// SUMMARY BOX
// =========================================================

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
      <div
        style={{
          fontSize: 11,
          color: "var(--color-ink-muted)",
        }}
      >
        {label}
      </div>

      <strong
        style={{
          fontSize: 18,
        }}
      >
        {value}
      </strong>
    </div>
  );
}
