import { useRef } from "react";
import { prefersReducedMotion } from "../lib/usePlatform";

export function GlassCard({ children, className = "", specular = true, ...rest }) {
  const ref = useRef(null);
  const reduced = prefersReducedMotion();

  const onMove = reduced || !specular ? undefined : (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  const classes = ["glass-surface", specular && !reduced ? "specular" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={ref} className={classes} onMouseMove={onMove} {...rest}>
      {children}
    </div>
  );
}
