/**
 * Player heatmap — SVG football pitch with density dots from TheStatsAPI.
 * Shows touch/movement distribution for a selected player.
 */
import { useState } from 'react';
import { usePlayerHeatmap } from '../lib/useStats.js';

const PITCH_W = 340;
const PITCH_H = 220;

function HeatPitch({ points }) {
  if (!points?.length) return (
    <div className="hm-empty">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
      </svg>
      No heatmap data
    </div>
  );

  const maxVal = Math.max(...points.map(p => p.value || 1), 1);

  return (
    <svg viewBox={`0 0 ${PITCH_W} ${PITCH_H}`} className="hm-svg" role="img" aria-label="Player heatmap">
      {/* Pitch background */}
      <rect width={PITCH_W} height={PITCH_H} fill="#1a3a1a" rx="6"/>
      {/* Pitch lines */}
      <rect x="2" y="2" width={PITCH_W-4} height={PITCH_H-4} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth=".8"/>
      <line x1={PITCH_W/2} y1="2" x2={PITCH_W/2} y2={PITCH_H-2} stroke="rgba(255,255,255,.15)" strokeWidth=".8"/>
      <circle cx={PITCH_W/2} cy={PITCH_H/2} r="28" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth=".8"/>
      <circle cx={PITCH_W/2} cy={PITCH_H/2} r="1.5" fill="rgba(255,255,255,.3)"/>
      {/* Penalty areas */}
      <rect x="2" y={PITCH_H/2-40} width="56" height="80" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth=".8"/>
      <rect x={PITCH_W-58} y={PITCH_H/2-40} width="56" height="80" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth=".8"/>
      {/* 6-yard boxes */}
      <rect x="2" y={PITCH_H/2-20} width="20" height="40" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth=".8"/>
      <rect x={PITCH_W-22} y={PITCH_H/2-20} width="20" height="40" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth=".8"/>
      {/* Goals */}
      <rect x="0" y={PITCH_H/2-12} width="4" height="24" fill="rgba(255,255,255,.4)"/>
      <rect x={PITCH_W-4} y={PITCH_H/2-12} width="4" height="24" fill="rgba(255,255,255,.4)"/>
      {/* Heatmap dots — radius + opacity scaled by density value */}
      {points.map((p, i) => {
        const cx = (p.x / 100) * PITCH_W;
        const cy = (p.y / 100) * PITCH_H;
        const intensity = (p.value || 1) / maxVal;
        const r = 4 + intensity * 10;
        const opacity = 0.25 + intensity * 0.6;
        return (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill={`rgba(250,204,21,${opacity})`}
            stroke="none"
          />
        );
      })}
    </svg>
  );
}

export default function HeatmapWidget({ statsMatchId, lineups }) {
  return (
    <div className="hm-gate">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
      </svg>
      <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Heatmap not available on trial plan</p>
      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>TheStatsAPI heatmap endpoint requires a paid plan</span>
    </div>
  );
}
