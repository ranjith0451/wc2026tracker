import { lazy, Suspense } from "react";
import { prefersReducedMotion } from "../lib/usePlatform";

const HostGlobe = lazy(() => import("./HostGlobe"));

function canRender3D() {
  if (typeof window === "undefined") return false;
  if (prefersReducedMotion()) return false;
  // Skip on very low-end devices
  const cores = navigator.hardwareConcurrency || 4;
  if (cores < 4) return false;
  // Probe for WebGL
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function GlobeFallback({ height }) {
  return (
    <div
      style={{
        width: "100%",
        height,
        borderRadius: 18,
        background:
          "radial-gradient(circle at 50% 45%, rgba(96,165,250,0.35) 0%, rgba(30,58,138,0.25) 35%, transparent 70%)",
        position: "relative",
        overflow: "hidden",
      }}
      aria-hidden="true"
    >
      <div
        style={{
          position: "absolute",
          inset: "10%",
          borderRadius: "50%",
          border: "1px solid rgba(96,165,250,0.25)",
          background:
            "radial-gradient(circle at 35% 30%, #1d4ed8 0%, #0b1a40 60%, #050c18 100%)",
          boxShadow: "0 0 80px rgba(37,99,235,0.35) inset",
        }}
      />
    </div>
  );
}

export default function GlobeHero({ height = 360 }) {
  const enabled = canRender3D();
  if (!enabled) return <GlobeFallback height={height} />;
  return (
    <Suspense fallback={<GlobeFallback height={height} />}>
      <HostGlobe height={height} />
    </Suspense>
  );
}
