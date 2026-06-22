# 🎨 Quick Start — Theme System

## Where to Find the Theme Switcher

📍 **Location:** Header, top-right corner (next to the IST Live clock)

```
┌─────────────────────────────────────────────────┐
│ WC 2026  │ Home Schedule Groups...  │ 🕐 IST │ 🌙 🎨 │
└─────────────────────────────────────────────────┘
                                         ↑
                              Theme Switcher Here
```

## How to Use

### 1. Toggle Light/Dark Mode
Click the **sun (☀️) or moon (🌙)** emoji button
- Switches between light and dark mode instantly
- Works with any theme

### 2. Change Theme Color
Click any of the **5 colored dots**:
- 🔵 Default (Blue)
- 🔵 Ocean (Cyan)  
- 🟠 Sunset (Orange)
- 🟢 Forest (Green)
- 🟣 Cyber (Purple)

### 3. Your Preference is Saved
- Automatically saved to your browser
- Will remember your choice when you return
- Works completely offline

## Available Combinations

| Mode  | Default | Ocean | Sunset | Forest | Cyber |
|-------|---------|-------|--------|--------|-------|
| Light |    ✅   |  ✅  |   ✅   |   ✅   |  ✅  |
| Dark  |    ✅   |  ✅  |   ✅   |   ✅   |  ✅  |

**Total:** 10 unique theme combinations

## Theme Descriptions

### 🔵 DEFAULT
The classic FIFA blue theme. Professional and sporty. 
**Best for:** Traditional look, official FIFA vibes

### 🔵 OCEAN
Cool cyan and teal colors inspired by water.
**Best for:** Fresh, modern, relaxing feel

### 🟠 SUNSET
Warm orange and gold glow like a golden sunset.
**Best for:** Evening browsing, energetic mood

### 🟢 FOREST
Natural green tones like a calm forest.
**Best for:** Eco-friendly vibe, relaxing viewing

### 🟣 CYBER
Bold purple and magenta cyberpunk neon.
**Best for:** Futuristic look, high contrast

## Mobile Users

The theme switcher is **responsive** and works great on mobile:
- On small screens (< 480px), theme names are hidden to save space
- Only colored dots are shown
- Mode toggle (🌙☀️) always visible
- Easy to tap with one finger

## Desktop Users

On larger screens (> 768px):
- Full theme names displayed
- More visual information
- Plenty of space for all controls
- Easy to switch themes

## Tips & Tricks

✨ **Instant Switching** — No page reload needed, changes happen instantly

✨ **All Features Work** — Every feature works perfectly with every theme

✨ **Matches Your Mood** — Pick a theme that matches how you're feeling today

✨ **No Ads or Tracking** — Theme preference saved only in your browser

✨ **Try Them All** — Experiment with different combinations to find your favorite

## Troubleshooting

**Theme doesn't change?**
- Check that the dot is highlighted (selected)
- Try refreshing the page

**Preference isn't saved?**
- Make sure browser allows localStorage
- Check if you're in private/incognito mode (won't persist)

**Colors look wrong?**
- Try clearing browser cache
- Try a different browser if issue persists

**Mobile theme selector isn't working?**
- Make sure you're clicking the colored dot
- Try making your browser window wider

## Accessibility

All themes meet **WCAG AA** standards:
- High contrast ratios for readability
- Clear focus states for keyboard navigation
- Works with screen readers
- Supports all modern browsers

## For Developers

To use themes in your components:

```jsx
import { useTheme } from "./lib/themeContext.jsx";

export function MyComponent() {
  const { theme, mode, toggleMode, setThemeByName } = useTheme();
  
  return (
    <div>
      <p>Current: {theme} ({mode})</p>
      <button onClick={toggleMode}>Toggle Mode</button>
      <button onClick={() => setThemeByName("ocean")}>Ocean</button>
    </div>
  );
}
```

All CSS variables automatically update based on selected theme!

## Questions?

Check these docs for more info:
- **Full Implementation:** `THEMES_IMPLEMENTATION.md`
- **Color Details:** `THEME_COLORS.md`
- **Code Reference:** See `src/lib/themeContext.jsx` and `src/lib/themes.js`

---

**Happy theming!** 🎨✨
