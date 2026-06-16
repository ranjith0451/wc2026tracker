import { useState, useMemo, useEffect } from "react";
import { MATCHES } from "../data/matches.js";
import { resolveMatchTeams } from "../lib/bracket.js";
import { formatISTDate, formatISTTime, getMatchStatus } from "../lib/time.js";
import MatchResultForm from "../components/MatchResultForm.jsx";
import TeamFlag from "../components/TeamFlag.jsx";

function ApiUsageBar() {
  const [usage, setUsage] = useState(null);
  useEffect(() => {
    fetch('/api/wc?action=usage').then(r => r.json()).then(setUsage).catch(() => {});
    const id = setInterval(() => {
      fetch('/api/wc?action=usage').then(r => r.json()).then(setUsage).catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, []);
  if (!usage) return null;
  const pct = (usage.used / usage.limit) * 100;
  const color = pct > 80 ? 'var(--red)' : pct > 60 ? '#f59e0b' : 'var(--green-bright)';
  return (
    <div className="api-usage-box">
      <div className="api-usage-head">
        <span>◉ API-Football Daily Budget</span>
        <span style={{color}}>{usage.used} / {usage.limit} requests used</span>
      </div>
      <div className="api-usage-track">
        <div className="api-usage-fill" style={{ width:`${pct}%`, background: color }}/>
      </div>
      <div className="api-usage-foot">
        <span>{usage.remaining} requests remaining today</span>
        <span style={{color:'var(--text-dim)',fontSize:10}}>Resets midnight UTC</span>
      </div>
    </div>
  );
}

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);
const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
);
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);

const STATUS_COLOR = {
  finished: { bg: "var(--green-bg)", color: "#1a7f3c", border: "rgba(52,199,89,.25)" },
  live:     { bg: "var(--red-bg)",   color: "var(--red)", border: "rgba(255,59,48,.25)" },
  scheduled:{ bg: "var(--blue-bg)",  color: "var(--blue)", border: "rgba(0,113,227,.2)" },
};

export default function Admin({ results, overrides, setOverride, clearOverride, clearAllOverrides, liveCount = 0 }) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState(null);
  const [syncState, setSyncState] = useState("idle"); // idle | syncing | ok | error

  const filtered = useMemo(() => {
    if (!search.trim()) return MATCHES;
    const q = search.toLowerCase();
    return MATCHES.filter((m) => {
      const { home, away } = resolveMatchTeams(m, results);
      return `${m.id} ${home.name} ${away.name} ${m.group || ""} ${m.stage} ${m.venue}`.toLowerCase().includes(q);
    });
  }, [search, results]);

  const selectedMatch = MATCHES.find((m) => m.id === selectedId) || null;
  const enteredIds = Object.keys(overrides || {}).filter((id) => overrides[id] !== null);

  function flash(msg) { setToast(msg); setTimeout(() => setToast(null), 2500); }
  function handleSave(matchId, result) {
    setSyncState("syncing");
    setOverride(matchId, result);
    flash(`Saved result for match #${matchId}`);
    setTimeout(() => setSyncState("ok"), 800);
    setTimeout(() => setSyncState("idle"), 3500);
  }
  function handleClear(matchId) {
    setSyncState("syncing");
    clearOverride(matchId);
    flash(`Cleared result for match #${matchId}`);
    setTimeout(() => setSyncState("ok"), 800);
    setTimeout(() => setSyncState("idle"), 3500);
  }

  function downloadResults() {
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "results.json";
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  function copyResults() { navigator.clipboard?.writeText(JSON.stringify(results, null, 2)); flash("Copied results.json to clipboard"); }

  return (
    <div>
      {/* ── API usage ── */}
      <ApiUsageBar />

      {/* ── Page header ── */}
      <div className="admin-header">
        <div className="admin-header-text">
          <div className="sec-head" style={{ marginBottom: 4 }}>
            <span className="sec-title">Update Results</span>
            <span className="sec-count">· scores auto-sync from API · manual override available</span>
            {liveCount > 0 && <span className="admin-live-badge">{liveCount} live</span>}
            <div className="sec-line" />
          </div>
          <p className="admin-desc">
            Pick a match → enter score & scorers → Save. Results sync instantly to the cloud — every visitor on every device sees them straight away, no file upload needed.
          </p>
        </div>
        <div className="admin-actions">
          {syncState === "syncing" && <span className="admin-sync-badge syncing">Syncing…</span>}
          {syncState === "ok" && <span className="admin-sync-badge ok">✓ Saved to cloud</span>}
          <button className="admin-btn" onClick={copyResults}><CopyIcon /> Copy JSON</button>
          <button className="admin-btn" onClick={downloadResults}><DownloadIcon /> Export</button>
          {enteredIds.length > 0 && (
            <button className="admin-btn danger" onClick={() => { if (confirm("Clear ALL results from the server? Everyone will see empty scores.")) { clearAllOverrides(); flash("Cleared all results"); setSyncState("ok"); setTimeout(() => setSyncState("idle"), 3000); } }}>
              <TrashIcon /> Clear all
            </button>
          )}
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className="admin-toast">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          {toast}
        </div>
      )}

      {/* ── Entered results summary ── */}
      {enteredIds.length > 0 && (
        <div className="admin-entered-block">
          <div className="admin-entered-head">
            <span className="admin-entered-title">Entered Results</span>
            <span className="admin-entered-count">{enteredIds.length} match{enteredIds.length !== 1 ? "es" : ""}</span>
          </div>
          {enteredIds
            .map((id) => MATCHES.find((m) => m.id === Number(id)))
            .filter(Boolean)
            .sort((a, b) => new Date(a.isoIST) - new Date(b.isoIST))
            .map((m) => {
              const { home, away } = resolveMatchTeams(m, results);
              const r = results[m.id];
              const sc = STATUS_COLOR[r.status] || STATUS_COLOR.scheduled;
              return (
                <div className="admin-entered-row" key={m.id}>
                  <div className="admin-entered-match">
                    <span className="admin-match-flags">
                      <TeamFlag team={home.name} style={{ width: 20, height: 14, borderRadius: 3 }} />
                      <strong>{home.name}</strong>
                      <span className="admin-score-inline">{r.homeScore}–{r.awayScore}</span>
                      <strong>{away.name}</strong>
                      <TeamFlag team={away.name} style={{ width: 20, height: 14, borderRadius: 3 }} />
                    </span>
                    <span className="admin-entered-meta">#{m.id} · {m.stage}{m.group ? ` · ${m.group}` : ""}</span>
                  </div>
                  <div className="admin-entered-row-actions">
                    <span className="admin-status-badge" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{r.status}</span>
                    <button className="admin-icon-btn" onClick={() => setSelectedId(m.id)}>Edit</button>
                    <button className="admin-icon-btn danger" onClick={() => handleClear(m.id)}>Clear</button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* ── Active edit form ── */}
      {selectedMatch && (
        <MatchResultForm
          match={selectedMatch}
          homeName={resolveMatchTeams(selectedMatch, results).home.name}
          awayName={resolveMatchTeams(selectedMatch, results).away.name}
          initial={results[selectedMatch.id]}
          onSave={handleSave}
          onClear={handleClear}
          onCancel={() => setSelectedId(null)}
        />
      )}

      {/* ── Match list ── */}
      <div className="sec-head" style={{ marginTop: selectedMatch ? 24 : 8 }}>
        <span className="sec-title">All Matches</span>
        <span className="sec-count">· {filtered.length} shown</span>
        <div className="sec-line" />
      </div>

      <div className="search-box" style={{ marginBottom: 14 }}>
        <SearchIcon />
        <input
          className="search-input"
          placeholder="Search by team, stage, group, venue, or match #…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="match-list">
        {filtered.map((m) => {
          const { home, away } = resolveMatchTeams(m, results);
          const status = getMatchStatus(m, results);
          const sc = STATUS_COLOR[status] || STATUS_COLOR.scheduled;
          return (
            <div
              className={`match-list-row${selectedId === m.id ? " active" : ""}`}
              key={m.id}
              onClick={() => setSelectedId(m.id)}
            >
              <span className="mlr-id">#{m.id}</span>
              <span className="mlr-teams">
                <TeamFlag team={home.name} />
                {home.name} <span style={{ color: "var(--text-tertiary)", margin: "0 4px", fontWeight: 400 }}>vs</span> {away.name}
                <TeamFlag team={away.name} />
              </span>
              <span className="mlr-meta">{m.stage}{m.group ? ` · ${m.group}` : ""}</span>
              <span className="mlr-time">{formatISTDate(m.isoIST)} {formatISTTime(m.isoIST)}</span>
              <span className="admin-status-badge" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{status}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
