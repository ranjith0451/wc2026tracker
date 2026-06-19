import { useState, useRef, useEffect } from "react";
import { useTheme, ACCENTS } from "../lib/theme.jsx";

/* ── Icons (no emoji, inline SVG) ───────────────────────────────────────────── */
const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
  </svg>
);
const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const PaletteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.244-.273-.408-.633-.408-1.04 0-.927.747-1.667 1.667-1.667h1.97c3.063 0 5.56-2.496 5.56-5.56C22 6.42 17.523 2 12 2z"/>
  </svg>
);

export default function ThemePicker() {
  const { theme, accent, setTheme, setAccent } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onEsc(e) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onEsc); };
  }, []);

  const activeAccent = ACCENTS.find(a => a.id === accent) || ACCENTS[0];

  return (
    <div className="theme-picker" ref={ref}>
      <button
        data-testid="theme-picker-btn"
        className="theme-picker-btn"
        onClick={() => setOpen(o => !o)}
        aria-label="Theme settings"
        aria-expanded={open}
      >
        {theme === "dark" ? <MoonIcon /> : <SunIcon />}
        <span className="theme-picker-swatch" style={{ background: activeAccent.color }} />
        <span style={{ display: "none" }} data-testid="theme-picker-label">Theme</span>
      </button>

      {open && (
        <div className="theme-picker-panel" data-testid="theme-picker-panel" role="dialog">
          <div className="theme-picker-section">
            <div className="theme-picker-label">Appearance</div>
            <div className="theme-mode-row">
              <button
                data-testid="theme-mode-dark"
                className={`theme-mode-btn ${theme === "dark" ? "active" : ""}`}
                onClick={() => setTheme("dark")}
              >
                <MoonIcon /> Dark
              </button>
              <button
                data-testid="theme-mode-light"
                className={`theme-mode-btn ${theme === "light" ? "active" : ""}`}
                onClick={() => setTheme("light")}
              >
                <SunIcon /> Light
              </button>
            </div>
          </div>

          <div className="theme-picker-section">
            <div className="theme-picker-label">
              <PaletteIcon style={{ display: "inline", width: 12, height: 12, verticalAlign: "-2px", marginRight: 4 }} />
              Accent Color
            </div>
            <div className="theme-accent-grid">
              {ACCENTS.map(a => (
                <button
                  key={a.id}
                  data-testid={`theme-accent-${a.id}`}
                  className={`theme-accent-tile ${accent === a.id ? "active" : ""}`}
                  onClick={() => setAccent(a.id)}
                  style={{ color: a.color }}
                  aria-label={`Set accent to ${a.name}`}
                >
                  <span className="theme-accent-swatch" style={{ background: a.swatch }} />
                  <span className="theme-accent-name">{a.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
