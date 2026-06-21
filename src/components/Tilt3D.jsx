/**
 * Tilt3D — wraps any element with a cursor-following 3D tilt.
 * Uses framer-motion springs for buttery feel. Disables on reduced motion.
 */
import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";

export default function Tilt3D({
  children,
  max = 12,        // max rotation in degrees
  scale = 1.025,
  glare = true,    // soft cursor glare overlay
  className = "",
  style = {},
  ...rest
}) {
  const ref = useRef(null);
  const reduced = useReducedMotion();

  // Raw cursor offset (-1 to +1 relative to centre)
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  // Springified rotations
  const spring = { stiffness: 220, damping: 22, mass: 0.5 };
  const rotX = useSpring(useTransform(my, [-1, 1], [max, -max]), spring);
  const rotY = useSpring(useTransform(mx, [-1, 1], [-max, max]), spring);
  const sclSpring = useSpring(1, spring);

  // Glare position
  const glareX = useTransform(mx, [-1, 1], ["0%", "100%"]);
  const glareY = useTransform(my, [-1, 1], ["0%", "100%"]);

  function onMove(e) {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    mx.set(x * 2 - 1);
    my.set(y * 2 - 1);
  }
  function onEnter() { if (!reduced) sclSpring.set(scale); }
  function onLeave() {
    mx.set(0); my.set(0); sclSpring.set(1);
  }

  if (reduced) {
    return <div className={className} style={style} {...rest}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={className}
      style={{
        ...style,
        rotateX: rotX,
        rotateY: rotY,
        scale: sclSpring,
        transformStyle: "preserve-3d",
        perspective: 1000,
        willChange: "transform",
      }}
      {...rest}
    >
      {children}
      {glare && (
        <motion.div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            borderRadius: "inherit",
            background: `radial-gradient(220px circle at ${glareX.get()} ${glareY.get()}, rgba(255,255,255,0.18), transparent 70%)`,
            opacity: 0.7,
            mixBlendMode: "screen",
          }}
        />
      )}
    </motion.div>
  );
}
