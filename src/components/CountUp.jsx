/**
 * CountUp — animates a number from 0 to target on first reveal.
 * Honours prefers-reduced-motion (renders final value immediately).
 */
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

export default function CountUp({ to = 0, duration = 1.4, decimals = 0, suffix = "" }) {
  const [val, setVal] = useState(0);
  const reduced = useReducedMotion();
  const startedRef = useRef(false);
  const refEl = useRef(null);

  useEffect(() => {
    if (reduced) { setVal(to); return; }
    if (startedRef.current) {
      // animate from current value to new target
      const start = val;
      const t0 = performance.now();
      let frame;
      const tick = (now) => {
        const k = Math.min(1, (now - t0) / (duration * 1000));
        const eased = 1 - Math.pow(1 - k, 3);
        setVal(start + (to - start) * eased);
        if (k < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(frame);
    }
  }, [to, duration, reduced]);

  useEffect(() => {
    if (!refEl.current || startedRef.current || reduced) {
      if (reduced) setVal(to);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          const t0 = performance.now();
          let frame;
          const tick = (now) => {
            const k = Math.min(1, (now - t0) / (duration * 1000));
            const eased = 1 - Math.pow(1 - k, 3);
            setVal(to * eased);
            if (k < 1) frame = requestAnimationFrame(tick);
          };
          frame = requestAnimationFrame(tick);
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(refEl.current);
    return () => io.disconnect();
  }, [to, duration, reduced]);

  const display = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString();
  return <span ref={refEl}>{display}{suffix}</span>;
}
