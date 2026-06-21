/**
 * Favorites / Follow Team — localStorage-backed state shared across the app.
 *
 * Usage:
 *   const { favorites, toggle, isFav } = useFavorites();
 *   toggle("Brazil");
 *   isFav("Brazil");      // boolean
 *
 * Persists to localStorage and broadcasts via window event so multiple
 * components stay in sync without prop drilling.
 */
import { useCallback, useEffect, useState } from "react";

const LS_KEY = "wc26_favorites";
const EVT = "wc26-favs-changed";

function read() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(arr) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(arr));
    window.dispatchEvent(new CustomEvent(EVT, { detail: arr }));
  } catch {
    /* noop */
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState(read);

  useEffect(() => {
    const onUpd = (e) => setFavorites(e.detail || read());
    const onStorage = (e) => { if (e.key === LS_KEY) setFavorites(read()); };
    window.addEventListener(EVT, onUpd);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVT, onUpd);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const toggle = useCallback((team) => {
    if (!team) return;
    const cur = read();
    const next = cur.includes(team) ? cur.filter(t => t !== team) : [...cur, team];
    write(next);
  }, []);

  const isFav = useCallback((team) => favorites.includes(team), [favorites]);

  const clear = useCallback(() => write([]), []);

  return { favorites, toggle, isFav, clear };
}
