/**
 * Radar chart for team comparison.
 *
 * Props:
 *   axes:  [{ key, label, max }]
 *   teamA: { name, color, values: { key: number } }
 *   teamB: { name, color, values: { key: number } }
 */
import { useId } from "react";

const SIZE = 432;
const CENTER = SIZE / 2;
const RADIUS = 126;

function shortTeam(name = "") {
  return name.length > 12 ? `${name.slice(0, 11)}…` : name;
}

function polarToXY(angleDeg, r) {
  const a = (angleDeg - 90) * (Math.PI / 180);
  return [CENTER + r * Math.cos(a), CENTER + r * Math.sin(a)];
}

export default function RadarChart({ axes, teamA, teamB }) {
  const gradA = useId();
  const gradB = useId();
  const n = axes.length;
  const angleStep = 360 / n;

  // Build polygon path for a team
  function path(team) {
    const points = axes.map((ax, i) => {
      const v = Number(team.values?.[ax.key] || 0);
      const max = Math.max(ax.max || 1, v);
      const norm = Math.min(1, v / max);
      const r = norm * RADIUS;
      return polarToXY(i * angleStep, r);
    });
    return "M " + points.map(p => p.join(" ")).join(" L ") + " Z";
  }

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1].map(f => f * RADIUS);

  // Axis lines + labels
  const axisLines = axes.map((ax, i) => {
    const [x2, y2] = polarToXY(i * angleStep, RADIUS);
    const labelRadius = i === Math.floor(n / 2) ? RADIUS + 24 : RADIUS + 40;
    const [lx, ly] = polarToXY(i * angleStep, labelRadius);
    return { x2, y2, lx, ly, label: ax.label, key: ax.key, i };
  });

  return (
    <svg
      className="radar-svg"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Team comparison radar chart"
      data-testid="compare-radar"
    >
      <defs>
        <linearGradient id={gradA} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={teamA.color} stopOpacity="0.55"/>
          <stop offset="100%" stopColor={teamA.color} stopOpacity="0.25"/>
        </linearGradient>
        <linearGradient id={gradB} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={teamB.color} stopOpacity="0.55"/>
          <stop offset="100%" stopColor={teamB.color} stopOpacity="0.25"/>
        </linearGradient>
      </defs>

      {/* Grid rings */}
      {rings.map((r, idx) => (
        <circle
          key={idx}
          cx={CENTER} cy={CENTER} r={r}
          fill="none"
          stroke="var(--border-medium)"
          strokeWidth={idx === rings.length - 1 ? 1.5 : 0.7}
          opacity={0.5}
        />
      ))}

      {/* Axis lines */}
      {axisLines.map((a, i) => (
        <line
          key={i}
          x1={CENTER} y1={CENTER} x2={a.x2} y2={a.y2}
          stroke="var(--border-medium)" strokeWidth="0.7" opacity="0.5"
        />
      ))}

      {/* Team B polygon (drawn first so A is on top) */}
      <path
        d={path(teamB)}
        fill={`url(#${gradB})`}
        stroke={teamB.color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Team A polygon */}
      <path
        d={path(teamA)}
        fill={`url(#${gradA})`}
        stroke={teamA.color}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Vertex dots */}
      {axes.map((ax, i) => {
        const va = Number(teamA.values?.[ax.key] || 0);
        const vb = Number(teamB.values?.[ax.key] || 0);
        const max = Math.max(ax.max || 1, va, vb);
        const [ax_, ay_] = polarToXY(i * angleStep, Math.min(1, va / max) * RADIUS);
        const [bx_, by_] = polarToXY(i * angleStep, Math.min(1, vb / max) * RADIUS);
        return (
          <g key={i}>
            <circle cx={bx_} cy={by_} r="3.5" fill={teamB.color} />
            <circle cx={ax_} cy={ay_} r="3.5" fill={teamA.color} />
          </g>
        );
      })}

      {/* Axis labels */}
      {axisLines.map((a, i) => {
        const anchor = a.lx < CENTER - 5 ? "end" : a.lx > CENTER + 5 ? "start" : "middle";
        return (
          <text
            key={i}
            x={a.lx} y={a.ly}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize="12"
            fontWeight="700"
            fill="var(--text-secondary)"
            style={{ textTransform: "uppercase", letterSpacing: ".06em" }}
          >
            {a.label}
          </text>
        );
      })}

      {/* Legend */}
      <g transform={`translate(${CENTER - 120}, ${SIZE - 18})`}>
        <circle cx="0" cy="0" r="5" fill={teamA.color} />
        <text x="10" y="0" dominantBaseline="middle" fontSize="12" fontWeight="700" fill="var(--text)">{shortTeam(teamA.name)}</text>
      </g>
      <g transform={`translate(${CENTER + 18}, ${SIZE - 18})`}>
        <circle cx="0" cy="0" r="5" fill={teamB.color} />
        <text x="10" y="0" dominantBaseline="middle" fontSize="12" fontWeight="700" fill="var(--text)">{shortTeam(teamB.name)}</text>
      </g>
    </svg>
  );
}
