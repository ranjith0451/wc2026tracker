/**
 * Confetti — bursts a cone of accent + gold particles for ~1.6s.
 * Renders only when `fire` flips true (via key remount).
 * Auto-removes itself when animation ends.
 * Honours prefers-reduced-motion.
 */
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const COLORS = ["#fbbf24", "#f59e0b", "var(--accent, #2563eb)", "#fff", "#22c55e", "#ec4899"];

export default function Confetti({ count = 36, duration = 1.6 }) {
  const reduced = useReducedMotion();
  const [done, setDone] = useState(false);

  // Pre-generate particle paths (deterministic per mount)
  const particles = useMemo(() => Array.from({ length: count }).map((_, i) => {
    const angle = (Math.random() - 0.5) * 120; // -60° to +60° spread (upward cone)
    const dist = 80 + Math.random() * 180;
    const rad = (angle - 90) * (Math.PI / 180);
    return {
      id: i,
      x: Math.cos(rad) * dist,
      y: Math.sin(rad) * dist,
      rot: (Math.random() - 0.5) * 720,
      size: 6 + Math.random() * 6,
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 0.15,
      shape: Math.random() > 0.5 ? "circle" : "rect",
    };
  }), [count]);

  useEffect(() => {
    if (reduced) { setDone(true); return; }
    const t = setTimeout(() => setDone(true), duration * 1000 + 300);
    return () => clearTimeout(t);
  }, [reduced, duration]);

  if (done || reduced) return null;

  return (
    <div className="confetti-layer" data-testid="confetti">
      {particles.map(p => (
        <motion.span
          key={p.id}
          className="confetti-piece"
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
          animate={{
            x: p.x,
            y: p.y + 40, // gravity adds downward drift at the end
            rotate: p.rot,
            opacity: [1, 1, 0],
            scale: [1, 1.1, 0.7],
          }}
          transition={{ duration, delay: p.delay, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: p.size,
            height: p.shape === "circle" ? p.size : p.size * 0.5,
            background: p.color,
            borderRadius: p.shape === "circle" ? "50%" : 2,
          }}
        />
      ))}
    </div>
  );
}
