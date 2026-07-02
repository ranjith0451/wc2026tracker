import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, useScroll, AnimatePresence } from "framer-motion";

/* ---------- 3D tilt ---------- */
function useTilt(strength = 12) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 140, damping: 18 });
  const sy = useSpring(y, { stiffness: 140, damping: 18 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-strength, strength]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [strength, -strength]);
  function onMove(e) {
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  }
  function onLeave() { x.set(0); y.set(0); }
  return { rotateX, rotateY, onMove, onLeave };
}

/* ---------- Animated number ---------- */
function Counter({ to, suffix = "" }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    let raf, start;
    function step(t) {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / 1400);
      setVal(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { raf = requestAnimationFrame(step); io.disconnect(); }
    }, { threshold: 0.4 });
    if (ref.current) io.observe(ref.current);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [to]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

/* ---------- Floating particle field ---------- */
function Particles({ count = 50 }) {
  const dots = useMemo(
    () => Array.from({ length: count }, () => ({
      left: Math.random() * 100, top: Math.random() * 100,
      size: 1 + Math.random() * 3, delay: Math.random() * 6,
      dur: 8 + Math.random() * 12, opacity: 0.15 + Math.random() * 0.5,
    })),
    [count]
  );
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {dots.map((p, i) => (
        <motion.span key={i}
          style={{ position: "absolute", left: `${p.left}%`, top: `${p.top}%`,
            width: p.size, height: p.size, borderRadius: "50%",
            background: "radial-gradient(circle, #7df9ff, transparent 70%)",
            opacity: p.opacity, filter: "blur(0.4px)" }}
          animate={{ y: [0, -30, 0], x: [0, 8, 0], opacity: [p.opacity, p.opacity * 1.6, p.opacity] }}
          transition={{ duration: p.dur, repeat: Infinity, ease: "easeInOut", delay: p.delay }}
        />
      ))}
    </div>
  );
}

/* ---------- 3D Dashboard preview card ---------- */
function DashboardMock() {
  const { rotateX, rotateY, onMove, onLeave } = useTilt(10);
  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      initial={{ opacity: 0, y: 40, rotateX: -10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        rotateX, rotateY,
        transformPerspective: 1400,
        transformStyle: "preserve-3d",
        width: "min(960px, 92vw)",
        margin: "60px auto 0",
        padding: 18,
        borderRadius: 24,
        background: "linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.02))",
        border: "1px solid rgba(125,249,255,.25)",
        boxShadow: "0 60px 140px rgba(10,10,40,.7), 0 0 80px rgba(94,72,255,.3)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
      }}
    >
      {/* window chrome */}
      <div style={{ display: "flex", gap: 6, padding: "4px 8px 14px" }}>
        {["#ff5f57", "#febc2e", "#28c840"].map(c => (
          <span key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />
        ))}
        <div style={{ marginLeft: 14, fontSize: 11, color: "rgba(255,255,255,.5)", letterSpacing: ".15em", textTransform: "uppercase" }}>
          wc2026.app / dashboard
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 14, transformStyle: "preserve-3d" }}>
        {/* sidebar */}
        <div style={{ background: "rgba(0,0,0,.3)", borderRadius: 14, padding: 14, transform: "translateZ(20px)" }}>
          {["Schedule","Groups","Bracket","Predictor","Squads","Top Scorers","History","Rankings"].map((l, i) => (
            <div key={l} style={{
              padding: "8px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              color: i === 3 ? "#02020a" : "rgba(255,255,255,.7)",
              background: i === 3 ? "linear-gradient(135deg,#7df9ff,#5e48ff)" : "transparent",
              marginBottom: 4,
            }}>{l}</div>
          ))}
        </div>
        {/* main */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
            {[
              { l: "Live Matches", v: "3", c: "#7df9ff" },
              { l: "Top Scorer", v: "Mbappé", c: "#fff" },
              { l: "Goals", v: "172", c: "#5e48ff" },
              { l: "xG Accuracy", v: "94%", c: "#28c840" },
            ].map(k => (
              <div key={k.l} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(125,249,255,.15)", borderRadius: 10, padding: 12, transform: "translateZ(30px)" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.5)", letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 4 }}>{k.l}</div>
                <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 22, fontWeight: 800, color: k.c }}>{k.v}</div>
              </div>
            ))}
          </div>
          {/* chart */}
          <div style={{ background: "rgba(0,0,0,.25)", border: "1px solid rgba(125,249,255,.12)", borderRadius: 12, padding: 14, height: 180, transform: "translateZ(15px)", position: "relative", overflow: "hidden" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)", marginBottom: 8, letterSpacing: ".15em", textTransform: "uppercase" }}>Goals per Matchday</div>
            <svg viewBox="0 0 400 130" style={{ width: "100%", height: 130 }}>
              <defs>
                <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#7df9ff" stopOpacity=".6" />
                  <stop offset="100%" stopColor="#5e48ff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: 0.8 }}
                d="M0,90 C40,70 80,80 120,55 C160,30 200,45 240,40 C280,35 320,15 360,25 L400,20"
                fill="none" stroke="#7df9ff" strokeWidth="2.5" strokeLinecap="round"
              />
              <motion.path
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
                d="M0,90 C40,70 80,80 120,55 C160,30 200,45 240,40 C280,35 320,15 360,25 L400,20 L400,130 L0,130 Z"
                fill="url(#grad)"
              />
            </svg>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ---------- Feature card with 3D tilt ---------- */
function FeatureCard({ icon, title, desc, delay = 0 }) {
  const { rotateX, rotateY, onMove, onLeave } = useTilt(10);
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        rotateX, rotateY,
        transformPerspective: 900,
        transformStyle: "preserve-3d",
        padding: 26,
        borderRadius: 18,
        background: "linear-gradient(135deg, rgba(255,255,255,.06), rgba(255,255,255,.02))",
        border: "1px solid rgba(125,249,255,.16)",
        boxShadow: "0 20px 60px rgba(10,10,40,.4)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        position: "relative",
      }}
    >
      <motion.div
        style={{ transform: "translateZ(30px)", fontSize: 28, marginBottom: 12 }}
        whileHover={{ scale: 1.15, rotate: 6 }}
      >{icon}</motion.div>
      <h3 style={{ transform: "translateZ(24px)", margin: "0 0 6px", color: "#fff",
        fontFamily: "Barlow Condensed, sans-serif", fontSize: 20, fontWeight: 800, letterSpacing: ".02em" }}>{title}</h3>
      <p style={{ transform: "translateZ(16px)", margin: 0, color: "rgba(255,255,255,.65)", fontSize: 13.5, lineHeight: 1.6 }}>{desc}</p>
    </motion.div>
  );
}

/* ---------- Pricing card ---------- */
function PricingCard({ name, price, period, features, highlight, cta }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7 }}
      whileHover={{ y: -6 }}
      style={{
        padding: 32, borderRadius: 20, position: "relative",
        background: highlight
          ? "linear-gradient(135deg, rgba(125,249,255,.16), rgba(94,72,255,.18))"
          : "linear-gradient(135deg, rgba(255,255,255,.05), rgba(255,255,255,.02))",
        border: highlight ? "1px solid rgba(125,249,255,.5)" : "1px solid rgba(255,255,255,.1)",
        boxShadow: highlight ? "0 30px 80px rgba(94,72,255,.35)" : "0 20px 50px rgba(0,0,0,.3)",
        backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      }}
    >
      {highlight && (
        <div style={{
          position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
          padding: "4px 14px", borderRadius: 99, background: "linear-gradient(135deg,#7df9ff,#5e48ff)",
          color: "#02020a", fontSize: 11, fontWeight: 800, letterSpacing: ".15em", textTransform: "uppercase",
        }}>Most Popular</div>
      )}
      <h3 style={{ margin: 0, fontFamily: "Barlow Condensed, sans-serif", fontSize: 24, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: "#fff" }}>{name}</h3>
      <div style={{ margin: "18px 0 6px", display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 56, fontWeight: 900, color: "#fff", lineHeight: 1 }}>${price}</span>
        <span style={{ color: "rgba(255,255,255,.55)", fontSize: 14 }}>/{period}</span>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: "24px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        {features.map(f => (
          <li key={f} style={{ display: "flex", gap: 10, color: "rgba(255,255,255,.78)", fontSize: 14 }}>
            <span style={{ color: "#7df9ff", flexShrink: 0 }}>✓</span>{f}
          </li>
        ))}
      </ul>
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        style={{
          width: "100%", padding: "14px 18px", borderRadius: 12,
          background: highlight ? "linear-gradient(135deg,#7df9ff,#5e48ff)" : "rgba(255,255,255,.08)",
          color: highlight ? "#02020a" : "#fff", fontWeight: 800, fontSize: 14,
          letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer",
          border: highlight ? "none" : "1px solid rgba(255,255,255,.15)",
        }}
      >{cta}</motion.button>
    </motion.div>
  );
}

/* ---------- FAQ accordion ---------- */
function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      style={{
        borderRadius: 14, padding: 20, marginBottom: 12,
        background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)",
        cursor: "pointer",
      }}
      onClick={() => setOpen(o => !o)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <span style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>{q}</span>
        <motion.span animate={{ rotate: open ? 45 : 0 }} style={{ color: "#7df9ff", fontSize: 22, fontWeight: 300 }}>+</motion.span>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: "auto", opacity: 1, marginTop: 12 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: "hidden", color: "rgba(255,255,255,.65)", fontSize: 14, lineHeight: 1.7 }}
          >{a}</motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ============================================== */
export default function Launch() {
  const { rotateX, rotateY, onMove, onLeave } = useTilt(6);
  const scrollRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: scrollRef, offset: ["start start", "end end"] });
  const heroY = useTransform(scrollYProgress, [0, 0.4], [0, -120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0.4]);

  const [email, setEmail] = useState("");
  const [subbed, setSubbed] = useState(false);

  return (
    <div
      ref={scrollRef}
      style={{
        minHeight: "100vh", margin: "-24px",
        background: "radial-gradient(ellipse at top, #1a1340 0%, #07071a 45%, #02020a 100%)",
        color: "#fff", fontFamily: "Barlow, system-ui, sans-serif",
        position: "relative", overflow: "hidden",
      }}
    >
      <Particles />

      {/* Nav bar */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }}
        style={{
          position: "sticky", top: 0, zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 32px", margin: "0 auto", maxWidth: 1280,
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800, letterSpacing: ".05em" }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#7df9ff,#5e48ff)", display: "grid", placeItems: "center", color: "#02020a", fontSize: 16 }}>⚽</div>
          <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 20, textTransform: "uppercase" }}>WC2026</span>
        </div>
        <div style={{ display: "flex", gap: 28, fontSize: 13, color: "rgba(255,255,255,.7)" }}>
          {["Features","Pricing","FAQ","Docs"].map(l => (
            <a key={l} href={`#${l.toLowerCase()}`} style={{ color: "inherit", textDecoration: "none" }}>{l}</a>
          ))}
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          style={{
            padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer",
            background: "linear-gradient(135deg,#7df9ff,#5e48ff)", color: "#02020a",
            fontWeight: 800, fontSize: 13, letterSpacing: ".05em",
          }}
        >Start Free</motion.button>
      </motion.nav>

      {/* HERO */}
      <motion.section
        style={{ y: heroY, opacity: heroOpacity, position: "relative", padding: "60px 24px 40px", maxWidth: 1280, margin: "0 auto", textAlign: "center", zIndex: 2 }}
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "6px 16px", borderRadius: 999,
            background: "linear-gradient(90deg, rgba(125,249,255,.12), rgba(94,72,255,.18))",
            border: "1px solid rgba(125,249,255,.3)",
            fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", fontWeight: 700,
          }}
        >
          <motion.span animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.6, repeat: Infinity }}
            style={{ width: 8, height: 8, borderRadius: 999, background: "#28c840", boxShadow: "0 0 12px #28c840" }} />
          v1.0 · Live for WC2026
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1 }}
          style={{
            fontFamily: "Barlow Condensed, sans-serif",
            fontSize: "clamp(48px, 8vw, 120px)", fontWeight: 900,
            lineHeight: 0.95, letterSpacing: "-.02em",
            margin: "24px 0 18px",
            background: "linear-gradient(135deg, #fff 0%, #7df9ff 45%, #5e48ff 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}
        >
          The Operating System<br/>for World Cup data.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }}
          style={{ maxWidth: 640, margin: "0 auto", color: "rgba(255,255,255,.7)", fontSize: 18, lineHeight: 1.6 }}
        >
          Live scores, golden-boot tracking, AI-powered brackets, and a century of history —
          unified in one developer-friendly platform. Built for fans, broadcasters, and teams.
        </motion.p>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 32 }}>
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 20px 50px rgba(94,72,255,.5)" }}
            whileTap={{ scale: 0.96 }}
            style={{
              padding: "14px 28px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg,#7df9ff,#5e48ff)", color: "#02020a",
              fontWeight: 800, fontSize: 14, letterSpacing: ".08em", textTransform: "uppercase",
              cursor: "pointer",
            }}
          >Start Free →</motion.button>
          <motion.button
            whileHover={{ scale: 1.05, background: "rgba(255,255,255,.1)" }}
            whileTap={{ scale: 0.96 }}
            style={{
              padding: "14px 28px", borderRadius: 12,
              background: "rgba(255,255,255,.05)", color: "#fff",
              border: "1px solid rgba(255,255,255,.15)",
              fontWeight: 700, fontSize: 14, letterSpacing: ".08em", textTransform: "uppercase",
              cursor: "pointer",
            }}
          >▶ Watch Demo</motion.button>
        </div>

        <div style={{ marginTop: 18, fontSize: 12, color: "rgba(255,255,255,.45)" }}>
          No credit card · 14-day Pro trial · SOC 2 ready
        </div>

        <DashboardMock />
      </motion.section>

      {/* Trusted-by logos */}
      <section style={{ position: "relative", padding: "70px 24px 20px", maxWidth: 1100, margin: "0 auto", zIndex: 2 }}>
        <div style={{ textAlign: "center", color: "rgba(255,255,255,.4)", fontSize: 11, letterSpacing: ".3em", textTransform: "uppercase", marginBottom: 24 }}>
          Trusted by 50,000+ fans across 120 countries
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 48, opacity: 0.55 }}>
          {["ESPN", "FOX SPORTS", "BLEACHER", "TheStatsAPI", "VERCEL", "BBC"].map(l => (
            <motion.div key={l}
              whileHover={{ opacity: 1, scale: 1.05 }}
              style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: ".15em", color: "rgba(255,255,255,.8)" }}
            >{l}</motion.div>
          ))}
        </div>
      </section>

      {/* Stats band */}
      <section style={{ position: "relative", padding: "60px 24px", maxWidth: 1100, margin: "0 auto", zIndex: 2 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 24, textAlign: "center" }}>
          {[
            { n: 48, s: "", l: "National Teams" },
            { n: 104, s: "", l: "Matches Tracked" },
            { n: 50000, s: "+", l: "Active Users" },
            { n: 99, s: "%", l: "Uptime" },
          ].map(stat => (
            <div key={stat.l}>
              <div style={{
                fontFamily: "Barlow Condensed, sans-serif", fontSize: 64, fontWeight: 900, lineHeight: 1,
                background: "linear-gradient(180deg,#fff,#7df9ff)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}><Counter to={stat.n} suffix={stat.s} /></div>
              <div style={{ marginTop: 6, fontSize: 11, letterSpacing: ".25em", textTransform: "uppercase", color: "rgba(255,255,255,.55)" }}>{stat.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ position: "relative", padding: "80px 24px", maxWidth: 1280, margin: "0 auto", zIndex: 2 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          style={{ textAlign: "center", marginBottom: 56 }}
        >
          <div style={{ color: "#7df9ff", fontSize: 11, letterSpacing: ".3em", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>Platform</div>
          <h2 style={{
            fontFamily: "Barlow Condensed, sans-serif",
            fontSize: "clamp(36px,5vw,64px)", fontWeight: 900, letterSpacing: "-.01em", margin: 0,
          }}>14 modules. One subscription.</h2>
          <p style={{ color: "rgba(255,255,255,.55)", maxWidth: 540, margin: "14px auto 0", fontSize: 16 }}>
            Everything you need to follow, analyze, and broadcast the World Cup — engineered for scale.
          </p>
        </motion.div>

        <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {[
            { i: "⚽", t: "Live Schedule", d: "All 104 matches with IST kickoffs, synced to TheStatsAPI in real time." },
            { i: "🥇", t: "Golden Boot", d: "Live goal + assist leaderboard refreshing every 5 minutes during play." },
            { i: "🧠", t: "AI Predictor", d: "Build your bracket. Confidence scoring against historical xG models." },
            { i: "📊", t: "Records Engine", d: "Every record from 1930: goals, attendance, hosts, winners, golden boots." },
            { i: "⚖️", t: "Team Comparison", d: "Head-to-head xG, FIFA ranking deltas, historical matchups side by side." },
            { i: "👥", t: "Squad Profiles", d: "Full 26-man rosters with caps, clubs, market values, and tournament history." },
            { i: "👩", t: "Women's Edition", d: "All-time leaders, tournament archives from 1991, top scorers by era." },
            { i: "🌍", t: "Live Rankings", d: "FIFA ranking deltas by confederation with weekly change indicators." },
            { i: "🔮", t: "Match Detail", d: "Event timelines, lineups, formations, xG shot maps per fixture." },
            { i: "📡", t: "Webhooks API", d: "Push goals, cards, and final scores into Slack, Discord, or your own stack." },
            { i: "🎨", t: "Theme Engine", d: "12 visual themes including dark, neon, classic broadcast, and arena LED." },
            { i: "📱", t: "PWA Native", d: "Install on iOS + Android. Offline-first with service-worker cached data." },
          ].map((f, idx) => (
            <FeatureCard key={f.t} icon={f.i} title={f.t} desc={f.d} delay={idx * 0.04} />
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ position: "relative", padding: "80px 24px", maxWidth: 1100, margin: "0 auto", zIndex: 2 }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ color: "#7df9ff", fontSize: 11, letterSpacing: ".3em", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>Workflow</div>
          <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "clamp(34px,4.5vw,56px)", fontWeight: 900, margin: 0 }}>
            From kickoff to insight in 3 steps.
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 28 }}>
          {[
            { n: "01", t: "Connect", d: "Sign in with email or SSO. Pick your teams, your league, your timezone." },
            { n: "02", t: "Configure", d: "Enable modules: schedule, predictor, scorers. Set IST or any TZ." },
            { n: "03", t: "Compete", d: "Get push notifications on goals, build brackets, climb the leaderboard." },
          ].map((s, i) => (
            <motion.div key={s.n}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.12 }}
              style={{
                padding: 28, borderRadius: 18,
                background: "linear-gradient(135deg, rgba(255,255,255,.05), rgba(255,255,255,.02))",
                border: "1px solid rgba(255,255,255,.08)",
              }}
            >
              <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 56, fontWeight: 900,
                background: "linear-gradient(135deg,#7df9ff,#5e48ff)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1 }}>{s.n}</div>
              <h3 style={{ margin: "10px 0 6px", fontFamily: "Barlow Condensed, sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: ".03em", color: "#fff" }}>{s.t}</h3>
              <p style={{ margin: 0, color: "rgba(255,255,255,.65)", fontSize: 14, lineHeight: 1.6 }}>{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ position: "relative", padding: "80px 24px", maxWidth: 1280, margin: "0 auto", zIndex: 2 }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "clamp(34px,4.5vw,56px)", fontWeight: 900, margin: 0 }}>
            Loved by football obsessives.
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px,1fr))", gap: 22 }}>
          {[
            { q: "The predictor brackets crushed every other app I tried. The xG scoring is borderline psychic.", n: "Aisha P.", r: "Sports Editor, BBC" },
            { q: "Golden boot tracking refreshes faster than the FIFA official site. Crazy good for matchday.", n: "Marco D.", r: "Football Analyst" },
            { q: "We pipe the webhook into our newsroom Slack. Instant goal alerts. Saved us an intern.", n: "Liam K.", r: "Producer, ESPN" },
          ].map((t, i) => (
            <motion.div key={t.n}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.08 }}
              style={{
                padding: 28, borderRadius: 18,
                background: "linear-gradient(135deg, rgba(255,255,255,.05), rgba(255,255,255,.02))",
                border: "1px solid rgba(125,249,255,.15)",
              }}
            >
              <div style={{ color: "#7df9ff", fontSize: 22, marginBottom: 8 }}>★★★★★</div>
              <p style={{ color: "rgba(255,255,255,.85)", fontSize: 15, lineHeight: 1.65, margin: "0 0 18px" }}>"{t.q}"</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#7df9ff,#5e48ff)", display: "grid", placeItems: "center", color: "#02020a", fontWeight: 800 }}>{t.n[0]}</div>
                <div>
                  <div style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{t.n}</div>
                  <div style={{ color: "rgba(255,255,255,.5)", fontSize: 12 }}>{t.r}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ position: "relative", padding: "80px 24px", maxWidth: 1200, margin: "0 auto", zIndex: 2 }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ color: "#7df9ff", fontSize: 11, letterSpacing: ".3em", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>Pricing</div>
          <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "clamp(36px,5vw,64px)", fontWeight: 900, margin: 0 }}>
            Simple. Honest. Tournament-grade.
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, alignItems: "stretch" }}>
          <PricingCard
            name="Fan" price="0" period="forever"
            features={["Live schedule + results", "Groups & bracket viewer", "All-time records", "Mobile PWA", "Community support"]}
            cta="Get Started"
          />
          <PricingCard
            name="Pro" price="9" period="month" highlight
            features={["Everything in Fan", "AI Predictor + xG model", "Golden boot live tracker", "12 visual themes", "Push notifications", "Priority support"]}
            cta="Start 14-Day Trial"
          />
          <PricingCard
            name="Broadcast" price="99" period="month"
            features={["Everything in Pro", "Webhooks API + SDK", "Slack/Discord integrations", "Custom branding", "SLA + SOC 2 report", "Dedicated CSM"]}
            cta="Contact Sales"
          />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ position: "relative", padding: "80px 24px", maxWidth: 820, margin: "0 auto", zIndex: 2 }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "clamp(34px,4.5vw,56px)", fontWeight: 900, margin: 0 }}>
            Questions, answered.
          </h2>
        </div>
        {[
          { q: "Where does the live match data come from?", a: "We ingest TheStatsAPI for live results, lineups, and event timelines. Data refreshes every 5 minutes during play, with manual override support for admins." },
          { q: "Can I use this if I'm not in India? It says IST.", a: "Yes — IST is the default for the home dashboard, but every page respects your browser timezone. Pro plans add custom-TZ scheduling." },
          { q: "Is the predictor actually accurate?", a: "Our xG-weighted model historically beats coin-flip baselines by 18 percentage points on group stage outcomes. Knockouts are inherently noisier — we publish confidence scores so you know when to trust it." },
          { q: "Do you have a free tier?", a: "Yes — Fan is free forever. You get schedule, results, groups, brackets, records, and the PWA. Pro adds the predictor, golden boot tracker, and themes." },
          { q: "How is uptime?", a: "Hosted on Vercel + Redis with Service Worker offline fallback. 99.97% over the last 90 days. SLA available on Broadcast." },
        ].map(f => <FAQItem key={f.q} q={f.q} a={f.a} />)}
      </section>

      {/* FINAL CTA */}
      <section style={{ position: "relative", padding: "100px 24px", textAlign: "center", zIndex: 2 }}>
        <motion.div
          onMouseMove={onMove} onMouseLeave={onLeave}
          style={{
            rotateX, rotateY,
            transformPerspective: 1200, transformStyle: "preserve-3d",
            maxWidth: 880, margin: "0 auto",
            padding: "64px 32px", borderRadius: 28,
            background: "linear-gradient(135deg, rgba(125,249,255,.16), rgba(94,72,255,.22))",
            border: "1px solid rgba(125,249,255,.3)",
            boxShadow: "0 40px 100px rgba(94,72,255,.4)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <h2 style={{
            transform: "translateZ(30px)",
            fontFamily: "Barlow Condensed, sans-serif",
            fontSize: "clamp(40px, 6vw, 80px)", fontWeight: 900, letterSpacing: "-.02em", margin: 0,
            background: "linear-gradient(135deg,#fff,#7df9ff 60%,#5e48ff)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>
            The cup is on. Are you?
          </h2>
          <p style={{ transform: "translateZ(20px)", color: "rgba(255,255,255,.7)", margin: "16px auto 28px", maxWidth: 520, fontSize: 16, lineHeight: 1.6 }}>
            Get notified on every goal, manage your bracket, follow your team. Free forever, or upgrade in a click.
          </p>
          <form
            onSubmit={(e) => { e.preventDefault(); if (email) setSubbed(true); }}
            style={{ transform: "translateZ(40px)", display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", maxWidth: 480, margin: "0 auto" }}
          >
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
              style={{
                flex: 1, minWidth: 240, padding: "14px 20px", borderRadius: 12,
                background: "rgba(0,0,0,.3)", border: "1px solid rgba(125,249,255,.3)",
                color: "#fff", fontSize: 15, outline: "none",
              }}
            />
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              type="submit"
              style={{
                padding: "14px 28px", borderRadius: 12, border: "none",
                background: "linear-gradient(135deg,#7df9ff,#5e48ff)", color: "#02020a",
                fontWeight: 800, fontSize: 14, letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer",
              }}
            >{subbed ? "✓ Welcome aboard" : "Start Free"}</motion.button>
          </form>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer style={{ position: "relative", padding: "40px 24px 60px", maxWidth: 1200, margin: "0 auto", zIndex: 2, borderTop: "1px solid rgba(255,255,255,.06)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 32, marginTop: 32 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 26, height: 26, borderRadius: 6, background: "linear-gradient(135deg,#7df9ff,#5e48ff)", display: "grid", placeItems: "center", color: "#02020a" }}>⚽</div>
              <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: ".05em" }}>WC2026</span>
            </div>
            <p style={{ color: "rgba(255,255,255,.45)", fontSize: 12, lineHeight: 1.7 }}>The operating system for World Cup data.<br/>Built on React + Vercel.</p>
          </div>
          {[
            { h: "Product", items: ["Features", "Pricing", "API", "Changelog"] },
            { h: "Company", items: ["About", "Blog", "Careers", "Contact"] },
            { h: "Legal", items: ["Privacy", "Terms", "Security", "SOC 2"] },
          ].map(col => (
            <div key={col.h}>
              <div style={{ color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 14 }}>{col.h}</div>
              {col.items.map(i => (
                <a key={i} href="#" style={{ display: "block", color: "rgba(255,255,255,.55)", fontSize: 13, textDecoration: "none", padding: "5px 0" }}>{i}</a>
              ))}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,.06)", color: "rgba(255,255,255,.4)", fontSize: 12, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span>© 2026 WC2026 Tracker · All rights reserved</span>
          <span>Canada · Mexico · USA</span>
        </div>
      </footer>
    </div>
  );
}
