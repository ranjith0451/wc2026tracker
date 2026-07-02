# WC2026 — Launch Page Brief

Reference site analyzed: **tonyscore.com** ("The Home of Football" — a football media/community brand with 120M+ followers, an app, and a dark, bold, high-energy visual identity). This brief adapts its structure and design language into a launch page for the **WC2026 Data Hub**.

---

## 1. What TonyScore does well (source analysis)

**Site structure:** `Home` · `Advertise` · `Cases` · `Careers` · `App` — a single-purpose, one-page-per-goal site. Every page ends in the same CTA block ("Work with us" → `mailto:` link). No clutter, no nav depth.

**Homepage anatomy:**
1. Full-bleed hero image + oversized headline ("THE HOME OF FOOTBALL") + one-line subhead + primary CTA
2. App store badges directly under the hero (App Store + Google Play)
3. Brand story paragraph (short, 3–4 sentences)
4. **Stat strip** — 4 big numbers with icon + label (9B+ views/month, 14.4% engagement, 120M+ followers, 77M+ Instagram) — this is the single most reusable pattern for a launch page
5. Auto-scrolling image marquee (rotating player/content photos)
6. App screenshot mockup + feature callouts (News, Match Center, etc.)
7. Closing CTA block + footer with contact/social/legal

**Design system (extracted via Firecrawl branding scan):**
| Token | Value |
|---|---|
| Background | `#0A0A0A` (near-black) |
| Primary/accent | `#C6F800` (acid/lime green) |
| Text on accent | `#0A0A0A` |
| Heading font | Archivo Black (bold, condensed, all-caps energy) |
| Body font | Inter |
| H1/H2 size | ~80px desktop |
| Body size | ~17.6px |
| Border radius | Pill buttons (`100px`), cards `12px` |
| Button style | Flat, no shadow, high-contrast pill CTAs |
| Tone | Bold, high-energy, fan-first, no corporate hedging |

Takeaway: **dark background + one loud accent color + oversized display type + a stat strip + pill buttons** is what makes it feel premium and confident on a single scroll.

---

## 2. Adapted structure for WC2026 launch page

Goal: this is a **data hub** (live scores, stats, all-time records, rankings), not a media brand — so the hero sells "the fastest way to follow WC2026," not follower counts. Swap TonyScore's social-proof stat strip for a **data-coverage stat strip**.

### Hero
- Full-bleed background: World Cup stadium/action photo or a subtle animated bracket/scoreline graphic
- H1 (Archivo Black-style, ~72–80px): **"WORLD CUP 2026. EVERY STAT. ONE PAGE."**
- Subhead: "Live scores, all-time records, and rankings for the 2026 World Cup — no clutter, no ads getting in the way."
- Primary CTA (pill, accent color): **"Open the Hub →"** → links to the live app (`wc2026-nine-sepia.vercel.app`)
- Secondary CTA (white pill): "View on GitHub" (optional, if repo is public)

### Stat strip (swap TonyScore's follower stats for data coverage)
Use 4 cards, big number + icon + label, e.g.:
- **48** teams tracked 🏆
- **104** matches covered ⚽
- **20+** tournaments of history 📊
- **Live** score refresh 🔴

### What's inside (feature grid — mirrors TonyScore's "News / Match Center" callouts)
- **Rankings** — current standings, live
- **All-Time Players** — top scorers across every World Cup
- **Stats** — tournament-by-tournament breakdowns
- **Women's WC** — dedicated section, same data depth

Each as a card: short label + one-line description + screenshot/mockup of that page.

### Screenshot / mockup section
Single large device mockup (phone or browser frame) showing the live Rankings or Stats page, similar to TonyScore's iPhone app mockups. Since this is a web SPA, use a browser-chrome frame instead of a phone frame unless you also ship a PWA.

### Closing CTA
Repeat the primary CTA: **"Track every match. Open the Hub →"**

### Footer
- Links: Home / Rankings / Stats / All-Time / Women's WC
- Contact (optional, e.g. GitHub issues link or email)
- Legal: none required unless collecting data (this is a public stats aggregator)

---

## 3. Suggested color/type tokens for WC2026 (World Cup-flavored, not a copy of TonyScore's palette)

| Token | Value | Note |
|---|---|---|
| Background | `#0A0A0A` or `#0B1120` | keep dark, high-contrast |
| Accent | `#00E28A` (green/pitch) or keep FIFA-adjacent gold `#D4AF37` | avoid exact `#C6F800` — that's TonyScore's brand color |
| Text primary | `#F5F5F5` | |
| Heading font | Archivo Black / Space Grotesk / any bold condensed display font | |
| Body font | Inter (matches your likely existing stack) | |
| Button radius | `100px` pill | consistent with reference |
| Card radius | `12px` | |

---

## 4. Implementation notes for this repo

- This is a **React + Vite SPA** (`HashRouter`, existing pages at `/women`, `/all-time`, `/rankings`, `/stats`) deployed to Vercel. The launch page should live at the **root route `/`** as a new `Landing.jsx` (or become the new `App.jsx` root), linking into the existing HashRouter routes (`#/rankings`, `#/stats`, etc.) as the feature-grid CTAs.
- Reuse existing data (`public/data/players.json`, `history-v2.json`) to populate the stat strip numbers dynamically (e.g. count of tournaments, total goals) instead of hardcoding — this keeps the launch page accurate as data updates.
- Keep it a single scroll, no new routes needed beyond linking to existing pages.
- Service worker cache version will need a bump (`wc2026-v3` → `v4`) once this ships, per existing pattern.

---

## 5. Next steps

1. Confirm accent color choice (pitch-green vs. gold vs. classic FIFA blue)
2. Build `Landing.jsx` with sections above
3. Wire stat-strip numbers to existing JSON data files
4. Add hero background image/graphic
5. Deploy — Vercel auto-deploys on push
