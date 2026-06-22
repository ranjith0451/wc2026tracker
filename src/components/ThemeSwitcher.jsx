import { useTheme } from "../lib/themeContext.jsx";
import { THEME_LABELS } from "../lib/themes.js";

export default function ThemeSwitcher() {
  const { theme, mode, toggleMode, setThemeByName, availableThemes } = useTheme();

  return (
    <div className="theme-switcher">
      {/* Mode Toggle */}
      <button
        className="theme-mode-btn"
        onClick={toggleMode}
        title={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
        aria-label="Toggle light/dark mode"
      >
        {mode === "light" ? "🌙" : "☀️"}
      </button>

      {/* Theme Selector */}
      <div className="theme-palette">
        {availableThemes.map((t) => (
          <button
            key={t}
            className={`theme-btn ${theme === t ? "active" : ""}`}
            onClick={() => setThemeByName(t)}
            title={THEME_LABELS[t]}
            aria-label={`Set theme to ${THEME_LABELS[t]}`}
            aria-current={theme === t ? "true" : "false"}
          >
            <span className="theme-dot" />
            <span className="theme-label">{THEME_LABELS[t]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
