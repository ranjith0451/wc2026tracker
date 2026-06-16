// 3D glass soccer ball that rolls across the screen on three tracks.
// Pure CSS animations — no canvas, no JS loop, GPU-accelerated via transform.
// Respects prefers-reduced-motion automatically via CSS.

const BALLS = [
  { top: "9%",  duration: 18, delay: 0,    size: 72 },
  { top: "52%", duration: 13, delay: 6,    size: 56 },
  { top: "78%", duration: 22, delay: 11.5, size: 88 },
];

function SoccerSVG({ size }) {
  const r = size / 2;
  const s = size;
  // Scale the pentagon positions relative to size
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      width={s}
      height={s}
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <radialGradient id={`bg-${size}`} cx="35%" cy="28%" r="70%">
          <stop offset="0%"   stopColor="#ddeeff" stopOpacity="0.95" />
          <stop offset="40%"  stopColor="#99c4ff" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#2255aa" stopOpacity="0.25" />
        </radialGradient>
        <radialGradient id={`sheen-${size}`} cx="38%" cy="28%" r="36%">
          <stop offset="0%"   stopColor="white" stopOpacity="0.95" />
          <stop offset="60%"  stopColor="white" stopOpacity="0.3" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <filter id={`glow-${size}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Base glass sphere */}
      <circle cx="50" cy="50" r="49"
        fill={`url(#bg-${size})`}
        stroke="rgba(180,220,255,0.5)"
        strokeWidth="0.8"
      />

      {/* Classic soccer ball pentagon panels */}
      <polygon points="50,7  62,29 54,51 46,51 38,29"  fill="rgba(5,10,30,0.80)" />
      <polygon points="50,93 62,71 54,49 46,49 38,71"  fill="rgba(5,10,30,0.72)" />
      <polygon points="7,50  29,62 51,54 51,46 29,38"  fill="rgba(5,10,30,0.76)" />
      <polygon points="93,50 71,62 49,54 49,46 71,38"  fill="rgba(5,10,30,0.72)" />
      <polygon points="19,19 37,26 44,45 29,57 11,46"  fill="rgba(5,10,30,0.62)" />
      <polygon points="81,19 63,26 56,45 71,57 89,46"  fill="rgba(5,10,30,0.62)" />
      <polygon points="19,81 37,74 44,55 29,43 11,54"  fill="rgba(5,10,30,0.55)" />
      <polygon points="81,81 63,74 56,55 71,43 89,54"  fill="rgba(5,10,30,0.55)" />

      {/* Highlight sheen — gives the glassy "lit from top-left" look */}
      <ellipse cx="37" cy="31" rx="20" ry="15"
        fill={`url(#sheen-${size})`}
        transform="rotate(-20,37,31)"
      />

      {/* Thin inner edge ring for depth */}
      <circle cx="50" cy="50" r="47"
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1"
      />
    </svg>
  );
}

export default function Ball3D() {
  return (
    <div className="ball3d-stage" aria-hidden="true">
      {BALLS.map(({ top, duration, delay, size }) => (
        <div
          key={`${top}-${size}`}
          className="ball3d-traveller"
          style={{
            top,
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
          }}
        >
          <div
            className="ball3d-spinner"
            style={{ animationDuration: `${duration}s`, animationDelay: `${delay}s` }}
          >
            <SoccerSVG size={size} />
            {/* Glass shimmer overlay */}
            <div className="ball3d-gloss" />
            {/* Drop glow */}
            <div className="ball3d-shadow" style={{ width: size, height: size * 0.18, marginTop: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
