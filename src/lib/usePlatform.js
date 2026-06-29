import { useEffect, useState } from "react";

function detect() {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

export function usePlatform() {
  const [platform, setPlatform] = useState(() => detect());
  useEffect(() => {
    const p = detect();
    setPlatform(p);
    if (typeof document !== "undefined") {
      document.body.setAttribute("data-platform", p);
    }
  }, []);
  return platform;
}

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}
