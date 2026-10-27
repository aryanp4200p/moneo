import { useEffect, useState } from 'react';
import { useTransactionStore } from '../store/transactionStore';

const QUICK_CATEGORIES = ['Food', 'Movies', 'Shopping', 'Travel', 'Bills', 'Health', 'Other'];

export default function CategorizePrompt() {
  const pending = useTransactionStore((s) => s.pending);
  const fetchPending = useTransactionStore((s) => s.fetchPending);
  const categorizeTransaction = useTransactionStore((s) => s.categorizeTransaction);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleCategorize = async (id, category) => {
    setBusyId(id);
    try {
      await categorizeTransaction(id, category);
    } finally {
      setBusyId(null);
    }
  };

  if (pending.length === 0) {
    return (
      <div className="card">
        <h3>Categorize</h3>
        <p style={{ color: 'var(--color-ink-muted)', marginTop: 8 }}>
          Nothing waiting — every transaction is categorized.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: 4 }}>Categorize</h3>
      <p style={{ color: 'var(--color-ink-muted)', fontSize: 13, marginBottom: 16 }}>
        {pending.length} transaction{pending.length > 1 ? 's' : ''} waiting for a category.
      </p>

      {pending.map((txn) => (
        <div
          key={txn.id}
          style={{
            borderTop: '1px solid var(--color-line)',
            padding: '14px 0',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <strong>₹{txn.amount.toLocaleString('en-IN')}</strong>{' '}
              <span style={{ color: 'var(--color-ink-muted)', fontSize: 13 }}>
                {txn.date} {txn.note ? `· ${txn.note}` : ''}
              </span>
            </div>
            <span className="pill pill-alert">pending</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {QUICK_CATEGORIES.map((cat) => (
              <button
                key={cat}
                className="btn btn-ghost"
                disabled={busyId === txn.id}
                onClick={() => handleCategorize(txn.id, cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
