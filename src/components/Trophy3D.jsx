/**
 * Floating World Cup Trophy — real photo with cursor parallax tilt + mirror reflection.
 *
 * Visual treatment:
 *  - Cursor-following 3D tilt (spring physics, subtle)
 *  - Gentle floating bob (sine wave keyframes — composes with tilt)
 *  - Mirror reflection floor (flipped copy with fading mask)
 *  - Accent-color drop-shadow halo
 *  - 18 orbiting accent-color particles
 *  - Honours prefers-reduced-motion
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";

function useCssColor(varName, fallback) {
  const [c, setC] = useState(fallback);
  useEffect(() => {
    const read = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      if (v) setC(v);
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-accent", "data-theme"] });
    return () => obs.disconnect();
  }, [varName]);
  return c;
}

export default function Trophy3D() {
  const accent = useCssColor("--accent", "#2563eb");
  const reduced = useReducedMotion();
  const wrapRef = useRef(null);
  const [imgMissing, setImgMissing] = useState(false);

  // Cursor parallax — raw cursor offset (-1 to +1 from center of stage)
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  // Springified tilt (gentler than instant rotation)
  const spring = { stiffness: 80, damping: 14, mass: 0.6 };
  const rotateY = useSpring(useTransform(mx, [-1, 1], [-14, 14]), spring);
  const rotateX = useSpring(useTransform(my, [-1, 1], [10, -10]), spring);
  const translateX = useSpring(useTransform(mx, [-1, 1], [-12, 12]), spring);

  // Cursor tracker — listens on window so it works from anywhere on the page
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const onMove = (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const stage = wrapRef.current;
        if (!stage) return;
        const r = stage.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = (e.clientX - cx) / (window.innerWidth / 2);
        const dy = (e.clientY - cy) / (window.innerHeight / 2);
        mx.set(Math.max(-1, Math.min(1, dx)));
        my.set(Math.max(-1, Math.min(1, dy)));
      });
    };
    const onLeave = () => { mx.set(0); my.set(0); };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced, mx, my]);

  // 18 orbiting particles
  const particles = useMemo(() => Array.from({ length: 18 }).map((_, i) => {
    const angle = (i / 18) * Math.PI * 2;
    const r = 150 + (i % 3) * 22;
    return {
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r * 0.42,
      delay: i * 0.18,
      size: 4 + (i % 4),
    };
  }), []);

  const trophyFilter = `drop-shadow(0 20px 24px rgba(0,0,0,0.55)) drop-shadow(0 0 36px ${accent}66)`;

  if (imgMissing) {
    return (
      <div ref={wrapRef} className="trophy-3d-wrap trophy-fallback-wrap" data-testid="trophy-3d" style={{ perspective: 1100 }}>
        <div className="trophy-halo" style={{ background: `radial-gradient(circle, ${accent}66 0%, transparent 66%)` }} />
        <div className="trophy-fallback-core" style={{ borderColor: `${accent}66`, boxShadow: `0 0 24px ${accent}66` }}>
          <span className="trophy-fallback-icon">🏆</span>
        </div>
        <div className="trophy-floor" style={{ background: `radial-gradient(ellipse at center, ${accent}66 0%, transparent 66%)` }} />
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="trophy-3d-wrap" data-testid="trophy-3d" style={{ perspective: 1100 }}>
      {/* Breathing halo */}
      <div
        className="trophy-halo"
        style={{ background: `radial-gradient(circle, ${accent}55 0%, transparent 65%)` }}
      />

      {/* Cursor-parallax wrapper: applies rotation + small translate from cursor */}
      <motion.div
        className="trophy-tilt"
        style={{
          rotateX,
          rotateY,
          x: translateX,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
        {/* Floating image (continuous sine bob) — composes with parent tilt */}
        <motion.img
          src="/trophy.png"
          alt="FIFA World Cup Trophy"
          className="trophy-img"
          draggable={false}
          animate={reduced ? {} : {
            y: [0, -16, 0, 16, 0],
            rotateZ: [-1.5, 1.5, -1.5],
          }}
          transition={reduced ? {} : {
            y: { duration: 4.5, repeat: Infinity, ease: "easeInOut" },
            rotateZ: { duration: 6, repeat: Infinity, ease: "easeInOut" },
          }}
          style={{ filter: trophyFilter }}
          onError={() => setImgMissing(true)}
        />

        {/* Mirror reflection underneath */}
        <img
          src="/trophy.png"
          alt=""
          aria-hidden="true"
          className="trophy-mirror"
        />
      </motion.div>

      {/* Orbiting particles */}
      {!reduced && (
        <motion.div
          className="trophy-orbit"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        >
          {particles.map((p, i) => (
            <motion.span
              key={i}
              className="trophy-particle"
              style={{
                left: `calc(50% + ${p.x}px)`,
                top: `calc(50% + ${p.y}px)`,
                width: p.size,
                height: p.size,
                background: i % 2 === 0 ? accent : "#fbbf24",
                boxShadow: `0 0 ${p.size * 2.5}px ${i % 2 === 0 ? accent : "#fbbf24"}`,
              }}
              animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.6, 1] }}
              transition={{ duration: 2.6, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
            />
          ))}
        </motion.div>
      )}

      {/* Ground spotlight */}
      <div
        className="trophy-floor"
        style={{ background: `radial-gradient(ellipse at center, ${accent}55 0%, transparent 65%)` }}
      />
    </div>
  );
}
