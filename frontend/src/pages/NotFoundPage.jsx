import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="container" style={{ textAlign: 'center', paddingTop: 100 }}>
      <h1 style={{ fontSize: 48, marginBottom: 12 }}>404</h1>
      <p style={{ color: 'var(--color-ink-muted)', marginBottom: 20 }}>
        This page doesn't exist.
      </p>
      <Link to="/" className="btn btn-primary">Go home</Link>
    </div>
  );
}
