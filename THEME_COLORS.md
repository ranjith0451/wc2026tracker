# 🎨 WC2026 Theme Color Palettes

## 1️⃣ DEFAULT THEME (Blue)
**Professional FIFA Blue** — The classic choice, perfect for football/soccer vibes

### Dark Mode
```
Primary Colors:
  🟦 Accent: #2563eb (Blue)
  🟦 Light:  #60a5fa (Sky Blue)
  
Backgrounds:
  ⬛ Main:      #020817 (OLED Black)
  ⬛ Primary:   #080f1e
  ⬛ Secondary: #050c18
  ⬛ Cards:     #080f1e
  
Accents:
  🟩 Success: #22c55e (Green)
  🟥 Error:   #ef4444 (Red)
  🟨 Warning: #f59e0b (Gold)
```

### Light Mode
```
Primary Colors:
  🟦 Accent: #2563eb (Deep Blue)
  🟦 Light:  #3b82f6 (Blue)

Backgrounds:
  ⬜ Main:      #f9fafb (Off White)
  ⬜ Primary:   #ffffff (White)
  ⬜ Secondary: #f3f4f6 (Light Gray)
  ⬜ Cards:     #ffffff (White)
```

---

## 2️⃣ OCEAN THEME (Cyan/Teal)
**Cool Ocean Vibes** — Fresh, modern, inspired by water

### Dark Mode
```
Primary Colors:
  🟦 Accent: #0ea5e9 (Sky Cyan)
  🟦 Light:  #38bdf8 (Light Cyan)
  
Backgrounds:
  ⬛ Main:      #0a1628 (Deep Navy)
  ⬛ Primary:   #0f1f35
  ⬛ Secondary: #0d1a2e
  ⬛ Cards:     #0f1f35
  
Accents:
  🟩 Success: #10b981 (Green)
  🟥 Error:   #ff6b6b (Red)
  🟨 Warning: #fbbf24 (Gold)
```

### Light Mode
```
Primary Colors:
  🟦 Accent: #0369a1 (Ocean Blue)
  🟦 Light:  #0284c7 (Bright Blue)

Backgrounds:
  ⬜ Main:      #f0f9ff (Ice Blue)
  ⬜ Primary:   #ffffff (White)
  ⬜ Secondary: #e0f2fe (Light Blue)
  ⬜ Cards:     #ffffff (White)
```

---

## 3️⃣ SUNSET THEME (Orange/Gold)
**Warm Sunset Glow** — Energetic, vibrant, like a golden sunset

### Dark Mode
```
Primary Colors:
  🟧 Accent: #f97316 (Deep Orange)
  🟧 Light:  #fb923c (Bright Orange)
  
Backgrounds:
  ⬛ Main:      #1a0f0a (Dark Brown)
  ⬛ Primary:   #2a1810
  ⬛ Secondary: #241408
  ⬛ Cards:     #2a1810
  
Accents:
  🟩 Success: #34d399 (Green)
  🟥 Error:   #fc5c65 (Red)
  🟨 Warning: #fbbf24 (Gold)
```

### Light Mode
```
Primary Colors:
  🟧 Accent: #b45309 (Warm Brown)
  🟧 Light:  #d97706 (Orange)

Backgrounds:
  ⬜ Main:      #fffbf5 (Cream)
  ⬜ Primary:   #ffffff (White)
  ⬜ Secondary: #fed7aa (Warm Peach)
  ⬜ Cards:     #ffffff (White)
```

---

## 4️⃣ FOREST THEME (Green)
**Natural Forest Greens** — Eco-friendly, natural, calming

### Dark Mode
```
Primary Colors:
  🟩 Accent: #22c55e (Bright Green)
  🟩 Light:  #4ade80 (Light Green)
  
Backgrounds:
  ⬛ Main:      #0a1408 (Dark Green)
  ⬛ Primary:   #0f1f10
  ⬛ Secondary: #0d180f
  ⬛ Cards:     #0f1f10
  
Accents:
  🟩 Success: #10b981 (Emerald)
  🟥 Error:   #f87171 (Red)
  🟨 Warning: #fbbf24 (Gold)
```

### Light Mode
```
Primary Colors:
  🟩 Accent: #15803d (Deep Green)
  🟩 Light:  #16a34a (Bright Green)

Backgrounds:
  ⬜ Main:      #f7fee7 (Light Green)
  ⬜ Primary:   #ffffff (White)
  ⬜ Secondary: #dcfce7 (Pale Green)
  ⬜ Cards:     #ffffff (White)
```

---

## 5️⃣ CYBER THEME (Purple/Magenta)
**Neon Cyberpunk** — Futuristic, bold, energetic

### Dark Mode
```
Primary Colors:
  🟣 Accent: #d946ef (Magenta)
  🟣 Light:  #a78bfa (Light Purple)
  
Backgrounds:
  ⬛ Main:      #0a0e27 (Deep Purple)
  ⬛ Primary:   #11152b
  ⬛ Secondary: #0f1225
  ⬛ Cards:     #11152b
  
Accents:
  🟩 Success: #33d399 (Green)
  🟥 Error:   #ff006e (Hot Pink)
  🟨 Warning: #fbbf24 (Gold)
```

### Light Mode
```
Primary Colors:
  🟣 Accent: #7c3aed (Deep Purple)
  🟣 Light:  #a855f7 (Purple)

Backgrounds:
  ⬜ Main:      #faf5ff (Light Purple)
  ⬜ Primary:   #ffffff (White)
  ⬜ Secondary: #f3e8ff (Pale Purple)
  ⬜ Cards:     #ffffff (White)
```

---

## 🔄 How to Switch

**In App:**
1. Look for the theme selector in the header (top-right)
2. Click the 🌙 (moon) or ☀️ (sun) to toggle light/dark mode
3. Click any color dot to select a theme
4. Your choice is saved automatically

**Available Combinations:** 10 total (5 themes × 2 modes)

---

## 📊 Color Contrast Reference

All themes meet WCAG AA accessibility standards:
- **Text on backgrounds:** 4.5:1+ contrast ratio
- **UI elements:** 3:1+ contrast ratio
- **Focus states:** Clearly visible on all backgrounds

---

## 🎨 Using Theme Colors in Code

All theme colors are available as CSS variables:

```css
/* Backgrounds */
background: var(--bg);
background: var(--bg-primary);
background: var(--bg-secondary);

/* Text */
color: var(--text);
color: var(--text-secondary);
color: var(--text-link);

/* Accents */
background: var(--accent);
color: var(--accent-light);
box-shadow: var(--shadow-accent);

/* Semantic Colors */
background: var(--green);  /* Success */
background: var(--red);    /* Error */
background: var(--gold);   /* Warning */

/* Gradients */
background: var(--grad-brand);
background: var(--grad-accent);
```

All variables update automatically based on the selected theme!

