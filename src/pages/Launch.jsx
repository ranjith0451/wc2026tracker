import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform, useScroll, AnimatePresence } from "framer-motion";
import { MATCHES } from "../data/matches.js";
import { GROUPS } from "../data/teams.js";

const MotionLink = motion(Link);

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

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

/* ---------- 3D dashboard preview card (illustrative mockup) ---------- */
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
          wc2026 / rankings
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
              { l: "Teams", v: "48", c: "#7df9ff" },
              { l: "Matches", v: "104", c: "#fff" },
              { l: "Groups", v: "12", c: "#5e48ff" },
              { l: "Since", v: "1930", c: "#28c840" },
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

/* ---------- Feature card with 3D tilt, optionally a link into the app ---------- */
function FeatureCard({ icon, title, desc, to, delay = 0 }) {
  const { rotateX, rotateY, onMove, onLeave } = useTilt(10);
  const Tag = to ? MotionLink : motion.div;
  const tagProps = to ? { to } : {};
  return (
    <Tag
      {...tagProps}
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
        textDecoration: "none",
        display: "block",
        cursor: to ? "pointer" : "default",
      }}
    >
      <motion.div
        style={{ transform: "translateZ(30px)", fontSize: 28, marginBottom: 12 }}
        whileHover={{ scale: 1.15, rotate: 6 }}
      >{icon}</motion.div>
      <h3 style={{ transform: "translateZ(24px)", margin: "0 0 6px", color: "#fff",
        fontFamily: "Barlow Condensed, sans-serif", fontSize: 20, fontWeight: 800, letterSpacing: ".02em" }}>{title}</h3>
      <p style={{ transform: "translateZ(16px)", margin: 0, color: "rgba(255,255,255,.65)", fontSize: 13.5, lineHeight: 1.6 }}>{desc}</p>
    </Tag>
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

  const teamCount = Object.values(GROUPS).flat().length;
  const matchCount = MATCHES.length;
  const groupCount = Object.keys(GROUPS).length;

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
          {[["Features", "features"], ["How it works", "how"], ["FAQ", "faq"]].map(([label, id]) => (
            <button key={id} onClick={() => scrollToId(id)}
              style={{ color: "inherit", background: "none", border: "none", cursor: "pointer", font: "inherit", padding: 0 }}>
              {label}
            </button>
          ))}
        </div>
        <MotionLink
          to="/"
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          style={{
            padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer",
            background: "linear-gradient(135deg,#7df9ff,#5e48ff)", color: "#02020a",
            fontWeight: 800, fontSize: 13, letterSpacing: ".05em", textDecoration: "none",
          }}
        >Open the Hub</MotionLink>
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
          Free · Live for WC2026
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
          World Cup 2026.<br/>Every stat. One hub.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }}
          style={{ maxWidth: 640, margin: "0 auto", color: "rgba(255,255,255,.7)", fontSize: 18, lineHeight: 1.6 }}
        >
          Live scores, the Golden Boot race, an AI-assisted bracket predictor, and a century of
          World Cup history — free, no account required.
        </motion.p>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 32 }}>
          <MotionLink
            to="/"
            whileHover={{ scale: 1.05, boxShadow: "0 20px 50px rgba(94,72,255,.5)" }}
            whileTap={{ scale: 0.96 }}
            style={{
              padding: "14px 28px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg,#7df9ff,#5e48ff)", color: "#02020a",
              fontWeight: 800, fontSize: 14, letterSpacing: ".08em", textTransform: "uppercase",
              cursor: "pointer", textDecoration: "none", display: "inline-block",
            }}
          >Open the Hub →</MotionLink>
          <MotionLink
            to="/schedule"
            whileHover={{ scale: 1.05, background: "rgba(255,255,255,.1)" }}
            whileTap={{ scale: 0.96 }}
            style={{
              padding: "14px 28px", borderRadius: 12,
              background: "rgba(255,255,255,.05)", color: "#fff",
              border: "1px solid rgba(255,255,255,.15)",
              fontWeight: 700, fontSize: 14, letterSpacing: ".08em", textTransform: "uppercase",
              cursor: "pointer", textDecoration: "none", display: "inline-block",
            }}
          >View Schedule</MotionLink>
        </div>

        <div style={{ marginTop: 18, fontSize: 12, color: "rgba(255,255,255,.45)" }}>
          Free forever · No login required · Live during matches
        </div>

        <DashboardMock />
      </motion.section>

      {/* Powered by (real stack, no fabricated endorsements) */}
      <section style={{ position: "relative", padding: "70px 24px 20px", maxWidth: 1100, margin: "0 auto", zIndex: 2 }}>
        <div style={{ textAlign: "center", color: "rgba(255,255,255,.4)", fontSize: 11, letterSpacing: ".3em", textTransform: "uppercase", marginBottom: 24 }}>
          Powered by
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 48, opacity: 0.55 }}>
          {["React", "Vite", "TheStatsAPI", "Vercel"].map(l => (
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
            { n: teamCount, s: "", l: "National Teams" },
            { n: matchCount, s: "", l: "Matches Tracked" },
            { n: groupCount, s: "", l: "Groups" },
            { n: 1930, s: "", l: "Tracking History Since" },
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
          }}>Every page, one nav bar.</h2>
          <p style={{ color: "rgba(255,255,255,.55)", maxWidth: 540, margin: "14px auto 0", fontSize: 16 }}>
            Everything you need to follow, analyze, and relive the World Cup — click any card to jump straight in.
          </p>
        </motion.div>

        <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {[
            { i: "⚽", t: "Live Schedule", d: "All 104 matches with IST kickoffs, synced live from TheStatsAPI.", to: "/schedule" },
            { i: "🏆", t: "Group Standings", d: "All 12 groups, updated automatically as results come in.", to: "/groups" },
            { i: "🥊", t: "Knockout Bracket", d: "Round of 32 through the final, filled in as the tournament plays out.", to: "/bracket" },
            { i: "🥇", t: "Golden Boot", d: "Live goal and assist leaderboard, refreshed every few minutes during play.", to: "/scorers" },
            { i: "🔮", t: "AI Predictor", d: "Build your own bracket and compare it against a simple historical model.", to: "/predictor" },
            { i: "📊", t: "All-Time Records", d: "Every World Cup since 1930 — top scorers, goals, and tournament totals.", to: "/all-time" },
            { i: "⚖️", t: "Team Comparison", d: "Head-to-head history and FIFA ranking deltas, side by side.", to: "/compare" },
            { i: "👥", t: "Squads & Players", d: "Rosters for all 48 nations, with caps, clubs, and tournament history.", to: "/squads" },
            { i: "👩", t: "Women's World Cup", d: "All-time leaders and the tournament archive going back to 1991.", to: "/women" },
            { i: "🌍", t: "FIFA Rankings", d: "Confederation-by-confederation ranking changes.", to: "/rankings" },
            { i: "📈", t: "Tournament Stats", d: "Goals, attendance, and records for every World Cup edition.", to: "/stats" },
            { i: "📖", t: "History Archive", d: "Finals, winners, and runner-ups from every World Cup since 1930.", to: "/history" },
          ].map((f, idx) => (
            <FeatureCard key={f.t} icon={f.i} title={f.t} desc={f.d} to={f.to} delay={idx * 0.04} />
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ position: "relative", padding: "80px 24px", maxWidth: 1100, margin: "0 auto", zIndex: 2 }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ color: "#7df9ff", fontSize: 11, letterSpacing: ".3em", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>Workflow</div>
          <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "clamp(34px,4.5vw,56px)", fontWeight: 900, margin: 0 }}>
            No sign-up. Just open it.
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 28 }}>
          {[
            { n: "01", t: "Pick a page", d: "Schedule, Bracket, Predictor, Stats, and more — all in one nav bar, no account needed." },
            { n: "02", t: "Track it live", d: "Scores and the Golden Boot table update automatically while matches are in progress." },
            { n: "03", t: "Go deeper", d: "Compare teams, browse full squads, or explore every World Cup back to 1930." },
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

      {/* FREE STRIP */}
      <section style={{ position: "relative", padding: "20px 24px 80px", maxWidth: 1100, margin: "0 auto", zIndex: 2, textAlign: "center" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{
            padding: "32px 24px", borderRadius: 20,
            background: "linear-gradient(135deg, rgba(125,249,255,.1), rgba(94,72,255,.14))",
            border: "1px solid rgba(125,249,255,.25)",
          }}
        >
          <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "clamp(24px,3vw,32px)", fontWeight: 800, marginBottom: 6 }}>
            Free forever. No tiers, no paywall.
          </div>
          <p style={{ margin: 0, color: "rgba(255,255,255,.6)", fontSize: 14 }}>
            Every page on WC2026 is open to everyone — this is a fan project, not a subscription product.
          </p>
        </motion.div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ position: "relative", padding: "40px 24px 80px", maxWidth: 820, margin: "0 auto", zIndex: 2 }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "clamp(34px,4.5vw,56px)", fontWeight: 900, margin: 0 }}>
            Questions, answered.
          </h2>
        </div>
        {[
          { q: "Where does the live match data come from?", a: "Live results, lineups, and event timelines come from TheStatsAPI. Scores refresh automatically every 30 seconds while matches are live, and the Golden Boot table refreshes every few minutes." },
          { q: "Is this free?", a: "Yes — the entire hub is free, with no account or sign-up required." },
          { q: "What timezone are kickoffs shown in?", a: "IST (UTC+5:30) is the default across the hub, matching the live clock in the header." },
          { q: "How accurate is the Predictor?", a: "It's a simple model built on historical results — good for building your own bracket for fun, not a guarantee of outcomes." },
          { q: "Is there a mobile app?", a: "Not a native app yet — WC2026 is a responsive web app with offline-friendly caching, so it works well from any phone browser." },
        ].map(f => <FAQItem key={f.q} q={f.q} a={f.a} />)}
      </section>

      {/* FINAL CTA */}
      <section style={{ position: "relative", padding: "60px 24px 100px", textAlign: "center", zIndex: 2 }}>
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
            Every match, every stat, every record — free, live, and one click away.
          </p>
          <MotionLink
            to="/"
            whileHover={{ scale: 1.05, boxShadow: "0 20px 50px rgba(94,72,255,.5)" }}
            whileTap={{ scale: 0.96 }}
            style={{
              transform: "translateZ(40px)",
              display: "inline-block",
              padding: "16px 36px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg,#7df9ff,#5e48ff)", color: "#02020a",
              fontWeight: 800, fontSize: 14, letterSpacing: ".08em", textTransform: "uppercase",
              cursor: "pointer", textDecoration: "none",
            }}
          >Open the Hub →</MotionLink>
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
            <p style={{ color: "rgba(255,255,255,.45)", fontSize: 12, lineHeight: 1.7 }}>A free fan-built data hub for the<br/>2026 World Cup. Built on React + Vercel.</p>
          </div>
          {[
            { h: "Explore", items: [["Schedule", "/schedule"], ["Rankings", "/rankings"], ["Predictor", "/predictor"], ["History", "/history"]] },
            { h: "More", items: [["All-Time Records", "/all-time"], ["Women's World Cup", "/women"], ["Squads", "/squads"], ["Stats", "/stats"]] },
          ].map(col => (
            <div key={col.h}>
              <div style={{ color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 14 }}>{col.h}</div>
              {col.items.map(([label, to]) => (
                <Link key={label} to={to} style={{ display: "block", color: "rgba(255,255,255,.55)", fontSize: 13, textDecoration: "none", padding: "5px 0" }}>{label}</Link>
              ))}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,.06)", color: "rgba(255,255,255,.4)", fontSize: 12, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span>© 2026 WC2026 · Fan project, not affiliated with FIFA</span>
          <span>Canada · Mexico · USA</span>
        </div>
      </footer>
    </div>
  );
}
