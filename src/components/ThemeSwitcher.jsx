import { useState, useEffect, useRef } from "react";
import { useTheme } from "../lib/themeContext.jsx";
import { THEME_LABELS } from "../lib/themes.js";

export default function ThemeSwitcher() {
  const { theme, mode, toggleMode, setThemeByName, availableThemes } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDropdown]);

  const handleThemeSelect = (t) => {
    setThemeByName(t);
    setShowDropdown(false);
  };

  return (
    <div className="theme-switcher" ref={dropdownRef}>
      {/* Mode Toggle */}
      <button
        className="theme-mode-btn"
        onClick={toggleMode}
        title={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
        aria-label="Toggle light/dark mode"
      >
        {mode === "light" ? "🌙" : "☀️"}
      </button>

      {/* Mobile: Dropdown Menu */}
      <div className="theme-dropdown-wrapper">
        <button
          className="theme-dropdown-trigger"
          onClick={() => setShowDropdown(!showDropdown)}
          title="Select color theme"
          aria-label="Theme selector"
          aria-expanded={showDropdown}
        >
          <span className="theme-dot" style={{ backgroundColor: `var(--accent)` }} />
          <span className="theme-current-label">{THEME_LABELS[theme]}</span>
          <span className="theme-dropdown-icon">▼</span>
        </button>

        {showDropdown && (
          <div className="theme-dropdown-menu">
            {availableThemes.map((t) => (
              <button
                key={t}
                className={`theme-menu-item ${theme === t ? "active" : ""}`}
                onClick={() => handleThemeSelect(t)}
                aria-current={theme === t ? "true" : "false"}
              >
                <span className="theme-menu-dot" />
                <span className="theme-menu-label">{THEME_LABELS[t]}</span>
                {theme === t && <span className="theme-menu-check">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Desktop: Palette Row */}
      <div className="theme-palette">
        {availableThemes.map((t) => (
          <button
            key={t}
            className={`theme-btn ${theme === t ? "active" : ""}`}
            onClick={() => handleThemeSelect(t)}
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
