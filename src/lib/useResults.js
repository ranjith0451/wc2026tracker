import { useEffect, useState } from "react";

const POLL_MS = 30_000; // 30 s — quick enough for live match updates

// Loads results from /api/results (Vercel KV) and re-polls every 30 s so
// every visitor sees live scores as soon as the admin saves them, with no
// manual file upload required. Falls back gracefully to {} when offline.
export function useResults() {
  const [results, setResults] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/results?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setResults(data || {});
          setLastUpdated(new Date());
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    }

    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { results, lastUpdated, error };
}
