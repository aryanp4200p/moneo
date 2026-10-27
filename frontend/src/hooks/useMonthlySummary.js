import { useEffect, useState } from 'react';
import api from '../services/api';

/**
 * Fetches month-over-month category insights + AI advice for a given
 * year/month (defaults to the current month) from /advisor/monthly-insights.
 */
export function useMonthlySummary(year, month) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = {};
    if (year) params.year = year;
    if (month) params.month = month;

    api
      .get('/advisor/monthly-insights', { params })
      .then(({ data }) => {
        if (!cancelled) {
          setInsights(data.insights || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Could not load monthly insights');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [year, month]);

  return { insights, loading, error };
}
