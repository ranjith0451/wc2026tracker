/**
 * Motion utilities — central place for variants + reduced-motion handling.
 * Uses framer-motion conventions. All variants honour prefers-reduced-motion
 * because <MotionConfig reducedMotion="user"> is set in main.jsx.
 */

/* ── Page transition (route change) ─────────────────────────────────────── */
export const pageVariants = {
  initial: { opacity: 0, y: 12, filter: "blur(6px)" },
  enter:   { opacity: 1, y: 0,  filter: "blur(0px)", transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: -8, filter: "blur(4px)", transition: { duration: 0.25 } },
};

/* ── Stagger container — children reveal in sequence ────────────────────── */
export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

/* ── Reveal-from-below child variant ────────────────────────────────────── */
export const revealUp = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  },
};

/* ── Reveal-from-side ──────────────────────────────────────────────────── */
export const revealLeft = {
  hidden: { opacity: 0, x: -28 },
  show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};
export const revealRight = {
  hidden: { opacity: 0, x: 28 },
  show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

/* ── Scale-pop (used for badges, pills) ────────────────────────────────── */
export const scalePop = {
  hidden: { opacity: 0, scale: 0.7 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 260, damping: 18 } },
};

/* ── Hover-lift preset (used as whileHover/whileTap props on motion divs) ─ */
export const hoverLift = {
  whileHover: { y: -4, scale: 1.02, transition: { type: "spring", stiffness: 320, damping: 22 } },
  whileTap: { scale: 0.98, y: 0, transition: { duration: 0.1 } },
};

/* ── Scroll-reveal viewport options ────────────────────────────────────── */
export const inViewOnce = { once: true, margin: "-80px" };
