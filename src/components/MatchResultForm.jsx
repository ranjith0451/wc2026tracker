import { useState, useEffect } from "react";
import TeamFlag from "./TeamFlag.jsx";
import { formatISTFull } from "../lib/time.js";
import { TEAMS } from "../data/squads.js";

const KNOCKOUT_STAGES = ["Round of 32", "Round of 16", "Quarterfinal", "Semifinal", "Third Place", "Final"];

function playersForTeam(teamName) {
  const team = TEAMS.find((t) => t.name === teamName);
  if (!team || !team.players) return [];
  return team.players.map((p) => p.name);
}

export default function MatchResultForm({ match, homeName, awayName, initial, onSave, onClear, onCancel }) {
  const [status, setStatus]         = useState(initial?.status || "finished");
  const [homeScore, setHomeScore]   = useState(initial?.homeScore ?? 0);
  const [awayScore, setAwayScore]   = useState(initial?.awayScore ?? 0);
  const [hasPenalties, setHasPenalties] = useState(!!initial?.penalties);
  const [pkHome, setPkHome]         = useState(initial?.penalties?.home ?? 0);
  const [pkAway, setPkAway]         = useState(initial?.penalties?.away ?? 0);
  const [scorers, setScorers]       = useState(initial?.scorers ? initial.scorers.map((s) => ({ ...s })) : []);

  useEffect(() => {
    setStatus(initial?.status || "finished");
    setHomeScore(initial?.homeScore ?? 0);
    setAwayScore(initial?.awayScore ?? 0);
    setHasPenalties(!!initial?.penalties);
    setPkHome(initial?.penalties?.home ?? 0);
    setPkAway(initial?.penalties?.away ?? 0);
    setScorers(initial?.scorers ? initial.scorers.map((s) => ({ ...s })) : []);
  }, [match.id]);

  const isKnockout = KNOCKOUT_STAGES.includes(match.stage);

  function addScorer() { setScorers((s) => [...s, { team: homeName, player: "", minute: 1, penalty: false, ownGoal: false }]); }
  function updateScorer(i, field, value) { setScorers((s) => s.map((row, idx) => idx === i ? { ...row, [field]: value } : row)); }
  function removeScorer(i) { setScorers((s) => s.filter((_, idx) => idx !== i)); }

  function handleSave() {
    if (status === "scheduled") { onClear(match.id); return; }
    const result = {
      status,
      homeScore: Number(homeScore) || 0,
      awayScore: Number(awayScore) || 0,
      scorers: scorers
        .filter((s) => s.player.trim() && s.player !== "__custom__")
        .map((s) => {
          const out = { team: s.team, player: s.player.trim(), minute: Number(s.minute) || 0 };
          if (s.penalty) out.penalty = true;
          if (s.ownGoal)  out.ownGoal  = true;
          return out;
        }),
    };
    if (hasPenalties) result.penalties = { home: Number(pkHome) || 0, away: Number(pkAway) || 0 };
    onSave(match.id, result);
  }

  const STATUS_OPTS = [
    { value: "scheduled", label: "Scheduled", color: "var(--blue)" },
    { value: "live",      label: "Live",      color: "var(--red)"  },
    { value: "finished",  label: "Finished",  color: "#1a7f3c"     },
  ];

  return (
    <div className="rf-card">
      {/* Card header */}
      <div className="rf-card-header">
        <div className="rf-card-meta">
          <span className="rf-card-id">Match #{match.id}</span>
          <span className="rf-card-stage">{match.stage}{match.group ? ` · ${match.group}` : ""}</span>
        </div>
        {onCancel && (
          <button className="rf-close-btn" onClick={onCancel} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        )}
      </div>

      {/* Teams row */}
      <div className="rf-teams-row">
        <div className="rf-team-side">
          <TeamFlag team={homeName} style={{ width: 36, height: 26, borderRadius: 5 }} />
          <span className="rf-team-name">{homeName}</span>
        </div>
        <span className="rf-vs">VS</span>
        <div className="rf-team-side right">
          <span className="rf-team-name">{awayName}</span>
          <TeamFlag team={awayName} style={{ width: 36, height: 26, borderRadius: 5 }} />
        </div>
      </div>
      <div className="rf-kickoff">{formatISTFull(match.isoIST)} · {match.venue}</div>

      {/* Status toggle */}
      <div className="rf-field">
        <div className="rf-field-label">Status</div>
        <div className="rf-status-row">
          {STATUS_OPTS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`rf-status-btn${status === opt.value ? " active" : ""}`}
              style={status === opt.value ? { background: opt.color, borderColor: opt.color, color: "#fff" } : {}}
              onClick={() => setStatus(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {status !== "scheduled" && (
        <>
          {/* Score */}
          <div className="rf-field">
            <div className="rf-field-label">Score</div>
            <div className="rf-score-row">
              <span className="rf-score-team">{homeName}</span>
              <input className="rf-score-input" type="number" min="0" value={homeScore} onChange={(e) => setHomeScore(e.target.value)} />
              <span className="rf-score-dash">—</span>
              <input className="rf-score-input" type="number" min="0" value={awayScore} onChange={(e) => setAwayScore(e.target.value)} />
              <span className="rf-score-team">{awayName}</span>
            </div>
          </div>

          {/* Penalties */}
          {isKnockout && (
            <div className="rf-field">
              <label className="rf-checkbox-label">
                <input type="checkbox" checked={hasPenalties} onChange={(e) => setHasPenalties(e.target.checked)} />
                Decided on penalties
              </label>
              {hasPenalties && (
                <div className="rf-score-row" style={{ marginTop: 10 }}>
                  <span className="rf-score-team">{homeName}</span>
                  <input className="rf-score-input" type="number" min="0" value={pkHome} onChange={(e) => setPkHome(e.target.value)} />
                  <span className="rf-score-dash">—</span>
                  <input className="rf-score-input" type="number" min="0" value={pkAway} onChange={(e) => setPkAway(e.target.value)} />
                  <span className="rf-score-team">{awayName}</span>
                </div>
              )}
            </div>
          )}

          {/* Goal scorers */}
          <div className="rf-field">
            <div className="rf-field-label">Goal Scorers</div>
            {scorers.length === 0 && <div className="rf-no-scorers">No scorers added yet</div>}
            {scorers.map((s, i) => {
              const players = playersForTeam(s.team);
              const isCustom = s.player !== "" && !players.includes(s.player);
              const selectValue = s.player === "" ? "" : isCustom ? "__custom__" : s.player;
              return (
                <div className="rf-scorer-row" key={i}>
                  <select className="rf-select" value={s.team} onChange={(e) => updateScorer(i, "team", e.target.value)}>
                    <option value={homeName}>{homeName}</option>
                    <option value={awayName}>{awayName}</option>
                  </select>
                  <select className="rf-select" value={selectValue} onChange={(e) => updateScorer(i, "player", e.target.value)}>
                    <option value="">Select player…</option>
                    {players.map((name) => <option key={name} value={name}>{name}</option>)}
                    <option value="__custom__">Other / type manually…</option>
                  </select>
                  {selectValue === "__custom__" && (
                    <input className="rf-text-input" type="text" placeholder="Player name"
                      value={s.player === "__custom__" ? "" : s.player}
                      onChange={(e) => updateScorer(i, "player", e.target.value)} />
                  )}
                  <input className="rf-minute-input" type="number" min="1" max="120" title="Minute" value={s.minute} onChange={(e) => updateScorer(i, "minute", e.target.value)} />
                  <span className="rf-min-label">min</span>
                  <label className="rf-check-label"><input type="checkbox" checked={!!s.penalty} onChange={(e) => updateScorer(i, "penalty", e.target.checked)} /> Pen</label>
                  <label className="rf-check-label"><input type="checkbox" checked={!!s.ownGoal} onChange={(e) => updateScorer(i, "ownGoal", e.target.checked)} /> OG</label>
                  <button type="button" className="rf-remove-btn" onClick={() => removeScorer(i)} title="Remove">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              );
            })}
            <button type="button" className="rf-add-scorer-btn" onClick={addScorer}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add scorer
            </button>
          </div>
        </>
      )}

      {/* Save / Clear */}
      <div className="rf-actions">
        <button className="rf-save-btn" onClick={handleSave}>Save result</button>
        <button className="rf-clear-btn" onClick={() => onClear(match.id)}>Clear / reset</button>
      </div>
    </div>
  );
}
