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
  const [playerId, setPlayerId] = useState('');
  const [triggered, setTriggered] = useState(false);

  const { data, isLoading, error } = usePlayerHeatmap(
    triggered ? statsMatchId : null,
    triggered ? playerId : null
  );

  const allPlayers = [];
  for (const side of lineups || []) {
    for (const p of side?.startXI || []) {
      if (p.name && p.id) allPlayers.push({ id: p.id, name: p.name, team: side.team });
    }
    for (const p of side?.substitutes || []) {
      if (p.name && p.id) allPlayers.push({ id: p.id, name: p.name, team: side.team });
    }
  }

  if (!statsMatchId) return (
    <div className="hm-gate"><p>Heatmap requires TheStatsAPI match ID</p></div>
  );

  return (
    <div className="hm-wrap">
      <div className="hm-controls">
        <select
          className="hm-select"
          value={playerId}
          onChange={e => { setPlayerId(e.target.value); setTriggered(false); }}
        >
          <option value="">— Select a player —</option>
          {allPlayers.map(p => (
            <option key={p.id} value={p.id}>{p.name} ({p.team})</option>
          ))}
        </select>
        <button
          className="hm-load-btn"
          disabled={!playerId || isLoading}
          onClick={() => setTriggered(true)}
        >
          {isLoading ? 'Loading…' : 'Load Heatmap'}
        </button>
      </div>
      {!triggered && <div className="hm-hint">Select a player and click Load Heatmap to see their positional density on the pitch.</div>}
      {triggered && error && <div className="hm-error">Heatmap unavailable: {error.message}</div>}
      {triggered && !isLoading && data?.unavailable && (
        <div className="hm-error">No heatmap data for this player in this match.</div>
      )}
      {triggered && !isLoading && data && !data.unavailable && (
        <>
          {data.playerName && <div className="hm-player-label">{data.playerName}</div>}
          <HeatPitch points={data.points || []} />
          <div className="hm-legend">
            <span className="hm-dot low" />Low activity
            <span className="hm-dot high" style={{ marginLeft: 16 }} />High activity
          </div>
        </>
      )}
    </div>
  );
}
