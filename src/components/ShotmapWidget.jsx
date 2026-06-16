/**
 * SVG shot map — renders shots on a half-pitch.
 * Each shot: { x, y, xG, onTarget, goal, team, playerName }
 * Coordinates are 0-100 (percentage of pitch dimensions).
 */
import { useState } from 'react';

const PITCH_W = 340;
const PITCH_H = 230;
// Goal dimensions in SVG space
const GOAL_W  = 44;
const GOAL_Y  = PITCH_H / 2 - 22;

function ShotDot({ shot, homeTeam, isSelected, onSelect }) {
  const isHome = shot.team === homeTeam;
  // Mirror away shots (they attack opposite direction)
  const sx = isHome ? (shot.x / 100) * PITCH_W : PITCH_W - (shot.x / 100) * PITCH_W;
  const sy = (shot.y / 100) * PITCH_H;

  const color = shot.goal
    ? (isHome ? '#22c55e' : '#f59e0b')
    : shot.onTarget
    ? (isHome ? '#60a5fa' : '#f97316')
    : 'rgba(255,255,255,0.3)';

  const r = 4 + (shot.xG || 0) * 10; // radius scales with xG

  return (
    <g
      onClick={() => onSelect(isSelected ? null : shot)}
      style={{ cursor: 'pointer' }}
    >
      <circle
        cx={sx} cy={sy} r={r}
        fill={color}
        stroke={isSelected ? '#fff' : 'rgba(0,0,0,0.4)'}
        strokeWidth={isSelected ? 2 : 1}
        opacity={0.85}
      />
      {shot.goal && (
        <circle cx={sx} cy={sy} r={r + 4}
          fill="none" stroke={color} strokeWidth="1.5" opacity="0.5" />
      )}
    </g>
  );
}

export default function ShotmapWidget({ data, homeTeam, awayTeam }) {
  const [selected, setSelected] = useState(null);

  const shots = data?.shots || data?.response || data || [];
  if (!shots.length) {
    return (
      <div className="shotmap-empty">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4M12 16h.01"/>
        </svg>
        No shotmap data available
      </div>
    );
  }

  const homeShots = shots.filter((s) => s.team === homeTeam || s.teamName === homeTeam);
  const awayShots = shots.filter((s) => s.team === awayTeam || s.teamName === awayTeam);
  const homeXG = homeShots.reduce((a, s) => a + (s.xG || 0), 0).toFixed(2);
  const awayXG = awayShots.reduce((a, s) => a + (s.xG || 0), 0).toFixed(2);
  const homeGoals = homeShots.filter((s) => s.goal).length;
  const awayGoals = awayShots.filter((s) => s.goal).length;

  return (
    <div className="shotmap-wrap">
      {/* xG Summary */}
      <div className="shotmap-xg-row">
        <div className="shotmap-xg-team">
          <span className="shotmap-xg-val home">{homeXG}</span>
          <span className="shotmap-xg-label">xG · {homeTeam}</span>
          <span className="shotmap-xg-shots">{homeShots.length} shots · {homeGoals} goals</span>
        </div>
        <div className="shotmap-xg-vs">xG</div>
        <div className="shotmap-xg-team right">
          <span className="shotmap-xg-val away">{awayXG}</span>
          <span className="shotmap-xg-label">{awayTeam} · xG</span>
          <span className="shotmap-xg-shots">{awayGoals} goals · {awayShots.length} shots</span>
        </div>
      </div>

      {/* Pitch SVG */}
      <div className="shotmap-svg-wrap">
        <svg
          viewBox={`0 0 ${PITCH_W} ${PITCH_H}`}
          className="shotmap-svg"
          role="img"
          aria-label="Shot map"
        >
          {/* Pitch background */}
          <rect x="0" y="0" width={PITCH_W} height={PITCH_H} fill="#1a3a1a" rx="6" />
          {/* Center line */}
          <line x1={PITCH_W / 2} y1="0" x2={PITCH_W / 2} y2={PITCH_H}
            stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4 4" />
          {/* Goals */}
          <rect x="0" y={GOAL_Y} width="8" height={GOAL_W}
            fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
          <rect x={PITCH_W - 8} y={GOAL_Y} width="8" height={GOAL_W}
            fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
          {/* 6-yard boxes */}
          <rect x="0" y={PITCH_H / 2 - 44} width="30" height="88"
            fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          <rect x={PITCH_W - 30} y={PITCH_H / 2 - 44} width="30" height="88"
            fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          {/* Penalty areas */}
          <rect x="0" y={PITCH_H / 2 - 68} width="74" height="136"
            fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
          <rect x={PITCH_W - 74} y={PITCH_H / 2 - 68} width="74" height="136"
            fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
          {/* Penalty spots */}
          <circle cx="52" cy={PITCH_H / 2} r="2" fill="rgba(255,255,255,0.3)" />
          <circle cx={PITCH_W - 52} cy={PITCH_H / 2} r="2" fill="rgba(255,255,255,0.3)" />

          {/* Shots */}
          {shots.map((s, i) => (
            <ShotDot
              key={i}
              shot={s}
              homeTeam={homeTeam}
              isSelected={selected === s}
              onSelect={setSelected}
            />
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="shotmap-legend">
        <span><span className="dot" style={{ background: '#22c55e' }} />{homeTeam} goal</span>
        <span><span className="dot" style={{ background: '#60a5fa' }} />{homeTeam} on target</span>
        <span><span className="dot" style={{ background: '#f59e0b' }} />{awayTeam} goal</span>
        <span><span className="dot" style={{ background: '#f97316' }} />{awayTeam} on target</span>
        <span><span className="dot" style={{ background: 'rgba(255,255,255,0.3)' }} />Off target</span>
      </div>

      {/* Shot tooltip */}
      {selected && (
        <div className="shotmap-tooltip">
          <strong>{selected.playerName || selected.player}</strong>
          <span className="chip">{selected.goal ? 'GOAL' : selected.onTarget ? 'On target' : 'Off target'}</span>
          {selected.xG != null && <span>xG: {selected.xG.toFixed(2)}</span>}
          {selected.minute && <span>{selected.minute}'</span>}
        </div>
      )}
    </div>
  );
}
